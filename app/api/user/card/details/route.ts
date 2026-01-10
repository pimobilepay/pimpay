export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth'; // Utilise ton helper d'authentification standard

export async function GET(req: NextRequest) {
  try {
    // 1. Correction : Ajout du 'await' pour résoudre la promesse de l'authentification
    const payload = await verifyAuth(req) as any;

    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: "Non autorisé" }, 
        { status: 401 }
      );
    }

    // 2. Recherche de la carte virtuelle
    const card = await prisma.virtualCard.findFirst({
      where: { 
        userId: payload.id 
      },
      include: {
        user: {
          select: {
            username: true,
            // Correction : Utilisation de 'wallets' (pluriel) selon ton schéma User
            wallets: { 
              where: { currency: "PI" }, 
              take: 1 
            }
          }
        }
      }
    });

    if (!card) {
      return NextResponse.json(
        { error: "Aucune carte trouvée" }, 
        { status: 404 }
      );
    }

    // 3. Retourner les détails complets (incluant isFrozen, dailyLimit, etc.)
    return NextResponse.json(card);

  } catch (error: any) {
    console.error("CARD_DETAILS_FETCH_ERROR:", error.message);
    return NextResponse.json(
      { error: "Erreur serveur lors de la récupération de la carte" }, 
      { status: 500 }
    );
  }
}
