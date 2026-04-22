export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserIdFromRequest } from "@/lib/auth";

// VACCIN : Configuration des headers pour Pi Browser & CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

export async function POST(req: Request) {
  try {
    // 1. Authentification
    const userId = await getAuthUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: CORS_HEADERS });

    const body = await req.json().catch(() => ({}));
    const { quoteId } = body;
    
    if (!quoteId) return NextResponse.json({ error: "Identifiant de devis manquant" }, { status: 400, headers: CORS_HEADERS });

    // 2. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      // Récupération du devis (On récupère les monnaies réelles stockées lors du quote)
      const quote = await tx.swapQuote.findUnique({
        where: { id: quoteId, userId: userId }
      });

      if (!quote) throw new Error("Devis introuvable ou expiré");
      if (new Date() > quote.expiresAt) throw new Error("Le devis a expiré, veuillez recommencer");

      // --- LOGIQUE DYNAMIQUE CORRIGÉE ---
      // On utilise sourceCurrency et targetCurrency du schéma pour éviter de deviner
      const fromCurrency = quote.sourceCurrency.toUpperCase();
      const targetCurrency = quote.targetCurrency.toUpperCase();
                                              
      // --- ETAPE A : DÉBIT DU SOLDE SOURCE ---
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: fromCurrency } }
      });                                      
      
      if (!sourceWallet || sourceWallet.balance < quote.fromAmount) {
        throw new Error(`Solde ${fromCurrency} insuffisant pour cette opération`);
      }

      await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: quote.fromAmount } }
      });

      // --- ETAPE B : CRÉDIT DU SOLDE CIBLE ---
      const getWalletType = (curr: string) => {
        if (curr === "SDA") return "SIDRA" as const;
        if (curr === "PI") return "PI" as const;
        if (["XAF","XOF","USD","EUR","CDF","NGN","AED","CNY","VND","MGA"].includes(curr)) return "FIAT" as const;
        return "CRYPTO" as const;
      };

      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId,
          currency: targetCurrency,
          balance: quote.toAmount,
          type: getWalletType(targetCurrency),
        }
      });                                      

      // --- ETAPE C : CRÉATION DE LA TRANSACTION ---
      const sourceSymbol = fromCurrency === "PI" ? "π" : fromCurrency;
      const targetSymbol = targetCurrency === "PI" ? "π" : targetCurrency;                    
      
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${userId.substring(0, 4).toUpperCase()}`,
          amount: quote.fromAmount,
          netAmount: quote.toAmount,
          currency: fromCurrency,
          destCurrency: targetCurrency,
          type: "EXCHANGE",
          status: "SUCCESS",
          description: `Swap PimPay : ${sourceSymbol} → ${targetSymbol}`,
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate
        }
      });                                      

      // --- ETAPE D : NETTOYAGE ---
      await tx.swapQuote.delete({ where: { id: quote.id } });                                 
      
      return transaction;
    }, {
      maxWait: 10000,
      timeout: 30000,
    });
                                                   
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

    return NextResponse.json({
      success: true,
      message: "Swap effectué avec succès",
      reference: result.reference,
      received: result.netAmount,
      currency: result.destCurrency
    }, { headers: CORS_HEADERS });                                        

  } catch (error: any) {
    console.error("CONFIRM_SWAP_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur lors du swap" }, { status: 400, headers: CORS_HEADERS });
  }
}

// VACCIN : Gestion du Preflight (OPTIONS) pour le Pi Browser
export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS_HEADERS });
}
