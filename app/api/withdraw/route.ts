import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getFeeConfig, calculateFee } from "@/lib/fees";
import { getAuthUserId } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

// Force le rendu dynamique pour le build Vercel
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // [FIX #7] Rate limiting — 20 requêtes / 60s par IP (anti wash-trading / DDoS financier)
    const ip = getClientIp(req);
    const rl = checkRateLimit(`withdraw:${ip}`, 20, 60_000);
    if (rl.limited) {
      const retryAfter = Math.ceil((rl.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Trop de requêtes. Veuillez patienter avant de réessayer." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "20",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      );
    }

    // #2 FIX: userId extrait du token JWT, jamais du body client
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
    }

    const { amountUSD, phone, prefix } = await req.json();

    // #19 FIX: Validation du montant maximum (AML/limites journalières)
    const DAILY_LIMIT_USD = 500;
    const MAX_SINGLE_WITHDRAW_USD = 200;
    if (!amountUSD || amountUSD <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }
    if (amountUSD > MAX_SINGLE_WITHDRAW_USD) {
      return NextResponse.json({ error: `Montant maximum par retrait : ${MAX_SINGLE_WITHDRAW_USD} USD` }, { status: 400 });
    }

    // Vérification limite journalière
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const dailyTotal = await prisma.transaction.aggregate({
      where: { fromUserId: userId, type: "WITHDRAW", createdAt: { gte: startOfDay }, status: { in: ["PENDING", "SUCCESS"] } },
      _sum: { amount: true }
    });
    const dailySpent = dailyTotal._sum.amount || 0;
    if (dailySpent + amountUSD > DAILY_LIMIT_USD) {
      return NextResponse.json({ error: `Limite journalière atteinte (${DAILY_LIMIT_USD} USD/jour)` }, { status: 400 });
    }

    // Frais centralisés
    const feeConfig = await getFeeConfig();
    const { feeRate: FEE_PERCENT, feeAmount, totalDebit: totalToDeduct } = calculateFee(amountUSD, feeConfig, "withdraw");
    const amountXAF = Math.floor(amountUSD * 600);

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
          amount: amountUSD,
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
          message: `Votre demande de ${amountUSD}$ est en cours de traitement vers le ${phone}.`,
          type: "PAYMENT_SENT",
          metadata: JSON.stringify({
            amount: amountUSD,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
