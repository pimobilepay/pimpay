import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

type ChartPointWithFees = {
  date: string;
  label: string;
  newUsers: number;
  transactions: number;
  volume: number;
  fees?: number;
};

export async function GET(req: NextRequest) {
  const adminPayload = await adminAuth(req);
  if (!adminPayload) return NextResponse.json({ error: "Accès non autorisé" }, { status: 401 });

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // --- Parallel queries ---
    const [
      totalUsers,
      newUsersToday,
      newUsersYesterday,
      newUsersWeek,
      activeUsers,
      bannedUsers,
      suspendedUsers,
      roleDistribution,
      totalTransactions,
      transactionsToday,
      transactionsYesterday,
      transactionsWeek,
      usersLast30Days,
      transactionsLast30Days,
      topCountries,
      kycStats,
      recentSignups,
      domainStats,
      txStatusStats,
      txTypeStats,
      txGlobalAgg,
      txTodayAgg,
      txWeekAgg,
      feesLast30Days,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "BANNED" } }),
      prisma.user.count({ where: { status: "SUSPENDED" } }),

      // Role distribution
      prisma.user.groupBy({ by: ["role"], _count: { id: true } }),

      // Transactions
      prisma.transaction.count(),
      prisma.transaction.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.transaction.count({ where: { createdAt: { gte: yesterdayStart, lt: todayStart } } }),
      prisma.transaction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),

      // Users last 30 days (grouped by day)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count
        FROM "User"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      ` as Promise<{ date: Date; count: number }[]>,

      // Transactions last 30 days (grouped by day)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COUNT(*)::int as count, COALESCE(SUM(amount), 0)::float as volume
        FROM "Transaction"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      ` as Promise<{ date: Date; count: number; volume: number }[]>,

      // Top countries - combining all registered users and recent activity (no LIMIT to get all countries)
      prisma.$queryRaw`
        SELECT 
          TRIM(u."country") as country, 
          COUNT(DISTINCT u.id)::int as count,
          COUNT(DISTINCT CASE WHEN ua."createdAt" >= ${thirtyDaysAgo} THEN u.id END)::int as active_count,
          COUNT(DISTINCT CASE WHEN u."createdAt" >= ${sevenDaysAgo} THEN u.id END)::int as new_count
        FROM "User" u
        LEFT JOIN "UserActivity" ua ON u.id = ua."userId"
        WHERE u."country" IS NOT NULL AND TRIM(u."country") != ''
        GROUP BY TRIM(u."country")
        ORDER BY count DESC
      ` as Promise<{ country: string; count: number; active_count: number; new_count: number }[]>,

      // KYC stats
      prisma.user.groupBy({ by: ["kycStatus"], _count: { id: true } }),

      // Recent signups (last 10)
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { id: true, name: true, username: true, email: true, country: true, role: true, createdAt: true, status: true },
      }),

      // Domain / server distribution (last 30 days) - identifies which
      // sub-domain of the Pi ecosystem / Vercel deployment users connect from.
      prisma.$queryRaw`
        SELECT
          COALESCE(NULLIF(TRIM("host"), ''), 'inconnu') as host,
          COUNT(*)::int as views,
          COUNT(DISTINCT "userId")::int as users,
          COUNT(DISTINCT CASE WHEN "createdAt" >= ${new Date(now.getTime() - 5 * 60 * 1000)} THEN "userId" END)::int as online
        FROM "UserActivity"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY COALESCE(NULLIF(TRIM("host"), ''), 'inconnu')
        ORDER BY views DESC
      ` as Promise<{ host: string; views: number; users: number; online: number }[]>,

      // Transaction status distribution (all time) - powers the
      // transactional health & risk tab.
      prisma.transaction.groupBy({
        by: ["status"],
        _count: { id: true },
        _sum: { amount: true, fee: true },
      }),

      // Transaction type distribution (all time) - volume & fees per type.
      prisma.transaction.groupBy({
        by: ["type"],
        _count: { id: true },
        _sum: { amount: true, fee: true },
      }),

      // Global volume & fee aggregates
      prisma.transaction.aggregate({
        _sum: { amount: true, fee: true },
        _avg: { amount: true, fee: true },
      }),

      // Today's volume & fees
      prisma.transaction.aggregate({
        where: { createdAt: { gte: todayStart } },
        _sum: { amount: true, fee: true },
      }),

      // 7-day volume & fees
      prisma.transaction.aggregate({
        where: { createdAt: { gte: sevenDaysAgo } },
        _sum: { amount: true, fee: true },
      }),

      // Daily fees over the last 30 days
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, COALESCE(SUM(fee), 0)::float as fees
        FROM "Transaction"
        WHERE "createdAt" >= ${thirtyDaysAgo}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      ` as Promise<{ date: Date; fees: number }[]>,
    ]);

    // Build 30-day chart data
    const userChartMap = new Map<string, number>();
    const txChartMap = new Map<string, { count: number; volume: number }>();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split("T")[0];
      userChartMap.set(key, 0);
      txChartMap.set(key, { count: 0, volume: 0 });
    }

    (usersLast30Days || []).forEach((row) => {
      const key = new Date(row.date).toISOString().split("T")[0];
      if (userChartMap.has(key)) userChartMap.set(key, row.count);
    });

    (transactionsLast30Days || []).forEach((row) => {
      const key = new Date(row.date).toISOString().split("T")[0];
      if (txChartMap.has(key)) txChartMap.set(key, { count: row.count, volume: row.volume });
    });

    const chartData = Array.from(userChartMap.entries()).map(([date, users]) => ({
      date,
      label: new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
      newUsers: users,
      transactions: txChartMap.get(date)?.count || 0,
      volume: Math.round((txChartMap.get(date)?.volume || 0) * 100) / 100,
    }));

    // Role distribution map
    const roles: Record<string, number> = { USER: 0, AGENT: 0, MERCHANT: 0, ADMIN: 0 };
    roleDistribution.forEach((r) => { roles[r.role] = r._count.id; });

    // KYC stats map
    const kyc: Record<string, number> = { NONE: 0, PENDING: 0, VERIFIED: 0, APPROVED: 0, REJECTED: 0 };
    kycStats.forEach((k) => { if (k.kycStatus) kyc[k.kycStatus] = k._count.id; });

    // Growth percentages
    const userGrowth = newUsersYesterday > 0 ? Math.round(((newUsersToday - newUsersYesterday) / newUsersYesterday) * 100) : newUsersToday > 0 ? 100 : 0;
    const txGrowth = transactionsYesterday > 0 ? Math.round(((transactionsToday - transactionsYesterday) / transactionsYesterday) * 100) : transactionsToday > 0 ? 100 : 0;

    // Process country data with additional metrics
    const finalTopCountries = (topCountries || []).map(c => ({
      country: c.country,
      count: c.count,
      activeCount: c.active_count || 0,
      newCount: c.new_count || 0,
    }));

    // Process domain/server data: classify each host so the admin can quickly
    // tell apart the Pi Browser sandbox, custom sub-domains, and Vercel previews.
    const totalDomainViews = (domainStats || []).reduce((sum, d) => sum + d.views, 0);
    const finalDomains = (domainStats || []).map((d) => ({
      host: d.host,
      views: d.views,
      users: d.users,
      online: d.online || 0,
      share: totalDomainViews > 0 ? Math.round((d.views / totalDomainViews) * 1000) / 10 : 0,
      kind: classifyHost(d.host),
    }));

    // --- Transactional health & risk ---
    const STATUS_ORDER = ["SUCCESS", "PENDING", "PENDING_CONFIRMATION", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"];
    const statusBreakdown = STATUS_ORDER.map((status) => {
      const row = txStatusStats.find((s) => s.status === status);
      return {
        status,
        count: row?._count.id || 0,
        volume: Math.round((row?._sum.amount || 0) * 100) / 100,
        fees: Math.round((row?._sum.fee || 0) * 100) / 100,
      };
    }).filter((s) => s.count > 0);

    const totalTxCount = statusBreakdown.reduce((sum, s) => sum + s.count, 0) || totalTransactions || 0;
    const successCount = statusBreakdown.find((s) => s.status === "SUCCESS")?.count || 0;
    const failedCount = statusBreakdown
      .filter((s) => ["FAILED", "CANCELLED", "REJECTED", "EXPIRED"].includes(s.status))
      .reduce((sum, s) => sum + s.count, 0);
    const pendingCount = statusBreakdown
      .filter((s) => ["PENDING", "PENDING_CONFIRMATION"].includes(s.status))
      .reduce((sum, s) => sum + s.count, 0);

    const successRate = totalTxCount > 0 ? Math.round((successCount / totalTxCount) * 1000) / 10 : 0;
    const failureRate = totalTxCount > 0 ? Math.round((failedCount / totalTxCount) * 1000) / 10 : 0;
    const pendingRate = totalTxCount > 0 ? Math.round((pendingCount / totalTxCount) * 1000) / 10 : 0;

    // Volume & fees per transaction type
    const typeBreakdown = (txTypeStats || [])
      .map((t) => ({
        type: t.type,
        count: t._count.id,
        volume: Math.round((t._sum.amount || 0) * 100) / 100,
        fees: Math.round((t._sum.fee || 0) * 100) / 100,
      }))
      .sort((a, b) => b.volume - a.volume);

    // Daily fees map merged onto the existing 30-day chart
    const feesMap = new Map<string, number>();
    (feesLast30Days || []).forEach((row) => {
      const key = new Date(row.date).toISOString().split("T")[0];
      feesMap.set(key, Math.round(row.fees * 100) / 100);
    });
    chartData.forEach((point) => {
      (point as ChartPointWithFees).fees = feesMap.get(point.date) || 0;
    });

    const txHealth = {
      totalVolume: Math.round((txGlobalAgg._sum.amount || 0) * 100) / 100,
      totalFees: Math.round((txGlobalAgg._sum.fee || 0) * 100) / 100,
      avgAmount: Math.round((txGlobalAgg._avg.amount || 0) * 100) / 100,
      avgFee: Math.round((txGlobalAgg._avg.fee || 0) * 100) / 100,
      volumeToday: Math.round((txTodayAgg._sum.amount || 0) * 100) / 100,
      feesToday: Math.round((txTodayAgg._sum.fee || 0) * 100) / 100,
      volumeWeek: Math.round((txWeekAgg._sum.amount || 0) * 100) / 100,
      feesWeek: Math.round((txWeekAgg._sum.fee || 0) * 100) / 100,
      successRate,
      failureRate,
      pendingRate,
      successCount,
      failedCount,
      pendingCount,
      statusBreakdown,
      typeBreakdown,
    };

    return NextResponse.json({
      kpis: {
        totalUsers,
        newUsersToday,
        newUsersWeek,
        activeUsers,
        bannedUsers,
        suspendedUsers,
        totalTransactions,
        transactionsToday,
        transactionsWeek,
        userGrowth,
        txGrowth,
      },
      roles,
      kyc,
      chartData,
      topCountries: finalTopCountries,
      domains: finalDomains,
      txHealth,
      recentSignups: recentSignups.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[Analytics API Error]", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// Classify a host into a server "kind" so the dashboard can color/label it.
function classifyHost(host: string): "pi" | "vercel" | "local" | "custom" | "unknown" {
  const h = (host || "").toLowerCase();
  if (!h || h === "inconnu") return "unknown";
  if (h.includes("localhost") || h.startsWith("127.") || h.includes(".local")) return "local";
  if (h.includes("pinet.com") || h.includes("minepi.com") || h.includes("pi.app")) return "pi";
  if (h.includes("vercel.app") || h.includes("vercel.sh")) return "vercel";
  return "custom";
}
