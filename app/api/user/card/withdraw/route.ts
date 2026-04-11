export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { sendNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  try {
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorise" }, { status: 401 });

    let userId: string;
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
      userId = payload.id as string;
    } catch {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { cardId, amount, currency } = body;

    if (!cardId || !amount || !currency) {
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (!["USD", "EUR"].includes(currency)) {
      return NextResponse.json({ error: "Devise non supportee" }, { status: 400 });
    }

    // Verify card belongs to user
    const card = await prisma.virtualCard.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) {
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 });
    }

    // Find card wallet
    const cardWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: `CARD_${currency}` } },
    });

    if (!cardWallet || cardWallet.balance < parsedAmount) {
      return NextResponse.json({ 
        error: `Solde carte ${currency} insuffisant`,
        available: cardWallet?.balance || 0 
      }, { status: 400 });
    }

    // Find or create destination wallet (USD or EUR)
    let destWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    if (!destWallet) {
      destWallet = await prisma.wallet.create({
        data: {
          userId,
          currency,
          balance: 0,
        },
      });
    }

    // Calculate fees (1.5% withdraw fee)
    const feeRate = 0.015;
    const fee = parsedAmount * feeRate;
    const netAmount = parsedAmount - fee;

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Debit card wallet
      await tx.wallet.update({
        where: { id: cardWallet.id },
        data: { balance: { decrement: parsedAmount } },
      });

      // Credit destination wallet
      await tx.wallet.update({
        where: { id: destWallet!.id },
        data: { balance: { increment: netAmount } },
      });

      // Create transaction record
      return await tx.transaction.create({
        data: {
          reference: `CARD-WITHDRAW-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: parsedAmount,
          fee,
          type: "WITHDRAWAL",
          status: "SUCCESS",
          description: `Retrait carte *${card.number.slice(-4)} vers compte ${currency}`,
          fromUserId: userId,
          fromWalletId: cardWallet.id,
          toWalletId: destWallet!.id,
          metadata: {
            cardId,
            cardLast4: card.number.slice(-4),
            currency,
            netAmount,
            feeRate: `${feeRate * 100}%`,
          },
        },
      });
    });

    // Send notification
    try {
      await sendNotification({
        userId,
        title: "Retrait carte reussi",
        message: `${netAmount.toFixed(2)} ${currency} transferes vers votre compte ${currency}`,
        type: "success",
      });
    } catch (notifErr) {
      console.warn("Notification non envoyee:", notifErr);
    }

    return NextResponse.json({
      success: true,
      txId: result.id,
      amount: parsedAmount,
      fee,
      netAmount,
      currency,
    });

  } catch (error: unknown) {
    console.error("CARD_WITHDRAW_ERROR:", error);
    return NextResponse.json({ 
      error: "Echec du retrait",
      details: error instanceof Error ? error.message : "Erreur inconnue"
    }, { status: 500 });
  }
}
