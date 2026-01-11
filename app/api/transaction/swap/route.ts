export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // 1. AUTHENTICATION (Standard PimPay)
    const cookieStore = await cookies();
    const token = cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. VÉRIFICATION DE LA SESSION & UTILISATEUR
    const dbSession = await prisma.session.findUnique({
      where: { token: token },
      include: {
        user: {
          select: {
            id: true,
            kycStatus: true,
            status: true,
            role: true
          }
        }
      },
    });

    if (!dbSession || !dbSession.isActive || !dbSession.user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    if (dbSession.user.status !== "ACTIVE") {
      return NextResponse.json({ error: "Compte restreint ou suspendu" }, { status: 403 });
    }

    const userId = dbSession.user.id;
    const body = await req.json().catch(() => ({}));
    const { quoteId } = body;

    if (!quoteId) {
      return NextResponse.json({ error: "Identifiant de devis manquant" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE (Swap PI -> FIAT)
    // On utilise une transaction avec un timeout pour éviter les blocages longs
    const result = await prisma.$transaction(async (tx) => {
      
      // A. Récupérer et supprimer immédiatement le devis (Protection contre le rejeu)
      // On le cherche d'abord pour validation
      const quote = await tx.swapQuote.findUnique({
        where: { id: quoteId, userId: userId }
      });

      if (!quote) {
        throw new Error("Devis introuvable, expiré ou déjà utilisé");
      }

      if (new Date() > quote.expiresAt) {
        throw new Error("Le taux a expiré. Veuillez demander un nouveau devis.");
      }

      // B. Vérification KYC (Enums: VERIFIED / APPROVED)
      const needsKyc = quote.fromAmount > 100;
      const isVerified = dbSession.user.kycStatus === "VERIFIED" || dbSession.user.kycStatus === "APPROVED";

      if (needsKyc && !isVerified) {
        throw new Error("Limite de 100 PI dépassée pour les comptes non-vérifiés.");
      }

      // C. Frais Système
      const config = await tx.systemConfig.findUnique({
        where: { id: "GLOBAL_CONFIG" }
      });
      const networkFees = config?.transactionFee ?? 0.01;
      const totalPiDeduction = Number((quote.fromAmount + networkFees).toFixed(8));

      // D. Débit du portefeuille PI (avec vérification de solde rigoureuse)
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: "PI" } }
      });

      if (!sourceWallet || sourceWallet.balance < totalPiDeduction) {
        throw new Error(`Solde insuffisant : ${totalPiDeduction.toFixed(4)} PI requis (frais inclus).`);
      }

      const updatedSourceWallet = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: totalPiDeduction } }
      });

      // Sécurité anti-solde négatif (Double check)
      if (updatedSourceWallet.balance < 0) {
        throw new Error("Erreur critique : Solde insuffisant détecté lors du débit.");
      }

      // E. Crédit du portefeuille cible
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: quote.targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId,
          currency: quote.targetCurrency,
          balance: quote.toAmount,
          type: "FIAT"
        }
      });

      // F. Création du log financier
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${userId.substring(0, 4)}`.toUpperCase(),
          amount: quote.fromAmount,
          fee: networkFees,
          netAmount: quote.toAmount,
          currency: "PI",
          destCurrency: quote.targetCurrency,
          type: "EXCHANGE", // Type spécifique pour le swap
          status: "COMPLETED",
          description: `Swap : ${quote.fromAmount} PI → ${quote.toAmount} ${quote.targetCurrency}`,
          fromUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate,
          metadata: { quoteId: quote.id, consensusPrice: config?.consensusPrice }
        }
      });

      // G. Mise à jour des volumes
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: {
          totalVolumePi: { increment: quote.fromAmount },
          totalProfit: { increment: networkFees }
        }
      });

      // H. Suppression définitive du devis pour clore le cycle
      await tx.swapQuote.delete({ where: { id: quoteId } });

      return { updatedSourceWallet, targetWallet, transaction };
    }, {
      timeout: 10000 // 10 secondes max pour la transaction financière
    });

    return NextResponse.json({
      success: true,
      message: "Swap confirmé et exécuté",
      newBalances: {
        pi: result.updatedSourceWallet.balance,
        [result.targetWallet.currency]: result.targetWallet.balance
      },
      reference: result.transaction.reference
    });

  } catch (error: any) {
    console.error("SWAP_CONFIRMATION_ERROR:", error.message);
    return NextResponse.json({ 
      error: error.message || "Une erreur est survenue lors du swap" 
    }, { status: 400 });
  }
}
