import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URLSearchParams(req.url.split('?')[1]);
    const ref = searchParams.get("ref");
    const txid = searchParams.get("txid");

    if (!ref && !txid) {
      return NextResponse.json({ error: "Référence manquante" }, { status: 400 });
    }

    // 1. Trouver la transaction
    const transaction = await prisma.transaction.findFirst({
      where: {
        OR: [
          { reference: ref || undefined },
          { blockchainTx: txid || undefined },
          { externalId: txid || undefined }
        ]
      },
      include: { toWallet: true }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // 2. Si elle est en PENDING, on la passe en SUCCESS (Validation du dépôt)
    if (transaction.status === TransactionStatus.PENDING) {
      const updatedTx = await prisma.$transaction(async (tx) => {
        // Mettre à jour la transaction
        const t = await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.SUCCESS },
        });

        // Créditer le Wallet du destinataire (si c'est un dépôt)
        if (t.toWalletId) {
          await tx.wallet.update({
            where: { id: t.toWalletId },
            data: { balance: { increment: t.amount } }
          });
        }
        return t;
      }, { timeout: 15000 });

      return NextResponse.json(updatedTx);
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("Détails Error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
