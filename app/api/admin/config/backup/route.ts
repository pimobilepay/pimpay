import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET(req: NextRequest) {
  try {
    // 1. DOUBLE VÉRIFICATION DE SÉCURITÉ (ADMIN OU CRON)
    const authHeader = req.headers.get('authorization');
    const isCron = 
      authHeader === `Bearer ${process.env.CRON_SECRET}` || 
      authHeader === `Bearer ${process.env.VERCEL_CRON_JWT}`;

    let adminPayload = null;
    if (!isCron) {
      adminPayload = verifyAuth(req) as { id: string; role: string } | null;
    }

    if (!isCron && (!adminPayload || adminPayload.role !== "ADMIN")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    // 2. EXTRACTION DES DONNÉES
    const [users, config, logs] = await Promise.all([
      prisma.user.findMany({ take: 5000 }),
      prisma.systemConfig.findFirst(),
      prisma.auditLog.findMany({ take: 100, orderBy: { createdAt: 'desc' } })
    ]);

    // Calcul des statistiques
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

    // 3. MISE À JOUR DE L'HISTORIQUE POUR LE GRAPHIQUE (Seulement si Cron)
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

    // 4. ENVOI DE L'EMAIL AVEC RAPPORT HTML
    const shouldSendEmail = isCron || req.nextUrl.searchParams.get("sendEmail") === "true";

    if (shouldSendEmail && process.env.RESEND_API_KEY) {
      await resend.emails.send({
        from: "PimPay Security <onboarding@resend.dev>",
        to: process.env.ADMIN_EMAIL as string,
        subject: `🛡️ Rapport & Backup PimPay - ${new Date().toLocaleDateString()}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 15px;">
            <h2 style="color: #2563eb; text-align: center;">Système Core Snapshot</h2>
            <div style="background: #f8fafc; padding: 15px; border-radius: 10px; margin: 20px 0;">
              <table style="width: 100%; font-size: 15px;">
                <tr><td>👥 Utilisateurs :</td><td style="text-align: right; font-weight: bold;">${totalUsers}</td></tr>
                <tr><td>💰 Prix GCV :</td><td style="text-align: right; font-weight: bold;">$${gcvPrice}</td></tr>
                <tr><td>🛠️ Maintenance :</td><td style="text-align: right; font-weight: bold;">${maintenanceStatus}</td></tr>
                <tr><td>🚀 Version :</td><td style="text-align: right; font-weight: bold;">v${appVersion}</td></tr>
              </table>
            </div>
            <p style="font-size: 11px; color: #999; text-align: center;">Fichier JSON attaché pour restauration.</p>
          </div>
        `,
        attachments: [
          {
            filename: `backup_core_${new Date().getTime()}.json`,
            content: Buffer.from(backupString),
          },
        ],
      });
    }

    // 5. LOG DE L'ACTION
    await prisma.auditLog.create({
      data: {
        adminId: isCron ? "SYSTEM_CRON" : (adminPayload?.id || "UNKNOWN"),
        adminName: isCron ? "Auto-Protect" : "System Admin",
        action: "DATABASE_BACKUP",
        details: isCron 
          ? "Cron Job : Backup + Stats Graphique + Email." 
          : `Manuel ${shouldSendEmail ? '+ Email' : ''}.`,
        targetId: "SYSTEM",
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
    return NextResponse.json({ error: "Échec procédure" }, { status: 500 });
  }
}
