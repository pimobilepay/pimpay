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

    const result = await prisma.$transaction(async (tx) => {
      // 1. Récupération du devis
      const quote = await tx.swapQuote.findUnique({ where: { id: quoteId, userId } });
      if (!quote) throw new Error("Devis introuvable");
      if (new Date() > quote.expiresAt) throw new Error("Le taux a expiré");

      // 2. Déduction automatique des devises (Source vs Cible)
      // Si la cible est PI, la source est forcément le Fiat sélectionné (ou USD par défaut)
      // Si la cible est FIAT (USD, XAF...), la source est forcément PI
      const targetCurrency = quote.targetCurrency.toUpperCase();
      const fromCurrency = targetCurrency === "PI" ? "USD" : "PI"; 

      // 3. EXÉCUTION DU DÉBIT (Wallet Source)
      const sourceWallet = await tx.wallet.update({
        where: { userId_currency: { userId, currency: fromCurrency } },
        data: { balance: { decrement: quote.fromAmount } }
      });

      if (sourceWallet.balance < 0) {
        throw new Error(`Solde ${fromCurrency} insuffisant pour cette opération`);
      }

      // 4. EXÉCUTION DU CRÉDIT (Wallet Cible)
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

      // 5. CRÉATION DU LOG DE TRANSACTION UNIQUE
      // On affiche le montant reçu avec le bon symbole dans la description
      const sourceSymbol = fromCurrency === "PI" ? "π" : fromCurrency;
      const targetSymbol = targetCurrency === "PI" ? "π" : targetCurrency;

      await tx.transaction.create({
        data: {
          reference: `SWP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: quote.fromAmount,
          netAmount: quote.toAmount,
          currency: fromCurrency,      // Monnaie vendue
          destCurrency: targetCurrency, // Monnaie reçue
          type: "EXCHANGE",
          status: "COMPLETED",
          // Description dynamique : "Swap GCV : π → USD" ou "Swap GCV : USD → π"
          description: `Swap GCV : ${sourceSymbol} → ${targetSymbol}`,
          fromUserId: userId,
          toUserId: userId,
          fromWalletId: sourceWallet.id,
          toWalletId: targetWallet.id,
          retailRate: quote.rate
        }
      });

      // 6. Nettoyage du devis
      await tx.swapQuote.delete({ where: { id: quoteId } });

      return { 
        success: true, 
        received: quote.toAmount, 
        currency: targetCurrency 
      };
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("SWAP_FINAL_ERROR:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
