import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { Wallet } from "ethers";
import { encrypt } from "@/lib/crypto";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 1. VERIFICATION : On récupère l'utilisateur et son wallet existant
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { sidraAddress: true }
    });

    // Si l'adresse existe déjà, on la renvoie simplement
    if (user?.sidraAddress) {
      return NextResponse.json({
        address: user.sidraAddress,
        message: "Adresse existante récupérée"
      });
    }

    // 2. GÉNÉRATION : Création d'un wallet Sidra (compatible EVM/Ethereum)
    const wallet = Wallet.createRandom();

    // 3. TRANSACTION ATOMIQUE : Sécurité bancaire PimPay
    const result = await prisma.$transaction(async (tx) => {
      // Mise à jour des clés sur le profil utilisateur (clé privée chiffrée)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          sidraAddress: wallet.address,
          sidraPrivateKey: encrypt(wallet.privateKey) // Chiffrement sécurisé
        },
        select: { sidraAddress: true }
      });

      // Création ou mise à jour du Wallet SDA dans la table Wallet
      await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "SDA" } },
        update: { type: "SIDRA" }, // On s'assure que le type est correct
        create: {
          userId: userId,
          currency: "SDA",
          type: "SIDRA",
          balance: 0,
        },
      });

      return updatedUser;
    }, { maxWait: 10000, timeout: 30000 });

    console.log(`[PIMPAY] Nouveau Wallet Sidra généré pour ${userId}: ${result.sidraAddress}`);

    return NextResponse.json({
      success: true,
      address: result.sidraAddress,
      message: "Nouvelle adresse Sidra générée avec succès"
    });

  } catch (error: any) {
    console.error("❌ [SIDRA_GEN_ERROR]:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la création du wallet Sidra", details: error.message },
      { status: 500 }
    );
  }
}
