export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth"; // Utilisation du helper standard pour Pimpay

export async function GET(
  req: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    // 1. Correction : Ajout du await pour résoudre la promesse
    const payload = await verifyAuth(req) as any;
    
    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupération de la transaction avec les relations correctes
    const tx = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        // CORRECTION : Utilisation de 'avatar' à la place de 'image'
        fromUser: { 
          select: { 
            username: true, 
            name: true, 
            avatar: true 
          } 
        },
        toUser: { 
          select: { 
            username: true, 
            name: true, 
            avatar: true 
          } 
        }
      }
    });

    if (!tx) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // 3. Sécurité : Vérifier que l'utilisateur est concerné par la transaction
    if (tx.fromUserId !== payload.id && tx.toUserId !== payload.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(tx);

  } catch (error: any) {
    console.error("GET_TX_BY_ID_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
