export const dynamic = "force-dynamic";

// CORRECTION : On importe depuis 'next/server'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { paymentId, txid } = await req.json();

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    // 1. On cherche la transaction correspondante dans Pimpay
    const transaction = await prisma.transaction.findUnique({
      where: { reference: paymentId },
      include: { fromUser: true }
    });

    if (!transaction || !transaction.fromUserId) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // 2. TRANSACTION ATOMIQUE : On finalise tout d'un coup
    const result = await prisma.$transaction(async (tx) => {
      // a. Mettre à jour la transaction
      const updatedTx = await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: "COMPLETED",
          blockchainTx: txid,
          metadata: {
            ...(transaction.metadata as object),
            completedAt: new Date().toISOString(),
            txid: txid
          }
        }
      });

      // b. Mettre à jour le Wallet de l'utilisateur (on débite s'il s'agit d'un paiement vers l'app)
      // Note : Adapte 'decrement' ou 'increment' selon si c'est un achat ou un dépôt
      const wallet = await tx.wallet.update({
        where: {
          userId_currency: {
            userId: transaction.fromUserId!,
            currency: "PI"
          }
        },
        data: {
          balance: {
            decrement: transaction.amount // On retire le montant payé
          }
        }
      });

      return { updatedTx, wallet };
    });

    return NextResponse.json({ 
      success: true, 
      balance: result.wallet.balance 
    });

  } catch (error: any) {
    console.error("PI_COMPLETE_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Erreur lors de la finalisation" }, { status: 500 });
  }
}
