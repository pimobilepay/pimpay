import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Configuration des paliers en USD (comme demandé)
const CARD_TIERS = {
  PLATINIUM: { usdPrice: 10, limit: 50000, currencies: ["PI", "USD", "EUR", "GBP"] },
  PREMIUM: { usdPrice: 25, limit: 1000, currencies: ["PI"] },
  GOLD: { usdPrice: 50, limit: 10000, currencies: ["PI", "USD"] },
};

export async function POST(req: NextRequest) {
  try {
    const userPayload = await verifyAuth(req);
    if (!userPayload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { type, holderName, paymentCurrency } = await req.json(); // paymentCurrency: "PI" ou "USD"
    const tier = CARD_TIERS[type as keyof typeof CARD_TIERS];

    if (!tier) return NextResponse.json({ error: "Type de carte invalide" }, { status: 400 });

    // 1. RÉCUPÉRATION DU PRIX DU PI DEPUIS LA CONFIG SYSTÈME
    const config = await prisma.systemConfig.findFirst();
    const piPriceInUsd = config?.consensusPrice || 314159; // Prix GCV par défaut

    // 2. CALCUL DU PRIX SELON LA DEVISE CHOISIE
    let finalPrice = 0;
    if (paymentCurrency === "PI") {
      // Formule : Prix USD / Valeur du Pi
      finalPrice = tier.usdPrice / piPriceInUsd;
    } else {
      finalPrice = tier.usdPrice;
    }

    // 3. TRANSACTION ATOMIQUE
    const result = await prisma.$transaction(async (tx) => {
      // Vérifier le solde du wallet correspondant
      const wallet = await tx.wallet.findUnique({
        where: { 
          userId_currency: { userId: userPayload.id, currency: paymentCurrency } 
        }
      });

      if (!wallet || wallet.balance < finalPrice) {
        throw new Error(`Solde ${paymentCurrency} insuffisant.`);
      }

      // Déduire les frais
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: finalPrice } }
      });

      // Créer la carte
      const cardNumber = `4532${Math.floor(100000000000 + Math.random() * 900000000000)}`;
      
      return await tx.virtualCard.create({
        data: {
          userId: userPayload.id,
          type: type,
          number: cardNumber,
          exp: "12/28",
          cvv: Math.floor(100 + Math.random() * 899).toString(),
          holder: holderName,
          dailyLimit: tier.limit,
          allowedCurrencies: tier.currencies,
        }
      });
    });

    return NextResponse.json({ success: true, card: result });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur serveur" }, { status: 400 });
  }
}
