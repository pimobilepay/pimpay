export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.trim().split('=')));
    const token = cookies['token'];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: CORS_HEADERS });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const { quoteId } = await req.json();

    const result = await prisma.$transaction(async (tx) => {
      const quote = await tx.swapQuote.findUnique({ where: { id: quoteId, userId } });
      if (!quote) throw new Error("Devis introuvable");
      if (new Date() > quote.expiresAt) throw new Error("Devis expiré");

      // On utilise sourceCurrency stocké dans le quote lors de la création
      const fromCurrency = quote.sourceCurrency.toUpperCase();

      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: fromCurrency } }
      });

      if (!sourceWallet || sourceWallet.balance < quote.fromAmount) {
        throw new Error(`Solde ${fromCurrency} insuffisant`);
      }

      // 1. Débit
      await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: quote.fromAmount } }
      });

      // 2. Crédit
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: quote.targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId,
          currency: quote.targetCurrency,
          balance: quote.toAmount,
          type: quote.targetCurrency === "PI" ? "PI" :
            ["SDA","BTC","ETH","BNB","SOL","XRP","XLM","TRX","ADA","DOGE","TON","USDT","USDC","DAI","BUSD"].includes(quote.targetCurrency) ? "CRYPTO" : "FIAT"
        }
      });

      // 3. Transaction
      return await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}`,
          amount: quote.fromAmount,
          netAmount: quote.toAmount,
          currency: fromCurrency,
          destCurrency: quote.targetCurrency,
          type: "EXCHANGE",
          status: "COMPLETED",
          description: `Swap PimPay : ${fromCurrency} -> ${quote.targetCurrency}`,
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate
        }
      });
    });

    // Nettoyage
    await prisma.swapQuote.delete({ where: { id: quoteId } }).catch(() => {});

    return NextResponse.json({ success: true, reference: result.reference }, { headers: CORS_HEADERS });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
    return NextResponse.json({}, { headers: CORS_HEADERS });
}
