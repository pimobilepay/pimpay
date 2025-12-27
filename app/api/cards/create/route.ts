import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Configuration des paliers en USD
const CARD_TIERS = {
  PLATINIUM: { usdPrice: 10, limit: 50000, currencies: ["PI", "USD", "EUR", "GBP"] },
  PREMIUM: { usdPrice: 25, limit: 1000, currencies: ["PI"] },
  GOLD: { usdPrice: 50, limit: 10000, currencies: ["PI", "USD"] },
};

export async function POST(req: NextRequest) {
  try {
    // 1. AUTHENTIFICATION SÉCURISÉE
    const userPayload = await verifyAuth(req);
    
    // Debug pour voir ce que contient le payload en cas d'erreur 401
    console.log("Auth Debug - UserPayload:", userPayload);

    // Si verifyAuth renvoie une réponse (ex: 401), on la retourne directement
    if (!userPayload || userPayload instanceof NextResponse) {
      return NextResponse.json({ error: "Session invalide ou expirée" }, { status: 401 });
    }

    // Extraction sécurisée des données du body
    const body = await req.json();
    const { type, holderName, paymentCurrency } = body;

    const tier = CARD_TIERS[type as keyof typeof CARD_TIERS];

    if (!tier) {
      return NextResponse.json({ error: "Type de carte invalide" }, { status: 400 });
    }

    // 2. RÉCUPÉRATION DU PRIX DU PI (GCV)
    const systemConfig = await prisma.systemConfig.findFirst();
    const piPriceInUsd = systemConfig?.consensusPrice || 314159;

    // 3. CALCUL DU PRIX FINAL
    // Si paymentCurrency est "PI", on divise le prix USD par la valeur du Pi
    const finalPrice = paymentCurrency === "PI" 
      ? tier.usdPrice / piPriceInUsd 
      : tier.usdPrice;

    // 4. TRANSACTION ATOMIQUE (Paiement + Création)
    const result = await prisma.$transaction(async (tx) => {
      // Vérification du portefeuille spécifique (PI ou USD)
      const wallet = await tx.wallet.findUnique({
        where: {
          userId_currency: { 
            userId: userPayload.id, 
            currency: paymentCurrency 
          }
        }
      });

      if (!wallet || wallet.balance < finalPrice) {
        throw new Error(`Solde ${paymentCurrency} insuffisant (Requis: ${finalPrice.toFixed(6)})`);
      }

      // Déduction du solde
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: finalPrice } }
      });

      // Création de la transaction de débit pour l'historique
      await tx.transaction.create({
        data: {
          reference: `CARD-BUY-${Date.now()}`,
          amount: finalPrice,
          type: "PAYMENT",
          status: "COMPLETED",
          description: `Achat Carte ${type} via ${paymentCurrency}`,
          fromUserId: userPayload.id,
          fromWalletId: wallet.id
        }
      });

      // Génération numéro de carte aléatoire
      const cardNumber = `4532${Math.floor(100000000000 + Math.random() * 900000000000)}`;

      // Création de la carte dans la base de données
      return await tx.virtualCard.create({
        data: {
          userId: userPayload.id,
          type: type as any, // Cast pour l'enum CardType
          number: cardNumber,
          exp: "12/28",
          cvv: Math.floor(100 + Math.random() * 899).toString(),
          holder: holderName || "PimPay User",
          dailyLimit: tier.limit,
          allowedCurrencies: tier.currencies,
        }
      });
    });

    return NextResponse.json({ success: true, card: result });

  } catch (error: any) {
    console.error("CREATE_CARD_ERROR:", error);
    return NextResponse.json(
      { error: error.message || "Une erreur est survenue lors de la création" }, 
      { status: 400 }
    );
  }
}
