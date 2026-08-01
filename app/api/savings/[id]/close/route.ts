/**
 * GET  /api/savings/[id]/close — Simulation : ce que la clôture rapporterait.
 * POST /api/savings/[id]/close — Clôture le compte et rapatrie le solde.
 *
 * Un dépôt à terme clôturé avant maturité subit une pénalité. Le GET existe
 * pour que l'UI puisse afficher le montant exact avant confirmation, plutôt
 * que de laisser l'utilisateur découvrir la retenue après coup.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  postSavingsMovement,
  assertPin,
  earlyPenalty,
  buildReference,
  round2,
  DEFAULT_PENALTY_RATE,
  SavingsError,
} from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseIdempotencyKey,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

type ClosableAccount = {
  id: string;
  status: string;
  currency: string;
  name: string | null;
  type: string;
  balance: number;
  maturityDate: Date | null;
};

async function loadClosable(userId: string, id: string): Promise<ClosableAccount> {
  const account = await prisma.savingsAccount.findFirst({
    where: { id, userId },
    select: {
      id: true,
      status: true,
      currency: true,
      name: true,
      type: true,
      balance: true,
      maturityDate: true,
    },
  });
  if (!account) throw new SavingsError("Compte épargne introuvable.", 404);
  if (account.status === "CLOSED") throw new SavingsError("Ce compte est déjà clôturé.");
  if (account.status === "FROZEN") {
    throw new SavingsError("Ce compte est gelé. Contactez le support.", 403);
  }
  return account;
}

/** Pénalité de clôture anticipée, uniquement sur un dépôt à terme non échu. */
function closurePenalty(account: ClosableAccount, now = new Date()): number {
  const isEarly =
    account.type === "FIXED_DEPOSIT" && !!account.maturityDate && now < account.maturityDate;
  return isEarly ? earlyPenalty(account.balance, DEFAULT_PENALTY_RATE) : 0;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const account = await loadClosable(userId, id);

    const penalty = closurePenalty(account);
    return NextResponse.json({
      balance: round2(account.balance),
      penalty,
      penaltyRate: penalty > 0 ? DEFAULT_PENALTY_RATE : 0,
      netAmount: round2(account.balance - penalty),
      currency: account.currency,
      isEarly: penalty > 0,
      maturityDate: account.maturityDate?.toISOString() ?? null,
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

    const account = await loadClosable(userId, id);
    await assertPin(userId, body.pin);

    const balance = round2(account.balance);

    // Compte vide : rien à déplacer, on se contente de le fermer.
    if (balance <= 0) {
      await prisma.savingsAccount.update({
        where: { id: account.id },
        data: { status: "CLOSED" },
      });
      return NextResponse.json({
        success: true,
        amount: 0,
        penalty: 0,
        netAmount: 0,
        closed: true,
      });
    }

    const penalty = closurePenalty(account);

    const result = await postSavingsMovement({
      userId,
      target: { kind: "savings", id: account.id },
      direction: "OUT",
      amount: balance,
      penalty,
      txType: penalty > 0 ? "PENALTY" : "WITHDRAWAL",
      currency: account.currency,
      description: `Clôture épargne — ${account.name ?? "Compte épargne"}`,
      note:
        penalty > 0
          ? `Clôture anticipée, pénalité de ${DEFAULT_PENALTY_RATE}% retenue.`
          : "Clôture du compte épargne.",
      reference: buildReference("SVC", parseIdempotencyKey(body.idempotencyKey)),
      newStatus: "CLOSED",
    });

    return NextResponse.json({ success: true, closed: true, ...result });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
