export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

// VACCIN : Configuration des headers pour Pi Browser & CORS
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Cache-Control": "no-store, max-age=0, must-revalidate",
};

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
};

export async function POST(req: Request) {
  try {
    // 1. Authentification
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.trim().split('=')));
    const token = cookies['token'];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401, headers: CORS_HEADERS });

    let userId: string;
    try {
      const secret = getJwtSecret();
      if (!secret) throw new Error();
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401, headers: CORS_HEADERS });
    }

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
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId,
          currency: targetCurrency,
          balance: quote.toAmount,
          // Détection intelligente du type pour PimPay
          type: targetCurrency === "PI" ? "PI" :
            ["SDA","BTC","ETH","BNB","SOL","XRP","XLM","TRX","ADA","DOGE","TON","USDT","USDC","DAI","BUSD"].includes(targetCurrency) ? "CRYPTO" : "FIAT"
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
          status: "COMPLETED",
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
      timeout: 15000 // Sécurité pour les connexions lentes sur mobile
    });
                                                   
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
