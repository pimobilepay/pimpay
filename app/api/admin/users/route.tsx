export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  // 1. Vérification de la session admin (Utilisation du nouveau adminAuth)
  const payload = adminAuth(req);
  
  // Si adminAuth renvoie null ou une réponse d'erreur, on bloque l'accès
  if (!payload || (payload instanceof NextResponse)) {
    return payload || NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });
  }

  try {
    // 2. Récupération enrichie des utilisateurs via les relations
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        role: true,
        createdAt: true,
        // On récupère le solde depuis la table Wallet liée
        wallets: {
          where: {
            type: "PI"
          },
          select: {
            balance: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3. Transformation des données pour le Dashboard
    // On aplatit la structure pour que 'balance' soit directement accessible
    const formattedUsers = users.map(user => {
      // On récupère la balance du premier wallet PI trouvé, sinon 0
      const piBalance = user.wallets && user.wallets.length > 0 
        ? user.wallets[0].balance 
        : 0;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        role: user.role,
        createdAt: user.createdAt,
        balance: piBalance // ✅ Le Dashboard verra 'user.balance' normalement
      };
    });

    // 4. Retourne le tableau formaté
    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error("API_ADMIN_USERS_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération des utilisateurs" },
      { status: 500 }
    );
  }
}
