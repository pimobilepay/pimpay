/**
 * GET   /api/savings/[id] — Détail d'un compte épargne + historique.
 * PATCH /api/savings/[id] — Renomme / ajuste objectif et versement programmé.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeSavings, SavingsError } from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseName,
  parseOptionalTarget,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

/** Toujours filtrer par `userId` : un id seul ne prouve pas la propriété. */
async function findOwnedAccount(userId: string, id: string) {
  const account = await prisma.savingsAccount.findFirst({ where: { id, userId } });
  if (!account) throw new SavingsError("Compte épargne introuvable.", 404);
  return account;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const account = await findOwnedAccount(userId, id);

    const transactions = await prisma.savingsTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      account: serializeSavings(account),
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        penalty: t.penalty,
        balance: t.balance,
        currency: t.currency,
        reference: t.reference,
        note: t.note,
        createdAt: t.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const account = await findOwnedAccount(userId, id);

    if (account.status === "CLOSED") {
      throw new SavingsError("Ce compte est clôturé et ne peut plus être modifié.");
    }
    if (account.status === "FROZEN") {
      throw new SavingsError("Ce compte est gelé. Contactez le support.", 403);
    }

    const body = await readJson(req);
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = parseName(body.name, account.name ?? "Compte épargne");
    if (body.targetAmount !== undefined) data.targetAmount = parseOptionalTarget(body.targetAmount);

    if (body.autoDebitAmount !== undefined) {
      if (account.type !== "RECURRING") {
        throw new SavingsError("Le versement programmé n'est disponible que sur une épargne récurrente.");
      }
      data.autoDebitAmount = parseOptionalTarget(body.autoDebitAmount);
    }
    if (body.autoDebitDay !== undefined) {
      if (account.type !== "RECURRING") {
        throw new SavingsError("Le versement programmé n'est disponible que sur une épargne récurrente.");
      }
      if (body.autoDebitDay === null || body.autoDebitDay === "") {
        data.autoDebitDay = null;
      } else {
        const day = Number(body.autoDebitDay);
        if (!Number.isInteger(day) || day < 1 || day > 28) {
          throw new SavingsError("Le jour de prélèvement doit être un entier entre 1 et 28.");
        }
        data.autoDebitDay = day;
      }
    }

    if (Object.keys(data).length === 0) {
      throw new SavingsError("Aucune modification fournie.");
    }

    const updated = await prisma.savingsAccount.update({ where: { id: account.id }, data });
    return NextResponse.json({ account: serializeSavings(updated) });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
