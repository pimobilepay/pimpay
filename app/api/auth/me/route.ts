export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value;

    let user = null;

    // 1. Logique de récupération selon le type de session
    if (piToken) {
      // Cas Pi Browser : On cherche l'utilisateur via piUserId défini dans le schéma
      user = await prisma.user.findUnique({
        where: { piUserId: piToken },
        select: {
          id: true,
          username: true,
          role: true,
          status: true,
          kycStatus: true,
          name: true,
          avatar: true, // Récupération de l'avatar
          walletAddress: true,
          wallets: {
            where: { currency: "PI" },
            select: { balance: true }
          }
        }
      });
    } else if (classicToken) {
      // Cas Classique : Vérification du JWT et recherche par ID interne
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jose.jwtVerify(classicToken, secret);
        const userId = payload.id as string;

        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            username: true,
            role: true,
            status: true,
            kycStatus: true,
            name: true,
            avatar: true,
            walletAddress: true,
            wallets: {
              where: { currency: "PI" },
              select: { balance: true }
            }
          }
        });
      } catch (e) {
        return NextResponse.json({ user: null }, { status: 401 });
      }
    }

    // 2. Validation de l'existence et du statut
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // 3. Réponse formatée
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        kycStatus: user.kycStatus,
        name: user.name,
        avatar: user.avatar,
        walletAddress: user.walletAddress,
        balance: user.wallets[0]?.balance || 0
      }
    });

  } catch (error) {
    console.error("Erreur API Auth Me (PimPay):", error);
    return NextResponse.json({ user: null }, { status: 500 });
  }
}
