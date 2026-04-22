export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

// Helper to log to AuditLog for admin visibility
async function logToAdmin(action: string, details: string, targetId?: string) {
  try {
    await prisma.auditLog.create({
      data: {
        adminId: null,
        adminName: "SYSTEM",
        action,
        targetId: targetId || null,
        details,
      },
    });
  } catch (err) {
    console.error("[AUDIT_LOG_ERROR]:", err);
  }
}

export async function POST(req: NextRequest) {
  let userId: string = "";
  let logContext = "";
  
  try {
    const authUserId = await getAuthUserId();
    if (!authUserId) {
      await logToAdmin("CARD_WITHDRAW_ERROR", "Token manquant ou invalide");
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }
    userId = authUserId;

    const body = await req.json().catch(() => ({}));
    const { cardId, amount, currency } = body;
    logContext = `userId=${userId}, cardId=${cardId}, amount=${amount}, currency=${currency}`;

    if (!cardId || !amount || !currency) {
      await logToAdmin("CARD_WITHDRAW_ERROR", `Donnees manquantes | ${logContext}`, userId);
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await logToAdmin("CARD_WITHDRAW_ERROR", `Montant invalide (${amount}) | ${logContext}`, userId);
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (!["USD", "EUR"].includes(currency)) {
      await logToAdmin("CARD_WITHDRAW_ERROR", `Devise non supportee (${currency}) | ${logContext}`, userId);
      return NextResponse.json({ error: "Devise non supportee" }, { status: 400 });
    }

    // Verify card belongs to user
    const card = await prisma.virtualCard.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) {
      await logToAdmin("CARD_WITHDRAW_ERROR", `Carte non trouvee | ${logContext}`, userId);
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 });
    }

    // Check card balance directly (each card has its own balanceUSD and balanceEUR)
    const balanceField = currency === "EUR" ? "balanceEUR" : "balanceUSD";
    const cardBalance = currency === "EUR" ? (card.balanceEUR ?? 0) : (card.balanceUSD ?? 0);

    await logToAdmin("CARD_WITHDRAW_DEBUG", `Card ${cardId} ${balanceField}=${cardBalance} | ${logContext}`, userId);
    
    if (cardBalance < parsedAmount) {
      await logToAdmin("CARD_WITHDRAW_ERROR", `Solde carte insuffisant: ${cardBalance} < ${parsedAmount} | ${logContext}`, userId);
      return NextResponse.json({ 
        error: `Solde carte ${currency} insuffisant (${cardBalance.toFixed(2)} ${currency} disponible)`,
        available: cardBalance 
      }, { status: 400 });
    }

    // Find or create destination wallet (USD or EUR)
    let destWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    await logToAdmin("CARD_WITHDRAW_DEBUG", `destWallet trouvé: ${destWallet ? `id=${destWallet.id}, balance=${destWallet.balance}` : "NULL, creation en cours..."} | ${logContext}`, userId);

    if (!destWallet) {
      try {
        destWallet = await prisma.wallet.create({
          data: {
            userId,
            currency,
            balance: 0,
            type: "FIAT", // USD and EUR are FIAT wallets
          },
        });
        await logToAdmin("CARD_WITHDRAW_INFO", `Wallet ${currency} cree avec succes: id=${destWallet.id} | ${logContext}`, userId);
      } catch (createErr: any) {
        await logToAdmin("CARD_WITHDRAW_ERROR", `Erreur creation wallet ${currency}: ${createErr.message} | ${logContext}`, userId);
        return NextResponse.json({ error: "Erreur creation wallet destination" }, { status: 500 });
      }
    }

    // Calculate fees (1.5% withdraw fee)
    const feeRate = 0.015;
    const fee = parsedAmount * feeRate;
    const netAmount = parsedAmount - fee;

    await logToAdmin("CARD_WITHDRAW_DEBUG", `Calcul: amount=${parsedAmount}, fee=${fee}, netAmount=${netAmount} | ${logContext}`, userId);

    // Atomic transaction - debit card balance directly, credit destination wallet
    const result = await prisma.$transaction(async (tx) => {
      // Debit card balance directly
      await tx.virtualCard.update({
        where: { id: cardId },
        data: { [balanceField]: { decrement: parsedAmount } },
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
          type: "CARD_WITHDRAW",
          status: "SUCCESS",
          currency: currency,
          description: `Retrait carte *${card.number.slice(-4)} vers compte ${currency}`,
          fromUserId: userId,
          toWalletId: destWallet!.id,
          metadata: {
            cardId,
            cardLast4: card.number.slice(-4),
            currency,
            netAmount,
            feeRate: `${feeRate * 100}%`,
            type: "CARD_WITHDRAW",
          },
        },
      });
    });
    
    await logToAdmin("CARD_WITHDRAW_SUCCESS", `Retrait reussi: ${netAmount} ${currency} | txId=${result.id} | ${logContext}`, userId);

    // Send notification with full details
    try {
      await sendNotification({
        userId,
        title: "Retrait carte reussi",
        message: `${netAmount.toFixed(2)} ${currency} transferes de votre carte *${card.number.slice(-4)} vers votre compte ${currency}. Frais: ${fee.toFixed(2)} ${currency} (${(feeRate * 100).toFixed(1)}%)`,
        type: "PAYMENT_SENT",
        metadata: {
          amount: parsedAmount,
          currency,
          fee,
          reference: result.reference,
          transactionId: result.id,
          status: "SUCCESS",
          method: "CARD_WITHDRAW",
        },
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
    const errorMsg = error instanceof Error ? error.message : "Erreur inconnue";
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("CARD_WITHDRAW_ERROR:", error);
    
    await logToAdmin(
      "CARD_WITHDRAW_FATAL", 
      `Exception: ${errorMsg} | Stack: ${errorStack?.slice(0, 500)} | Context: ${logContext}`,
      userId || undefined
    );
    
    return NextResponse.json({ 
      error: "Echec du retrait",
      details: errorMsg
    }, { status: 500 });
  }
}
