export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth() as any;
    
    // Utilisation de session.user?.id ou session.id selon ton provider
    const userId = session?.user?.id || session?.id;

    if (!userId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // Récupération avec plus de détails
    const notifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50 // Augmenté pour ne rien rater
    });

    return NextResponse.json(notifications);

  } catch (error: any) {
    console.error("GET_NOTIFICATIONS_ERROR:", error.message);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Route pour TOUT marquer comme lu (très utile pour ton bouton "Tout marquer comme lu")
export async function PUT() {
  try {
    const session = await auth() as any;
    const userId = session?.user?.id || session?.id;

    if (!userId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    await prisma.notification.updateMany({
      where: { userId: userId, read: false },
      data: { read: true }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
