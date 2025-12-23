export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: Request) {
  try {
    // 1. Vérification de sécurité Admin
    const payload = adminAuth(req as any);
    if (payload instanceof NextResponse) return payload;

    // 2. Récupération des logs avec les champs sélectionnés
    const logs = await prisma.auditLog.findMany({
      orderBy: { 
        createdAt: 'desc' 
      },
      take: 10, // Limitation aux 10 derniers pour la performance du dashboard
      select: {
        id: true,
        adminName: true,
        action: true,
        targetEmail: true,
        createdAt: true,
        details: true
      }
    });

    return NextResponse.json(logs);
    
  } catch (error) {
    console.error("[ADMIN_LOGS_GET_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des logs d'audit" },
      { status: 500 }
    );
  }
}
