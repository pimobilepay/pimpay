export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuthPayload } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  resolveUserLimits,
  maxPerTransaction,
  DEFAULT_LIMITS,
  isKycVerifiedStatus,
  LIMIT_CHANNELS,
  type LimitChannel,
} from "@/lib/limits-policy";

/**
 * GET /api/user/limits?channel=WITHDRAW
 *
 * Renvoie les plafonds RÉELLEMENT applicables à l'utilisateur connecté, en
 * tenant compte des politiques admin (globales, par rôle, ou exceptions
 * individuelles). Les pages retrait / wallet / transfer / mpay consomment cette
 * route au lieu de coder les valeurs en dur.
 */
export async function GET(req: Request) {
  try {
    const payload = await getAuthPayload();
    if (!payload) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const raw = new URL(req.url).searchParams.get("channel")?.toUpperCase();
    const channel = (LIMIT_CHANNELS as readonly string[]).includes(raw ?? "")
      ? (raw as LimitChannel)
      : undefined;

    let role: string | null = payload.role ?? null;
    let kycStatus: string | null = null;
    try {
      const user = await prisma.user.findUnique({
        where: { id: payload.id },
        select: { role: true, kycStatus: true },
      });
      role = user?.role ?? role;
      kycStatus = user?.kycStatus ?? null;
    } catch {
      /* on continue avec les valeurs par défaut */
    }

    const limits = await resolveUserLimits({ userId: payload.id, role, kycStatus, channel });
    const verified = isKycVerifiedStatus(kycStatus);
    const maxPerTx = maxPerTransaction(limits);

    return NextResponse.json({
      channel: channel ?? null,
      verified,
      kycStatus,
      role,
      /** Plafond effectif par transaction pour CE compte. */
      maxPerTx,
      /** Plafond sans KYC (franchise). */
      kycFreeLimitPi: limits.kycFreeLimitPi,
      /** Plafond par transaction une fois le KYC validé. */
      kycMaxPerTxPi: limits.kycMaxPerTxPi,
      adminApprovalThresholdPi: limits.adminApprovalThresholdPi,
      maxPerDay: limits.maxPerDay,
      dailyTotalPi: limits.dailyTotalPi,
      minPerTxPi: limits.minPerTxPi,
      /** Exception admin : ce compte n'est pas soumis à l'obligation de KYC. */
      bypassKyc: limits.bypassKyc,
      /** true si le KYC bloque encore ce compte. */
      kycRequired: !verified && !limits.bypassKyc,
      /** Politiques admin appliquées (traçabilité). */
      appliedPolicies: limits.applied,
      usingDefaults: limits.usingDefaults,
    });
  } catch (error) {
    console.error("[v0] USER_LIMITS_ERROR:", error);
    // Filet de sécurité : jamais d'écran cassé côté client.
    return NextResponse.json({
      ...DEFAULT_LIMITS,
      maxPerTx: DEFAULT_LIMITS.kycFreeLimitPi,
      verified: false,
      kycRequired: true,
      appliedPolicies: [],
      usingDefaults: true,
    });
  }
}
