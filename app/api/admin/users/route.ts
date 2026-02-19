export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

// Définition d'un type pour la clarté, car Next.js vérifie les types de retour au build
type ResponseData = NextResponse | Response;

export async function GET(req: NextRequest): Promise<ResponseData> {
  try {
    // 1. Authentification
    // On utilise await car adminAuth doit vérifier le token/session
    const payload = await adminAuth(req);

    // Si adminAuth échoue (retourne null ou une erreur 401/403 déjà formattée)
    if (!payload || payload instanceof NextResponse) {
      return payload || NextResponse.json(
        { error: "Accès non autorisé" }, 
        { status: 401 }
      );
    }

    // 2. Récupération Prisma
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatar: true,
        piUserId: true,
        phone: true,
        country: true,
        status: true,
        role: true,
        createdAt: true,
        kycStatus: true,
        autoApprove: true,
        lastLoginIp: true,
        lastLoginAt: true,
        wallets: {
          select: {
            balance: true,
            currency: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Transformation des données
    // On s'assure qu'on retourne un tableau d'objets simple
    const formattedUsers = users.map(user => {
      const piWallet = user.wallets?.find(w => w.currency.toUpperCase() === "PI");
      return {
        ...user,
        wallets: user.wallets || [],
        piBalance: piWallet ? piWallet.balance : 0
      };
    });

    // CRUCIAL : Toujours retourner un objet NextResponse.json()
    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error("BUILD_FIX_API_ADMIN_USERS_ERROR:", error);
    // En cas d'erreur, on ne retourne jamais 'void' ou 'null', toujours une réponse
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
