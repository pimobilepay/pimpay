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
          wallets: {
            create: {
              currency: "PI",
              balance: 0,
              type: "PI"
            }
          }
        }
      });
    }

    // Ici, tu peux gérer ta session (JWT ou Auth.js)
    return { success: true, userId: user.id };
  } catch (error) {
    console.error("Erreur Auth Pi:", error);
    return { success: false };
  }
}
