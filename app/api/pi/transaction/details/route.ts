import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ref = searchParams.get("ref");
    const txid = searchParams.get("txid");

    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { reference: ref || undefined },
          { blockchainTx: txid || undefined }
        ]
      }
    });

    if (!transaction) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

    // Si PENDING, on valide et on renvoie la version mise à jour
    if (transaction.status === TransactionStatus.PENDING) {
      const validatedTx = await prisma.$transaction(async (tx) => {
        // 1. Update status
        const updated = await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.SUCCESS }
        });

        // 2. Créditer le wallet (si dépôt)
        if (updated.toWalletId) {
          await tx.wallet.update({
            where: { id: updated.toWalletId },
            data: { balance: { increment: updated.amount } }
          });
        }
        return updated;
      }, { maxWait: 10000, timeout: 30000 });
      return NextResponse.json(validatedTx);
    }

    return NextResponse.json(transaction);
  } catch (error) {
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
