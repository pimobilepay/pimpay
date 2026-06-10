import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

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
