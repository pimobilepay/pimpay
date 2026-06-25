import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { getAuthUserId } from "@/lib/auth";
import { parseAmount } from "@/lib/amount-guard";
import { enforceTxRateLimit, getClientIp } from "@/lib/tx-rate-limit";

// Force le rendu dynamique pour le build Vercel
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // #2 FIX: userId extrait du token JWT, jamais du body client
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    // [FIX #7] Rate limiting DISTRIBUÉ — 2 req / 60s par utilisateur ET par IP
    // (anti wash-trading / DDoS financier, partagé entre toutes les lambdas Vercel).
    const ip = getClientIp(req);
    const limited = await enforceTxRateLimit({ userId, ip, action: "withdraw" });
    if (limited) return limited;

    const { amountUSD, phone, prefix } = await req.json();

    // #19 FIX: Validation stricte du montant + plafond par retrait (AML).
    const DAILY_LIMIT_USD = 500;
    const MAX_SINGLE_WITHDRAW_USD = 200;
    const parsed = parseAmount(amountUSD, { max: MAX_SINGLE_WITHDRAW_USD, decimals: 2 });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const amountUSDNum = parsed.value;

    // Vérification limite journalière
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const dailyTotal = await prisma.transaction.aggregate({
      where: { fromUserId: userId, type: "WITHDRAW", createdAt: { gte: startOfDay }, status: { in: ["PENDING", "SUCCESS"] } },
      _sum: { amount: true }
    });
    const dailySpent = dailyTotal._sum.amount || 0;
    if (dailySpent + amountUSDNum > DAILY_LIMIT_USD) {
      return NextResponse.json({ error: `Limite journalière atteinte (${DAILY_LIMIT_USD} USD/jour)` }, { status: 400 });
    }

    // Frais centralisés
    const feeConfig = await getFeeConfig();
    const { feeRate: FEE_PERCENT, feeAmount, totalDebit: totalToDeduct } = calculateFee(amountUSDNum, feeConfig, "withdraw");
    const amountXAF = Math.floor(amountUSDNum * 600);

    const result = await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "USD" } }
      });

      if (!wallet || wallet.balance < totalToDeduct) {
        throw new Error("Solde insuffisant (Frais de 2% inclus)");
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: totalToDeduct } }
      });

      const transaction = await tx.transaction.create({
        data: {
          reference: `WDR-${Date.now()}`,
          amount: amountUSDNum,
          fee: feeAmount,
          currency: "USD",
          type: "WITHDRAW",
          status: "PENDING",
          fromUserId: userId,
          fromWalletId: wallet.id,
          description: `Retrait vers ${phone}`
        }
      });

      await tx.notification.create({
        data: {
          userId: userId,
          title: "Retrait initie !",
          message: `Votre demande de ${amountUSDNum}$ est en cours de traitement vers le ${phone}.`,
          type: "PAYMENT_SENT",
          metadata: JSON.stringify({
            amount: amountUSDNum,
            currency: "USD",
            fee: feeAmount,
            reference: transaction.reference,
            method: "Mobile Money",
            walletAddress: phone,
            status: "PENDING",
          }),
        }
      });

      return transaction;
    }, { maxWait: 10000, timeout: 30000 });

    // Appel CinetPay Transfer ici...
    // (Le code reste identique à l'étape précédente)

    return NextResponse.json({ success: true, transaction: result });
  } catch (error: any) {
    // [FIX V9] Ne pas exposer error.message en production
    console.error("[WITHDRAW_ERROR]", error);
    // Seules les erreurs métier connues sont retournées au client
    const safeErrors = ["Solde insuffisant", "Montant invalide", "Limite journalière"];
    const isSafeError = safeErrors.some(e => error.message?.includes(e));
    return NextResponse.json(
      { error: isSafeError ? error.message : "Erreur lors du traitement du retrait" },
      { status: 500 }
    );
  }
}
