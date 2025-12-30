"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; 
import { revalidatePath } from "next/cache";

/**
 * Action pour l'achat d'une carte virtuelle
 */
export async function purchaseVirtualCard(
  cardType: 'CLASSIC' | 'GOLD' | 'BUSINESS' | 'ULTRA',
  price: number
) {
  try {
    const session = await auth();
    const userId = session?.id;

    if (!userId) {
      return { success: false, error: "Session expirée. Veuillez vous reconnecter." };
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true, name: true }
      });

      if (!user) throw new Error("Utilisateur non trouvé.");

      const cardHolderName = user.name ||
        (user.firstName ? `${user.firstName} ${user.lastName || ''}` : "PI PIONEER");

      const wallet = await tx.wallet.findFirst({
        where: { userId, currency: "PI" }
      });

      if (!wallet || wallet.balance < price) {
        const currentBalance = wallet?.balance || 0;
        throw new Error(`Solde insuffisant. Requis: ${price.toFixed(4)} PI, Dispo: ${currentBalance.toFixed(4)} PI.`);
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: price } }
      });

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

      const isMastercard = cardType === 'GOLD' || cardType === 'ULTRA' || cardType === 'BUSINESS';
      const prefix = isMastercard ? "5412" : "4111";
      const cardNumber = prefix + Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');

      // --- SECTION CORRIGÉE SELON TON SCHEMA.PRISMA ---
      const newCard = await tx.virtualCard.create({
        data: {
          userId: userId,
          type: cardType,
          holder: cardHolderName.trim().toUpperCase(),
          number: cardNumber,
          exp: "12/28",
          cvv: Math.floor(100 + Math.random() * 900).toString(),
          brand: isMastercard ? "MASTERCARD" : "VISA",
          isFrozen: false,
          // Note: On n'ajoute pas 'status' ici car il n'existe pas dans ton schema.prisma
          // Le champ dailyLimit et allowedCurrencies prendront les valeurs par défaut du schéma
        }
      });

      return newCard;
    });

    revalidatePath("/dashboard/card");
    revalidatePath("/wallet");

    return { success: true, data: result };

  } catch (error: any) {
    console.error("CRITICAL_CARD_PURCHASE_ERROR:", error.message);
    return { success: false, error: error.message || "Une erreur interne est survenue." };
  }
}
