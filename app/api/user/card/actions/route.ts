export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth"; // Utilise ton helper d'auth standard

export async function PATCH(req: NextRequest) {
  try {
    // 1. Vérification de la session (Correction : ajout du await)
    const payload = await verifyAuth(req) as any;
    
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { cardId, action } = await req.json(); // action: "LOCK" ou "UNLOCK"

    if (!cardId) {
      return NextResponse.json({ error: "ID de carte manquant" }, { status: 400 });
    }

    // 2. Mise à jour selon ton schéma (isFrozen au lieu de locked)
    const updatedCard = await prisma.virtualCard.update({
      where: { 
        id: cardId, 
        userId: payload.id // Sécurité : vérifie que la carte appartient à l'user
      },
      data: { 
        isFrozen: action === "LOCK" 
      }
    });

    return NextResponse.json({
      message: action === "LOCK" ? "Carte verrouillée" : "Carte activée",
      isFrozen: updatedCard.isFrozen
    });

  } catch (error: any) {
    console.error("CARD_PATCH_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors de la modification de la carte" }, { status: 500 });
  }
}
