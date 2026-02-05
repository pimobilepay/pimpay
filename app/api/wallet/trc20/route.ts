export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import * as jose from "jose";

// Importation TronWeb sécurisée
const TronWebModule = require('tronweb');
const TronWeb = TronWebModule.TronWeb || TronWebModule.default || TronWebModule;

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();

    // --- LE VACCIN HYBRIDE (Indispensable pour Pi Browser) ---
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;

    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jose.jwtVerify(classicToken, secret);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 1. VERIFICATION : On ne génère pas si l'adresse existe déjà
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { usdtAddress: true }
    });

    if (user?.usdtAddress) {
      return NextResponse.json({ 
        success: true,
        address: user.usdtAddress,
        message: "Adresse existante récupérée" 
      });
    }

    // 2. GENERATION : Utilisation de TronWeb pour créer un compte TRC20
    const tronWeb = new TronWeb({
      fullHost: 'https://api.trongrid.io'
    });

    const account = await tronWeb.createAccount();

    if (!account || !account.address) {
      throw new Error("Échec de la création du compte sur le réseau Tron");
    }

    // 3. TRANSACTION ATOMIQUE : Mise à jour User + Wallet
    const result = await prisma.$transaction(async (tx) => {
      // Sauvegarde des clés sur le profil (TRC20 utilise Base58 pour l'adresse)
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          usdtAddress: account.address.base58,
          usdtPrivateKey: account.privateKey
        },
        select: { usdtAddress: true }
      });

      // Création du Wallet USDT pour l'affichage du solde
      await tx.wallet.upsert({
        where: { userId_currency: { userId, currency: "USDT" } },
        update: { type: "CRYPTO" },
        create: {
          userId: userId,
          currency: "USDT",
          type: "CRYPTO",
          balance: 0,
        },
      });

      return updatedUser;
    });

    console.log(`[PIMPAY] Nouveau Wallet USDT (TRC20) pour ${userId}: ${result.usdtAddress}`);

    return NextResponse.json({
      success: true,
      address: result.usdtAddress,
      message: "Adresse USDT (TRC20) générée avec succès"
    });

  } catch (error: any) {
    console.error("❌ [USDT_GEN_ERROR]:", error.message);
    return NextResponse.json(
      { error: "Échec technique de génération USDT", details: error.message },
      { status: 500 }
    );
  }
}
