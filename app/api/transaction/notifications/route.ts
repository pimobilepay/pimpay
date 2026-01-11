export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // On récupère TOUTES les notifications (Paiements + Sécurité + Login)
    const notifications = await prisma.notification.findMany({
      where: { 
        userId: user.id 
      },
      orderBy: { 
        createdAt: "desc" 
      },
      take: 50,
    });

    // Formatage pour s'assurer que le frontend reçoit des objets JSON valides
    const formattedNotifications = notifications.map(n => {
      let meta = n.metadata;
      
      // Si metadata est stocké en String dans la DB, on le transforme en Objet
      if (typeof n.metadata === 'string') {
        try {
          meta = JSON.parse(n.metadata);
        } catch (e) {
          meta = {};
        }
      }

      return {
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type, // "PAYMENT_RECEIVED", "SECURITY", "LOGIN", etc.
        read: n.read,
        createdAt: n.createdAt,
        metadata: meta || {}
      };
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({
      notifications: formattedNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Erreur API Notifications Globales:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Les méthodes POST (Mark Read) et DELETE restent identiques à la version précédente
