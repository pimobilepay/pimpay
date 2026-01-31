export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const whereClause: any = { userId: user.id };
    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50
    });

    // Formatage sécurisé : On s'assure que metadata est toujours un objet propre
    const formattedNotifications = notifications.map(n => {
      let meta = {};
      try {
        meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
      } catch (e) {
        meta = {}; // Fallback si le JSON est mal formé
      }
      return { ...n, metadata: meta };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false }
    });

    // On renvoie un objet structuré que le frontend attend
    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error("Erreur GET Notifications PimPay:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    // Cas 1 : Marquer tout comme lu
    if (body.all === true || body.action === "MARK_ALL_READ" || !body.id) {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true }
      });
      return NextResponse.json({ success: true, message: "Toutes les notifications lues" });
    }

    // Cas 2 : Marquer une seule notification précise
    if (body.id) {
      await prisma.notification.update({
        where: { 
          id: body.id, 
          userId: user.id // Sécurité : l'utilisateur ne peut modifier que la sienne
        },
        data: { read: true }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    console.error("Erreur POST Notifications:", error);
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    // On s'assure qu'il ne supprime que SES notifications
    const result = await prisma.notification.deleteMany({
      where: { 
        id: id, 
        userId: user.id 
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Notification non trouvée ou non autorisée" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE Notification:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
