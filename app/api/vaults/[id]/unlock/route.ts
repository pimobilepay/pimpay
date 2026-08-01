/**
 * GET  /api/vaults/[id]/unlock — Simulation du déblocage (pénalité éventuelle).
 * POST /api/vaults/[id]/unlock — Rapatrie les fonds vers le portefeuille.
 *
 * Un déblocage avant `lockUntil` retient `penaltyRate` % du montant. Le GET
 * permet à l'UI d'annoncer la retenue exacte avant confirmation.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  postSavingsMovement,
  assertPin,
  isVaultLocked,
  earlyPenalty,
  parseAmount,
  buildReference,
  round2,
  SavingsError,
} from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseIdempotencyKey,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

async function loadVault(userId: string, id: string) {
  const vault = await prisma.vault.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      currency: true,
      name: true,
      amount: true,
      lockUntil: true,
      penaltyRate: true,
    },
  });
  if (!vault) throw new SavingsError("Coffre-fort introuvable.", 404);
  if (vault.status === "CLOSED") throw new SavingsError("Ce coffre est clôturé.");
  return vault;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const vault = await loadVault(userId, id);

    const locked = isVaultLocked(vault);
    const penalty = locked ? earlyPenalty(vault.amount, vault.penaltyRate) : 0;

    return NextResponse.json({
      amount: round2(vault.amount),
      penalty,
      penaltyRate: locked ? vault.penaltyRate : 0,
      netAmount: round2(vault.amount - penalty),
      currency: vault.currency,
      isLocked: locked,
      lockUntil: vault.lockUntil?.toISOString() ?? null,
    });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await readJson(req);

    const vault = await loadVault(userId, id);
    await assertPin(userId, body.pin);

    // Par défaut on vide le coffre ; un montant partiel reste possible.
    const requested = body.amount === undefined || body.amount === null || body.amount === ""
      ? round2(vault.amount)
      : parseAmount(body.amount);

    if (requested <= 0) throw new SavingsError("Ce coffre est vide.");
    if (requested > round2(vault.amount)) {
      throw new SavingsError("Le montant demandé dépasse le solde du coffre.");
    }

    const locked = isVaultLocked(vault);
    const penalty = locked ? earlyPenalty(requested, vault.penaltyRate) : 0;
    const emptiesVault = requested >= round2(vault.amount);

    const result = await postSavingsMovement({
      userId,
      target: { kind: "vault", id: vault.id },
      direction: "OUT",
      amount: requested,
      penalty,
      txType: penalty > 0 ? "PENALTY" : "WITHDRAWAL",
      currency: vault.currency,
      description: `Déblocage coffre-fort — ${vault.name}`,
      note: locked
        ? `Déblocage anticipé, pénalité de ${vault.penaltyRate}% retenue.`
        : "Déblocage du coffre-fort à échéance.",
      reference: buildReference("VUL", parseIdempotencyKey(body.idempotencyKey)),
      // Le coffre n'est marqué UNLOCKED que s'il est effectivement vidé.
      newStatus: emptiesVault ? "UNLOCKED" : undefined,
    });

    return NextResponse.json({ success: true, wasLocked: locked, ...result });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
