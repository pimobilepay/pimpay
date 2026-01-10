export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // On force le type 'any' temporairement pour passer outre la validation stricte 
    // si le type de retour d'auth() n'est pas encore parfaitement synchronisé.
    const session = await auth() as any;

    // CORRECTION : Accès direct à session.id (et non session.user.id)
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        fromUser: { 
          select: { 
            name: true, 
            username: true, 
            avatar: true, 
            walletAddress: true 
          } 
        },
        toUser: { 
          select: { 
            name: true, 
            username: true, 
            avatar: true, 
            walletAddress: true 
          } 
        },
      }
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction introuvable" }, { status: 404 });
    }

    // CORRECTION : Sécurité basée sur session.id et session.role
    const isSender = transaction.fromUserId === session.id;
    const isReceiver = transaction.toUserId === session.id;
    const isAdmin = session.role === "ADMIN";

    if (!isSender && !isReceiver && !isAdmin) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(transaction);
  } catch (error: any) {
    console.error("TRANSACTION_DETAILS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
