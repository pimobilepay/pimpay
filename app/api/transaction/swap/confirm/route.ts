export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Authentification
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader?.split("; ").find(row => row.startsWith("token="))?.split("=")[1];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const dbSession = await prisma.session.findUnique({
      where: { token },
      include: { user: true }
    });

    if (!dbSession || !dbSession.isActive) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const { quoteId } = await req.json();

    // 2. Récupération et validation du devis (Quote)
    const quote = await prisma.swapQuote.findUnique({
      where: { id: quoteId }
    });

    if (!quote || quote.userId !== dbSession.userId) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }

    if (new Date() > quote.expiresAt) {
      return NextResponse.json({ error: "Le devis a expiré, veuillez recommencer" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (Tout passe ou tout échoue)
    const result = await prisma.$transaction(async (tx) => {
      // a. Vérifier et débiter le portefeuille PI
      const piWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: quote.userId, currency: "PI" } }
      });

      if (!piWallet || piWallet.balance < quote.fromAmount) {
        throw new Error("Solde Pi insuffisant pour finaliser le swap");
      }

      await tx.wallet.update({
        where: { id: piWallet.id },
        data: { balance: { decrement: quote.fromAmount } }
      });

      // b. Créditer le portefeuille cible (USD, XAF, etc.)
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: quote.userId, currency: quote.targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId: quote.userId,
          currency: quote.targetCurrency,
          balance: quote.toAmount,
          type: "FIAT"
        }
      });

      // c. Créer l'enregistrement de la transaction pour l'historique
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWAP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: quote.fromAmount,
          netAmount: quote.toAmount,
          currency: "PI",
          destCurrency: quote.targetCurrency,
          status: "SUCCESS",
          description: `Swap de ${quote.fromAmount} PI vers ${quote.targetCurrency}`,
          fromUserId: quote.userId,
          fromWalletId: piWallet.id,
          toUserId: quote.userId,
          toWalletId: targetWallet.id,
          retailRate: quote.rate
        }
      });

      // d. Supprimer le devis utilisé
      await tx.swapQuote.delete({ where: { id: quote.id } });

      return transaction;
    });

    return NextResponse.json({
      success: true,
      message: "Swap effectué avec succès",
      transaction: result
    });

  } catch (error: any) {
    console.error("CONFIRM_SWAP_ERROR:", error.message);
    return NextResponse.json({ error: error.message || "Erreur lors du swap" }, { status: 500 });
  }
}
