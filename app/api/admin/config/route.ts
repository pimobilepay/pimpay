export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { verifyAuth } from "@/lib/auth/verify";
import bcrypt from "bcryptjs";

const ConfigModel = prisma.systemConfig;

// --- GET : RÉCUPÉRATION DE LA CONFIGURATION ET DES STATS ---
export async function GET(req: NextRequest) {
  try {
    let config = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });

    // Initialisation si inexistant
    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          appVersion: "2.4.0-STABLE",
          maintenanceMode: false,
          comingSoonMode: false, // Initialisé par défaut
          consensusPrice: 314159.0,
          stakingAPY: 12.0,
          transactionFee: 0.5,
          minWithdrawal: 10.0,
          globalAnnouncement: "PIMPAY PROTOCOL: Network operational.",
          forceUpdate: false,
        }
      });
    }

    // Récupération des statistiques réelles pour l'admin
    const [totalUsers, activeSessions] = await Promise.all([
      prisma.user.count(),
      prisma.session.count({ where: { isActive: true } })
    ]);

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

    return NextResponse.json({ 
      ...config, 
      auditLogs: logs, 
      isAdmin,
      stats: {
        totalUsers,
        activeSessions,
        piVolume24h: 314.15 // Tu pourras lier cela à une agrégation de transactions plus tard
      }
    });
  } catch (error: any) {
    console.error("GET_CONFIG_ERROR:", error);
    return NextResponse.json({ error: "Erreur noyau Elara" }, { status: 500 });
  }
}

// --- POST : CENTRE DE COMMANDE ACTIONS ADMIN ---
export async function POST(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Accès refusé - Protocole Elara" }, { status: 403 });
    }

    const body = await req.json();
    const { action } = body;

    // 1. ACTION : RÉINITIALISATION (Password/Pin)
    if (action === "RESET_PASSWORD" || action === "RESET_PIN") {
      const { userId, newSecret } = body;
      if (!userId || !newSecret) return NextResponse.json({ error: "Données manquantes" }, { status: 400 });

      const hashedSecret = await bcrypt.hash(newSecret, 10);
      const updateData = action === "RESET_PASSWORD"
        ? { password: hashedSecret }
        : { pin: hashedSecret }; // Corrigé selon ton schéma 'pin'

      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      await prisma.auditLog.create({
        data: {
          adminName: adminSession.email || "Admin",
          action: action,
          details: `Réinitialisation de sécurité pour l'utilisateur ${userId}`
        }
      });

      return NextResponse.json({ message: "Réinitialisation réussie" });
    }

    // 2. ACTION : TOGGLE SPECIFIQUE (Maintenance ou Coming Soon)
    if (action === "TOGGLE_MODE") {
      const { modeType } = body; // 'maintenanceMode' ou 'comingSoonMode'
      const current = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });
      
      const updated = await ConfigModel.update({
        where: { id: "GLOBAL_CONFIG" },
        data: { [modeType]: !current?.[modeType as keyof typeof current] }
      });

      return NextResponse.json(updated);
    }

    // 3. ACTION PAR DÉFAUT : SYNC CORE (Mise à jour globale depuis ton formulaire)
    const {
      appVersion, globalAnnouncement, transactionFee,
      maintenanceMode, comingSoonMode, minWithdrawal, 
      consensusPrice, stakingAPY, forceUpdate
    } = body;

    const updatedConfig = await ConfigModel.update({
      where: { id: "GLOBAL_CONFIG" },
      data: {
        appVersion,
        globalAnnouncement,
        transactionFee: Number(transactionFee),
        maintenanceMode: Boolean(maintenanceMode),
        comingSoonMode: Boolean(comingSoonMode), // Support du nouveau mode
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
        details: `Synchronisation noyau v${appVersion} effectuée.`
      }
    });

    return NextResponse.json(updatedConfig);

  } catch (error: any) {
    console.error("ADMIN_POST_ERROR:", error);
    return NextResponse.json({ error: "Échec de l'opération noyau" }, { status: 500 });
  }
}
