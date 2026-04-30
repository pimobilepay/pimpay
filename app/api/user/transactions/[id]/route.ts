export const dynamic = "force-dynamic";

import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth"; // Utilisation du helper standard pour Pimpay

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const payload = await verifyAuth(req) as any;

    if (!payload || !payload.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupération de la transaction avec les relations correctes
    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: {
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

  } catch (error: unknown) {
    console.error("GET_TX_BY_ID_ERROR:", getErrorMessage(error));
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
