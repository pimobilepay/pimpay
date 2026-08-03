export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  sendBroadcast,
  resolveRecipients,
  SEVERITIES,
  SEVERITY_META,
  BROADCAST_CATEGORIES,
  BROADCAST_ROLES,
  formatDuration,
} from "@/lib/broadcast";

async function requireAdmin() {
  const payload = await getAuthPayload();
  if (!payload) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  if (payload.role !== "ADMIN")
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { payload };
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** GET — historique des diffusions + métadonnées du formulaire. */
export async function GET(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  const url = new URL(req.url);
  // ?preview=1 => renvoie seulement le nombre de destinataires pour un ciblage
  if (url.searchParams.get("preview")) {
    const scope = (url.searchParams.get("scope") ?? "ALL") as any;
    const roles = (url.searchParams.get("roles") ?? "").split(",").filter(Boolean);
    const userIds = (url.searchParams.get("userIds") ?? "").split(",").filter(Boolean);
    try {
      const recipients = await resolveRecipients({ scope, roles, userIds });
      return NextResponse.json({ recipientCount: recipients.length });
    } catch {
      return NextResponse.json({ recipientCount: 0 });
    }
  }

  try {
    const client = prisma as any;
    const rows = client?.broadcast
      ? await client.broadcast.findMany({ orderBy: { createdAt: "desc" }, take: 50 })
      : [];

    return NextResponse.json({
      broadcasts: (rows as any[]).map((b) => ({
        ...b,
        durationLabel: formatDuration(b.durationMin),
      })),
      meta: {
        severities: SEVERITIES.map((s) => ({ value: s, ...SEVERITY_META[s] })),
        categories: BROADCAST_CATEGORIES,
        roles: BROADCAST_ROLES,
      },
    });
  } catch (error) {
    console.error("[v0] BROADCAST_GET_ERROR:", error);
    return NextResponse.json({ broadcasts: [], meta: null });
  }
}

/** POST — envoie une nouvelle diffusion. */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const payload = guard.payload!;

  try {
    const body = await req.json();

    const title = String(body.title ?? "").trim();
    const message = String(body.message ?? "").trim();
    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message obligatoires" }, { status: 400 });
    }

    const scope = String(body.scope ?? "ALL").toUpperCase();
    if (scope === "ROLES" && !(body.roles ?? []).length) {
      return NextResponse.json({ error: "Sélectionnez au moins un rôle" }, { status: 400 });
    }
    if (scope === "USERS" && !(body.userIds ?? []).length) {
      return NextResponse.json({ error: "Sélectionnez au moins un utilisateur" }, { status: 400 });
    }

    const result = await sendBroadcast({
      title,
      message,
      severity: body.severity,
      category: body.category ?? "ANNOUNCEMENT",
      scope,
      roles: body.roles,
      userIds: body.userIds,
      link: body.link ?? null,
      startsAt: parseDate(body.startsAt),
      endsAt: parseDate(body.endsAt),
      details: body.details ?? null,
      active: body.showBanner !== false,
      createdById: payload.id,
      createdByName: payload.username ?? "Administrateur",
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[v0] BROADCAST_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** PATCH — masque (désactive) une bannière sans supprimer l'historique. */
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const { id, active } = await req.json();
    if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

    const client = prisma as any;
    if (!client?.broadcast) {
      return NextResponse.json({ error: "Table Broadcast indisponible" }, { status: 503 });
    }
    await client.broadcast.update({ where: { id }, data: { active: Boolean(active) } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] BROADCAST_PATCH_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
