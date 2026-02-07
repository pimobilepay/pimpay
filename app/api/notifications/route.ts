export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose";
import { cookies } from "next/headers";

// Fonction utilitaire interne pour récupérer le userId comme dans l'API profile
async function getAuthenticatedUserId() {
  const cookieStore = await cookies();
  const piToken = cookieStore.get("pi_session_token")?.value;
  const classicToken = cookieStore.get("token")?.value;

  if (piToken) return piToken;

  if (classicToken) {
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || "");
      const { payload } = await jwtVerify(classicToken, secret);
      return (payload.id || payload.userId) as string;
    } catch (e) {
      return null;
    }
  }
  return null;
}

export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    const whereClause: any = { userId: userId };
    if (type && type !== "ALL") {
      whereClause.type = type;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50
    });

    const formattedNotifications = notifications.map(n => {
      let meta = {};
      try {
        meta = typeof n.metadata === 'string' ? JSON.parse(n.metadata) : (n.metadata || {});
      } catch (e) {
        meta = {};
      }
      return { ...n, metadata: meta };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: userId, read: false }
    });

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
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();

    if (body.all === true || body.action === "MARK_ALL_READ" || !body.id) {
      await prisma.notification.updateMany({
        where: { userId: userId, read: false },
        data: { read: true }
      });
      return NextResponse.json({ success: true, message: "Toutes les notifications lues" });
    }

    if (body.id) {
      await prisma.notification.update({
        where: {
          id: body.id,
          userId: userId 
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
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID manquant" }, { status: 400 });

    const result = await prisma.notification.deleteMany({
      where: {
        id: id,
        userId: userId
      }
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Notification non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erreur DELETE Notification:", error);
    return NextResponse.json({ error: "Erreur suppression" }, { status: 500 });
  }
}
