import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { getFeeConfig, calculateFee } from "@/lib/fees";

// Force le rendu dynamique pour le build Vercel
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { userId, amountUSD, phone, prefix } = await req.json();

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
          title: "Retrait initié 🚀",
          message: `Votre demande de ${amountUSD}$ est en cours de traitement vers le ${phone}.`,
          type: "info"
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
