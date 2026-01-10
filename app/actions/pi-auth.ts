"use server";

import { prisma } from "@/lib/prisma";

export async function authenticatePiUser(piData: { uid: string; username: string }) {
  try {
    // 1. Chercher si l'utilisateur existe déjà via son piUserId
    let user = await prisma.user.findUnique({
      where: { piUserId: piData.uid }
    });

    if (!user) {
      // 2. Créer l'utilisateur s'il est nouveau
      user = await prisma.user.create({
        data: {
          piUserId: piData.uid,
          username: piData.username,
          status: "ACTIVE",
          // phone est optionnel dans ton nouveau schéma, mais on peut laisser "" 
          // ou l'enlever. Gardons "" pour la cohérence.
          phone: null, 
          wallets: {
            create: {
              currency: "PI",
              balance: 0,
              // CORRECTION : Utilisation d'une valeur valide de l'enum WalletType
              type: "PI" 
            }
          }
        }
      });
    }

    // Retour pour gérer la session
    return { 
      success: true, 
      userId: user.id, 
      username: user.username 
    };
  } catch (error: any) {
    console.error("Erreur Auth Pi (Pimpay):", error.message);
    return { success: false, error: error.message };
  }
}
