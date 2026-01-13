export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";

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

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    let userId: string;
    try {
      const secret = getJwtSecret();
      if (!secret) throw new Error();
      const { payload } = await jose.jwtVerify(token, secret);
      userId = payload.id as string;
    } catch (e) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const { quoteId } = await req.json().catch(() => ({}));
    if (!quoteId) return NextResponse.json({ error: "Identifiant de devis manquant" }, { status: 400 });

    // 2. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {

      // Récupération du devis
      const quote = await tx.swapQuote.findUnique({
        where: { id: quoteId, userId: userId }
      });

      if (!quote) throw new Error("Devis introuvable ou déjà utilisé");
      if (new Date() > quote.expiresAt) throw new Error("Le devis a expiré");

      // --- LOGIQUE DE DÉDUCTION DES DEVISES (fromCurrency n'existe pas dans le schéma) ---
      // Si la cible est PI, on vend du Fiat (USD par défaut). Si la cible est Fiat, on vend du PI.
      const targetCurrency = quote.targetCurrency.toUpperCase();
      const fromCurrency = targetCurrency === "PI" ? "USD" : "PI";
      const isSellingPi = fromCurrency === "PI";

      // --- ETAPE A : DÉBIT DU SOLDE SOURCE (Dans la table Wallet) ---
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: fromCurrency } }
      });

      if (!sourceWallet || sourceWallet.balance < quote.fromAmount) {
        throw new Error(`Solde ${fromCurrency} insuffisant`);
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
          type: targetCurrency === "PI" ? "PI" : "FIAT"
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
          description: `Swap GCV : ${sourceSymbol} → ${targetSymbol}`,
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
    });

    return NextResponse.json({
      success: true,
      message: "Swap effectué avec succès",
      reference: result.reference
    });

  } catch (error: any) {
    console.error("CONFIRM_SWAP_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur lors du swap" }, { status: 400 });
  }
}
