"use server";

import { prisma } from "@/lib/prisma";
import { TransactionStatus } from "@prisma/client";

export async function processDeposit(formData: {
  amount: number;
  method: string;
  phone: string;
  currency: string;
}) {
  const reference = `TX-PIM-${Math.random().toString(36).toUpperCase().substring(2, 10)}`;

  try {
    // 1. Récupérer un utilisateur réel
    // Note : Plus tard, remplace ceci par la récupération de l'utilisateur connecté
    const user = await prisma.user.findFirst();

    if (!user) {
      return { 
        success: false, 
        error: "Utilisateur introuvable. Veuillez vous connecter." 
      };
    }

    // 2. Création de la transaction
    const result = await prisma.transaction.create({
      data: {
        reference: reference,
        amount: formData.amount,
        // Correction : Ton schéma utilise 'purpose' (String) pour stocker le type
        purpose: "DEPOSIT", 
        status: TransactionStatus.PENDING,
        fromUserId: user.id,
        toUserId: user.id,
        
        // Optionnel : On remplit aussi les champs spécifiques du schéma s'ils sont utiles
        operatorId: formData.method,
        countryCode: formData.currency,
        
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
  } catch (error: any) {
    console.error("Erreur Prisma détaillée:", error);
    return { 
      success: false, 
      error: "Le protocole PimPay n'a pas pu enregistrer la transaction." 
    };
  }
}
