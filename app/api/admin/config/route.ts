export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { verifyAuth } from "@/lib/auth/verify"; // Ajuste le chemin vers ton fichier verifyAuth

const ConfigModel = prisma.systemConfig;

export async function GET(req: NextRequest) {
  try {
    // 1. Récupération de la configuration globale (Public)
    let config = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });

    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          maintenanceMode: false,
          consensusPrice: 314159.0,
          globalAnnouncement: "Bienvenue sur PIMPAY.",
        }
      });
    }

    // 2. Vérification de l'utilisateur via TON système Bearer Token
    let userStatus = { isBanned: false, isFrozen: false };
    
    // On appelle ta fonction de vérification personnalisée
    const authUser = await verifyAuth(req);
    
    if (authUser?.id) {
      const user = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { isBanned: true, isFrozen: true }
      });
      
      if (user) {
        userStatus = { 
          isBanned: !!user.isBanned, 
          isFrozen: !!user.isFrozen 
        };
      }
    }

    // 3. Vérification Admin pour les logs (Optionnel)
    const isAdmin = await adminAuth(req).catch(() => null);
    let logs: any[] = [];
    if (isAdmin) {
      logs = await prisma.auditLog.findMany({
        where: { action: "UPDATE_SYSTEM_CONFIG" },
        orderBy: { createdAt: 'desc' },
        take: 5
      }).catch(() => []);
    }

    // Réponse finale : Toujours 200 pour que le client reçoive les infos
    return NextResponse.json({ 
      ...config, 
      auditLogs: isAdmin ? logs : undefined,
      userStatus 
    });

  } catch (error: any) {
    console.error("CONFIG_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur interne" }, { status: 500 });
  }
}
