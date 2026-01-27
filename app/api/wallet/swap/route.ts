import { NextResponse } from 'next/server';
import { cookies } from "next/headers";               
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { WalletType, TransactionType, TransactionStatus } from "@prisma/client";

export const dynamic = 'force-dynamic';

async function getLiveBTCPrice() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd', { next: { revalidate: 60 } });
    const data = await res.json();
    return data.bitcoin.usd;
  } catch (e) {
    return 95000;
  }
}

export async function POST(request: Request) {
  try {
    const SECRET = process.env.JWT_SECRET;
    const token = cookies().get("pimpay_token")?.value;

    if (!token || !SECRET) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { amount, fromCurrency, toCurrency } = await request.json();
    const swapAmount = parseFloat(amount);
    
    if (isNaN(swapAmount) || swapAmount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const btcPrice = await getLiveBTCPrice();

    const PRICES: Record<string, number> = {
      "SDA": 15,
      "USDT": 1,
      "BTC": btcPrice,
      "PI": 314159 // Selon ton schéma SystemConfig
    };

    if (!PRICES[from] || !PRICES[to]) return NextResponse.json({ error: "Actif non supporté" }, { status: 400 });

    const rate = PRICES[from] / PRICES[to];
    const targetAmount = (to === "BTC")
      ? Number((swapAmount * rate).toFixed(8))
      : Number((swapAmount * rate).toFixed(4));

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer les deux wallets
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: from } }
      });

      if (!sourceWallet || sourceWallet.balance < swapAmount) {
        throw new Error(`Solde ${from} insuffisant.`);
      }

      // 2. Déterminer le WalletType correct selon l'Enum du schéma
      const getWalletType = (curr: string): WalletType => {
        if (curr === "SDA") return WalletType.SIDRA;
        if (curr === "PI") return WalletType.PI;
        if (curr === "USDT" || curr === "BTC") return WalletType.CRYPTO;
        return WalletType.FIAT;
      };

      // 3. Mise à jour des balances
      const updatedSource = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: swapAmount } }
      });

      const updatedTarget = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: to } },
        update: { balance: { increment: targetAmount } },
        create: { 
          userId, 
          currency: to, 
          balance: targetAmount, 
          type: getWalletType(to) 
        }
      });

      // 4. Création de la transaction détaillée (Tx)
      const log = await tx.transaction.create({
        data: {
          reference: `SWAP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: swapAmount,
          netAmount: targetAmount,
          currency: from,
          destCurrency: to,
          type: TransactionType.EXCHANGE,
          status: TransactionStatus.COMPLETED,
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: updatedSource.id,
          toWalletId: updatedTarget.id,
          description: `Swap PimPay: ${swapAmount} ${from} ➔ ${targetAmount} ${to}`
        }
      });

      return { from, to, received: targetAmount, reference: log.reference };
    });

    return NextResponse.json({ success: true, details: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
