export const dynamic = "force-dynamic";
import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

// Utilitaire sécurisé pour accéder au modèle
const getConfigModel = () => {
  return (prisma as any).systemConfig;
};

export async function GET(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const ConfigModel = getConfigModel();
    if (!ConfigModel) throw new Error("Modèle systemConfig introuvable dans Prisma");

    let config = await ConfigModel.findUnique({
      where: { id: "GLOBAL_CONFIG" }
    });

    if (!config) {
      config = await ConfigModel.create({
        data: {
          id: "GLOBAL_CONFIG",
          maintenanceMode: false,
          transactionFee: 0.01,
          minWithdrawal: 1.0,
          maxWithdrawal: 1000.0,
          consensusPrice: 314159.0,
          stakingAPY: 15.0,
          globalAnnouncement: "Bienvenue sur PIMPAY.",
          appVersion: "1.0.0",
          totalVolumePi: 0,
          totalUsers: 0,
          totalProfit: 0,
          lastBackupAt: new Date(),
        }
      });
    }

    // On récupère aussi les 5 derniers logs d'audit pour le flux visuel
    const logs = await prisma.auditLog.findMany({
      where: { action: "UPDATE_SYSTEM_CONFIG" },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return NextResponse.json({ ...config, auditLogs: logs });
  } catch (error: any) {
    console.error("CONFIG_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur de récupération" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = verifyAuth(req) as { id: string; role: string } | null;
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const ConfigModel = getConfigModel();

    // 1. Récupération de l'ancienne config pour comparer
    const oldConfig = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });
    const adminUser = await prisma.user.findUnique({ where: { id: payload.id } });

    // 2. Préparation des données (Conversion explicite)
    const updateData: any = {};
    const changes: string[] = [];

    // Mapping des champs et détection des changements pour l'audit
    const fieldsToTrack = [
      { key: 'maintenanceMode', type: 'bool' },
      { key: 'forceUpdate', type: 'bool' },
      { key: 'transactionFee', type: 'float' },
      { key: 'minWithdrawal', type: 'float' },
      { key: 'maxWithdrawal', type: 'float' },
      { key: 'consensusPrice', type: 'float' },
      { key: 'stakingAPY', type: 'float' },
      { key: 'globalAnnouncement', type: 'string' },
      { key: 'appVersion', type: 'string' }
    ];

    fieldsToTrack.forEach(({ key, type }) => {
      if (body[key] !== undefined) {
        let val: any;
        if (type === 'bool') val = Boolean(body[key]);
        else if (type === 'float') val = parseFloat(body[key]);
        else val = body[key];

        updateData[key] = val;

        // Si la valeur change, on l'ajoute au log
        if (oldConfig && oldConfig[key] !== val) {
          changes.push(`${key}: ${oldConfig[key]} → ${val}`);
        }
      }
    });

    if (body.action === "BACKUP_DB") updateData.lastBackupAt = new Date();

    // 3. TRANSACTION ATOMIQUE : Update Config + Create Log
    const result = await prisma.$transaction(async (tx) => {
      const updated = await (tx as any).systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: updateData,
        create: {
          id: "GLOBAL_CONFIG",
          ...updateData,
          lastBackupAt: new Date(),
        }
      });

      // On ne crée un log que s'il y a eu de vrais changements
      if (changes.length > 0) {
        await tx.auditLog.create({
          data: {
            adminId: payload.id,
            adminName: adminUser?.name || adminUser?.email || "Admin",
            action: "UPDATE_SYSTEM_CONFIG",
            details: changes.join(" | "),
            targetId: "SYSTEM",
          }
        });
      }

      return updated;
    });

    // 4. Gestion des Cookies
    const response = NextResponse.json(result);
    if (body.maintenanceMode !== undefined) {
      if (body.maintenanceMode === true) {
        response.cookies.set("maintenance_mode", "true", {
          path: "/",
          httpOnly: false,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 30,
        });
      } else {
        response.cookies.set("maintenance_mode", "false", { path: "/", maxAge: 0 });
      }
    }

    return response;
  } catch (error: any) {
    console.error("CONFIG_POST_ERROR:", error);
    return NextResponse.json({ error: "Échec de la mise à jour" }, { status: 500 });
  }
}
