"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Import de ton système d'authentification
import { revalidatePath } from "next/cache";

/**
 * Action pour l'achat d'une carte virtuelle
 * @param cardType - Le palier de la carte (CLASSIC, GOLD, BUSINESS, ULTRA)
 * @param price - Le prix à débiter (déjà calculé en PI selon le GCV)
 */
export async function purchaseVirtualCard(
  cardType: 'CLASSIC' | 'GOLD' | 'BUSINESS' | 'ULTRA',
  price: number
) {
  try {
    // 1. Récupération de la session côté serveur (Sécurité maximale)
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 2. Récupérer l'utilisateur pour le nom sur la carte
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, name: true }
      });

      if (!user) throw new Error("Utilisateur non trouvé.");

      // Construction du nom du titulaire
      const cardHolderName = user.name || 
        (user.firstName ? `${user.firstName} ${user.lastName || ''}` : "PI PIONEER");

      // 3. Vérifier le solde du Wallet PI
      const wallet = await tx.wallet.findFirst({
        where: { userId, currency: "PI" }
      });

      if (!wallet || wallet.balance < price) {
        const currentBalance = wallet?.balance || 0;
        throw new Error(`Solde insuffisant. Requis: ${price.toFixed(4)} PI, Dispo: ${currentBalance.toFixed(4)} PI.`);
      }

      // 4. Déduire le montant du solde
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: price } }
      });

      // 5. Créer la transaction pour l'historique
      const reference = `CARD-PUB-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

      await tx.transaction.create({
        data: {
          reference: reference,
          amount: price,
          type: "CARD_PURCHASE", 
          status: "SUCCESS",     
          fromUserId: userId,
          fromWalletId: wallet.id,
          description: `Achat carte virtuelle ${cardType}`,
          metadata: {
            cardType: cardType,
            piRate: "GCV 314159",
            timestamp: new Date().toISOString()
          }
        }
      });

      // 6. Générer les infos de la carte
      const isMastercard = cardType === 'GOLD' || cardType === 'ULTRA' || cardType === 'BUSINESS';
      const prefix = isMastercard ? "5412" : "4111";
      // Génère un numéro de 16 chiffres (prefix + 12 aléatoires)
      const cardNumber = prefix + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');

      const newCard = await tx.virtualCard.create({
        data: {
          userId: userId,
          type: cardType,
          holder: cardHolderName.trim().toUpperCase(),
          number: cardNumber,
          exp: "12/28", 
          cvv: Math.floor(100 + Math.random() * 900).toString(),
          brand: isMastercard ? "MASTERCARD" : "VISA",
          status: "ACTIVE",
          isFrozen: false,
        }
      });

      return newCard;
    });

    // 7. Rafraîchir les données de la page
    revalidatePath("/dashboard/card");
    revalidatePath("/wallet");

    return { success: true, data: result };

  } catch (error: any) {
    console.error("CRITICAL_CARD_PURCHASE_ERROR:", error.message);
    return { success: false, error: error.message || "Une erreur interne est survenue." };
  }
}
