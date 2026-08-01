/**
 * POST /api/savings/[id]/withdraw — Retrait partiel vers le portefeuille.
 *
 * Mouvement sortant : PIN obligatoire. Un dépôt à terme non échu est refusé
 * par `assertSavingsWithdrawable` (il faut passer par la clôture anticipée).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  postSavingsMovement,
  assertSavingsWithdrawable,
  assertPin,
  parseAmount,
  buildReference,
  SavingsError,
} from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseIdempotencyKey,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const body = await readJson(req);

    const account = await prisma.savingsAccount.findFirst({
      where: { id, userId },
      select: {
        id: true,
        status: true,
        currency: true,
        name: true,
        type: true,
        maturityDate: true,
      },
    });
    if (!account) throw new SavingsError("Compte épargne introuvable.", 404);

    const amount = parseAmount(body.amount);

    // Ordre volontaire : on valide le PIN avant toute règle métier pour ne pas
    // divulguer d'information sur le compte à un appelant non authentifié.
    await assertPin(userId, body.pin);
    assertSavingsWithdrawable(account);

    const result = await postSavingsMovement({
      userId,
      target: { kind: "savings", id: account.id },
      direction: "OUT",
      amount,
      txType: "WITHDRAWAL",
      currency: account.currency,
      description: `Retrait épargne — ${account.name ?? "Compte épargne"}`,
      note: typeof body.note === "string" ? body.note.slice(0, 140) : null,
      reference: buildReference("SVW", parseIdempotencyKey(body.idempotencyKey)),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
