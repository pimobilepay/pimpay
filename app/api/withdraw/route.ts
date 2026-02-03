import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Force le rendu dynamique pour le build Vercel
export const dynamic = "force-dynamic";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { userId, amountUSD, phone, prefix } = await req.json();

    const FEE_PERCENT = 0.02;
    const totalToDeduct = amountUSD * (1 + FEE_PERCENT);
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
          fee: amountUSD * FEE_PERCENT,
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
    });

    // Appel CinetPay Transfer ici...
    // (Le code reste identique à l'étape précédente)

    return NextResponse.json({ success: true, transaction: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
