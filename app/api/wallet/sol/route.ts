import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import { Keypair } from "@solana/web3.js";
import b58 from "bs58";

/**
 * GET: Récupère l'adresse Solana de l'utilisateur
 */
export async function GET() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { solAddress: true }
    });

    return NextResponse.json({
      address: user?.solAddress || null
    });
  } catch (error: unknown) {
    console.error("Erreur GET SOL:", getErrorMessage(error));
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST: Génère une nouvelle adresse Solana et l'enregistre
 */
export async function POST() {
  const userId = await getAuthUserId();
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // 1. Vérifier si l'adresse existe déjà
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { solAddress: true }
    });

    if (currentUser?.solAddress) {
      return NextResponse.json({
        success: true,
        address: currentUser.solAddress,
        message: "L'adresse existe déjà."
      });
    }

    // 2. Générer une nouvelle paire de clés Solana
    const keypair = Keypair.generate();
    const address = keypair.publicKey.toBase58();
    const privateKey = b58.encode(keypair.secretKey);

    // 3. Sauvegarder dans Pimpay
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        solAddress: address,
        solPrivateKey: privateKey
      }
    });

    return NextResponse.json({
      success: true,
      address: updatedUser.solAddress
    });

  } catch (error: unknown) {
    console.error("Erreur POST SOL:", getErrorMessage(error));
    return NextResponse.json({
      error: "Échec de la génération du portefeuille Solana"
    }, { status: 500 });
  }
}
