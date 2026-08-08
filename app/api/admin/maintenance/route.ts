export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendBroadcast,
  normalizeSeverity,
  durationMinutes,
  formatDuration,
  MAINTENANCE_SCOPES,
} from "@/lib/broadcast";
import { revokeSessionsForMaintenance, invalidateMaintenanceCache } from "@/lib/maintenance";

const CONFIG_ID = "GLOBAL_CONFIG";

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

async function requireAdmin() {
  const payload = await getAuthPayload();
  if (!payload) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  if (payload.role !== "ADMIN")
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { payload };
}

/**
 * GET — état courant de la maintenance (pour préremplir le formulaire admin).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: CONFIG_ID } });
    const c = config as any;
    const startsAt = c?.maintenanceStartsAt ?? null;
    const endsAt = c?.maintenanceUntil ?? null;
    const durationMin = durationMinutes(startsAt, endsAt);

    return NextResponse.json({
      maintenanceMode: Boolean(c?.maintenanceMode),
      title: c?.maintenanceTitle ?? "",
      message: c?.maintenanceMessage ?? "",
      severity: c?.maintenanceSeverity ?? "WARNING",
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      durationMin,
      durationLabel: formatDuration(durationMin),
      scopes: c?.maintenanceScopes ?? [],
      allowedRoles: c?.maintenanceAllowedRoles ?? ["ADMIN"],
      availableScopes: MAINTENANCE_SCOPES,
    });
  } catch (error) {
    console.error("[v0] MAINTENANCE_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST — active ou désactive la maintenance.
 *
 * Body :
 *  {
 *    maintenanceMode: boolean,
 *    title, message, severity,               // détails annoncés
 *    startsAt, endsAt,                       // fenêtre => durée calculée
 *    scopes: string[],                       // services impactés
 *    allowedRoles: string[],                 // rôles non bloqués
 *    notify: boolean,                        // envoyer la notification ?
 *    notifyScope: "ALL" | "ROLES" | "USERS", // ciblage
 *    notifyRoles: string[], notifyUserIds: string[]
 *  }
 */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const payload = guard.payload!;

  try {
    const body = await req.json();

    const isMaintenance: boolean = Boolean(body.maintenanceMode ?? body.enabled);
    const severity = normalizeSeverity(body.severity ?? (isMaintenance ? "URGENT" : "SUCCESS"));
    const startsAt = parseDate(body.startsAt) ?? (isMaintenance ? new Date() : null);
    const endsAt = parseDate(body.endsAt ?? body.maintenanceUntil);
    const durationMin = durationMinutes(startsAt, endsAt);
    const durationLabel = formatDuration(durationMin);

    const scopes: string[] = Array.isArray(body.scopes) ? body.scopes.filter(Boolean) : [];
    const allowedRoles: string[] = Array.isArray(body.allowedRoles)
      ? body.allowedRoles.filter(Boolean)
      : ["ADMIN"];

    const title: string =
      String(body.title ?? "").trim() ||
      (isMaintenance ? "Maintenance planifiée de la plateforme" : "Plateforme de nouveau en ligne");

    const message: string =
      String(body.message ?? "").trim() ||
      (isMaintenance
        ? `La plateforme est momentanément indisponible pour maintenance technique.${
            durationLabel ? ` Durée estimée : ${durationLabel}.` : ""
          }${
            endsAt
              ? ` Retour prévu le ${endsAt.toLocaleString("fr-FR", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}.`
              : ""
          }`
        : "La maintenance est terminée. Tous les services sont de nouveau opérationnels. Merci de votre patience.");

    // 1. Persistance de l'état + des détails
    const data: Record<string, unknown> = {
      maintenanceMode: isMaintenance,
      maintenanceUntil: isMaintenance ? endsAt : null,
      maintenanceTitle: isMaintenance ? title : null,
      maintenanceMessage: isMaintenance ? message : null,
      maintenanceSeverity: severity,
      maintenanceStartsAt: isMaintenance ? startsAt : null,
      maintenanceScopes: isMaintenance ? scopes : [],
      maintenanceAllowedRoles: allowedRoles.length ? allowedRoles : ["ADMIN"],
    };

    try {
      await prisma.systemConfig.upsert({
        where: { id: CONFIG_ID },
        update: data as any,
        create: { id: CONFIG_ID, ...(data as any) },
      });
    } catch (err) {
      console.log("[v0] systemConfig maintenance update failed:", (err as Error)?.message);
    }

    // 1bis. Propagation immédiate : le cache mémoire de `getMaintenanceState()`
    // (TTL 5s) ne doit pas retarder l'effet de l'activation, et surtout, les
    // utilisateurs déjà connectés doivent être déconnectés tout de suite plutôt
    // que d'attendre l'expiration naturelle de leur token (jusqu'à 15 min).
    // On révoque toutes les sessions actives des rôles non autorisés — ADMIN
    // reste toujours connecté pour pouvoir désactiver la maintenance ensuite.
    invalidateMaintenanceCache();
    let revokedSessions = 0;
    if (isMaintenance) {
      revokedSessions = await revokeSessionsForMaintenance(allowedRoles);
    }

    // 2. Désactivation des anciennes bannières de maintenance
    try {
      const client = prisma as any;
      if (client?.broadcast) {
        await client.broadcast.updateMany({
          where: { category: "MAINTENANCE", active: true },
          data: { active: false },
        });
      }
    } catch (err) {
      console.log("[v0] broadcast cleanup skipped:", (err as Error)?.message);
    }

    // 3. Diffusion de la notification
    let broadcast: Awaited<ReturnType<typeof sendBroadcast>> | null = null;
    if (body.notify !== false) {
      broadcast = await sendBroadcast({
        title,
        message,
        severity,
        category: "MAINTENANCE",
        scope: body.notifyScope ?? "ALL",
        roles: body.notifyRoles,
        userIds: body.notifyUserIds,
        startsAt,
        endsAt,
        details: {
          maintenance: isMaintenance,
          services: scopes,
          durationLabel: durationLabel ?? undefined,
          allowedRoles,
        },
        active: isMaintenance,
        createdById: payload.id,
        createdByName: payload.username ?? "Administrateur",
      });

      if (broadcast.broadcastId) {
        try {
          await prisma.systemConfig.update({
            where: { id: CONFIG_ID },
            data: { maintenanceBroadcastId: broadcast.broadcastId } as any,
          });
        } catch {
          /* champ optionnel : on ignore */
        }
      }
    }

    // 4. Cookie utilisé par le proxy pour rediriger vers /maintenance
    const response = NextResponse.json({
      success: true,
      maintenanceMode: isMaintenance,
      title,
      message,
      severity,
      startsAt: startsAt?.toISOString() ?? null,
      endsAt: endsAt?.toISOString() ?? null,
      durationMin,
      durationLabel,
      scopes,
      allowedRoles,
      notified: broadcast?.recipientCount ?? 0,
      broadcastId: broadcast?.broadcastId ?? null,
      broadcastError: broadcast?.error ?? null,
      revokedSessions,
    });

    if (isMaintenance) {
      response.cookies.set("maintenance_mode", "true", {
        path: "/",
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
      });
    } else {
      response.cookies.delete("maintenance_mode");
    }

    return response;
  } catch (error) {
    console.error("[v0] MAINTENANCE_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
