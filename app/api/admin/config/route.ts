export const dynamic = "force-dynamic";

import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth"; // Changement ici pour utiliser la version stricte

const getConfigModel = () => {
  return (prisma as any).systemConfig;
};

export async function GET(req: NextRequest) {
  try {
    // On utilise adminAuth qui vérifie le token ET le rôle ADMIN
    const payload = adminAuth(req);
    
    if (!payload) {
      return NextResponse.json({ error: "Accès Admin requis" }, { status: 401 });
    }

    const ConfigModel = getConfigModel();
    if (!ConfigModel) throw new Error("Modèle systemConfig introuvable");

    let config = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });

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

    const logs = await prisma.auditLog.findMany({
      where: { action: "UPDATE_SYSTEM_CONFIG" },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return NextResponse.json({ ...config, auditLogs: logs });
  } catch (error: any) {
    console.error("CONFIG_GET_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Accès Admin requis" }, { status: 401 });
    }

    const body = await req.json();
    const ConfigModel = getConfigModel();

    const oldConfig = await ConfigModel.findUnique({ where: { id: "GLOBAL_CONFIG" } });
    const adminUser = await prisma.user.findUnique({ where: { id: payload.id } });

    const updateData: any = {};
    const changes: string[] = [];

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
        let val = type === 'bool' ? Boolean(body[key]) : type === 'float' ? parseFloat(body[key]) : body[key];
        updateData[key] = val;
        if (oldConfig && oldConfig[key] !== val) {
          changes.push(`${key}: ${oldConfig[key]} → ${val}`);
        }
      }
    });

    if (body.action === "BACKUP_DB") updateData.lastBackupAt = new Date();

    const result = await prisma.$transaction(async (tx) => {
      const updated = await (tx as any).systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        update: updateData,
        create: { id: "GLOBAL_CONFIG", ...updateData, lastBackupAt: new Date() }
      });

      if (changes.length > 0) {
        await tx.auditLog.create({
          data: {
            adminId: payload.id,
            adminName: adminUser?.username || adminUser?.email || "Admin",
            action: "UPDATE_SYSTEM_CONFIG",
            details: changes.join(" | "),
            targetId: "SYSTEM",
          }
        });
      }
      return updated;
    });

    const response = NextResponse.json(result);
    if (body.maintenanceMode !== undefined) {
      response.cookies.set("maintenance_mode", String(body.maintenanceMode), {
        path: "/",
        maxAge: body.maintenanceMode ? 60 * 60 * 24 * 30 : 0,
      });
    }

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: "Échec de mise à jour" }, { status: 500 });
  }
}
