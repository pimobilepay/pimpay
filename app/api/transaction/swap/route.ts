import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // On attend désormais un quoteId généré au préalable
    const { quoteId } = await req.json();

    if (!quoteId) {
      return NextResponse.json({ error: "ID de devis manquant" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupérer et valider le devis (Quote)
      const quote = await tx.swapQuote.findUnique({
        where: { id: quoteId, userId: session.user.id }
      });

      if (!quote) throw new Error("Devis introuvable ou expiré");
      
      // Vérification de l'expiration (30 secondes)
      if (new Date() > quote.expiresAt) {
        throw new Error("Le taux a expiré. Veuillez rafraîchir le devis.");
      }

      // 2. Vérification des limites KYC
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { kycStatus: true }
      });

      const swapAmountPi = quote.fromAmount;
      // Limite : 100 PI max pour les non-vérifiés (Exemple)
      if (user?.kycStatus !== "APPROVED" && swapAmountPi > 100) {
        throw new Error("Limite de 100 PI dépassée. Veuillez valider votre KYC.");
      }

      // 3. Récupération de la config et calcul des frais
      const config = await tx.systemConfig.findUnique({
        where: { id: "GLOBAL_CONFIG" }
      });
      const networkFees = config?.transactionFee || 0.01;
      const totalPiDeduction = swapAmountPi + networkFees;

      // 4. Vérifier le solde PI
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId: session.user.id, currency: "PI" } }
      });

      if (!sourceWallet || sourceWallet.balance < totalPiDeduction) {
        throw new Error("Solde PI insuffisant pour couvrir le swap et les frais.");
      }

      // 5. Exécution des mouvements de fonds
      // A. Débit PI
      const updatedSourceWallet = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: totalPiDeduction } }
      });

      // B. Crédit Devise Cible (ex: USD)
      const targetWallet = await tx.wallet.upsert({
        where: { userId_currency: { userId: session.user.id, currency: quote.targetCurrency } },
        update: { balance: { increment: quote.toAmount } },
        create: {
          userId: session.user.id,
          currency: quote.targetCurrency,
          balance: quote.toAmount,
          label: `Wallet ${quote.targetCurrency}`
        }
      });

      // 6. Création de la transaction finale
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${session.user.id.slice(0, 5)}`.toUpperCase(),
          amount: swapAmountPi,
          fee: networkFees,
          netAmount: quote.toAmount,
          type: "EXCHANGE",
          status: "SUCCESS",
          description: `Swap verrouillé : ${swapAmountPi} PI -> ${quote.toAmount} ${quote.targetCurrency}`,
          fromUserId: session.user.id,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          metadata: {
            quoteId: quote.id,
            rate: quote.rate,
            targetCurrency: quote.targetCurrency
          }
        }
      });

      // 7. Mise à jour stats système & Nettoyage du devis utilisé
      await tx.systemConfig.update({
        where: { id: "GLOBAL_CONFIG" },
        data: {
          totalVolumePi: { increment: swapAmountPi },
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
    console.error("Swap Transaction Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
