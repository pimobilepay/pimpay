/**
 * POST /api/savings/[id]/deposit — Alimente un compte épargne depuis le portefeuille.
 *
 * Mouvement entrant : aucun PIN requis (l'argent reste chez l'utilisateur et
 * devient moins liquide, le risque est nul).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  postSavingsMovement,
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
      select: { id: true, status: true, currency: true, name: true },
    });
    if (!account) throw new SavingsError("Compte épargne introuvable.", 404);

    if (account.status === "FROZEN") {
      throw new SavingsError("Ce compte est gelé. Contactez le support.", 403);
    }
    if (account.status === "CLOSED") {
      throw new SavingsError("Ce compte est clôturé.");
    }

    const amount = parseAmount(body.amount);

    const result = await postSavingsMovement({
      userId,
      target: { kind: "savings", id: account.id },
      direction: "IN",
      amount,
      txType: "DEPOSIT",
      currency: account.currency,
      description: `Dépôt épargne — ${account.name ?? "Compte épargne"}`,
      note: typeof body.note === "string" ? body.note.slice(0, 140) : null,
      reference: buildReference("SVD", parseIdempotencyKey(body.idempotencyKey)),
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
