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
          include: { wallets: true }
        }
      },
    });

    if (!dbSession || !dbSession.isActive) {
      return NextResponse.json({ error: "Session invalide" }, { status: 401 });
    }

    const user = dbSession.user;
    // Récupération de sourceCurrency (ex: "PI" ou "USD") et targetCurrency
    const { amount, sourceCurrency, targetCurrency } = await req.json(); 
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
    }

    // 3. Vérification du solde selon la monnaie SOURCE
    const sellingCurrency = sourceCurrency || "PI";
    const sourceWallet = user.wallets.find(w => w.currency === sellingCurrency);

    if (!sourceWallet || sourceWallet.balance < parsedAmount) {
      return NextResponse.json({ 
        error: `Solde ${sellingCurrency} insuffisant` 
      }, { status: 400 });
    }

    // 4. Logique de conversion dynamique
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    const baseRate = config?.consensusPrice || 31.4159; // 1 PI = 31.41 USD (exemple)

    const currencyMultipliers: Record<string, number> = {
      "USD": 1,
      "EUR": 0.92,
      "XAF": 600,
      "XOF": 600,
      "CDF": 2800
    };

    let finalRate = 0;
    let convertedAmount = 0;

    if (sellingCurrency === "PI") {
      // Cas : PI -> FIAT
      const multiplier = currencyMultipliers[targetCurrency] || 1;
      finalRate = baseRate * multiplier;
      convertedAmount = parsedAmount * finalRate;
    } else {
      // Cas : FIAT -> PI
      const multiplier = currencyMultipliers[sellingCurrency] || 1;
      const fiatToPiRate = 1 / (baseRate * multiplier);
      finalRate = fiatToPiRate;
      convertedAmount = parsedAmount * finalRate;
    }

    // 5. Création du devis en base
    const quote = await prisma.swapQuote.create({
      data: {
        userId: user.id,
        fromAmount: parsedAmount,
        toAmount: convertedAmount,
        rate: finalRate,
        targetCurrency: targetCurrency || "PI",
        expiresAt: new Date(Date.now() + 30 * 1000), 
      }
    });

    return NextResponse.json({
      success: true,
      quoteId: quote.id,
      fromCurrency: sellingCurrency,
      targetCurrency: targetCurrency,
      rate: finalRate,
      convertedAmount,
      expiresIn: 30
    });

  } catch (error: any) {
    console.error("SWAP_QUOTE_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
