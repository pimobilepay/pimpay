/**
 * GET   /api/admin/savings/rates — Grille des taux d'intérêt configurés.
 * POST  /api/admin/savings/rates — Crée ou met à jour le barème d'un couple (type, devise).
 * PATCH /api/admin/savings/rates — Active ou désactive une ligne de barème.
 *
 * `resolveInterestRate` (lib/savings.ts) lit la ligne active la plus récente
 * pour un couple (type, devise) et retombe sur `FALLBACK_RATES` si aucune
 * n'existe. On évite donc de dupliquer les lignes : POST met à jour la ligne
 * existante du couple plutôt que d'en empiler une nouvelle.
 *
 * Le taux n'est appliqué qu'aux produits ouverts APRÈS la modification : les
 * comptes existants conservent le taux figé à leur ouverture, ce que l'UI
 * indique explicitement.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission, PERMISSIONS } from "@/lib/permissions";
import { logAdminAction } from "@/lib/adminAudit";
import { FALLBACK_RATES } from "@/lib/savings";
import { SAVINGS_TYPES } from "@/lib/savings-http";
import { SUPPORTED_CURRENCIES } from "@/lib/validators";

/** Borne haute de sécurité : au-delà, c'est une erreur de saisie. */
const MAX_RATE = 50;

export async function GET(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.SAVINGS_VIEW);
  if (ctx instanceof NextResponse) return ctx;

  const rates = await prisma.interestRate.findMany({
    orderBy: [{ currency: "asc" }, { type: "asc" }],
  });

  return NextResponse.json({
    rates,
    // Référentiels exposés pour que l'UI n'ait pas à les redéclarer.
    types: SAVINGS_TYPES,
    currencies: SUPPORTED_CURRENCIES,
    fallbackRates: FALLBACK_RATES,
    canManage: ctx.isSuperAdmin || ctx.permissions.includes(PERMISSIONS.SAVINGS_MANAGE),
  });
}

/** Valide et normalise le corps d'un barème. */
function parseRateBody(body: Record<string, unknown>):
  | { ok: true; type: string; currency: string; minRate: number; maxRate: number; defaultRate: number }
  | { ok: false; error: string } {
  const type = String(body.type ?? "").toUpperCase().trim();
  if (!SAVINGS_TYPES.includes(type as (typeof SAVINGS_TYPES)[number])) {
    return { ok: false, error: `Type invalide. Valeurs acceptées : ${SAVINGS_TYPES.join(", ")}.` };
  }

  const currency = String(body.currency ?? "").toUpperCase().trim();
  if (!SUPPORTED_CURRENCIES.includes(currency as (typeof SUPPORTED_CURRENCIES)[number])) {
    return {
      ok: false,
      error: `Devise invalide. Valeurs acceptées : ${SUPPORTED_CURRENCIES.join(", ")}.`,
    };
  }

  const minRate = Number(body.minRate);
  const maxRate = Number(body.maxRate);
  const defaultRate = Number(body.defaultRate);

  for (const [label, value] of [
    ["Le taux minimum", minRate],
    ["Le taux maximum", maxRate],
    ["Le taux par défaut", defaultRate],
  ] as const) {
    if (!Number.isFinite(value) || value < 0 || value > MAX_RATE) {
      return { ok: false, error: `${label} doit être un nombre entre 0 et ${MAX_RATE}.` };
    }
  }

  if (minRate > maxRate) {
    return { ok: false, error: "Le taux minimum ne peut dépasser le taux maximum." };
  }
  if (defaultRate < minRate || defaultRate > maxRate) {
    return { ok: false, error: "Le taux par défaut doit se situer entre le minimum et le maximum." };
  }

  return { ok: true, type, currency, minRate, maxRate, defaultRate };
}

export async function POST(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.SAVINGS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = parseRateBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { type, currency, minRate, maxRate, defaultRate } = parsed;

  // Pas de contrainte unique en base sur (type, currency) : on cherche puis on
  // met à jour, afin de ne pas empiler des barèmes concurrents.
  const existing = await prisma.interestRate.findFirst({
    where: { type, currency },
    orderBy: { updatedAt: "desc" },
  });

  const rate = existing
    ? await prisma.interestRate.update({
        where: { id: existing.id },
        data: { minRate, maxRate, defaultRate, isActive: true },
      })
    : await prisma.interestRate.create({
        data: { type, currency, minRate, maxRate, defaultRate, isActive: true },
      });

  await logAdminAction(req, ctx.payload, {
    action: existing ? "SAVINGS_RATE_UPDATE" : "SAVINGS_RATE_CREATE",
    category: "finance",
    targetId: rate.id,
    targetType: "interestRate",
    details: `Barème ${type}/${currency} — défaut ${defaultRate}% (plage ${minRate}–${maxRate}%)`,
  });

  return NextResponse.json({ ok: true, rate });
}

export async function PATCH(req: NextRequest) {
  const ctx = await requirePermission(req, PERMISSIONS.SAVINGS_MANAGE);
  if (ctx instanceof NextResponse) return ctx;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Identifiant requis." }, { status: 400 });
  if (typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "Le champ « isActive » (booléen) est requis." },
      { status: 400 }
    );
  }

  const existing = await prisma.interestRate.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Barème introuvable." }, { status: 404 });

  const rate = await prisma.interestRate.update({
    where: { id },
    data: { isActive: body.isActive },
  });

  await logAdminAction(req, ctx.payload, {
    action: "SAVINGS_RATE_TOGGLE",
    category: "finance",
    targetId: rate.id,
    targetType: "interestRate",
    details: `Barème ${rate.type}/${rate.currency} ${body.isActive ? "activé" : "désactivé"}`,
  });

  return NextResponse.json({ ok: true, rate });
}
