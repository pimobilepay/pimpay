export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // ✅ Changement : jose au lieu de jsonwebtoken

export async function GET() {
  try {
    // 1. Récupération sécurisée du secret (pas de throw global)
    const SECRET = process.env.JWT_SECRET;
    if (!SECRET) {
      console.error("JWT_SECRET is missing");
      return NextResponse.json({ error: "Erreur configuration" }, { status: 500 });
    }

    const token = cookies().get("pimpay_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Vérification asynchrone avec jose
    const secretKey = new TextEncoder().encode(SECRET);
    const { payload } = await jwtVerify(token, secretKey);
    const decodedId = payload.id as string;

    // 3. Logique métier Pimpay (Inchangée mais sécurisée)
    const wallet = await prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId: decodedId,
          currency: "PI", 
        },
      },
      select: {
        balance: true,
      },
    });

    return NextResponse.json({
      balance: wallet?.balance || 0,
      currency: "PI"
    });

  } catch (error: any) {
    console.error("BALANCE ERROR:", error);
    // Gestion propre des erreurs de token
    if (error.code === 'ERR_JWT_EXPIRED' || error.code === 'ERR_JWS_INVALID') {
      return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
