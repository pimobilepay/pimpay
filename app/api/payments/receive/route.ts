export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { TransactionStatus, TransactionType, WalletType } from "@prisma/client";

export async function POST(request: Request) {
  try {
    const user = await auth();
    if (!user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const body = await request.json();
    const { paymentId, amount, memo } = body;

    if (!paymentId || !amount) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    // Verifier si le paiement existe deja
    const existingPayment = await prisma.transaction.findFirst({
      where: { externalId: paymentId }
    });

    if (existingPayment) {
      return NextResponse.json({ error: "Paiement deja traite" }, { status: 400 });
    }

    const finalAmount = parseFloat(amount);

    // Transaction atomique : creer la transaction + crediter le wallet
    const result = await prisma.$transaction(async (tx) => {
      // Creer la transaction approuvee automatiquement
      const transaction = await tx.transaction.create({
        data: {
          reference: `RCV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
          toUserId: user.id,
          type: TransactionType.DEPOSIT,
          currency: "PI",
          amount: finalAmount,
          status: TransactionStatus.SUCCESS,
          externalId: paymentId,
          description: memo || "Paiement Pi Network (Automatique)",
          metadata: {
            paymentType: "receive_request",
            requestedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          }
        }
      });

      // Crediter le wallet PI immediatement avec upsert
      await tx.wallet.upsert({
        where: { userId_currency: { userId: user.id, currency: "PI" } },
        update: { balance: { increment: finalAmount } },
        create: {
          userId: user.id,
          currency: "PI",
          balance: finalAmount,
          type: WalletType.PI,
        }
      });

      return transaction;
    }, { maxWait: 10000, timeout: 30000 });

    // Notification de confirmation
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Paiement recu !",
        message: `Votre compte a ete credite de ${finalAmount} PI.`,
        type: "SUCCESS"
      }
    });

    return NextResponse.json({
      success: true,
      transactionId: result.id,
      paymentId,
      message: "Paiement approuve et credite"
    });

  } catch (error: any) {
    console.error("[RECEIVE-PAYMENT] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
