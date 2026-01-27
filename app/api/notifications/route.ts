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

    // Formatage sécurisé du JSON metadata
    const formattedNotifications = notifications.map(n => ({
      ...n,
      metadata: typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {})
    }));

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false }
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount
    });
  } catch (error) {
    console.error("Erreur GET Notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.all === true || body.action === "MARK_ALL_READ") {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true }
      });
      return NextResponse.json({ success: true });
    }

    // Optionnel : Marquer une seule notification comme lue
    if (body.id) {
      await prisma.notification.update({
        where: { id: body.id, userId: user.id },
        data: { read: true }
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur action" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await verifyAuth(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    await prisma.notification.delete({
      where: { id: id, userId: user.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
