import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const token = cookies().get("token")?.value;
    if (!token) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // On récupère l'utilisateur avec sa carte ET son wallet Pi
    const userCard = await prisma.user.findUnique({
      where: { id: payload.id as string },
      include: {
        virtualCards: true, // On récupère les cartes
        wallets: {
          where: { currency: "PI" } // On récupère le solde Pi
        }
      }
    });

    if (!userCard || userCard.virtualCards.length === 0) {
      return NextResponse.json({ error: "Aucune carte trouvée" }, { status: 404 });
    }

    const card = userCard.virtualCards[0];
    const wallet = userCard.wallets[0];

    return NextResponse.json({
      holder: card.holder,
      number: card.number,
      expiry: card.exp,
      cvv: card.cvv,
      balance: wallet?.balance || 0,
      isLocked: card.locked
    });

  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
