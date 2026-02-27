export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as jose from "jose";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();

    const piToken = cookieStore.get("pi_session_token")?.value;
    const classicToken = cookieStore.get("token")?.value || cookieStore.get("pimpay_token")?.value;

    let userId: string | null = null;

    // 1. Extraction de l'ID selon le type de session
    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jose.jwtVerify(classicToken, secret);
        userId = (payload.id || payload.userId) as string;
      } catch (e) {
        return NextResponse.json({ user: null, error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ user: null, error: "Non authentifié" }, { status: 401 });
    }

    // 2. Recherche complète de l'utilisateur avec tous les champs du schéma Prisma
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        name: true,
        avatar: true,
        gender: true,
        birthDate: true,
        nationality: true,
        country: true,
        city: true,
        address: true,
        postalCode: true,
        occupation: true,
        sourceOfFunds: true,
        idType: true,
        idNumber: true,
        walletAddress: true,
        role: true,
        kycStatus: true,
        status: true,
        createdAt: true,
        wallets: {
          where: { currency: "PI" },
          select: { balance: true }
        }
      }
    });

    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ user: null, error: "Compte introuvable ou inactif" }, { status: 401 });
    }

    // 3. Formatage de la réponse pour le frontend (ProfilePage.tsx)
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || "Pioneer",
        avatar: user.avatar,
        gender: user.gender,
        birthDate: user.birthDate,
        nationality: user.nationality,
        country: user.country,
        city: user.city,
        address: user.address,
        postalCode: user.postalCode,
        occupation: user.occupation,
        sourceOfFunds: user.sourceOfFunds,
        idType: user.idType,
        idNumber: user.idNumber,
        walletAddress: user.walletAddress,
        role: user.role,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
        balance: user.wallets[0]?.balance || 0,
      }
    });

  } catch (error) {
    console.error("❌ Erreur API Auth Me (PimPay):", error);
    return NextResponse.json({ user: null, error: "Erreur interne du serveur" }, { status: 500 });
  }
}

