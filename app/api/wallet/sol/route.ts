import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Keypair } from "@solana/web3.js";
import b58 from "bs58"; // Pour encoder la clé privée de manière lisible

const prisma = new PrismaClient();

/**
 * GET: Récupère l'adresse Solana de l'utilisateur
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { solAddress: true }
    });

    return NextResponse.json({ 
      address: user?.solAddress || null 
    });
  } catch (error) {
    console.error("Erreur GET SOL:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST: Génère une nouvelle adresse Solana et l'enregistre
 */
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    // 1. Vérifier si l'utilisateur a déjà une adresse pour éviter les doublons
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
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
    
    // On convertit la clé privée (Uint8Array) en format Base58 (format standard Solana)
    const privateKey = b58.encode(keypair.secretKey);

    // 3. Sauvegarder dans les nouveaux champs Prisma
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        solAddress: address,
        solPrivateKey: privateKey
      }
    });

    return NextResponse.json({ 
      success: true, 
      address: updatedUser.solAddress 
    });

  } catch (error) {
    console.error("Erreur POST SOL:", error);
    return NextResponse.json({ 
      error: "Échec de la génération du portefeuille Solana" 
    }, { status: 500 });
  }
}
