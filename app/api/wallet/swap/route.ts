export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { WalletType, TransactionType, TransactionStatus } from "@prisma/client";
import { nanoid } from 'nanoid';

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

/* ---------- CRYPTO IDS (prices are in USD) ---------- */
const CRYPTO_LIST = [
  "PI", "SDA", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM",
  "TRX", "ADA", "DOGE", "TON", "USDT", "USDC", "DAI", "BUSD",
];

/* ---------- FALLBACK FIAT RATES (units per 1 USD) ---------- */
const FALLBACK_FIAT: Record<string, number> = {
  USD: 1, EUR: 0.92, XAF: 615, XOF: 615, CDF: 2800,
  NGN: 1550, AED: 3.67, CNY: 7.24, VND: 25450,
};

const PI_GCV = 314159;

/* ---------- Fetch live market prices ---------- */
async function getLiveMarketPrices(): Promise<Record<string, number>> {
  const prices: Record<string, number> = {
    PI: PI_GCV, SDA: 1.2, BUSD: 1,
    ...FALLBACK_FIAT,
  };

  try {
    const [cryptoRes, fiatRes] = await Promise.all([
      fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd',
        { signal: AbortSignal.timeout(5000) }
      ),
      fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(5000) }),
    ]);

    const cd = await cryptoRes.json();
    if (cd) {
      prices.BTC = cd.bitcoin?.usd || 95000;
      prices.ETH = cd.ethereum?.usd || 3200;
      prices.BNB = cd.binancecoin?.usd || 600;
      prices.SOL = cd.solana?.usd || 180;
      prices.XRP = cd.ripple?.usd || 2.5;
      prices.XLM = cd.stellar?.usd || 0.4;
      prices.TRX = cd.tron?.usd || 0.12;
      prices.ADA = cd.cardano?.usd || 0.65;
      prices.DOGE = cd.dogecoin?.usd || 0.15;
      prices.TON = cd['the-open-network']?.usd || 5.5;
      prices.USDT = cd.tether?.usd || 1;
      prices.USDC = cd['usd-coin']?.usd || 1;
      prices.DAI = cd.dai?.usd || 1;
    }

    const fiatData = await fiatRes.json();
    if (fiatData?.rates) {
      for (const [key, val] of Object.entries(fiatData.rates)) {
        if (!CRYPTO_LIST.includes(key)) {
          prices[key] = val as number;
        }
      }
    }
  } catch (e) {
    console.warn("[SWAP] Fallback rates used:", e);
  }

  return prices;
}

/* ---------- Unified conversion via USD pivot ---------- */
function convertViaUsd(
  fromId: string,
  toId: string,
  amount: number,
  prices: Record<string, number>
): number {
  const isFromCrypto = CRYPTO_LIST.includes(fromId);
  const isToCrypto = CRYPTO_LIST.includes(toId);

  // Step 1: Convert FROM amount to USD
  const valueInUsd = isFromCrypto
    ? amount * (prices[fromId] || 0)
    : amount / (prices[fromId] || 1);

  // Step 2: Convert USD to TO amount
  return isToCrypto
    ? valueInUsd / (prices[toId] || 1)
    : valueInUsd * (prices[toId] || 1);
}

/* ---------- Wallet type detection per Prisma schema ---------- */
function getWalletType(currency: string): WalletType {
  if (currency === "SDA") return WalletType.SIDRA;
  if (currency === "PI") return WalletType.PI;
  if (["XAF", "XOF", "USD", "EUR", "CDF", "NGN", "AED", "CNY", "VND"].includes(currency))
    return WalletType.FIAT;
  return WalletType.CRYPTO;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const SECRET = process.env.JWT_SECRET;

    const token =
      cookieStore.get("token")?.value ||
      cookieStore.get("pimpay_token")?.value;

    if (!token || !SECRET)
      return NextResponse.json({ error: "Non authentifie" }, { status: 401, headers: CORS_HEADERS });

    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jose.jwtVerify(token, secretKey);
    const userId = payload.id as string;

    const { amount, fromCurrency, toCurrency } = await request.json();
    const swapAmount = parseFloat(amount);

    if (isNaN(swapAmount) || swapAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400, headers: CORS_HEADERS });
    }

    const from = fromCurrency.toUpperCase();
    const to = toCurrency.toUpperCase();

    if (from === to) {
      return NextResponse.json({ error: "Les devises doivent etre differentes" }, { status: 400, headers: CORS_HEADERS });
    }

    // 1. Get live prices (crypto + fiat)
    const prices = await getLiveMarketPrices();

    if (!prices[from]) {
      return NextResponse.json({ error: `Actif non supporte: ${from}` }, { status: 400, headers: CORS_HEADERS });
    }
    if (!prices[to]) {
      return NextResponse.json({ error: `Actif non supporte: ${to}` }, { status: 400, headers: CORS_HEADERS });
    }

    // 2. Calculate conversion via USD pivot
    const targetAmount = Number(convertViaUsd(from, to, swapAmount, prices).toFixed(8));
    const rate = swapAmount > 0 ? targetAmount / swapAmount : 0;

    // 3. Atomic DB transaction (ACID)
    const result = await prisma.$transaction(async (tx) => {
      // A. Verify source wallet
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: from } }
      });

      if (!sourceWallet || sourceWallet.balance < swapAmount) {
        throw new Error(`Solde ${from} insuffisant`);
      }

      // B. Upsert target wallet
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: to } },
        update: { balance: { increment: targetAmount } },
        create: {
          userId,
          currency: to,
          balance: targetAmount,
          type: getWalletType(to),
        },
      });

      // C. Debit source
      const updatedSource = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: swapAmount } },
      });

      // D. Create transaction record
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
          toWalletId: targetWallet.id,
          retailRate: rate,
          description: `Swap: ${swapAmount} ${from} -> ${targetAmount.toFixed(6)} ${to}`,
        },
      });

      return { reference: transaction.reference, received: targetAmount };
    }, {
      maxWait: 10000,
      timeout: 30000,
      isolationLevel: "Serializable",
    });

    // 4. Async notification
    prisma.notification.create({
      data: {
        userId,
        title: "Swap PimPay confirme",
        message: `Conversion de ${swapAmount} ${from} vers ${result.received} ${to} effectuee.`,
        type: "SWAP",
        metadata: { fromCurrency: from, toCurrency: to, fromAmount: swapAmount, toAmount: result.received, rate, reference: result.reference },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: "Swap valide par PimPay",
      ...result,
    }, { headers: CORS_HEADERS });

  } catch (error: any) {
    console.error("[SWAP_ERROR]:", error.message);
    return NextResponse.json(
      { error: error.message || "Erreur de traitement" },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}
