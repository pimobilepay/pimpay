export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    // 1. Correction de l'accès à la session (session.id au lieu de session.user.id)
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. Récupération des notifications liées à l'utilisateur Pimpay
    const notifications = await prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json(notifications);

  } catch (error: any) {
    console.error("GET_NOTIFICATIONS_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Route pour marquer une notification comme lue
export async function PATCH(req: Request) {
  try {
    const session = await auth() as any;
    if (!session?.id) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { id } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID de notification manquant" }, { status: 400 });
    }

    // Mise à jour sécurisée : on vérifie que la notification appartient bien à l'utilisateur
    await prisma.notification.update({
      where: { 
        id: id,
        userId: session.id // Sécurité supplémentaire
      },
      data: { read: true }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("PATCH_NOTIFICATION_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}
