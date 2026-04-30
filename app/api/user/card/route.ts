export const dynamic = "force-dynamic";

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId();
    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupération de l'utilisateur avec ses relations (Schéma Pimpay)
    const userWithData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        virtualCards: true, // Relation définie dans le modèle User
        wallets: {
          where: { currency: "PI" } // On cible le wallet Pi
        }
      }
    });

    if (!userWithData || userWithData.virtualCards.length === 0) {
      return NextResponse.json({ error: "Aucune carte trouvée" }, { status: 404 });
    }

    // On prend la première carte active
    const card = userWithData.virtualCards[0];
    const wallet = userWithData.wallets[0];

    return NextResponse.json({
      id: card.id,
      holder: card.holder,
      number: card.number,
      expiry: card.exp,
      cvv: card.cvv,
      brand: card.brand,
      balance: wallet?.balance || 0,
      currency: "PI",
      // CORRECTION : On utilise isFrozen conformément au schéma Prisma
      isLocked: card.isFrozen, 
      kycStatus: userWithData.kycStatus
    });

  } catch (error: unknown) {
    console.error("GET_CARD_DATA_ERROR:", getErrorMessage(error));
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
