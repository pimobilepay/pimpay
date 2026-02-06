export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const FALLBACK_FIAT: Record<string, number> = { USD: 1, EUR: 0.92, XAF: 615, XOF: 615, CDF: 2800 };
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

    // 2. Taux réels
    let marketRates: Record<string, number> = { ...FALLBACK_FIAT };
    try {
      const fiatRes = await fetch("https://open.er-api.com/v6/latest/USD", { next: { revalidate: 60 } });
      const fiatData = await fiatRes.json();
      if (fiatData?.rates) marketRates = { ...marketRates, ...fiatData.rates };

      const cryptoRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd");
      const cryptoData = await cryptoRes.json();
      if (cryptoData) {
        marketRates["BTC"] = cryptoData.bitcoin.usd;
        marketRates["USDT"] = cryptoData.tether.usd;
      }
    } catch (e) { console.warn("Fallback rates used"); }

    marketRates["PI"] = PI_GCV;

    // 3. Calcul du taux
    const priceFromInUsd = ["BTC", "USDT", "PI"].includes(fromCurr) ? marketRates[fromCurr] : (1 / marketRates[fromCurr]);
    const priceToInUsd = ["BTC", "USDT", "PI"].includes(toCurr) ? marketRates[toCurr] : (1 / marketRates[toCurr]);
    
    // Taux croisé simplifié
    const rate = (fromCurr === "PI" || fromCurr === "USDT" || fromCurr === "BTC") 
                 ? marketRates[fromCurr] * (toCurr === "USD" ? 1 : marketRates[toCurr])
                 : (1 / marketRates[fromCurr]) * (toCurr === "PI" ? (1/PI_GCV) : marketRates[toCurr]);

    // Correction spécifique pour USDT -> XAF par exemple
    let finalRate = (fromCurr === "USDT" || fromCurr === "USD") ? marketRates[toCurr] : rate;
    if (fromCurr === "PI") finalRate = PI_GCV * marketRates[toCurr];

    const toAmount = parseFloat(amount) * finalRate;

    // 4. Sauvegarde (SANS sourceCurrency car absent du schéma)
    const quote = await prisma.swapQuote.create({
      data: {
        userId,
        fromAmount: parseFloat(amount),
        toAmount: toAmount,
        rate: finalRate,
        targetCurrency: toCurr,
        expiresAt: new Date(Date.now() + 30000),
      }
    });

    return NextResponse.json({ 
        success: true, 
        quoteId: quote.id, 
        convertedAmount: toAmount, 
        rate: finalRate, 
        fromCurrency: fromCurr // On renvoie l'info au client pour qu'il la garde
    }, { headers });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
}
