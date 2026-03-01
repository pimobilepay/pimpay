import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";

// Force le rendu dynamique pour éviter les erreurs au build
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const { cpm_trans_id, cpm_result, cpm_amount, cpm_custom } = data;

    if (cpm_result === "00") {
      const amountUSD = parseFloat(cpm_amount) / 600;
      const userId = cpm_custom;

      await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { userId_currency: { userId, currency: "USD" } }
        });

        if (!wallet) throw new Error("Wallet non trouvé");

        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: amountUSD } }
        });

        await tx.transaction.create({
          data: {
            reference: cpm_trans_id,
            amount: amountUSD,
            currency: "USD",
            type: "DEPOSIT",
            status: "SUCCESS",
            toUserId: userId,
            toWalletId: wallet.id,
            description: `Dépôt Mobile Money (${cpm_amount} XAF)`
          }
        });

        await tx.notification.create({
          data: {
            userId: userId,
            title: "Dépôt Réussi 💰",
            message: `Votre compte PimPay a été crédité de ${amountUSD.toFixed(2)}$`,
            type: "success"
          }
        });
      }, { maxWait: 10000, timeout: 30000 });

      return NextResponse.json({ message: "OK" });
    }
    return NextResponse.json({ message: "Failed" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
