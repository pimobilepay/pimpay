export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { verifyAuth } from "@/lib/auth/verify";
import bcrypt from "bcryptjs";

const ConfigModel = prisma.systemConfig;

// Defaults returned when the database is not reachable (e.g. missing DATABASE_URL)
const FALLBACK_CONFIG = {
  id: "GLOBAL_CONFIG",
  appVersion: "2.4.0-STABLE",
  maintenanceMode: false,
  comingSoonMode: false,
  consensusPrice: 314159.0,
  stakingAPY: 12.0,
  transactionFee: 0.5,
  minWithdrawal: 10.0,
  globalAnnouncement: "",
  forceUpdate: false,
  auditLogs: [],
  isAdmin: false,
  stats: { totalUsers: 0, activeSessions: 0, piVolume24h: 0 },
};

// --- GET : RÉCUPÉRATION DE LA CONFIGURATION ET DES STATS ---
export async function GET(req: NextRequest) {
  // Early exit when DATABASE_URL is not configured
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(FALLBACK_CONFIG);
  }

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
    // When the database is unreachable return safe defaults instead of a 500
    // so that client components (GlobalAnnouncement, GlobalAlert) keep working.
    console.error("GET_CONFIG_ERROR:", error);
    return NextResponse.json(FALLBACK_CONFIG);
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

    // 2b. ACTION : MAINTENANCE AVEC DATE (depuis MaintenanceControl)
    if (body.maintenanceMode !== undefined && !body.appVersion) {
      const updateData: any = {
        maintenanceMode: Boolean(body.maintenanceMode),
      };
      if (body.maintenanceUntil) {
        updateData.maintenanceUntil = new Date(body.maintenanceUntil);
      } else if (!body.maintenanceMode) {
        updateData.maintenanceUntil = null;
      }

      const updated = await ConfigModel.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: updateData,
        create: { id: "GLOBAL_CONFIG", ...updateData },
      });

      // Cookie de maintenance pour le proxy
      const response = NextResponse.json(updated);
      if (body.maintenanceMode) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/", httpOnly: false, secure: process.env.NODE_ENV === "production",
          sameSite: "lax", maxAge: 60 * 60 * 24 * 365,
        });
      } else {
        response.cookies.delete("maintenance_mode");
      }
      return response;
    }

    // 3. ACTION PAR DÉFAUT : SYNC CORE (Mise a jour globale depuis ton formulaire)
    const {
      appVersion, globalAnnouncement, transactionFee,
      maintenanceMode, comingSoonMode, minWithdrawal, 
      consensusPrice, stakingAPY, forceUpdate,
      maintenanceUntil,
    } = body;

    const updatedConfig = await ConfigModel.update({
      where: { id: "GLOBAL_CONFIG" },
      data: {
        appVersion,
        globalAnnouncement,
        transactionFee: Number(transactionFee),
        maintenanceMode: Boolean(maintenanceMode),
        maintenanceUntil: maintenanceUntil ? new Date(maintenanceUntil) : null,
        comingSoonMode: Boolean(comingSoonMode),
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
