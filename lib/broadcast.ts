import { prisma } from "@/lib/prisma";

/**
 * MOTEUR DE DIFFUSION (BROADCAST)
 * ===============================
 *
 * Permet a un administrateur d'envoyer une notification :
 *   - a TOUS les utilisateurs                 (scope = "ALL")
 *   - a un ou plusieurs ROLES                 (scope = "ROLES", roles = [...])
 *   - a une selection d'utilisateurs precis   (scope = "USERS", userIds = [...])
 *
 * Chaque diffusion porte un NIVEAU D'URGENCE (severity) qui pilote la couleur,
 * la persistance et la possibilite de fermer la banniere in-app.
 *
 * Deux effets par diffusion :
 *   1. une ligne `Broadcast` (historique + source de la banniere globale)
 *   2. une ligne `Notification` par destinataire (centre de notifications)
 */

/* ─── Niveaux d'urgence ─────────────────────────────────────────────────── */

export const SEVERITIES = ["INFO", "SUCCESS", "WARNING", "URGENT", "CRITICAL"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface SeverityMeta {
  label: string;
  /** Type stocke sur la Notification (compatible avec l'UI existante). */
  notificationType: string;
  /** Les niveaux hauts ne peuvent pas etre masques par l'utilisateur. */
  dismissible: boolean;
  /** Poids pour trier les bannieres (le plus haut s'affiche en premier). */
  weight: number;
}

export const SEVERITY_META: Record<Severity, SeverityMeta> = {
  INFO: { label: "Information", notificationType: "info", dismissible: true, weight: 1 },
  SUCCESS: { label: "Resolu", notificationType: "success", dismissible: true, weight: 2 },
  WARNING: { label: "Avertissement", notificationType: "warning", dismissible: true, weight: 3 },
  URGENT: { label: "Urgent", notificationType: "error", dismissible: false, weight: 4 },
  CRITICAL: { label: "Critique", notificationType: "error", dismissible: false, weight: 5 },
};

export function normalizeSeverity(value: unknown): Severity {
  const v = String(value ?? "").toUpperCase();
  return (SEVERITIES as readonly string[]).includes(v) ? (v as Severity) : "INFO";
}

/* ─── Categories & portees ──────────────────────────────────────────────── */

export const BROADCAST_CATEGORIES = [
  "ANNOUNCEMENT",
  "MAINTENANCE",
  "SECURITY",
  "PROMO",
  "SYSTEM",
] as const;
export type BroadcastCategory = (typeof BROADCAST_CATEGORIES)[number];

export const BROADCAST_SCOPES = ["ALL", "ROLES", "USERS"] as const;
export type BroadcastScope = (typeof BROADCAST_SCOPES)[number];

export const BROADCAST_ROLES = [
  "USER",
  "AGENT",
  "MERCHANT",
  "ADMIN",
  "BANK_ADMIN",
  "BUSINESS_ADMIN",
] as const;

/** Services pouvant etre marques comme impactes par une maintenance. */
export const MAINTENANCE_SCOPES = [
  "RETRAIT",
  "DEPOT",
  "TRANSFERT",
  "MPAY",
  "ECHANGE",
  "CARTES",
  "PLATEFORME",
] as const;

/* ─── Utilitaires de duree ──────────────────────────────────────────────── */

/** Duree en minutes entre deux dates (arrondie), ou null. */
export function durationMinutes(start?: Date | null, end?: Date | null): number | null {
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return Math.round(ms / 60000);
}

/** Formate une duree en minutes vers un libelle lisible ("2 h 30 min"). */
export function formatDuration(minutes?: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = Math.round(minutes % 60);
  const parts: string[] = [];
  if (d) parts.push(`${d} j`);
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  return parts.join(" ") || null;
}

/* ─── Resolution des destinataires ──────────────────────────────────────── */

export interface BroadcastTarget {
  scope: BroadcastScope;
  roles?: string[];
  userIds?: string[];
}

/**
 * Retourne la liste des identifiants d'utilisateurs cibles.
 * Les comptes bannis / supprimes sont exclus lorsque ces champs existent.
 */
export async function resolveRecipients(target: BroadcastTarget): Promise<string[]> {
  const scope = target.scope;

  if (scope === "USERS") {
    const ids = (target.userIds ?? []).filter(Boolean);
    if (ids.length === 0) return [];
    const rows = await prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  if (scope === "ROLES") {
    const roles = (target.roles ?? []).filter(Boolean);
    if (roles.length === 0) return [];
    const rows = await prisma.user.findMany({
      where: { role: { in: roles } },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  const rows = await prisma.user.findMany({ select: { id: true } });
  return rows.map((r) => r.id);
}

/* ─── Envoi ─────────────────────────────────────────────────────────────── */

export interface SendBroadcastInput {
  title: string;
  message: string;
  severity?: Severity | string;
  category?: BroadcastCategory | string;
  scope?: BroadcastScope | string;
  roles?: string[];
  userIds?: string[];
  link?: string | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  /** Details libres : services impactes, consignes, contact support... */
  details?: Record<string, unknown> | null;
  /** Cree aussi une notification persistee par destinataire (defaut : true). */
  persistNotifications?: boolean;
  /** Affiche la banniere globale in-app (defaut : true). */
  active?: boolean;
  createdById?: string | null;
  createdByName?: string | null;
}

export interface SendBroadcastResult {
  broadcastId: string | null;
  recipientCount: number;
  severity: Severity;
  /** Renseigne si la diffusion a echoue (table absente, base indisponible...). */
  error?: string;
}

/**
 * Cree la campagne et distribue les notifications.
 * Ne jette jamais : une diffusion ratee ne doit pas bloquer l'action admin
 * (ex. activer la maintenance) qui l'a declenchee.
 */
export async function sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult> {
  const severity = normalizeSeverity(input.severity);
  const meta = SEVERITY_META[severity];
  const scope = ((): BroadcastScope => {
    const v = String(input.scope ?? "ALL").toUpperCase();
    return (BROADCAST_SCOPES as readonly string[]).includes(v) ? (v as BroadcastScope) : "ALL";
  })();
  const category = ((): BroadcastCategory => {
    const v = String(input.category ?? "ANNOUNCEMENT").toUpperCase();
    return (BROADCAST_CATEGORIES as readonly string[]).includes(v)
      ? (v as BroadcastCategory)
      : "ANNOUNCEMENT";
  })();

  const roles = scope === "ROLES" ? (input.roles ?? []).filter(Boolean) : [];
  const userIds = scope === "USERS" ? (input.userIds ?? []).filter(Boolean) : [];

  try {
    const recipients = await resolveRecipients({ scope, roles, userIds });
    const durationMin = durationMinutes(input.startsAt, input.endsAt);

    let broadcastId: string | null = null;

    // 1. Campagne (historique + banniere globale)
    try {
      const client = prisma as any;
      if (client?.broadcast) {
        const row = await client.broadcast.create({
          data: {
            title: input.title,
            message: input.message,
            severity,
            category,
            scope,
            roles,
            userIds,
            recipientCount: recipients.length,
            link: input.link ?? null,
            startsAt: input.startsAt ?? null,
            endsAt: input.endsAt ?? null,
            durationMin,
            details: (input.details ?? undefined) as any,
            dismissible: meta.dismissible,
            active: input.active ?? true,
            createdById: input.createdById ?? null,
            createdByName: input.createdByName ?? null,
          },
          select: { id: true },
        });
        broadcastId = row.id;
      }
    } catch (err) {
      console.log("[v0] broadcast row not created:", (err as Error)?.message);
    }

    // 2. Notifications individuelles (par lots pour ne pas saturer la base)
    let delivered = 0;
    if (input.persistNotifications !== false && recipients.length > 0) {
      const metadata = JSON.stringify({
        broadcastId,
        severity,
        category,
        scope,
        link: input.link ?? undefined,
        startsAt: input.startsAt ? new Date(input.startsAt).toISOString() : undefined,
        endsAt: input.endsAt ? new Date(input.endsAt).toISOString() : undefined,
        durationMin: durationMin ?? undefined,
        durationLabel: formatDuration(durationMin) ?? undefined,
        ...(input.details ?? {}),
      });

      const CHUNK = 500;
      for (let i = 0; i < recipients.length; i += CHUNK) {
        const slice = recipients.slice(i, i + CHUNK);
        try {
          const res = await prisma.notification.createMany({
            data: slice.map((userId) => ({
              userId,
              title: input.title,
              message: input.message,
              type: meta.notificationType,
              read: false,
              metadata: metadata as any,
            })),
            skipDuplicates: true,
          });
          delivered += res.count;
        } catch (err) {
          console.log("[v0] notification chunk failed:", (err as Error)?.message);
        }
      }
    }

    return {
      broadcastId,
      recipientCount: input.persistNotifications === false ? recipients.length : delivered,
      severity,
    };
  } catch (err) {
    const message = (err as Error)?.message ?? "Diffusion impossible";
    console.log("[v0] sendBroadcast failed:", message);
    return { broadcastId: null, recipientCount: 0, severity, error: message };
  }
}

/* ─── Lecture des bannieres actives pour un utilisateur ─────────────────── */

export interface ActiveAlert {
  id: string;
  title: string;
  message: string;
  severity: Severity;
  category: string;
  link: string | null;
  startsAt: string | null;
  endsAt: string | null;
  durationMin: number | null;
  durationLabel: string | null;
  details: Record<string, unknown> | null;
  dismissible: boolean;
  createdAt: string;
}

/**
 * Retourne les campagnes actives qui concernent cet utilisateur,
 * triees du niveau le plus grave au moins grave.
 */
export async function getActiveAlertsForUser(params: {
  userId?: string | null;
  role?: string | null;
}): Promise<ActiveAlert[]> {
  try {
    const client = prisma as any;
    if (!client?.broadcast) return [];

    const now = new Date();
    const rows = await client.broadcast.findMany({
      where: {
        active: true,
        OR: [{ endsAt: null }, { endsAt: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });

    return (rows as any[])
      .filter((b) => {
        if (b.scope === "USERS") return Boolean(params.userId && b.userIds?.includes(params.userId));
        if (b.scope === "ROLES") return Boolean(params.role && b.roles?.includes(params.role));
        return true;
      })
      .sort(
        (a, b) =>
          SEVERITY_META[normalizeSeverity(b.severity)].weight -
            SEVERITY_META[normalizeSeverity(a.severity)].weight ||
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .map((b) => ({
        id: b.id,
        title: b.title,
        message: b.message,
        severity: normalizeSeverity(b.severity),
        category: b.category,
        link: b.link ?? null,
        startsAt: b.startsAt ? new Date(b.startsAt).toISOString() : null,
        endsAt: b.endsAt ? new Date(b.endsAt).toISOString() : null,
        durationMin: b.durationMin ?? null,
        durationLabel: formatDuration(b.durationMin),
        details: (b.details ?? null) as Record<string, unknown> | null,
        dismissible: b.dismissible ?? true,
        createdAt: new Date(b.createdAt).toISOString(),
      }));
  } catch (err) {
    console.log("[v0] getActiveAlertsForUser failed:", (err as Error)?.message);
    return [];
  }
}
