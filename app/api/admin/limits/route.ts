export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  invalidateLimitPolicyCache,
  resolveUserLimits,
  DEFAULT_LIMITS,
  LIMIT_CHANNELS,
  LIMIT_SCOPES,
  LIMIT_KYC_TIERS,
  LIMIT_ROLES,
} from "@/lib/limits-policy";

async function requireAdmin() {
  const payload = await getAuthPayload();
  if (!payload) return { error: NextResponse.json({ error: "Non autorisé" }, { status: 401 }) };
  if (payload.role !== "ADMIN")
    return { error: NextResponse.json({ error: "Accès refusé" }, { status: 403 }) };
  return { payload };
}

/** Nombre optionnel : "" et null => null (hérite), sinon Number. */
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function int(value: unknown): number | null {
  const n = num(value);
  return n === null ? null : Math.round(n);
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function buildData(body: any) {
  const scope = String(body.scope ?? "ALL").toUpperCase();
  return {
    name: String(body.name ?? "").trim(),
    description: body.description ? String(body.description) : null,
    scope,
    roles: scope === "ROLES" ? (body.roles ?? []).filter(Boolean) : [],
    userIds: scope === "USERS" ? (body.userIds ?? []).filter(Boolean) : [],
    kycTier: String(body.kycTier ?? "ALL").toUpperCase(),
    channels: Array.isArray(body.channels) ? body.channels.filter(Boolean) : [],
    kycFreeLimitPi: num(body.kycFreeLimitPi),
    kycMaxPerTxPi: num(body.kycMaxPerTxPi),
    adminApprovalThresholdPi: num(body.adminApprovalThresholdPi),
    maxPerDay: int(body.maxPerDay),
    dailyTotalPi: num(body.dailyTotalPi),
    minPerTxPi: num(body.minPerTxPi),
    bypassKyc: body.bypassKyc === null || body.bypassKyc === undefined ? null : Boolean(body.bypassKyc),
    priority: int(body.priority) ?? 0,
    active: body.active === undefined ? true : Boolean(body.active),
    startsAt: parseDate(body.startsAt),
    endsAt: parseDate(body.endsAt),
  };
}

/** GET — liste des politiques + métadonnées du formulaire. */
export async function GET() {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const client = prisma as any;
    const policies = client?.limitPolicy
      ? await client.limitPolicy.findMany({
          orderBy: [{ scope: "asc" }, { priority: "asc" }, { createdAt: "desc" }],
        })
      : [];

    // Noms des utilisateurs ciblés, pour un affichage lisible dans l'UI.
    const targetedIds = Array.from(
      new Set((policies as any[]).flatMap((p) => p.userIds ?? []))
    ) as string[];
    let users: { id: string; username: string | null; role: string | null }[] = [];
    if (targetedIds.length) {
      users = (await prisma.user.findMany({
        where: { id: { in: targetedIds } },
        select: { id: true, username: true, role: true },
      })) as any;
    }

    return NextResponse.json({
      policies,
      users,
      defaults: DEFAULT_LIMITS,
      meta: {
        channels: LIMIT_CHANNELS,
        scopes: LIMIT_SCOPES,
        kycTiers: LIMIT_KYC_TIERS,
        roles: LIMIT_ROLES,
      },
    });
  } catch (error) {
    console.error("[v0] LIMITS_GET_ERROR:", error);
    return NextResponse.json({ policies: [], users: [], defaults: DEFAULT_LIMITS, meta: null });
  }
}

/** POST — crée une politique, ou simule la résolution (?simulate). */
export async function POST(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;
  const payload = guard.payload!;

  try {
    const body = await req.json();

    // Simulation : "quels plafonds verrait cet utilisateur ?"
    if (body.simulateUserId) {
      const resolved = await resolveUserLimits({
        userId: String(body.simulateUserId),
        channel: body.channel,
      });
      return NextResponse.json({ simulation: resolved });
    }

    const data = buildData(body);
    if (!data.name) return NextResponse.json({ error: "Nom obligatoire" }, { status: 400 });
    if (data.scope === "ROLES" && !data.roles.length)
      return NextResponse.json({ error: "Sélectionnez au moins un rôle" }, { status: 400 });
    if (data.scope === "USERS" && !data.userIds.length)
      return NextResponse.json({ error: "Sélectionnez au moins un utilisateur" }, { status: 400 });

    const client = prisma as any;
    if (!client?.limitPolicy)
      return NextResponse.json({ error: "Table LimitPolicy indisponible" }, { status: 503 });

    const policy = await client.limitPolicy.create({
      data: { ...data, createdById: payload.id },
    });
    invalidateLimitPolicyCache();
    return NextResponse.json({ success: true, policy });
  } catch (error) {
    console.error("[v0] LIMITS_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** PATCH — met à jour une politique (ou bascule seulement `active`). */
export async function PATCH(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const body = await req.json();
    const id = String(body.id ?? "");
    if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

    const client = prisma as any;
    if (!client?.limitPolicy)
      return NextResponse.json({ error: "Table LimitPolicy indisponible" }, { status: 503 });

    // Bascule rapide activé / désactivé
    const data =
      Object.keys(body).length === 2 && body.active !== undefined
        ? { active: Boolean(body.active) }
        : buildData(body);

    const policy = await client.limitPolicy.update({ where: { id }, data });
    invalidateLimitPolicyCache();
    return NextResponse.json({ success: true, policy });
  } catch (error) {
    console.error("[v0] LIMITS_PATCH_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/** DELETE — supprime une politique. */
export async function DELETE(req: Request) {
  const guard = await requireAdmin();
  if (guard.error) return guard.error;

  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Identifiant manquant" }, { status: 400 });

    const client = prisma as any;
    if (!client?.limitPolicy)
      return NextResponse.json({ error: "Table LimitPolicy indisponible" }, { status: 503 });

    await client.limitPolicy.delete({ where: { id } });
    invalidateLimitPolicyCache();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[v0] LIMITS_DELETE_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
