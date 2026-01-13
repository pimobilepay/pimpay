export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.trim().split('=')));
    const token = cookies['token'];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const { amount, sourceCurrency, targetCurrency } = await req.json();
    const parsedAmount = parseFloat(amount);
    const sellingCurrency = (sourceCurrency || "PI").toUpperCase();

    // Récupération du solde dans le modèle Wallet (comme vu dans ton profil)
    const wallet = await prisma.wallet.findUnique({
      where: { userId_currency: { userId, currency: sellingCurrency } }
    });

    if (!wallet || wallet.balance < parsedAmount) {
      return NextResponse.json({ 
        error: `Solde ${sellingCurrency} insuffisant (Dispo: ${wallet?.balance || 0})` 
      }, { status: 400 });
    }

    // Calcul GCV
    const PI_CONSENSUS_USD = 314159;
    const rates: Record<string, number> = { USD: 1, EUR: 0.92, XAF: 600, XOF: 600, CDF: 2800 };
    const rate = sellingCurrency === "PI" 
      ? PI_CONSENSUS_USD * (rates[targetCurrency] || 1)
      : 1 / (PI_CONSENSUS_USD * (rates[sellingCurrency] || 1));

    const quote = await prisma.swapQuote.create({
      data: {
        userId,
        fromAmount: parsedAmount,
        toAmount: parsedAmount * rate,
        rate,
        targetCurrency, // Champ unique dans ton schéma
        expiresAt: new Date(Date.now() + 30000),
      }
    });

    return NextResponse.json({ success: true, quoteId: quote.id, convertedAmount: quote.toAmount, rate, expiresIn: 30 });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur quote" }, { status: 500 });
  }
}
