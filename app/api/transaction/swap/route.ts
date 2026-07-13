export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyJWT } from "@/lib/auth";
import { getCorsHeaders, corsPreflightResponse } from "@/lib/cors";
import { logSystemEvent } from "@/lib/systemLogger";
import { enforceTxRateLimit, getClientIp } from "@/lib/tx-rate-limit";

// [FIX N2] CORS_HEADERS statique retiré — remplacé par getCorsHeaders(request).

export async function POST(req: Request) {
  const cors = getCorsHeaders(req);
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookiesObj = Object.fromEntries(cookieHeader.split('; ').map(c => c.trim().split('=')));
    const token = cookiesObj['token'];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: cors });

    const payload = await verifyJWT(token);
    if (!payload) return NextResponse.json({ error: "Token invalide" }, { status: 401, headers: cors });
    const userId = payload.id;

    // RATE LIMITING distribué — 2 req / 60s par utilisateur ET par IP.
    const ip = getClientIp(req);
    const limited = await enforceTxRateLimit({ userId, ip, action: "swap" });
    if (limited) {
      return NextResponse.json(await limited.json(), { status: 429, headers: { ...cors, ...Object.fromEntries(limited.headers) } });
    }

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
      const getWalletType = (curr: string) => {
        if (curr === "SDA") return "SIDRA" as const;
        if (curr === "PI") return "PI" as const;
        if (["XAF","XOF","USD","EUR","CDF","NGN","AED","CNY","VND","MGA"].includes(curr)) return "FIAT" as const;
        return "CRYPTO" as const;
      };

      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: quote.targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId,
          currency: quote.targetCurrency,
          balance: quote.toAmount,
          type: getWalletType(quote.targetCurrency),
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
          status: "SUCCESS",
          description: `Swap PIMOBIPAY : ${fromCurrency} -> ${quote.targetCurrency}`,
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate
        }
      });
    }, {
      maxWait: 10000,
      timeout: 30000,
    });

    // Nettoyage
    await prisma.swapQuote.delete({ where: { id: quoteId } }).catch(() => {});

    // Notification de swap
    await prisma.notification.create({
      data: {
        userId,
        title: "Swap effectue !",
        message: `Vous avez converti ${result.amount} ${result.currency} en ${result.netAmount} ${result.destCurrency}.`,
        type: "SWAP",
        metadata: {
          fromCurrency: result.currency,
          toCurrency: result.destCurrency,
          fromAmount: result.amount,
          toAmount: result.netAmount,
          rate: result.retailRate,
          reference: result.reference,
        }
      }
    }).catch(() => {});

    // Log systeme : swap reussi (visible sur la page Admin > Logs > Systeme)
    await logSystemEvent({
      level: "INFO",
      source: "SWAP",
      action: "SWAP_SUCCESS",
      message: `Swap reussi : ${result.amount} ${result.currency} -> ${result.netAmount} ${result.destCurrency}`,
      userId,
      details: {
        reference: result.reference,
        fromCurrency: result.currency,
        toCurrency: result.destCurrency,
        fromAmount: result.amount,
        toAmount: result.netAmount,
        rate: result.retailRate,
        transactionId: result.id,
      },
    });

    return NextResponse.json({ success: true, reference: result.reference }, { headers: cors });

  } catch (error: any) {
    // Log systeme : echec du swap (visible sur la page Admin > Logs > Systeme)
    await logSystemEvent({
      level: "ERROR",
      source: "SWAP",
      action: "SWAP_FAILED",
      message: `Echec du swap : ${error?.message || "Erreur inconnue"}`,
      details: { error: error?.message, stack: error?.stack?.substring(0, 1000) },
    });
    return NextResponse.json({ error: error.message }, { status: 400, headers: getCorsHeaders(req) });
  }
}

export async function OPTIONS(request: Request) {
  return corsPreflightResponse(request);
}
