import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Wallet as EthersWallet } from "ethers";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 1. Récupérer l'état actuel de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: session.id },
      select: {
        sidraAddress: true,
        usdtAddress: true,
        walletAddress: true,
        sidraPrivateKey: true,
        usdtPrivateKey: true,
        walletPrivateKey: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    const updates: any = {};

    // 2. GÉNÉRATION EVM (Pour USDC, BUSD, DAI et SIDRA)
    // On utilise sidraAddress comme adresse principale EVM selon ton schéma
    if (!user.sidraAddress) {
      const evmWallet = EthersWallet.createRandom();
      updates.sidraAddress = evmWallet.address;
      updates.sidraPrivateKey = evmWallet.privateKey;
      updates.walletPrivateKey = evmWallet.privateKey; // Clé générique pour les réseaux EVM
    }

    // 3. GÉNÉRATION USDT (Réseau TRC20)
    if (!user.usdtAddress) {
      // Génération d'un format type Tron (T...)
      const usdtPrivKey = crypto.randomBytes(32).toString('hex');
      const usdtAddr = `T${crypto.randomBytes(20).toString('hex').substring(0, 33)}`;
      updates.usdtAddress = usdtAddr;
      updates.usdtPrivateKey = usdtPrivKey;
    }

    // 4. MISE À JOUR DE LA BASE DE DONNÉES
    if (Object.keys(updates).length > 0) {
      await prisma.user.update({
        where: { id: session.id },
        data: updates
      });
    }

    return NextResponse.json({
      success: true,
      message: "Identités blockchain synchronisées pour PimPay",
      data: {
        evmAddress: updates.sidraAddress || user.sidraAddress,
        usdtAddress: updates.usdtAddress || user.usdtAddress,
        isNew: Object.keys(updates).length > 0
      }
    });

  } catch (error: any) {
    console.error("[GENERATE_ADDRESSES_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération des adresses" },
      { status: 500 }
    );
  }
}
