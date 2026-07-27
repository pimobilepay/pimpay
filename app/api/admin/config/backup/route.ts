export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {

    // 1. DOUBLE VÉRIFICATION DE SÉCURITÉ (ADMIN OU CRON)
    // [FIX V21] — Vérification centralisée (supporte rotation CRON_SECRET_NEXT)
    const { verifyCronSecret } = await import("@/lib/cron-auth");
    const isCron = verifyCronSecret(req);

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

    // 2. EXTRACTION DES DONNÉES (PIMOBIPAY Core)
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

    // 3.b UPLOAD DE LA SAUVEGARDE VERS GOOGLE DRIVE (Seulement si Cron)
    let driveResult: { id: string; name: string; webViewLink?: string | null } | null = null;
    let driveError: string | null = null;

    if (isCron) {
      try {
        const { uploadBackupToDrive } = await import("@/lib/googleDrive");
        const fileName = `pimpay_backup_${new Date().toISOString().slice(0, 10)}_${new Date().getTime()}.json`;
        driveResult = await uploadBackupToDrive(fileName, backupString);
      } catch (e: any) {
        driveError = e?.message || "Erreur inconnue Google Drive";
        console.error("BACKUP_DRIVE_ERROR:", driveError);
      }
    }

    // 4. LOG DE L'ACTION
    await prisma.auditLog.create({
      data: {
        adminId: isCron ? null : (adminPayload?.id || null),
        adminName: isCron ? "Auto-Protect" : (adminPayload?.id ? "System Admin" : "Unknown"),
        action: "DATABASE_BACKUP",
        details: isCron
          ? driveError
            ? `Cron Job : Backup + Stats. ECHEC Drive : ${driveError}`
            : `Cron Job : Backup + Stats. Envoye sur Google Drive (${driveResult?.name}).`
          : "Manuel.",
        targetId: null, 
      }
    });

    if (isCron)
      return NextResponse.json({
        success: !driveError,
        mode: "Cron_Stats_Updated",
        drive: driveResult
          ? { id: driveResult.id, name: driveResult.name, link: driveResult.webViewLink }
          : null,
        driveError,
      });

    return new NextResponse(backupString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=pimpay_backup_${new Date().getTime()}.json`,
      },
    });

  } catch (error: any) {
    console.error("BACKUP_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Échec procédure" }, { status: 500 });
  }
}
