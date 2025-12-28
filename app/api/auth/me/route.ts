import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // 1. Vérification de l'auth avec 'await' (crucial car verifyAuth est async)
    const payload = await verifyAuth(req);
    
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Récupération de l'utilisateur (sans les relations pour éviter le crash PANIC)
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        birthDate: true,
        nationality: true,
        country: true,
        city: true,
        address: true,
        walletAddress: true,
        status: true,
        kycStatus: true,
        avatar: true,
        createdAt: true,
        name: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // 3. Récupération de la balance Pi séparément (contourne le bug Prisma)
    const piWallet = await prisma.wallet.findFirst({
      where: { 
        userId: user.id,
        type: "PI" 
      },
      select: { balance: true }
    });

    const balance = piWallet?.balance ?? 0;

    // 4. Réponse structurée pour le frontend
    return NextResponse.json({
      authenticated: true,
      user: {
        ...user,
        balance: balance
      }
    });

  } catch (error: any) {
    console.error("Erreur API /me:", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: error.message }, 
      { status: 500 }
    );
  }
}
