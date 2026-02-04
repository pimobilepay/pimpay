export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    
    // 1. On récupère les deux types de tokens possibles
    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value;

    let userId: string | null = null;

    // 2. Logique de vérification hybride
    if (piToken) {
      // Cas Pi Browser : Le token est l'ID utilisateur direct
      userId = piToken;
    } else if (classicToken) {
      // Cas Classique : Vérification du JWT
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jose.jwtVerify(classicToken, secret);
        userId = payload.id as string;
      } catch (e) {
        return NextResponse.json({ user: null }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 3. Recherche dans la base selon ton schéma Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        kycStatus: true,
        name: true,
        // On récupère le wallet PI spécifiquement comme demandé
        wallets: {
          where: { currency: "PI" },
          select: { balance: true }
        }
      }
    });

    // 4. Validation du statut
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 5. Réponse formatée pour ton Dashboard
    return NextResponse.json({
      user: {
        ...user,
        // On extrait la balance du premier wallet PI trouvé (ou 0)
        balance: user.wallets[0]?.balance || 0
      }
    });

  } catch (error) {
    console.error("Erreur API Auth Me:", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
