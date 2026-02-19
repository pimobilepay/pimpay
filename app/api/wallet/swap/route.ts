export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { WalletType, TransactionType, TransactionStatus } from "@prisma/client";

async function getLiveMarketPrices() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd',
      { next: { revalidate: 60 }, signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return {
      BTC: data.bitcoin?.usd || 95000,
      ETH: data.ethereum?.usd || 3200,
      BNB: data.binancecoin?.usd || 600,
      SOL: data.solana?.usd || 180,
      XRP: data.ripple?.usd || 2.50,
      XLM: data.stellar?.usd || 0.40,
      TRX: data.tron?.usd || 0.12,
      ADA: data.cardano?.usd || 0.65,
      DOGE: data.dogecoin?.usd || 0.15,
      TON: data["the-open-network"]?.usd || 5.5,
      USDT: data.tether?.usd || 1,
      USDC: data["usd-coin"]?.usd || 1,
      DAI: data.dai?.usd || 1,
    };
  } catch (e) {
    return {
      BTC: 95000, ETH: 3200, BNB: 600, SOL: 180,
      XRP: 2.50, XLM: 0.40, TRX: 0.12, ADA: 0.65,
      DOGE: 0.15, TON: 5.5, USDT: 1, USDC: 1, DAI: 1,
    };
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // --- LE VACCIN HYBRIDE : ÉTAPE CRUCIALE ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;

    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      try {
        const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jwtVerify(classicToken, secretKey);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const body = await request.json();
    const { amount, fromCurrency, toCurrency } = body;
    const swapAmount = parseFloat(amount);

    if (isNaN(swapAmount) || swapAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();
    const livePrices = await getLiveMarketPrices();

    // PRIX : Ecosysteme + Live Market
    const PRICES: Record<string, number> = {
      "PI": 314159,
      "SDA": 1.2,
      "BTC": livePrices.BTC,
      "ETH": livePrices.ETH,
      "BNB": livePrices.BNB,
      "SOL": livePrices.SOL,
      "XRP": livePrices.XRP,
      "XLM": livePrices.XLM,
      "TRX": livePrices.TRX,
      "ADA": livePrices.ADA,
      "DOGE": livePrices.DOGE,
      "TON": livePrices.TON,
      "USDT": livePrices.USDT,
      "USDC": livePrices.USDC,
      "DAI": livePrices.DAI,
      "BUSD": 1,
    };

    if (!PRICES[from] || !PRICES[to]) {
      return NextResponse.json({ error: "Actif non supporté" }, { status: 400 });
    }

    const rate = PRICES[from] / PRICES[to];
    const targetAmount = (to === "BTC")
      ? Number((swapAmount * rate).toFixed(8))
      : Number((swapAmount * rate).toFixed(4));

    // TRANSACTION ATOMIQUE : Sécurité maximale pour le swap
    const result = await prisma.$transaction(async (tx) => {
      // 1. Vérifier le wallet source
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: from } }
      });

      if (!sourceWallet || sourceWallet.balance < swapAmount) {
        throw new Error(`Solde ${from} insuffisant.`);
      }

      // 2. Determiner le type de Wallet automatiquement
      const getWalletType = (curr: string): WalletType => {
        if (curr === "SDA" || curr === "SIDRA") return WalletType.SIDRA;
        if (curr === "PI") return WalletType.PI;
        if (["XAF", "XOF", "CDF", "USD", "EUR"].includes(curr)) return WalletType.FIAT;
        return WalletType.CRYPTO;
      };

      // 3. Soustraire du source et ajouter à la cible
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

      // 4. Créer l'historique (Transaction Log)
      const transactionLog = await tx.transaction.create({
        data: {
          reference: `SWAP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: swapAmount,
          netAmount: targetAmount,
          currency: from,
          destCurrency: to,
          type: TransactionType.EXCHANGE,
          status: TransactionStatus.SUCCESS, // Aligné avec ton Enum
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: updatedSource.id,
          toWalletId: updatedTarget.id,
          description: `Swap: ${swapAmount} ${from} ➔ ${targetAmount} ${to}`
        }
      });

      // 5. Créer la notification pour l'utilisateur
      await tx.notification.create({
        data: {
          userId,
          title: "Swap réussi ! 🔄",
          message: `Vous avez échangé ${swapAmount} ${from} contre ${targetAmount} ${to}.`,
          type: "INFO" // Assure-toi que "INFO" ou "TRANSACTION" existe dans ton enum
        }
      });

      return { from, to, received: targetAmount, reference: transactionLog.reference };
    });

    return NextResponse.json({ success: true, details: result });

  } catch (error: any) {
    console.error("❌ [SWAP_ERROR]:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
