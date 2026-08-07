export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import os from "os";

/* ============================================================================
 * PIMOBIPAY — CENTRE DE MONITORING (API d'agregation)
 *
 * Cette route rassemble en UN SEUL appel toute la telemetrie de la plateforme :
 *   - Infrastructure   : CPU / RAM / load / process Node
 *   - Base de donnees  : latence (3 sondes), taille, connexions, volumetrie
 *   - Plateforme       : users, transactions, volumes, frais
 *   - Fiabilite        : taux de succes, taux d'erreur, SLA, debit
 *   - Securite         : IP bloquees, proxy/VPN, logins echoues, alertes AML
 *   - Flux temps reel  : journal systeme + journal d'audit fusionnes
 *
 * Toutes les sous-requetes sont individuellement protegees : si un modele
 * n'existe pas ou si la base est indisponible, la section retourne une valeur
 * neutre au lieu de faire echouer toute la page de monitoring.
 * ==========================================================================*/

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1);
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function cpuSnapshot() {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    const { user, nice, sys, idle: cpuIdle, irq } = cpu.times;
    total += user + nice + sys + cpuIdle + irq;
    idle += cpuIdle;
  }
  return { idle, total };
}

/** Mesure la charge CPU sur un court intervalle (plus fiable qu'un snapshot brut). */
async function measureCpu(sampleMs = 120): Promise<number> {
  const a = cpuSnapshot();
  await new Promise((r) => setTimeout(r, sampleMs));
  const b = cpuSnapshot();
  const totalDiff = b.total - a.total;
  const idleDiff = b.idle - a.idle;
  if (totalDiff <= 0) {
    // Fallback : instantane cumulatif depuis le boot
    return Math.round(((a.total - a.idle) / a.total) * 100);
  }
  return Math.max(0, Math.min(100, Math.round(((totalDiff - idleDiff) / totalDiff) * 100)));
}

/** Execute une promesse avec une valeur de repli en cas d'erreur. */
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

type Severity = "healthy" | "degraded" | "down";

export async function GET(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const requestStart = performance.now();
    const now = new Date();
    const h24 = new Date(now.getTime() - 24 * 3600 * 1000);
    const h1 = new Date(now.getTime() - 3600 * 1000);
    const m5 = new Date(now.getTime() - 5 * 60 * 1000);
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const d14 = new Date(now.getTime() - 13 * 24 * 3600 * 1000);
    d14.setHours(0, 0, 0, 0);
    const prev24 = new Date(now.getTime() - 48 * 3600 * 1000);

    /* ---------------------------------------------------------------------
     * 1. INFRASTRUCTURE (systeme d'exploitation + process Node)
     * ------------------------------------------------------------------ */
    const cpuUsage = await measureCpu();
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0;
    const load = os.loadavg();
    const cores = cpus.length || 1;
    // Load average normalise par coeur : > 1 = saturation
    const loadPercent = Math.min(100, Math.round((load[0] / cores) * 100));
    const mem = process.memoryUsage();
    const heapPercent = mem.heapTotal > 0 ? Math.round((mem.heapUsed / mem.heapTotal) * 100) : 0;

    const system = {
      hostname: os.hostname(),
      platform: os.platform(),
      osType: os.type(),
      osRelease: os.release(),
      arch: os.arch(),
      nodeVersion: process.version,
      uptime: formatUptime(os.uptime()),
      uptimeSeconds: Math.round(os.uptime()),
      processUptime: formatUptime(process.uptime()),
      processUptimeSeconds: Math.round(process.uptime()),
      region: process.env.VERCEL_REGION || process.env.AWS_REGION || "local",
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || "development",
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID || process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      pid: process.pid,
    };

    const cpu = {
      usageNum: cpuUsage,
      usage: `${cpuUsage}%`,
      cores,
      model: cpus[0]?.model?.trim() || "N/A",
      speed: cpus[0]?.speed ? `${(cpus[0].speed / 1000).toFixed(2)} GHz` : "N/A",
      arch: os.arch(),
      load1: Number(load[0].toFixed(2)),
      load5: Number(load[1].toFixed(2)),
      load15: Number(load[2].toFixed(2)),
      loadPercent,
    };

    const ram = {
      total: formatBytes(totalMem),
      used: formatBytes(usedMem),
      free: formatBytes(freeMem),
      percent: `${ramPercent}%`,
      percentNum: ramPercent,
      totalBytes: totalMem,
      usedBytes: usedMem,
    };

    const nodeProcess = {
      heapUsed: formatBytes(mem.heapUsed),
      heapTotal: formatBytes(mem.heapTotal),
      heapPercent,
      rss: formatBytes(mem.rss),
      external: formatBytes(mem.external),
      arrayBuffers: formatBytes((mem as NodeJS.MemoryUsage & { arrayBuffers?: number }).arrayBuffers || 0),
    };

    /* ---------------------------------------------------------------------
     * 2. BASE DE DONNEES — latence multi-sondes + volumetrie
     * ------------------------------------------------------------------ */
    const probes: number[] = [];
    let dbReachable = true;
    for (let i = 0; i < 3; i++) {
      try {
        const t0 = performance.now();
        await prisma.$queryRaw`SELECT 1`;
        probes.push(Math.round((performance.now() - t0) * 100) / 100);
      } catch {
        dbReachable = false;
        break;
      }
    }
    const latencyAvg = probes.length ? Math.round((probes.reduce((a, b) => a + b, 0) / probes.length) * 100) / 100 : -1;
    const latencyMin = probes.length ? Math.min(...probes) : -1;
    const latencyMax = probes.length ? Math.max(...probes) : -1;

    // Taille de la base + connexions actives (specifique PostgreSQL)
    const dbSize = await safe(async () => {
      const rows = await prisma.$queryRaw<{ size: string; bytes: bigint }[]>`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS size,
               pg_database_size(current_database()) AS bytes
      `;
      return { pretty: rows[0]?.size || "N/A", bytes: Number(rows[0]?.bytes || 0) };
    }, { pretty: "N/A", bytes: 0 });

    const dbConnections = await safe(async () => {
      const rows = await prisma.$queryRaw<{ total: bigint; active: bigint; idle: bigint; max_conn: string }[]>`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE state = 'active')::bigint AS active,
          COUNT(*) FILTER (WHERE state = 'idle')::bigint AS idle,
          current_setting('max_connections') AS max_conn
        FROM pg_stat_activity
        WHERE datname = current_database()
      `;
      const r = rows[0];
      return {
        total: Number(r?.total || 0),
        active: Number(r?.active || 0),
        idle: Number(r?.idle || 0),
        max: Number(r?.max_conn || 0),
      };
    }, { total: 0, active: 0, idle: 0, max: 0 });

    // Ratio de cache PostgreSQL : indicateur clef de performance (> 95% = sain)
    const dbCacheHit = await safe(async () => {
      const rows = await prisma.$queryRaw<{ ratio: number | null }[]>`
        SELECT ROUND(
          (SUM(heap_blks_hit) * 100.0) / NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0), 2
        )::float8 AS ratio
        FROM pg_statio_user_tables
      `;
      return rows[0]?.ratio != null ? Number(rows[0].ratio) : null;
    }, null);

    /* ---------------------------------------------------------------------
     * 3. PLATEFORME — utilisateurs, transactions, volumes
     * ------------------------------------------------------------------ */
    const [
      totalUsers,
      activeUsers,
      bannedUsers,
      suspendedUsers,
      newUsersToday,
      newUsers24h,
      newUsersPrev24h,
      kycPending,
      activeSessions,
      liveSessions,
    ] = await Promise.all([
      safe(() => prisma.user.count(), 0),
      safe(() => prisma.user.count({ where: { status: "ACTIVE" } }), 0),
      safe(() => prisma.user.count({ where: { status: "BANNED" } }), 0),
      safe(() => prisma.user.count({ where: { status: "SUSPENDED" } }), 0),
      safe(() => prisma.user.count({ where: { createdAt: { gte: startOfToday } } }), 0),
      safe(() => prisma.user.count({ where: { createdAt: { gte: h24 } } }), 0),
      safe(() => prisma.user.count({ where: { createdAt: { gte: prev24, lt: h24 } } }), 0),
      safe(() => prisma.user.count({ where: { kycStatus: "PENDING" } }), 0),
      safe(() => prisma.session.count({ where: { isActive: true } }), 0),
      safe(() => prisma.session.count({ where: { isActive: true, lastActiveAt: { gte: m5 } } }), 0),
    ]);

    const [
      totalTx,
      txToday,
      tx24h,
      txPrev24h,
      txPending,
      txFailed24h,
      txSuccess24h,
      tx1h,
      tx5m,
    ] = await Promise.all([
      safe(() => prisma.transaction.count(), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: startOfToday } } }), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: h24 } } }), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: prev24, lt: h24 } } }), 0),
      safe(() => prisma.transaction.count({ where: { status: "PENDING" } }), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: h24 }, status: { in: ["FAILED", "REJECTED", "CANCELLED", "EXPIRED"] } } }), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: h24 }, status: "SUCCESS" } }), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: h1 } } }), 0),
      safe(() => prisma.transaction.count({ where: { createdAt: { gte: m5 } } }), 0),
    ]);

    const [volume24h, fees24h, volumeTotal] = await Promise.all([
      safe(async () => {
        const r = await prisma.transaction.aggregate({
          where: { createdAt: { gte: h24 }, status: "SUCCESS" },
          _sum: { amount: true },
        });
        return Math.round((r._sum.amount || 0) * 100) / 100;
      }, 0),
      safe(async () => {
        const r = await prisma.transaction.aggregate({
          where: { createdAt: { gte: h24 }, status: "SUCCESS" },
          _sum: { fee: true },
        });
        return Math.round((r._sum.fee || 0) * 100) / 100;
      }, 0),
      safe(async () => {
        const r = await prisma.transaction.aggregate({
          where: { status: "SUCCESS" },
          _sum: { amount: true },
        });
        return Math.round((r._sum.amount || 0) * 100) / 100;
      }, 0),
    ]);

    // Repartition par type de transaction sur 24h
    const txByType = await safe(async () => {
      const grouped = await prisma.transaction.groupBy({
        by: ["type"],
        where: { createdAt: { gte: h24 } },
        _count: { _all: true },
        _sum: { amount: true },
      });
      return grouped
        .map((g) => ({
          type: g.type as string,
          count: g._count._all,
          volume: Math.round((g._sum.amount || 0) * 100) / 100,
        }))
        .sort((a, b) => b.count - a.count);
    }, [] as { type: string; count: number; volume: number }[]);

    // Repartition par statut sur 24h
    const txByStatus = await safe(async () => {
      const grouped = await prisma.transaction.groupBy({
        by: ["status"],
        where: { createdAt: { gte: h24 } },
        _count: { _all: true },
      });
      return grouped.map((g) => ({ status: g.status as string, count: g._count._all }));
    }, [] as { status: string; count: number }[]);

    /* ---------------------------------------------------------------------
     * 4. SERIES TEMPORELLES
     * ------------------------------------------------------------------ */
    // 24 dernieres heures, granularite horaire
    const hourlyRaw = await safe(
      () =>
        prisma.transaction.findMany({
          where: { createdAt: { gte: h24 } },
          select: { createdAt: true, amount: true, status: true, fee: true },
        }),
      [] as { createdAt: Date; amount: number; status: string; fee: number }[]
    );

    const hourlyMap = new Map<string, { label: string; ts: string; tx: number; volume: number; fees: number; failed: number }>();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      d.setMinutes(0, 0, 0);
      hourlyMap.set(d.toISOString(), {
        label: `${String(d.getHours()).padStart(2, "0")}h`,
        ts: d.toISOString(),
        tx: 0,
        volume: 0,
        fees: 0,
        failed: 0,
      });
    }
    for (const t of hourlyRaw) {
      const d = new Date(t.createdAt);
      d.setMinutes(0, 0, 0);
      const bucket = hourlyMap.get(d.toISOString());
      if (!bucket) continue;
      bucket.tx += 1;
      if (t.status === "SUCCESS") {
        bucket.volume += Math.abs(t.amount || 0);
        bucket.fees += Math.abs(t.fee || 0);
      }
      if (["FAILED", "REJECTED", "CANCELLED", "EXPIRED"].includes(t.status)) bucket.failed += 1;
    }
    const hourly = Array.from(hourlyMap.values()).map((b) => ({
      ...b,
      volume: Math.round(b.volume * 100) / 100,
      fees: Math.round(b.fees * 100) / 100,
    }));

    // 14 derniers jours : transactions + nouveaux utilisateurs
    const [dailyTxRaw, dailyUsersRaw] = await Promise.all([
      safe(
        () =>
          prisma.transaction.findMany({
            where: { createdAt: { gte: d14 } },
            select: { createdAt: true, amount: true, status: true },
          }),
        [] as { createdAt: Date; amount: number; status: string }[]
      ),
      safe(
        () =>
          prisma.user.findMany({
            where: { createdAt: { gte: d14 } },
            select: { createdAt: true },
          }),
        [] as { createdAt: Date }[]
      ),
    ]);

    const dailyMap = new Map<string, { label: string; date: string; tx: number; volume: number; failed: number; users: number }>();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 3600 * 1000);
      const key = d.toISOString().split("T")[0];
      dailyMap.set(key, {
        label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        date: key,
        tx: 0,
        volume: 0,
        failed: 0,
        users: 0,
      });
    }
    for (const t of dailyTxRaw) {
      const bucket = dailyMap.get(t.createdAt.toISOString().split("T")[0]);
      if (!bucket) continue;
      bucket.tx += 1;
      if (t.status === "SUCCESS") bucket.volume += Math.abs(t.amount || 0);
      if (["FAILED", "REJECTED", "CANCELLED", "EXPIRED"].includes(t.status)) bucket.failed += 1;
    }
    for (const u of dailyUsersRaw) {
      const bucket = dailyMap.get(u.createdAt.toISOString().split("T")[0]);
      if (bucket) bucket.users += 1;
    }
    const daily = Array.from(dailyMap.values()).map((b) => ({
      ...b,
      volume: Math.round(b.volume * 100) / 100,
    }));

    /* ---------------------------------------------------------------------
     * 5. JOURNAUX SYSTEME — taux d'erreur, latence applicative
     * ------------------------------------------------------------------ */
    const logStats = await safe(async () => {
      const grouped = await prisma.systemLog.groupBy({
        by: ["level"],
        where: { createdAt: { gte: h24 } },
        _count: { _all: true },
      });
      const map: Record<string, number> = { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 };
      for (const g of grouped) map[g.level as string] = g._count._all;
      return map;
    }, { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, FATAL: 0 });

    const totalLogs24h = Object.values(logStats).reduce((a, b) => a + b, 0);
    const errorLogs24h = (logStats.ERROR || 0) + (logStats.FATAL || 0);
    const errorRate = totalLogs24h > 0 ? Math.round((errorLogs24h / totalLogs24h) * 10000) / 100 : 0;

    // Latence applicative moyenne mesuree par le logger (champ duration)
    const appLatency = await safe(async () => {
      const r = await prisma.systemLog.aggregate({
        where: { createdAt: { gte: h24 }, duration: { not: null } },
        _avg: { duration: true },
        _max: { duration: true },
        _count: { duration: true },
      });
      return {
        avg: r._avg.duration != null ? Math.round(r._avg.duration) : null,
        max: r._max.duration != null ? Math.round(r._max.duration) : null,
        samples: r._count.duration || 0,
      };
    }, { avg: null as number | null, max: null as number | null, samples: 0 });

    // Sources les plus bruyantes (top modules generant des logs)
    const topSources = await safe(async () => {
      const grouped = await prisma.systemLog.groupBy({
        by: ["source"],
        where: { createdAt: { gte: h24 } },
        _count: { _all: true },
      });
      return grouped
        .map((g) => ({ source: g.source, count: g._count._all }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }, [] as { source: string; count: number }[]);

    /* ---------------------------------------------------------------------
     * 6. SECURITE
     * ------------------------------------------------------------------ */
    const [blockedIps, proxyDetections24h, failedLogins24h, lockedAccounts, openAlerts, criticalAlerts] = await Promise.all([
      safe(() => prisma.blockedIp.count({ where: { active: true } }), 0),
      safe(() => prisma.proxyDetection.count({ where: { createdAt: { gte: h24 } } }), 0),
      safe(() => prisma.systemLog.count({ where: { createdAt: { gte: h24 }, source: "AUTH", action: "FAILED_LOGIN" } }), 0),
      safe(() => prisma.user.count({ where: { lockedUntil: { gt: now } } }), 0),
      safe(() => prisma.suspiciousActivity.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }), 0),
      safe(() => prisma.suspiciousActivity.count({ where: { severity: { in: ["HIGH", "CRITICAL"] }, status: { in: ["OPEN", "REVIEWING"] } } }), 0),
    ]);

    /* ---------------------------------------------------------------------
     * 7. FLUX D'ACTIVITE TEMPS REEL (journal systeme + audit admin)
     * ------------------------------------------------------------------ */
    const [recentLogs, recentAudit] = await Promise.all([
      safe(
        () =>
          prisma.systemLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 30,
            select: { id: true, level: true, source: true, action: true, message: true, ip: true, duration: true, createdAt: true },
          }),
        [] as any[]
      ),
      safe(
        () =>
          prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 20,
            select: { id: true, adminName: true, action: true, category: true, targetEmail: true, status: true, ip: true, createdAt: true },
          }),
        [] as any[]
      ),
    ]);

    const activityFeed = [
      ...recentLogs.map((l: any) => ({
        id: `log-${l.id}`,
        kind: "system" as const,
        level: l.level as string,
        source: l.source as string,
        action: l.action as string,
        message: l.message as string,
        actor: null as string | null,
        ip: l.ip as string | null,
        duration: l.duration as number | null,
        createdAt: l.createdAt,
      })),
      ...recentAudit.map((a: any) => ({
        id: `audit-${a.id}`,
        kind: "admin" as const,
        level: a.status === "SUCCESS" ? "INFO" : a.status === "DENIED" ? "WARN" : "ERROR",
        source: (a.category || "ADMIN").toUpperCase(),
        action: a.action as string,
        message: a.targetEmail ? `${a.action} → ${a.targetEmail}` : (a.action as string),
        actor: (a.adminName as string | null) || "Admin",
        ip: a.ip as string | null,
        duration: null as number | null,
        createdAt: a.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 40);

    /* ---------------------------------------------------------------------
     * 8. VOLUMETRIE PAR TABLE (top entites)
     * ------------------------------------------------------------------ */
    const tableCounts = await safe(async () => {
      const [users, transactions, wallets, sessions, logs, audits, notifications, messages] = await Promise.all([
        prisma.user.count(),
        prisma.transaction.count(),
        prisma.wallet.count(),
        prisma.session.count(),
        prisma.systemLog.count(),
        prisma.auditLog.count(),
        prisma.notification.count(),
        prisma.message.count(),
      ]);
      return [
        { table: "User", rows: users },
        { table: "Transaction", rows: transactions },
        { table: "Wallet", rows: wallets },
        { table: "Session", rows: sessions },
        { table: "SystemLog", rows: logs },
        { table: "AuditLog", rows: audits },
        { table: "Notification", rows: notifications },
        { table: "Message", rows: messages },
      ].sort((a, b) => b.rows - a.rows);
    }, [] as { table: string; rows: number }[]);

    /* ---------------------------------------------------------------------
     * 9. ETAT DES SERVICES (derive de signaux reels)
     * ------------------------------------------------------------------ */
    const apiLatency = Math.round(performance.now() - requestStart);
    const txSuccessRate = tx24h > 0 ? Math.round((txSuccess24h / tx24h) * 10000) / 100 : 100;
    const txFailureRate = tx24h > 0 ? Math.round((txFailed24h / tx24h) * 10000) / 100 : 0;

    const connPercent = dbConnections.max > 0 ? Math.round((dbConnections.total / dbConnections.max) * 100) : 0;

    const services: { name: string; category: string; status: Severity; metric: string; detail: string }[] = [
      {
        name: "API Passerelle",
        category: "Application",
        status: apiLatency < 1500 ? "healthy" : apiLatency < 4000 ? "degraded" : "down",
        metric: `${apiLatency} ms`,
        detail: `Agregation monitoring — ${system.region}`,
      },
      {
        name: "Base PostgreSQL",
        category: "Donnees",
        status: !dbReachable ? "down" : latencyAvg < 120 ? "healthy" : latencyAvg < 400 ? "degraded" : "down",
        metric: dbReachable ? `${latencyAvg} ms` : "hors ligne",
        detail: dbReachable ? `${dbSize.pretty} — ${dbConnections.total}/${dbConnections.max || "?"} connexions` : "Sonde SELECT 1 en echec",
      },
      {
        name: "Pool de connexions",
        category: "Donnees",
        status: connPercent < 70 ? "healthy" : connPercent < 90 ? "degraded" : "down",
        metric: `${connPercent}%`,
        detail: `${dbConnections.active} actives / ${dbConnections.idle} en attente`,
      },
      {
        name: "Moteur transactionnel",
        category: "Metier",
        status: txSuccessRate >= 97 ? "healthy" : txSuccessRate >= 90 ? "degraded" : "down",
        metric: `${txSuccessRate}%`,
        detail: `${txSuccess24h} reussies / ${txFailed24h} echouees (24h)`,
      },
      {
        name: "Authentification",
        category: "Securite",
        status: failedLogins24h < 25 ? "healthy" : failedLogins24h < 100 ? "degraded" : "down",
        metric: `${failedLogins24h}`,
        detail: `${lockedAccounts} compte(s) verrouille(s) — ${activeSessions} sessions actives`,
      },
      {
        name: "Detection intrusion",
        category: "Securite",
        status: criticalAlerts === 0 ? "healthy" : criticalAlerts < 5 ? "degraded" : "down",
        metric: `${openAlerts}`,
        detail: `${blockedIps} IP bloquees — ${proxyDetections24h} proxy/VPN (24h)`,
      },
      {
        name: "Memoire runtime",
        category: "Infrastructure",
        status: heapPercent < 75 ? "healthy" : heapPercent < 90 ? "degraded" : "down",
        metric: `${heapPercent}%`,
        detail: `Heap ${nodeProcess.heapUsed} / ${nodeProcess.heapTotal} — RSS ${nodeProcess.rss}`,
      },
      {
        name: "Charge processeur",
        category: "Infrastructure",
        status: cpuUsage < 70 ? "healthy" : cpuUsage < 88 ? "degraded" : "down",
        metric: `${cpuUsage}%`,
        detail: `${cores} coeurs — load ${cpu.load1} / ${cpu.load5} / ${cpu.load15}`,
      },
      {
        name: "Journalisation",
        category: "Observabilite",
        status: errorRate < 2 ? "healthy" : errorRate < 8 ? "degraded" : "down",
        metric: `${errorRate}%`,
        detail: `${errorLogs24h} erreurs / ${totalLogs24h} evenements (24h)`,
      },
      {
        name: "File de validation",
        category: "Metier",
        status: txPending < 25 ? "healthy" : txPending < 100 ? "degraded" : "down",
        metric: `${txPending}`,
        detail: `${kycPending} dossier(s) KYC en attente`,
      },
    ];

    /* ---------------------------------------------------------------------
     * 10. SCORE DE SANTE GLOBAL (moyenne ponderee)
     * ------------------------------------------------------------------ */
    const weights: Record<Severity, number> = { healthy: 100, degraded: 60, down: 0 };
    const healthScore = services.length
      ? Math.round(services.reduce((acc, s) => acc + weights[s.status], 0) / services.length)
      : 0;
    const degradedCount = services.filter((s) => s.status === "degraded").length;
    const downCount = services.filter((s) => s.status === "down").length;
    const globalStatus: Severity = downCount > 0 ? "down" : degradedCount > 0 ? "degraded" : "healthy";

    // Disponibilite estimee sur 24h a partir du taux d'erreur applicatif
    const availability = Math.max(0, Math.round((100 - errorRate) * 100) / 100);

    const growth = (current: number, previous: number) =>
      previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : current > 0 ? 100 : 0;

    return NextResponse.json({
      generatedAt: now.toISOString(),
      collectionMs: Math.round(performance.now() - requestStart),
      health: {
        score: healthScore,
        status: globalStatus,
        availability,
        degradedCount,
        downCount,
        healthyCount: services.length - degradedCount - downCount,
        totalServices: services.length,
      },
      system,
      cpu,
      ram,
      process: nodeProcess,
      database: {
        reachable: dbReachable,
        latency: dbReachable ? `${latencyAvg} ms` : "N/A",
        latencyAvg,
        latencyMin,
        latencyMax,
        probes,
        size: dbSize.pretty,
        sizeBytes: dbSize.bytes,
        connections: dbConnections,
        connectionPercent: connPercent,
        cacheHitRatio: dbCacheHit,
        tables: tableCounts,
      },
      platform: {
        totalUsers,
        activeUsers,
        bannedUsers,
        suspendedUsers,
        newUsersToday,
        newUsers24h,
        userGrowth: growth(newUsers24h, newUsersPrev24h),
        kycPending,
        activeSessions,
        liveSessions,
        totalTransactions: totalTx,
        transactionsToday: txToday,
        transactions24h: tx24h,
        txGrowth: growth(tx24h, txPrev24h),
        transactionsPending: txPending,
        transactionsFailed24h: txFailed24h,
        transactionsSuccess24h: txSuccess24h,
        volume24h,
        fees24h,
        volumeTotal,
        throughputHour: tx1h,
        throughputMinute: Math.round((tx5m / 5) * 100) / 100,
        txSuccessRate,
        txFailureRate,
        txByType,
        txByStatus,
      },
      reliability: {
        apiLatency,
        errorRate,
        errorLogs24h,
        totalLogs24h,
        logLevels: logStats,
        appLatency,
        topSources,
      },
      security: {
        blockedIps,
        proxyDetections24h,
        failedLogins24h,
        lockedAccounts,
        openAlerts,
        criticalAlerts,
      },
      timeseries: { hourly, daily },
      services,
      activityFeed,
    });
  } catch (error: unknown) {
    console.error("MONITORING_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur monitoring" }, { status: 500 });
  }
}
