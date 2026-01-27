import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import * as jose from "jose";

// Singleton Prisma
const globalForPrisma = global as unknown as { prisma: PrismaClient };
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Importation TronWeb
const TronWebModule = require('tronweb');
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1. Récupération du token
    const token = req.headers.get("cookie")
      ?.split("; ")
      .find(row => row.startsWith("token="))
      ?.split("=")[1];

    if (!token) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Vérification JWT
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jose.jwtVerify(token, secret);
    const userId = payload.id as string;

    // 3. Vérification si l'adresse existe déjà
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdtAddress: true }
    });

    if (user?.usdtAddress) {
      return NextResponse.json({ address: user.usdtAddress });
    }

    // 4. Instanciation TRC20 et génération du compte
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    });

    const account = await tronWeb.createAccount();

    if (!account || !account.address) {
      throw new Error("Échec de la création du compte Tron");
    }

    // 5. Sauvegarde Prisma (Transaction pour lier User et Wallet)
    // On utilise $transaction pour s'assurer que les deux opérations réussissent ensemble
    const result = await prisma.$transaction(async (tx) => {
      // Mise à jour des identifiants blockchain sur l'utilisateur
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          usdtAddress: account.address.base58,
          usdtPrivateKey: account.privateKey
        }
      });

      // Création automatique de la ligne dans la table Wallet pour le solde
      await tx.wallet.upsert({
        where: {
          userId_currency: {
            userId: userId,
            currency: "USDT",
          },
        },
        update: {}, // Si le wallet existe déjà, on ne change rien
        create: {
          userId: userId,
          currency: "USDT",
          type: "CRYPTO", // Définit le type selon ton Enum WalletType
          balance: 0,
        },
      });

      return updatedUser;
    });

    return NextResponse.json({
      address: result.usdtAddress,
      message: "Adresse USDT et Wallet générés avec succès"
    });

  } catch (error: any) {
    console.error("Erreur USDT API:", error.message);
    return NextResponse.json(
      { error: "Erreur lors de la génération: " + error.message },
      { status: 500 }
    );
  }
}
