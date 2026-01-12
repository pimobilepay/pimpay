export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  try {
    // 1. AUTHENTICATION
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. VÉRIFICATION DE LA SESSION
    const dbSession = await prisma.session.findUnique({
      where: { token: token },
      include: {
        user: {
          select: {
            id: true,
            kycStatus: true,
            status: true,
          }
        }
      },
    });

    if (!dbSession || !dbSession.isActive || !dbSession.user) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const userId = dbSession.user.id;
    const body = await req.json().catch(() => ({}));
    const { quoteId } = body;

    if (!quoteId) {
      return NextResponse.json({ error: "Identifiant de devis manquant" }, { status: 400 });
    }

    // 3. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {

      const quote = await tx.swapQuote.findUnique({
        where: { id: quoteId, userId: userId }
      });

      if (!quote) {
        throw new Error("Devis introuvable ou déjà utilisé");
      }

      if (new Date() > quote.expiresAt) {
        throw new Error("Le taux a expiré.");
      }

      // CORRECTION DE L'ERREUR DE TYPE ICI :
      // Si targetCurrency n'est pas "PI", alors on vend du "PI".
      // Si targetCurrency est "PI", on vend du "USD" (ou la devise par défaut de ton choix).
      const isSellingPi = quote.targetCurrency !== "PI";
      const sourceCurrency = isSellingPi ? "PI" : "USD"; 
      const targetCurrency = quote.targetCurrency;

      // 4. Frais Système
      const config = await tx.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      const networkFees = config?.transactionFee ?? 0.01;
      
      const amountToDeduct = sourceCurrency === "PI" 
        ? Number((quote.fromAmount + networkFees).toFixed(8))
        : quote.fromAmount;

      // 5. Débit du portefeuille SOURCE
      const sourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: sourceCurrency } }
      });

      if (!sourceWallet || sourceWallet.balance < amountToDeduct) {
        throw new Error(`Solde ${sourceCurrency} insuffisant.`);
      }

      const updatedSourceWallet = await tx.wallet.update({
        where: { id: sourceWallet.id },
        data: { balance: { decrement: amountToDeduct } }
      });

      // 6. Crédit du portefeuille CIBLE
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

      // 7. Log Transaction
      const transaction = await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${userId.substring(0, 4)}`.toUpperCase(),
          amount: quote.fromAmount,
          fee: sourceCurrency === "PI" ? networkFees : 0,
          netAmount: quote.toAmount,
          currency: sourceCurrency,
          destCurrency: targetCurrency,
          type: "EXCHANGE",
          status: "COMPLETED",
          description: `Swap : ${quote.fromAmount} ${sourceCurrency} → ${quote.toAmount} ${targetCurrency}`,
          fromUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate,
        }
      });

      await tx.swapQuote.delete({ where: { id: quoteId } });

      return { updatedSourceWallet, targetWallet, transaction };
    }, {
      timeout: 10000 
    });

    return NextResponse.json({
      success: true,
      message: "Swap exécuté avec succès",
      reference: result.transaction.reference
    });

  } catch (error: any) {
    console.error("SWAP_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
