export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function POST(req: NextRequest) {
  try {
    // 1. Vérification Admin
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const { title, message, type = "info" } = await req.json();

    if (!title || !message) {
      return NextResponse.json({ error: "Titre et message requis" }, { status: 400 });
    }

    // 2. Récupérer tous les IDs d'utilisateurs actifs
    const users = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true }
    });

    // 3. Préparer les données pour l'insertion de masse
    const notificationsData = users.map(user => ({
      userId: user.id,
      title,
      message,
      type,
    }));

    // 4. Exécution de l'envoi global
    await prisma.notification.createMany({
      data: notificationsData,
      skipDuplicates: true,
    });

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        adminId: payload.id,
        adminName: "ADMIN",
        action: "GLOBAL_NOTIFICATION",
        details: `Annonce envoyée à ${users.length} utilisateurs : ${title}`
      }
    });

    return NextResponse.json({ 
      success: true, 
      recipientCount: users.length 
    });

  } catch (error) {
    console.error("GLOBAL_NOTIF_ERROR:", error);
    return NextResponse.json({ error: "Échec de l'envoi global" }, { status: 500 });
  }
}
