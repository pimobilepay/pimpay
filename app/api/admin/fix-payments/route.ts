export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from "@/lib/prisma";
import { WalletType } from "@prisma/client";

// On utilise GET pour que tu puisses simplement taper l'URL dans ton navigateur
export async function GET() {
  try {
    // 1. On cherche les transactions qui n'ont pas de Wallet lié
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromWalletId: null, fromUserId: { not: null } },
          { toWalletId: null, toUserId: { not: null } }
        ]
      }
    });

    let fixedCount = 0;

    for (const tx of transactions) {
      const currency = tx.currency || "XAF";
      
      const getWType = (curr: string): WalletType => {
        if (curr === "SDA") return WalletType.SIDRA;
        if (curr === "PI") return WalletType.PI;
        return WalletType.CRYPTO;
      };

      // Fix du portefeuille de départ
      if (!tx.fromWalletId && tx.fromUserId) {
        const w = await prisma.wallet.upsert({
          where: { userId_currency: { userId: tx.fromUserId, currency } },
          update: {},
          create: { userId: tx.fromUserId, currency, type: getWType(currency) }
        });
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { fromWalletId: w.id }
        });
        fixedCount++;
      }

      // Fix du portefeuille d'arrivée
      if (!tx.toWalletId && tx.toUserId) {
        const destCurrency = tx.destCurrency || currency;
        const w = await prisma.wallet.upsert({
          where: { userId_currency: { userId: tx.toUserId, currency: destCurrency } },
          update: {},
          create: { userId: tx.toUserId, currency: destCurrency, type: getWType(destCurrency) }
        });
        await prisma.transaction.update({
          where: { id: tx.id },
          data: { toWalletId: w.id }
        });
        fixedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `PimPay a réparé ${fixedCount} liens de transactions.`,
      found: transactions.length 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
