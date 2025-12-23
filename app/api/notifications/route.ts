export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET!;

// Utilitaire pour récupérer l'ID de l'utilisateur depuis le token
async function getUserIdFromToken() {
  const token = cookies().get("pimpay_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded.id;
  } catch {
    return null;
  }
}

// ✅ GET notifications (Récupère les vraies notifs de la DB)
export async function GET(req: NextRequest) {
  const userId = await getUserIdFromToken();
  
  if (!userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const userNotifications = await prisma.notification.findMany({
      where: { userId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(userNotifications);
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la récupération" }, { status: 500 });
  }
}

// ✅ POST pour marquer comme lu (Met à jour la DB)
export async function POST(req: NextRequest) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { id } = body;

    const updated = await prisma.notification.update({
      where: { 
        id: id,
        userId: userId // Sécurité : on vérifie que la notif appartient bien à l'user
      },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true, id: updated.id });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la mise à jour" }, { status: 500 });
  }
}

// ✅ DELETE pour supprimer (Supprime de la DB)
export async function DELETE(req: NextRequest) {
  const userId = await getUserIdFromToken();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Id requis" }, { status: 400 });
    }

    await prisma.notification.delete({
      where: { 
        id: id,
        userId: userId // Sécurité
      }
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: "Erreur lors de la suppression" }, { status: 500 });
  }
}
