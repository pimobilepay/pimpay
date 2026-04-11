export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
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
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      await logToAdmin("CARD_RECHARGE_ERROR", "JWT_SECRET non configure");
      return NextResponse.json({ error: "Erreur configuration serveur" }, { status: 500 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;
    if (!token) {
      await logToAdmin("CARD_RECHARGE_ERROR", "Token manquant");
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(SECRET));
      userId = payload.id as string;
    } catch {
      await logToAdmin("CARD_RECHARGE_ERROR", "Token invalide ou expire");
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { cardId, amount, currency } = body;
    logContext = `userId=${userId}, cardId=${cardId}, amount=${amount}, currency=${currency}`;

    if (!cardId || !amount || !currency) {
      await logToAdmin("CARD_RECHARGE_ERROR", `Donnees manquantes | ${logContext}`, userId);
      return NextResponse.json({ error: "Donnees manquantes" }, { status: 400 });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await logToAdmin("CARD_RECHARGE_ERROR", `Montant invalide (${amount}) | ${logContext}`, userId);
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    if (!["USD", "EUR"].includes(currency)) {
      await logToAdmin("CARD_RECHARGE_ERROR", `Devise non supportee (${currency}) | ${logContext}`, userId);
      return NextResponse.json({ error: "Devise non supportee" }, { status: 400 });
    }

    // Verify card belongs to user
    const card = await prisma.virtualCard.findFirst({
      where: { id: cardId, userId },
    });

    if (!card) {
      await logToAdmin("CARD_RECHARGE_ERROR", `Carte non trouvee | ${logContext}`, userId);
      return NextResponse.json({ error: "Carte non trouvee" }, { status: 404 });
    }

    // Find source wallet (USD or EUR)
    const sourceWallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency } },
    });

    await logToAdmin("CARD_RECHARGE_DEBUG", `sourceWallet: ${sourceWallet ? `id=${sourceWallet.id}, balance=${sourceWallet.balance}` : "NULL"} | ${logContext}`, userId);

    if (!sourceWallet || sourceWallet.balance < parsedAmount) {
      await logToAdmin("CARD_RECHARGE_ERROR", `Solde insuffisant: ${sourceWallet?.balance || 0} < ${parsedAmount} | ${logContext}`, userId);
      return NextResponse.json({ 
        error: `Solde ${currency} insuffisant`,
        available: sourceWallet?.balance || 0 
      }, { status: 400 });
    }

    // Calculate fees (2% recharge fee)
    const feeRate = 0.02;
    const fee = parsedAmount * feeRate;
    const netAmount = parsedAmount - fee;

    // Determine which balance field to update based on currency
    const balanceField = currency === "EUR" ? "balanceEUR" : "balanceUSD";

    await logToAdmin("CARD_RECHARGE_DEBUG", `Updating card ${cardId} ${balanceField} += ${netAmount} | ${logContext}`, userId);

    // Atomic transaction - update card balance directly
    const result = await prisma.$transaction(async (tx) => {
      // Debit source wallet
      await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: parsedAmount } },
      });

      // Credit card balance directly
      await tx.virtualCard.update({
        where: { id: cardId },
        data: { [balanceField]: { increment: netAmount } },
      });

      // Create transaction record
      return await tx.transaction.create({
        data: {
          reference: `CARD-RECHARGE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          amount: parsedAmount,
          fee,
          type: "CARD_RECHARGE",
          status: "SUCCESS",
          currency: currency,
          description: `Recharge carte *${card.number.slice(-4)} depuis ${currency}`,
          fromUserId: userId,
          fromWalletId: sourceWallet.id,
          metadata: {
            cardId,
            cardLast4: card.number.slice(-4),
            currency,
            netAmount,
            feeRate: `${feeRate * 100}%`,
            type: "CARD_RECHARGE",
          },
        },
      });
    });
    
    await logToAdmin("CARD_RECHARGE_SUCCESS", `Recharge reussie: ${netAmount} ${currency} | txId=${result.id} | ${logContext}`, userId);

    // Send notification with full details
    try {
      await sendNotification({
        userId,
        title: "Recharge carte reussie",
        message: `${netAmount.toFixed(2)} ${currency} ajoutes a votre carte *${card.number.slice(-4)}. Frais: ${fee.toFixed(2)} ${currency} (${(feeRate * 100).toFixed(1)}%)`,
        type: "SUCCESS",
        metadata: {
          amount: parsedAmount,
          currency,
          fee,
          reference: result.reference,
          transactionId: result.id,
          status: "SUCCESS",
          method: "CARD_RECHARGE",
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
    console.error("CARD_RECHARGE_ERROR:", error);
    
    await logToAdmin(
      "CARD_RECHARGE_FATAL", 
      `Exception: ${errorMsg} | Stack: ${errorStack?.slice(0, 500)} | Context: ${logContext}`,
      userId || undefined
    );
    
    return NextResponse.json({ 
      error: "Echec de la recharge",
      details: errorMsg
    }, { status: 500 });
  }
}
