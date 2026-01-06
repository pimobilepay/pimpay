import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Extraction du token depuis les cookies (Méthode PimPay Session)
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Vérification de la session en base de données
    const dbSession = await prisma.session.findUnique({
      where: { token: token },
      include: { user: true },
    });

    if (!dbSession || !dbSession.isActive || !dbSession.user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const userId = dbSession.user.id;
    const { quoteId } = await req.json();

    if (!quoteId) {
      return NextResponse.json({ error: "ID de devis manquant" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      // A. Récupérer et valider le devis
      const quote = await tx.swapQuote.findUnique({
        where: { id: quoteId, userId: userId }
      });

      if (!quote) throw new Error("Devis introuvable");

      if (new Date() > quote.expiresAt) {
        throw new Error("Le taux a expiré. Veuillez rafraîchir le devis.");
      }

      // B. Vérification du statut KYC (Enums du schéma : VERIFIED)
      const user = dbSession.user;
      if (user.kycStatus !== "VERIFIED" && quote.fromAmount > 100) {
        throw new Error("Limite de 100 PI dépassée pour les comptes non-vérifiés.");
      }

      // C. Récupération des frais système
      const config = await tx.systemConfig.findUnique({
        where: { id: "GLOBAL_CONFIG" }
      });
      const networkFees = config?.transactionFee || 0.01;
      const totalPiDeduction = quote.fromAmount + networkFees;

      // D. Vérification et débit du portefeuille PI
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: userId, currency: "PI" } }
      });

      if (!sourceWallet || sourceWallet.balance < totalPiDeduction) {
        throw new Error("Solde PI insuffisant pour couvrir le swap et les frais.");
      }

      const updatedSourceWallet = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: totalPiDeduction } }
      });

      // E. Crédit de la devise cible (USD, XAF, etc.)
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: userId, currency: quote.targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId: userId,
          currency: quote.targetCurrency,
          balance: quote.toAmount,
          type: "FIAT" // Utilisation de l'Enum WalletType du schéma
        }
      });

      // F. Création de la transaction historique
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${userId.slice(0, 5)}`.toUpperCase(),
          amount: quote.fromAmount,
          fee: networkFees,
          netAmount: quote.toAmount,
          currency: "PI",
          destCurrency: quote.targetCurrency,
          status: "SUCCESS",
          description: `Swap : ${quote.fromAmount} PI -> ${quote.toAmount} ${quote.targetCurrency}`,
          fromUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate,
          metadata: {
            quoteId: quote.id,
            rate: quote.rate
          }
        }
      });

      // G. Nettoyage
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: {
          totalVolumePi: { increment: quote.fromAmount },
          totalProfit: { increment: networkFees }
        }
      });

      await tx.swapQuote.delete({ where: { id: quoteId } });

      return { updatedSourceWallet, targetWallet, transaction };
    });

    return NextResponse.json({
      success: true,
      newBalances: {
        pi: result.updatedSourceWallet.balance,
        [result.targetWallet.currency]: result.targetWallet.balance
      },
      reference: result.transaction.reference
    });

  } catch (error: any) {
    console.error("Swap Confirmation Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
