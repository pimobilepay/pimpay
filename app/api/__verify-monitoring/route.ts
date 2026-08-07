// TEMPORAIRE — harness de verification visuelle, supprime apres controle.
import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const hourly = Array.from({ length: 24 }, (_, i) => {
    const d = new Date(now.getTime() - (23 - i) * 3600 * 1000);
    const tx = 40 + Math.round(Math.sin(i / 3) * 25 + i);
    return {
      label: `${String(d.getHours()).padStart(2, "0")}h`,
      ts: d.toISOString(),
      tx,
      volume: tx * 1450,
      fees: tx * 22,
      failed: Math.max(0, Math.round(tx * 0.04)),
    };
  });
  const daily = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 86400000);
    const tx = 700 + i * 45;
    return {
      label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
      date: d.toISOString().split("T")[0],
      tx,
      volume: tx * 1380,
      failed: Math.round(tx * 0.03),
      users: 20 + i * 3,
    };
  });

  return NextResponse.json({
    generatedAt: now.toISOString(),
    collectionMs: 214,
    health: { score: 82, status: "degraded", availability: 99.42, degradedCount: 2, downCount: 0, healthyCount: 8, totalServices: 10 },
    system: {
      hostname: "pimpay-edge-01", platform: "linux", osType: "Linux", osRelease: "6.6.0", arch: "x64",
      nodeVersion: "v22.14.0", uptime: "12j 4h 31m", uptimeSeconds: 1054260, processUptime: "3h 12m",
      region: "cdg1", environment: "production", deploymentId: "a3f91c7", pid: 1842,
    },
    cpu: { usage: "37%", usageNum: 37, cores: 8, model: "AMD EPYC 7763 64-Core Processor", speed: "2.45 GHz", arch: "x64", load1: 1.84, load5: 1.42, load15: 1.11, loadPercent: 23 },
    ram: { total: "16.0 GB", used: "9.8 GB", free: "6.2 GB", percent: "61%", percentNum: 61 },
    process: { heapUsed: "312.4 MB", heapTotal: "398.0 MB", heapPercent: 78, rss: "486.1 MB", external: "24.8 MB", arrayBuffers: "8.2 MB" },
    database: {
      reachable: true, latency: "42.18 ms", latencyAvg: 42.18, latencyMin: 38.4, latencyMax: 51.7,
      probes: [51.7, 38.4, 36.4], size: "2841 MB", sizeBytes: 2979000000,
      connections: { total: 34, active: 6, idle: 28, max: 100 }, connectionPercent: 34, cacheHitRatio: 99.21,
      tables: [
        { table: "SystemLog", rows: 184320 }, { table: "Transaction", rows: 92415 },
        { table: "AuditLog", rows: 41208 }, { table: "Notification", rows: 30115 },
        { table: "Session", rows: 12480 }, { table: "Wallet", rows: 8940 },
        { table: "User", rows: 4218 }, { table: "Message", rows: 2104 },
      ],
    },
    platform: {
      totalUsers: 4218, activeUsers: 3980, bannedUsers: 42, suspendedUsers: 18, newUsersToday: 37,
      newUsers24h: 41, userGrowth: 12.4, kycPending: 26, activeSessions: 612, liveSessions: 88,
      totalTransactions: 92415, transactionsToday: 1284, transactions24h: 1402, txGrowth: -3.8,
      transactionsPending: 34, transactionsFailed24h: 44, transactionsSuccess24h: 1324,
      volume24h: 2041500, fees24h: 30810, volumeTotal: 148920000,
      throughputHour: 61, throughputMinute: 1.2, txSuccessRate: 94.44, txFailureRate: 3.14,
      txByType: [
        { type: "TRANSFER", count: 612, volume: 890400 }, { type: "DEPOSIT", count: 341, volume: 620100 },
        { type: "WITHDRAW", count: 208, volume: 310200 }, { type: "PAYMENT", count: 141, volume: 142800 },
        { type: "EXCHANGE", count: 68, volume: 62400 }, { type: "AIRDROP", count: 32, volume: 15600 },
      ],
      txByStatus: [
        { status: "SUCCESS", count: 1324 }, { status: "PENDING", count: 34 },
        { status: "FAILED", count: 31 }, { status: "REJECTED", count: 13 },
      ],
    },
    reliability: {
      apiLatency: 214, errorRate: 1.42, errorLogs24h: 118, totalLogs24h: 8310,
      logLevels: { DEBUG: 1420, INFO: 6210, WARN: 562, ERROR: 104, FATAL: 14 },
      appLatency: { avg: 128, max: 2418, samples: 6140 },
      topSources: [
        { source: "AUTH", count: 2410 }, { source: "TRANSACTION", count: 1980 },
        { source: "WALLET", count: 1240 }, { source: "KYC", count: 810 },
        { source: "ADMIN", count: 640 }, { source: "PI_NETWORK", count: 420 },
      ],
    },
    security: { blockedIps: 27, proxyDetections24h: 63, failedLogins24h: 48, lockedAccounts: 4, openAlerts: 9, criticalAlerts: 2 },
    timeseries: { hourly, daily },
    services: [
      { name: "API Passerelle", category: "Application", status: "healthy", metric: "214 ms", detail: "Agregation monitoring — cdg1" },
      { name: "Base PostgreSQL", category: "Donnees", status: "healthy", metric: "42.18 ms", detail: "2841 MB — 34/100 connexions" },
      { name: "Pool de connexions", category: "Donnees", status: "healthy", metric: "34%", detail: "6 actives / 28 en attente" },
      { name: "Moteur transactionnel", category: "Metier", status: "degraded", metric: "94.44%", detail: "1324 reussies / 44 echouees (24h)" },
      { name: "Authentification", category: "Securite", status: "degraded", metric: "48", detail: "4 compte(s) verrouille(s) — 612 sessions actives" },
      { name: "Detection intrusion", category: "Securite", status: "healthy", metric: "9", detail: "27 IP bloquees — 63 proxy/VPN (24h)" },
      { name: "Memoire runtime", category: "Infrastructure", status: "healthy", metric: "78%", detail: "Heap 312.4 MB / 398.0 MB — RSS 486.1 MB" },
      { name: "Charge processeur", category: "Infrastructure", status: "healthy", metric: "37%", detail: "8 coeurs — load 1.84 / 1.42 / 1.11" },
      { name: "Journalisation", category: "Observabilite", status: "healthy", metric: "1.42%", detail: "118 erreurs / 8310 evenements (24h)" },
      { name: "File de validation", category: "Metier", status: "healthy", metric: "34", detail: "26 dossier(s) KYC en attente" },
    ],
    activityFeed: [
      { id: "1", kind: "system", level: "ERROR", source: "TRANSACTION", action: "TX_FAILED", message: "Echec du reglement PI pour la reference TX-99A21 — timeout du reseau", actor: null, ip: "41.202.18.7", duration: 3184, createdAt: new Date(now.getTime() - 60000).toISOString() },
      { id: "2", kind: "admin", level: "INFO", source: "USERS", action: "KYC_APPROVED", message: "KYC_APPROVED → client@exemple.cm", actor: "Admin Nkolo", ip: "102.44.9.12", duration: null, createdAt: new Date(now.getTime() - 240000).toISOString() },
      { id: "3", kind: "system", level: "WARN", source: "AUTH", action: "FAILED_LOGIN", message: "5 tentatives de connexion echouees depuis la meme adresse", actor: null, ip: "196.12.44.3", duration: 88, createdAt: new Date(now.getTime() - 480000).toISOString() },
      { id: "4", kind: "system", level: "INFO", source: "WALLET", action: "WALLET_CREDIT", message: "Credit de 12 500 XAF sur le portefeuille FIAT", actor: null, ip: null, duration: 142, createdAt: new Date(now.getTime() - 900000).toISOString() },
      { id: "5", kind: "admin", level: "WARN", source: "RBAC", action: "PERMISSION_DENIED", message: "PERMISSION_DENIED → analyste@pimobipay.com", actor: "Systeme RBAC", ip: "10.0.4.8", duration: null, createdAt: new Date(now.getTime() - 1500000).toISOString() },
      { id: "6", kind: "system", level: "FATAL", source: "PI_NETWORK", action: "HORIZON_UNREACHABLE", message: "Horizon injoignable apres 3 tentatives — bascule sur le noeud secondaire", actor: null, ip: null, duration: 9021, createdAt: new Date(now.getTime() - 2400000).toISOString() },
    ],
  });
}
