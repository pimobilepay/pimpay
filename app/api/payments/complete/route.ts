export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, txid } = body;

    if (!paymentId || !txid) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    console.log(`[COMPLETE-PAYMENT] Completing payment ${paymentId} with txid ${txid}`);

    // Trouver la transaction
    const transaction = await prisma.transaction.findFirst({
      where: { externalId: paymentId }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    if (transaction.status === "COMPLETED" || transaction.status === "SUCCESS") {
      return NextResponse.json({ error: "Transaction déjà complétée" }, { status: 400 });
    }

    // Mettre à jour la transaction
    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "SUCCESS",
        blockchainTx: txid,
        metadata: {
          ...(transaction.metadata as any || {}),
          completedAt: new Date().toISOString(),
          txid
        }
      }
    });

    // Mettre à jour le solde du wallet
    const wallet = await prisma.wallet.findFirst({
      where: {
        userId: user.id,
        currency: "PI"
      }
    });

    if (wallet) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            increment: transaction.amount
          }
        }
      });
    }

    console.log(`[COMPLETE-PAYMENT] Payment completed successfully: ${transaction.amount} π added to user ${user.username}`);

    return NextResponse.json({
      success: true,
      transactionId: updatedTransaction.id,
      amount: updatedTransaction.amount,
      txid,
      message: "Paiement complété avec succès"
    });

  } catch (error: any) {
    console.error("[COMPLETE-PAYMENT] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
