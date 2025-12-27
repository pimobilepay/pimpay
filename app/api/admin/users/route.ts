export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  // 1. Vérification de la session admin
  const payload = adminAuth(req);
  if (!payload || (payload instanceof NextResponse)) {
    return payload || NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
  }

  try {
    // 2. Récupération complète avec les nouveaux champs nécessaires au Dashboard
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
        createdAt: true,
        // Nouveaux champs pour les fonctionnalités Admin avancées
        kycStatus: true,       // Pour l'icône ShieldCheck
        autoApprove: true,     // Pour le bouton Shield
        lastLoginIp: true,     // Pour MonitorSmartphone (Infos Session)
        
        // On récupère TOUS les wallets pour que le Frontend puisse filtrer
        wallets: {
          select: {
            balance: true,
            currency: true // On utilise 'currency' au lieu de 'type' pour matcher le Frontend
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3. Transformation légère pour garantir la compatibilité
    const formattedUsers = users.map(user => ({
      ...user,
      // On s'assure que wallets n'est jamais null pour éviter les crashs JS
      wallets: user.wallets || [],
      // On garde une trace du solde principal Pi pour les tris si besoin
      piBalance: user.wallets.find(w => w.currency.toUpperCase() === "PI")?.balance || 0
    }));

    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error("API_ADMIN_USERS_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération" },
      { status: 500 }
    );
  }
}
