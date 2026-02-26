import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Utilise ton instance partagée
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { Keypair } from "@solana/web3.js";
import b58 from "bs58";

// ✅ FONCTION D'AUTHENTIFICATION RÉUTILISABLE
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? cookieStore.get("pimpay_token")?.value;
  
  if (!token) return null;

  try {
    const SECRET = process.env.JWT_SECRET;
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    return payload.id as string;
  } catch {
    return null;
  }
}

/**
 * GET: Récupère l'adresse Solana de l'utilisateur
 */
export async function GET() {
  const userId = await getAuthUser();
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
  } catch (error: any) {
    console.error("Erreur GET SOL:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

/**
 * POST: Génère une nouvelle adresse Solana et l'enregistre
 */
export async function POST() {
  const userId = await getAuthUser();
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

  } catch (error: any) {
    console.error("Erreur POST SOL:", error.message);
    return NextResponse.json({
      error: "Échec de la génération du portefeuille Solana"
    }, { status: 500 });
  }
}
