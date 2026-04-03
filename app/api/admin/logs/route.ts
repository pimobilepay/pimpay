export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    // 1. Vérification de sécurité Admin
    // adminAuth retourne null si l'utilisateur n'est pas admin
    const payload = await adminAuth(req);
    
    if (!payload) {
      return NextResponse.json(
        { error: "Accès refusé. Droits administrateur requis." },
        { status: 403 }
      );
    }

    // 2. Récupération des logs avec les relations (Correction du Select)
    const logs = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      take: 50, // Augmenté pour plus de visibilité
      include: {
        // On récupère le nom de l'admin via la relation
        admin: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            username: true
          }
        },
        // On récupère l'email de la cible via la relation
        target: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true
          }
        }
      }
    });

    // 3. Formater les données pour le frontend avec détails complets
    const formattedLogs = logs.map(log => ({
      id: log.id,
      adminId: log.adminId || null,
      adminName: log.adminName || log.admin?.name || log.admin?.username || "Système",
      adminEmail: log.admin?.email || null,
      adminAvatar: log.admin?.avatar || null,
      action: log.action,
      targetId: log.targetId || null,
      targetEmail: log.target?.email || log.targetEmail || null,
      targetName: log.target?.name || log.target?.username || null,
      createdAt: log.createdAt,
      details: log.details
    }));

    return NextResponse.json(formattedLogs);

  } catch (error) {
    console.error("[ADMIN_LOGS_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des logs d'audit" },
      { status: 500 }
    );
  }
}
