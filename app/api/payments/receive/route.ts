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
    const { paymentId, amount, memo } = body;

    if (!paymentId || !amount) {
      return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
    }

    console.log(`[RECEIVE-PAYMENT] User ${user.username} requesting payment: ${amount} π`);

    // Vérifier si le paiement existe déjà
    const existingPayment = await prisma.transaction.findFirst({
      where: { externalId: paymentId }
    });

    if (existingPayment) {
      return NextResponse.json({ error: "Paiement déjà traité" }, { status: 400 });
    }

    const finalAmount = parseFloat(amount);

    // Créer la transaction approuvée automatiquement
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        currency: "PI",
        amount: finalAmount,
        status: "SUCCESS",
        externalId: paymentId,
        description: memo || "Paiement Pi Network (Automatique)",
        metadata: {
          paymentType: "receive_request",
          requestedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        }
      }
    });

    // Créditer le wallet PI immédiatement
    const piWallet = await prisma.wallet.findFirst({
      where: { userId: user.id, currency: "PI" }
    });

    if (piWallet) {
      await prisma.wallet.update({
        where: { id: piWallet.id },
        data: { balance: { increment: finalAmount } }
      });
    }

    // Notification de confirmation
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: "Paiement recu !",
        message: `Votre compte a été crédité de ${finalAmount} PI.`,
        type: "SUCCESS"
      }
    });

    console.log(`[RECEIVE-PAYMENT] Transaction completed: ${transaction.id}`);

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      paymentId,
      message: "Paiement approuvé et crédité"
    });

  } catch (error: any) {
    console.error("[RECEIVE-PAYMENT] Error:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error.message },
      { status: 500 }
    );
  }
}
