import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function PATCH(req: NextRequest) {
  try {
    const payload = verifyAuth(req);
    if (!payload) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { cardId, action } = await req.json(); // action: "LOCK" ou "UNLOCK"

    const updatedCard = await prisma.virtualCard.update({
      where: { id: cardId, userId: payload.id },
      data: { locked: action === "LOCK" }
    });

    return NextResponse.json({ 
      message: action === "LOCK" ? "Carte verrouillée" : "Carte activée",
      locked: updatedCard.locked 
    });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
