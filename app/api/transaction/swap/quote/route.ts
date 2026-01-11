export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 1. Extraction du token
    const cookieHeader = req.headers.get("cookie");
    const token = cookieHeader
      ?.split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Session manquante" }, { status: 401 });
    }

    // 2. Vérification de la session
    const dbSession = await prisma.session.findUnique({
      where: { token: token },
      include: { 
        user: {
          include: { wallets: true } // On récupère les portefeuilles pour vérifier le solde
        } 
      },
    });

    if (!dbSession || !dbSession.isActive) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = dbSession.user;
    const { amount, targetCurrency } = await req.json(); // targetCurrency ex: "XAF", "USD"
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // 3. Vérification du solde PI
    const piWallet = user.wallets.find(w => w.currency === "PI");
    if (!piWallet || piWallet.balance < parsedAmount) {
      return NextResponse.json({ error: "Solde Pi insuffisant" }, { status: 400 });
    }

    // 4. Logique de conversion dynamique
    // On récupère le prix consensus depuis la config système
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    const baseRate = config?.consensusPrice || 31.4159;
    
    // Multiplicateurs de devises (à ajuster selon le marché réel ou tes besoins)
    const currencyMultipliers: Record<string, number> = {
      "USD": 1,
      "EUR": 0.92,
      "XAF": 600,
      "XOF": 600,
      "CDF": 2800
    };

    const multiplier = currencyMultipliers[targetCurrency] || 1;
    const currentRate = baseRate * multiplier;
    const convertedAmount = parsedAmount * currentRate;

    // 5. Création du devis en base (Maintenant que SwapQuote existe dans ton schéma)
    const quote = await prisma.swapQuote.create({
      data: {
        userId: user.id,
        fromAmount: parsedAmount,
        toAmount: convertedAmount,
        rate: currentRate,
        targetCurrency: targetCurrency || "USD",
        expiresAt: new Date(Date.now() + 30 * 1000), // Valable 30 secondes
      }
    });

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      fromCurrency: "PI",
      targetCurrency: targetCurrency,
      rate: currentRate,
      convertedAmount,
      expiresIn: 30
    });

  } catch (error: any) {
    console.error("SWAP_QUOTE_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
