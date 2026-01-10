export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET() {
  try {
    const token = cookies().get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // CORRECTION : On cherche dans la table Wallet car User n'a pas de champ balance
    // On utilise l'index unique @@unique([userId, currency]) défini à la ligne 132
    const wallet = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: decoded.id,
          currency: "PI", // Spécifique à Pimpay
        },
      },
      select: {
        balance: true,
      },
    });

    // Si le wallet n'existe pas encore pour cet utilisateur, on retourne 0
    return NextResponse.json({ 
      balance: wallet?.balance || 0,
      currency: "PI" 
    });

  } catch (error) {
    console.error("BALANCE ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
