"use server";

import { prisma } from "@/lib/prisma";
import { TransactionStatus, TransactionType } from "@prisma/client";

export async function processDeposit(formData: {
  amount: number;
  method: string;
  phone: string;
  currency: string;
}) {
  const reference = `TX-PIM-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;

  try {
    // 1. Récupérer un utilisateur réel pour éviter l'erreur de clé étrangère
    // Dans un vrai projet, on utiliserait l'ID de la session (Clerk/NextAuth)
    const user = await prisma.user.findFirst();

    if (!user) {
      return { success: false, error: "Aucun utilisateur trouvé en base. Créez un compte d'abord." };
    }

    // 2. Création de la transaction liée à l'utilisateur réel
    const result = await prisma.transaction.create({
      data: {
        reference: reference,
        amount: formData.amount,
        type: TransactionType.DEPOSIT,
        status: TransactionStatus.PENDING,
        fromUserId: user.id,
        toUserId: user.id,
        description: `Dépôt via ${formData.method}`,
        metadata: {
          phone: formData.phone,
          method: formData.method,
          country: formData.currency,
          dateInitiated: new Date().toISOString()
        }
      }
    });

    return { success: true, reference: result.reference };
  } catch (error) {
    console.error("Erreur Prisma:", error);
    return { success: false, error: "Erreur lors de la création de la transaction." };
  }
}
