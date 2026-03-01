"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Assure-toi que le chemin pointe vers le fichier où tu as ajouté l'export 'auth'
import { CardType } from "@prisma/client";

export async function purchaseVirtualCard(tier: CardType, priceInPi: number) {
  try {
    // Utilisation de ta nouvelle fonction auth()
    const user = await auth();

    if (!user || !user.id) {
      return { error: "Session expirée ou utilisateur non trouvé" };
    }

    const userId = user.id;

    // 1. Récupérer le wallet PI (unique par userId et currency d'après ton schéma)
    const wallet = await prisma.wallet.findUnique({
      where: { 
        userId_currency: { 
          userId: userId, 
          currency: "PI" 
        } 
      },
    });

    if (!wallet || wallet.balance < priceInPi) {
      return { error: "Solde Pi insuffisant pour l'émission" };
    }

    // 2. Transaction Atomique Prisma
    const result = await prisma.$transaction(async (tx) => {
      // A. Déduction du solde
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: priceInPi } },
      });

      // B. Création de la transaction (Sans le champ 'type' manquant)
      await tx.transaction.create({
        data: {
          reference: `CARD-PUB-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`,
          amount: priceInPi,
          status: "SUCCESS",
          fromUserId: userId,
          fromWalletId: wallet.id,
          description: `Achat carte virtuelle ${tier}`,
          metadata: {
            category: "CARD_PURCHASE",
            cardType: tier,
            piRate: "GCV 314159",
            timestamp: new Date().toISOString()
          },
        },
      });

      // C. Génération des données MasterCard
      const cardNumber = "5412" + Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
      const expiry = "01/31";
      const cvv = Math.floor(Math.random() * 900 + 100).toString();

      // D. Création de la carte virtuelle
      const newCard = await tx.virtualCard.create({
        data: {
          userId: userId,
          type: tier,
          number: cardNumber,
          exp: expiry,
          cvv: cvv,
          holder: user.username || "Pioneer",
          brand: (tier === "CLASSIC" || tier === "GOLD") ? "VISA" : "MASTERCARD",
          dailyLimit: tier === "ULTRA" ? 1000000 : (tier === "BUSINESS" ? 25000 : 5000),
        },
      });

      return newCard;
    }, { maxWait: 10000, timeout: 30000 });

    return { success: true, card: result };
  } catch (error: any) {
    console.error("CRITICAL_CARD_PURCHASE_ERROR:", error);
    return { error: "Erreur technique lors du minage de la carte." };
  }
}
