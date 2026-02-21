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

    let userId: string | null = null;

    // 1. Extraction de l'ID selon le type de session (Identique à ton API profile)
    if (piToken) {
      userId = piToken;
    } else if (classicToken) {
      try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
        const { payload } = await jose.jwtVerify(classicToken, secret);
        // On vérifie les deux payloads possibles comme dans ton profile
        userId = (payload.id || payload.userId) as string;
      } catch (e) {
        return NextResponse.json({ user: null, error: "Session expirée" }, { status: 401 });
      }
    }

    if (!userId) {
      return NextResponse.json({ user: null, error: "Non authentifié" }, { status: 401 });
    }

    // 2. Recherche de l'utilisateur (Recherche par ID unique comme dans profile)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        kycStatus: true,
        name: true,
        firstName: true,
        lastName: true,
        avatar: true,
        email: true,
        phone: true,
        birthDate: true,
        nationality: true,
        country: true,
        city: true,
        address: true,
        postalCode: true,
        gender: true,
        occupation: true,
        sourceOfFunds: true,
        idType: true,
        idNumber: true,
        walletAddress: true,
        createdAt: true,
        wallets: {
          where: { currency: "PI" },
          select: { balance: true }
        }
      }
    });

    // 3. Validation de l'existence et du statut
    if (!user || user.status !== "ACTIVE") {
      return NextResponse.json({ user: null, error: "Utilisateur introuvable ou inactif" }, { status: 401 });
    }

    // 4. Réponse formatée (Cohérente avec SideMenu et Profile)
    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        // Logique de nom identique au profile pour la cohérence visuelle
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || "PIONEER",
        role: user.role,
        status: user.status,
        kycStatus: user.kycStatus,
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
