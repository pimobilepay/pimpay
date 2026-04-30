export const dynamic = 'force-dynamic';
import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req);
    if (!payload || payload.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    // 1. Get table counts in parallel
    const [
      usersCount,
      transactionsCount,
      sessionsCount,
      auditLogsCount,
      securityLogsCount,
      walletsCount,
      supportTicketsCount,
      dailyStatsCount,
      userActivityCount,
      notificationsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.transaction.count(),
      prisma.session.count(),
      prisma.auditLog.count(),
      prisma.securityLog.count(),
      prisma.wallet.count(),
      prisma.supportTicket.count(),
      prisma.dailyStats.count(),
      (prisma as any).userActivity?.count().catch(() => 0) ?? 0,
      prisma.notification.count(),
    ]);

    const tables = [
      { name: "User", rows: usersCount, icon: "users" },
      { name: "Transaction", rows: transactionsCount, icon: "transaction" },
      { name: "Session", rows: sessionsCount, icon: "session" },
      { name: "Wallet", rows: walletsCount, icon: "wallet" },
      { name: "AuditLog", rows: auditLogsCount, icon: "audit" },
      { name: "SecurityLog", rows: securityLogsCount, icon: "security" },
      { name: "SupportTicket", rows: supportTicketsCount, icon: "support" },
      { name: "DailyStats", rows: dailyStatsCount, icon: "stats" },
      { name: "UserActivity", rows: userActivityCount, icon: "activity" },
      { name: "Notification", rows: notificationsCount, icon: "notification" },
    ];

    const totalRows = tables.reduce((sum, t) => sum + t.rows, 0);

    // 2. Get backup history from AuditLog
    const backups = await prisma.auditLog.findMany({
      where: { action: "DATABASE_BACKUP" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        adminName: true,
        details: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      tables,
      totalRows,
      totalTables: tables.length,
      backups,
      dbProvider: "PostgreSQL (Neon)",
    });
  } catch (error: unknown) {
    console.error("DB_INFO_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur", details: getErrorMessage(error) }, { status: 500 });
  }
}
