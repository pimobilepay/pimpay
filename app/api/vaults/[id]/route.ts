/**
 * GET   /api/vaults/[id] — Détail d'un coffre + historique.
 * PATCH /api/vaults/[id] — Renomme / ajuste l'objectif.
 *
 * La date de déverrouillage n'est volontairement pas modifiable : pouvoir la
 * repousser ou l'avancer viderait le verrou de tout sens.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { serializeVault, SavingsError } from "@/lib/savings";
import {
  requireUserId,
  readJson,
  parseName,
  parseOptionalTarget,
  savingsErrorResponse,
} from "@/lib/savings-http";

export const dynamic = "force-dynamic";

async function findOwnedVault(userId: string, id: string) {
  const vault = await prisma.vault.findFirst({ where: { id, userId } });
  if (!vault) throw new SavingsError("Coffre-fort introuvable.", 404);
  return vault;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const vault = await findOwnedVault(userId, id);

    const transactions = await prisma.vaultTransaction.findMany({
      where: { vaultId: vault.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json({
      vault: serializeVault(vault),
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
    const vault = await findOwnedVault(userId, id);

    if (vault.status === "CLOSED") {
      throw new SavingsError("Ce coffre est clôturé et ne peut plus être modifié.");
    }

    const body = await readJson(req);
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = parseName(body.name, vault.name);
    if (body.targetAmount !== undefined) data.targetAmount = parseOptionalTarget(body.targetAmount);

    if (Object.keys(data).length === 0) {
      throw new SavingsError("Aucune modification fournie.");
    }

    const updated = await prisma.vault.update({ where: { id: vault.id }, data });
    return NextResponse.json({ vault: serializeVault(updated) });
  } catch (error) {
    return savingsErrorResponse(error);
  }
}
