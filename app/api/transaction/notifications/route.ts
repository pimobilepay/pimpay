import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
// Importe ton instance prisma globale si tu en as une, sinon :
const prisma = new PrismaClient();

// Simulation d'une session utilisateur (À remplacer par ton système d'auth : NextAuth ou JWT)
async function getAuthenticatedUser() {
  // Ici, récupère l'ID de l'utilisateur connecté via les cookies ou le header
  // Pour l'exemple, on cherche le premier utilisateur actif
  const user = await prisma.user.findFirst({ where: { status: 'ACTIVE' } });
  return user;
}

// GET : Récupérer les notifications
export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50, // Limite pour la performance
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error("Erreur API Notifications:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST : Marquer comme lu
export async function POST(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const body = await request.json();

    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    if (body.action === "MARK_ALL_READ") {
      await prisma.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action non reconnue" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE : Supprimer une notification
export async function DELETE(request: Request) {
  try {
    const user = await getAuthenticatedUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!user || !id) return NextResponse.json({ error: "Requête invalide" }, { status: 400 });

    await prisma.notification.delete({
      where: { id, userId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Erreur de suppression" }, { status: 500 });
  }
}
