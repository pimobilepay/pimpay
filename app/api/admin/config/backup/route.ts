export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {

    // 1. DOUBLE VÉRIFICATION DE SÉCURITÉ (ADMIN OU CRON)
    const authHeader = req.headers.get('authorization');
    const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}` ||
                   authHeader === `Bearer ${process.env.VERCEL_CRON_JWT}`;

    let adminPayload: { id: string; role: string } | null = null;

    if (!isCron) {
      // On attend la vérification asynchrone
      const decoded = await verifyAuth(req);
      adminPayload = decoded as { id: string; role: string } | null;
    }

    // Vérification stricte des droits
    if (!isCron && (!adminPayload || adminPayload.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. EXTRACTION DES DONNÉES (PimPay Core)
    const [users, config, logs] = await Promise.all([
      prisma.user.findMany({ take: 5000 }),
      prisma.systemConfig.findFirst(),
      prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
    ]);

    const totalUsers = users.length;
    const maintenanceStatus = config?.maintenanceMode ? "ACTIF 🔴" : "INACTIF 🟢";
    const gcvPrice = config?.consensusPrice || 0;
    const appVersion = config?.appVersion || "N/A";
    const stakingAPY = config?.stakingAPY || 0;

    const backupData = {
      timestamp: new Date().toISOString(),
      source: isCron ? "AUTOMATIC_CRON" : "MANUAL_ADMIN",
      version: "1.4",
      stats: { totalUsers, gcvPrice, maintenanceStatus },
      data: { users, systemConfig: config, auditLogs: logs }
    };

    const backupString = JSON.stringify(backupData, null, 2);

    // 3. MISE À JOUR DE L'HISTORIQUE (Seulement si Cron)
    if (isCron) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.dailyStats.upsert({
        where: { date: today },
        update: {
          totalUsers,
          consensusPrice: gcvPrice,
          stakingAPY: stakingAPY,
        },
        create: {
          date: today,
          totalUsers,
          consensusPrice: gcvPrice,
          stakingAPY: stakingAPY,
        },
      });
    }

    // 4. LOG DE L'ACTION
    await prisma.auditLog.create({
      data: {
        adminId: isCron ? null : (adminPayload?.id || null),
        adminName: isCron ? "Auto-Protect" : (adminPayload?.id ? "System Admin" : "Unknown"),
        action: "DATABASE_BACKUP",
        details: isCron
          ? "Cron Job : Backup + Stats Graphique."
          : "Manuel.",
        targetId: null, 
      }
    });

    if (isCron) return NextResponse.json({ success: true, mode: "Cron_Stats_Updated" });

    return new NextResponse(backupString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=pimpay_backup_${new Date().getTime()}.json`,
      },
    });

  } catch (error: any) {
    console.error("BACKUP_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Échec procédure", details: error.message }, { status: 500 });
  }
}
