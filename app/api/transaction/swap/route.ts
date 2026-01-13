export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";

export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.trim().split('=')));
    const token = cookies['token'];

    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);
    const userId = payload.id as string;

    const { quoteId } = await req.json();

    // 1. Récupération du devis hors transaction pour alléger le verrouillage SQL
    const quote = await prisma.swapQuote.findUnique({ where: { id: quoteId, userId } });
    if (!quote) throw new Error("Devis introuvable");
    if (new Date() > quote.expiresAt) throw new Error("Le taux a expiré");

    const targetCurrency = quote.targetCurrency.toUpperCase();
    const fromCurrency = targetCurrency === "PI" ? "USD" : "PI";

    // 2. Exécution de la transaction financière avec un Timeout étendu
    const result = await prisma.$transaction(async (tx) => {
      // Vérification du solde avant débit
      const userSourceWallet = await tx.wallet.findUnique({
        where: { userId_currency: { userId, currency: fromCurrency } }
      });

      if (!userSourceWallet || userSourceWallet.balance < quote.fromAmount) {
        throw new Error(`Solde ${fromCurrency} insuffisant`);
      }

      // 3. EXÉCUTION DU DÉBIT
      const sourceWallet = await tx.wallet.update({
        where: { userId_currency: { userId, currency: fromCurrency } },
        data: { balance: { decrement: quote.fromAmount } }
      });

      // 4. EXÉCUTION DU CRÉDIT (Upsert)
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

      // 5. CRÉATION DU LOG DE TRANSACTION
      const sourceSymbol = fromCurrency === "PI" ? "π" : fromCurrency;
      const targetSymbol = targetCurrency === "PI" ? "π" : targetCurrency;

      const transactionRecord = await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
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

      return {
        success: true,
        received: quote.toAmount,
        currency: targetCurrency,
        txId: transactionRecord.id
      };
    }, {
      maxWait: 5000, 
      timeout: 20000 // Augmenté à 20 secondes pour éviter le timeout Prisma
    });

    // 6. NETTOYAGE DU DEVIS (Hors de la transaction financière pour éviter les erreurs de verrouillage)
    try {
      await prisma.swapQuote.delete({ where: { id: quoteId } });
    } catch (deleteError) {
      console.warn("Échec de la suppression du quote, mais le swap a réussi.");
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("SWAP_FINAL_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
