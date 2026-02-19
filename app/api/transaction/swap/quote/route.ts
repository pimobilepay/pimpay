export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const FALLBACK_FIAT: Record<string, number> = { USD: 1, EUR: 0.92, XAF: 615, XOF: 615, CDF: 2800, NGN: 1550, AED: 3.67, CNY: 7.24, VND: 25450 };
const PI_GCV = 314159;

export async function POST(req: Request) {
  try {
    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-store, max-age=0",
    };

    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.trim().split('=')));
    const token = cookies['token'];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const { amount, sourceCurrency, targetCurrency } = await req.json();
    const fromCurr = sourceCurrency.toUpperCase();
    const toCurr = targetCurrency.toUpperCase();

    // 1. Vérification du solde
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: fromCurr } }
    });

    if (!wallet || wallet.balance < parseFloat(amount)) {
      return NextResponse.json({ error: `Solde ${fromCurr} insuffisant` }, { status: 400, headers });
    }

    // 2. Taux reels (crypto + fiat)
    let marketRates: Record<string, number> = { ...FALLBACK_FIAT };
    try {
      const [fiatRes, cryptoRes] = await Promise.all([
        fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 60 } }),
        fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd",
          { signal: AbortSignal.timeout(5000) }
        ),
      ]);
      const fiatData = await fiatRes.json();
      if (fiatData?.rates) marketRates = { ...marketRates, ...fiatData.rates };

      const cd = await cryptoRes.json();
      if (cd) {
        marketRates["BTC"] = cd.bitcoin?.usd || 95000;
        marketRates["ETH"] = cd.ethereum?.usd || 3200;
        marketRates["BNB"] = cd.binancecoin?.usd || 600;
        marketRates["SOL"] = cd.solana?.usd || 180;
        marketRates["XRP"] = cd.ripple?.usd || 2.5;
        marketRates["XLM"] = cd.stellar?.usd || 0.4;
        marketRates["TRX"] = cd.tron?.usd || 0.12;
        marketRates["ADA"] = cd.cardano?.usd || 0.65;
        marketRates["DOGE"] = cd.dogecoin?.usd || 0.15;
        marketRates["TON"] = cd["the-open-network"]?.usd || 5.5;
        marketRates["USDT"] = cd.tether?.usd || 1;
        marketRates["USDC"] = cd["usd-coin"]?.usd || 1;
        marketRates["DAI"] = cd.dai?.usd || 1;
      }
    } catch (e) { console.warn("Fallback rates used"); }

    marketRates["PI"] = PI_GCV;
    marketRates["SDA"] = 1.2;
    marketRates["BUSD"] = 1;

    // 3. Calcul du taux unifie (via USD comme pivot)
    const CRYPTO_LIST = ["PI", "SDA", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM", "TRX", "ADA", "DOGE", "TON", "USDT", "USDC", "DAI", "BUSD"];
    const isFromCrypto = CRYPTO_LIST.includes(fromCurr);
    const isToCrypto = CRYPTO_LIST.includes(toCurr);

    // Convert FROM amount to USD
    const valueInUsd = isFromCrypto
      ? parseFloat(amount) * (marketRates[fromCurr] || 0)
      : parseFloat(amount) / (marketRates[fromCurr] || 1);

    // Convert USD to TO amount
    const toAmount = isToCrypto
      ? valueInUsd / (marketRates[toCurr] || 1)
      : valueInUsd * (marketRates[toCurr] || 1);

    const finalRate = toAmount / parseFloat(amount);

    // 4. Sauvegarde avec sourceCurrency
    const quote = await prisma.swapQuote.create({
      data: {
        userId,
        fromAmount: parseFloat(amount),
        toAmount: toAmount,
        rate: finalRate,
        sourceCurrency: fromCurr,
        targetCurrency: toCurr,
        expiresAt: new Date(Date.now() + 30000),
      }
    });

    return NextResponse.json({ 
        success: true, 
        quoteId: quote.id, 
        convertedAmount: toAmount, 
        rate: finalRate, 
        fromCurrency: fromCurr,
    }, { headers });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
}
