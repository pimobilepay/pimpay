export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { WalletType, TransactionType, TransactionStatus } from "@prisma/client";
import { nanoid } from 'nanoid';

// Récupération des prix en temps réel
async function getLiveMarketPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd',
      { next: { revalidate: 30 }, signal: AbortSignal.timeout(5000) }
    );
    return await res.json();
  } catch (e) {
    console.error("Coingecko Error:", e);
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;

    // Récupération du token (PimPay Auth)
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

    if (from === to) {
      return NextResponse.json({ error: "Les devises doivent être différentes" }, { status: 400 });
    }

    // 1. CALCUL DES PRIX (Logique Exchange complète)
    const live = await getLiveMarketPrices();
    
    // Mapping des IDs Coingecko vers tes symboles
    const PRICES: Record<string, number> = {
      PI: 314159, 
      SDA: 1.2,
      BTC: live.bitcoin?.usd || 95000,
      ETH: live.ethereum?.usd || 3200,
      BNB: live.binancecoin?.usd || 600,
      SOL: live.solana?.usd || 150,
      XRP: live.ripple?.usd || 2.5,
      XLM: live.stellar?.usd || 0.4,
      TRX: live.tron?.usd || 0.12,
      ADA: live.cardano?.usd || 0.6,
      DOGE: live.dogecoin?.usd || 0.15,
      TON: live['the-open-network']?.usd || 5.5,
      USDT: live.tether?.usd || 1,
      USDC: live['usd-coin']?.usd || 1,
      DAI: live.dai?.usd || 1,
      BUSD: 1,
      XAF: 0.0015
    };

    if (!PRICES[from] || !PRICES[to]) {
      return NextResponse.json({ error: `Actif non supporté: ${!PRICES[from] ? from : to}` }, { status: 400 });
    }

    const rate = PRICES[from] / PRICES[to];
    // Calcul précis à 8 décimales pour les cryptos
    const targetAmount = Number((swapAmount * rate).toFixed(8));

    // 2. TRANSACTION ATOMIQUE SÉCURISÉE (ACID)
    const result = await prisma.$transaction(async (tx) => {

      // Helper pour déterminer le type de wallet selon le schéma Prisma
      const getWalletType = (curr: string): WalletType => {
        if (curr === "SDA") return WalletType.SIDRA;
        if (curr === "PI") return WalletType.PI;
        if (["XAF", "USD", "EUR"].includes(curr)) return WalletType.FIAT;
        return WalletType.CRYPTO;
      };

      // A. Vérifier le Wallet Source
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: from } }
      });

      if (!sourceWallet || sourceWallet.balance < swapAmount) {
        throw new Error(`Solde ${from} insuffisant.`);
      }

      // B. Chercher ou Créer le Wallet Cible
      let targetWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: to } }
      });

      if (!targetWallet) {
        targetWallet = await tx.wallet.create({
          data: {
            userId,
            currency: to,
            balance: 0,
            type: getWalletType(to)
          }
        });
      }

      // C. Mouvement de fonds avec protection contre les balances négatives
      const updatedSource = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: swapAmount } }
      });

      const updatedTarget = await tx.wallet.update({
        where: { id: targetWallet.id },
        data: { balance: { increment: targetAmount } }
      });

      // D. Création de la transaction dans le Ledger PimPay
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWAP-${nanoid(12).toUpperCase()}`,
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
          retailRate: rate,
          description: `Swap réussi: ${swapAmount} ${from} -> ${targetAmount} ${to}`
        }
      });

      return { reference: transaction.reference, received: targetAmount };
    }, {
      timeout: 15000,
      isolationLevel: "Serializable" // Maximum de sécurité pour éviter les double-swaps
    });

    // 3. Notification (Async non-bloquant)
    prisma.notification.create({
      data: {
        userId,
        title: "Swap PimPay confirmé",
        message: `Conversion de ${swapAmount} ${from} vers ${result.received} ${to} effectuée avec succès.`,
        type: "info",
      }
    }).catch(() => {});

    return NextResponse.json({ 
      success: true, 
      message: "Swap validé par PimPay Ledger",
      ...result 
    });

  } catch (error: any) {
    console.error("[SWAP_ERROR]:", error.message);
    return NextResponse.json({ error: error.message || "Erreur de traitement" }, { status: 400 });
  }
}
