export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // On utilise 'as any' pour bypasser le typage de session si nécessaire
    const session = await auth() as any;

    // CORRECTION : Accès direct à session.id (et non session.user.id)
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { fromUserId: session.id },
          { toUserId: session.id }
        ]
      },
      orderBy: { 
        createdAt: 'desc' 
      },
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

    // Retourne les transactions trouvées
    return NextResponse.json(transactions);
    
  } catch (error: any) {
    console.error("HISTORY_ERROR:", error);
    return NextResponse.json(
      { error: "Erreur lors du chargement de l'historique" }, 
      { status: 500 }
    );
  }
}
