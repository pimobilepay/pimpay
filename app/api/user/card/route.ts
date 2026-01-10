export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
    const { payload } = await jwtVerify(token, secret);

    // Récupération de l'utilisateur avec ses relations (Schéma Pimpay)
    const userWithData = await prisma.user.findUnique({
      where: { id: payload.id as string },
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

  } catch (error: any) {
    console.error("GET_CARD_DATA_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
