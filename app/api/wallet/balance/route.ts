import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ton instance Prisma
import { verifyAuth } from "@/lib/auth"; // Ta fonction de vérification JWT

export async function GET(request: Request) {
  try {
    // 1. Vérification de l'utilisateur (Token dans le header)
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupération du wallet dans la DB
    const wallet = await prisma.wallet.findUnique({
      where: { userId: user.id },
      select: {
        balance: true,
        address: true,
      },
    });

    if (!wallet) {
      // Si le wallet n'existe pas encore, on le crée (Auto-provisioning)
      const newWallet = await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 0.0,
          address: `pi_${Math.random().toString(36).substring(7)}`, // Génération tempo
        },
      });
      return NextResponse.json({ balance: newWallet.balance, address: newWallet.address });
    }

    // 3. Retourner les données sécurisées
    return NextResponse.json(wallet);
    
  } catch (error) {
    console.error("Erreur Balance API:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
