export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { verifyAuth } from "@/lib/auth/verify";
import bcrypt from "bcryptjs"; // Pour la réinitialisation sécurisée

const ConfigModel = prisma.systemConfig;

// --- GET : RÉCUPÉRATION DE LA CONFIGURATION ---
export async function GET(req: NextRequest) {
  try {
    let config = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });

    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          appVersion: "2.4.0-STABLE",
          maintenanceMode: false,
          consensusPrice: 314159.0,
          stakingAPY: 12.0,
          transactionFee: 0.5,
          minWithdrawal: 10.0,
          globalAnnouncement: "PIMPAY PROTOCOL: Network operational.",
          forceUpdate: false,
        }
      });
    }

    let userStatus = { isBanned: false, isFrozen: false };
    try {
      const authUser = await verifyAuth(req);
      if (authUser?.id) {
        const user = await prisma.user.findUnique({
          where: { id: authUser.id },
          select: { id: true }
        });
        if (user) userStatus = { isBanned: false, isFrozen: false };
      }
    } catch (e) { console.warn("Public fetch"); }

    let logs: any[] = [];
    let isAdmin = false;
    try {
      const adminSession = await adminAuth(req);
      if (adminSession) {
        isAdmin = true;
        logs = await prisma.auditLog.findMany({
          orderBy: { createdAt: 'desc' },
          take: 10
        });
      }
    } catch (e) { isAdmin = false; }

    return NextResponse.json({ ...config, auditLogs: logs, userStatus, isAdmin });
  } catch (error: any) {
    return NextResponse.json({ error: "Erreur noyau", maintenanceMode: true }, { status: 500 });
  }
}

// --- POST : CENTRE DE COMMANDE ACTIONS ADMIN ---
export async function POST(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await req.json();
    const { action, userId, newSecret } = body;

    // 1. ACTION : RÉINITIALISATION MOT DE PASSE OU PIN
    if (action === "RESET_PASSWORD" || action === "RESET_PIN") {
      if (!userId || !newSecret) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });
      
      const hashedSecret = await bcrypt.hash(newSecret, 10);
      const updateData = action === "RESET_PASSWORD" 
        ? { password: hashedSecret } 
        : { pinCode: hashedSecret };

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          adminName: adminSession.email || "Admin",
          action: action,
          details: `Réinitialisation effectuée pour l'utilisateur ${userId}`
        }
      });

      return NextResponse.json({ message: "Réinitialisation réussie" });
    }

    // 2. ACTION : MAINTENANCE INSTANTANÉE (MODIFICATION IMMÉDIATE)
    if (action === "TOGGLE_MAINTENANCE") {
      const current = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      const updated = await ConfigModel.update({
        where: { id: "GLOBAL_CONFIG" },
        data: { maintenanceMode: !current?.maintenanceMode }
      });

      await prisma.auditLog.create({
        data: {
          adminName: adminSession.email || "Admin",
          action: "MAINTENANCE_TOGGLE",
          details: `Maintenance passée à : ${updated.maintenanceMode}`
        }
      });

      return NextResponse.json(updated);
    }

    // 3. ACTION PAR DÉFAUT : SYNC CORE (Mise à jour globale)
    const { 
      appVersion, globalAnnouncement, transactionFee, 
      maintenanceMode, minWithdrawal, consensusPrice, 
      stakingAPY, forceUpdate 
    } = body;

    const updatedConfig = await ConfigModel.update({
      where: { id: "GLOBAL_CONFIG" },
      data: {
        appVersion,
        globalAnnouncement,
        transactionFee: Number(transactionFee),
        maintenanceMode: Boolean(maintenanceMode), // Force le mode instantané ici
        minWithdrawal: Number(minWithdrawal),
        consensusPrice: Number(consensusPrice),
        stakingAPY: Number(stakingAPY),
        forceUpdate: Boolean(forceUpdate)
      }
    });

    await prisma.auditLog.create({
      data: {
        adminName: adminSession.email || "Admin",
        action: "UPDATE_SYSTEM_CONFIG",
        details: `Mise à jour noyau v${appVersion}`
      }
    });

    return NextResponse.json(updatedConfig);

  } catch (error: any) {
    console.error("ADMIN_POST_ERROR:", error);
    return NextResponse.json({ error: "Erreur d'exécution de l'action" }, { status: 500 });
  }
}
