export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { WalletType, TransactionType, TransactionStatus } from "@prisma/client";

// 1. Sortir l'appel API de la transaction pour éviter le timeout
async function getLiveMarketPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd',
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) }
    );
    return await res.json();
  } catch (e) {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;

    // --- AUTHENTIFICATION ---
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;
    if (!token || !SECRET) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jose.jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { amount, fromCurrency, toCurrency } = await request.json();
    const swapAmount = parseFloat(amount);

    if (isNaN(swapAmount) || swapAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    // --- CALCUL DES PRIX (Avant la transaction) ---
    const live = await getLiveMarketPrices();
    const PRICES: Record<string, number> = {
      PI: 314159, // Prix de consensus Daniel.F
      SDA: 1.2,
      BTC: live.bitcoin?.usd || 95000,
      ETH: live.ethereum?.usd || 3200,
      USDT: 1,
      USDC: 1,
      BNB: live.binancecoin?.usd || 600,
      XAF: 0.0015
    };

    if (!PRICES[from] || !PRICES[to]) {
      return NextResponse.json({ error: "Actif non supporté" }, { status: 400 });
    }

    const rate = PRICES[from] / PRICES[to];
    const targetAmount = Number((swapAmount * rate).toFixed(to === "BTC" || to === "PI" ? 8 : 4));

    // --- TRANSACTION ATOMIQUE ---
    const result = await prisma.$transaction(async (tx) => {
      
      const getWalletType = (curr: string): WalletType => {
        if (curr === "SDA") return WalletType.SIDRA;
        if (curr === "PI") return WalletType.PI;
        if (["XAF", "USD", "EUR"].includes(curr)) return WalletType.FIAT;
        return WalletType.CRYPTO;
      };

      // A. Wallet Source : On vérifie le solde
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: from } }
      });

      if (!sourceWallet || sourceWallet.balance < swapAmount) {
        throw new Error(`Solde ${from} insuffisant.`);
      }

      // B. Débit et Crédit simultanés
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

      // C. Log de transaction conforme au schéma PimPay
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWAP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: swapAmount,
          netAmount: targetAmount,
          currency: from,
          destCurrency: to,
          type: TransactionType.EXCHANGE,
          status: TransactionStatus.SUCCESS,
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: updatedSource.id,
          toWalletId: updatedTarget.id,
          description: `Swap ${swapAmount} ${from} vers ${targetAmount} ${to}`
        }
      });

      return { reference: transaction.reference, received: targetAmount };
    }, {
      timeout: 10000 // Augmentation du timeout à 10s pour éviter l'erreur de ta capture
    });

    return NextResponse.json({ success: true, ...result });

  } catch (error: any) {
    console.error("❌ [SWAP_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
