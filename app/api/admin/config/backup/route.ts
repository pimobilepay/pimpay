export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { createFullBackup } from "@/lib/backup";

export async function GET(req: NextRequest) {
  try {
    // 1. DOUBLE VÉRIFICATION DE SÉCURITÉ (ADMIN OU CRON)
    // [FIX V21] — Vérification centralisée (supporte rotation CRON_SECRET_NEXT)
    const { verifyCronSecret } = await import("@/lib/cron-auth");
    const isCron = verifyCronSecret(req);

    let adminPayload: { id: string; role: string } | null = null;

    if (!isCron) {
      const decoded = await verifyAuth(req);
      adminPayload = decoded as { id: string; role: string } | null;
    }

    if (!isCron && (!adminPayload || adminPayload.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. SAUVEGARDE COMPLÈTE : TOUTES LES TABLES DE LA BASE
    // ?redact=true → masque les champs sensibles (clés privées, mots de passe…)
    const redactSecrets = req.nextUrl.searchParams.get("redact") === "true";

    const backup = await createFullBackup({
      source: isCron ? "AUTOMATIC_CRON" : "MANUAL_ADMIN",
      redactSecrets,
      triggeredBy: isCron ? "Auto-Protect" : adminPayload?.id || null,
    });

    const config = (backup.backup.data.SystemConfig || [])[0] || null;
    const totalUsers = (backup.tables.find((t) => t.model === "User")?.rows) || 0;
    const gcvPrice = Number(config?.consensusPrice || 0);
    const stakingAPY = Number(config?.stakingAPY || 0);

    // 3. MISE À JOUR DE L'HISTORIQUE (Seulement si Cron)
    if (isCron) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.dailyStats.upsert({
        where: { date: today },
        update: { totalUsers, consensusPrice: gcvPrice, stakingAPY },
        create: { date: today, totalUsers, consensusPrice: gcvPrice, stakingAPY },
      });
    }

    // 4. UPLOAD VERS GOOGLE DRIVE (manuel ET automatique)
    let driveResult: { id: string; name: string; webViewLink?: string | null } | null = null;
    let driveError: string | null = null;

    try {
      const { uploadBackupToDrive } = await import("@/lib/googleDrive");
      const fileName = `pimpay_full_backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
      driveResult = await uploadBackupToDrive(fileName, backup.json);
    } catch (e: any) {
      driveError = e?.message || "Erreur inconnue Google Drive";
      console.error("BACKUP_DRIVE_ERROR:", driveError);
    }

    // 5. LOG DE L'ACTION
    const summary =
      `${backup.exportedTables}/${backup.totalTables} tables · ${backup.totalRows} lignes · ` +
      `${(backup.sizeBytes / 1024 / 1024).toFixed(2)} Mo · ${backup.durationMs} ms` +
      (backup.errors.length ? ` · ${backup.errors.length} table(s) en erreur` : "") +
      (driveResult ? ` · Drive: ${driveResult.name}` : driveError ? ` · ECHEC Drive: ${driveError}` : "");

    await prisma.auditLog.create({
      data: {
        adminId: isCron ? null : adminPayload?.id || null,
        adminName: isCron ? "Auto-Protect" : adminPayload?.id ? "System Admin" : "Unknown",
        action: "DATABASE_BACKUP",
        details: `${isCron ? "Cron Job" : "Manuel"} — Sauvegarde complète : ${summary}`,
        targetId: null,
      },
    });

    if (isCron) {
      return NextResponse.json({
        success: !driveError,
        mode: "Cron_Full_Backup",
        totalTables: backup.totalTables,
        exportedTables: backup.exportedTables,
        totalRows: backup.totalRows,
        sizeBytes: backup.sizeBytes,
        durationMs: backup.durationMs,
        tables: backup.tables,
        errors: backup.errors,
        drive: driveResult
          ? { id: driveResult.id, name: driveResult.name, link: driveResult.webViewLink }
          : null,
        driveError,
      });
    }

    // Téléchargement direct pour l'admin
    return new NextResponse(backup.json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename=pimpay_full_backup_${Date.now()}.json`,
        "X-Backup-Tables": String(backup.exportedTables),
        "X-Backup-Total-Tables": String(backup.totalTables),
        "X-Backup-Rows": String(backup.totalRows),
        "X-Backup-Drive": driveResult ? "uploaded" : "skipped",
      },
    });
  } catch (error: any) {
    console.error("BACKUP_CRITICAL_ERROR:", error);
    return NextResponse.json({ error: "Échec procédure" }, { status: 500 });
  }
}
