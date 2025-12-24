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
      take: 20, // Augmenté un peu pour plus de visibilité
      include: {
        // On récupère le nom de l'admin via la relation
        admin: {
          select: {
            name: true,
            email: true
          }
        },
        // On récupère l'email de la cible via la relation
        target: {
          select: {
            email: true
          }
        }
      }
    });

    // 3. Formater les données pour le frontend (optionnel mais recommandé)
    const formattedLogs = logs.map(log => ({
      id: log.id,
      adminName: log.admin?.name || "Système",
      action: log.action,
      targetEmail: log.target?.email || "N/A",
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
