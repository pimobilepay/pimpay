export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/adminAuth";
import { prisma } from "@/lib/prisma";
import os from "os";

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}j ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

function getCpuUsage(): number {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    const { user, nice, sys, idle, irq } = cpu.times;
    totalTick += user + nice + sys + idle + irq;
    totalIdle += idle;
  }
  return Math.round(((totalTick - totalIdle) / totalTick) * 100);
}

export async function GET(req: NextRequest) {
  try {
    const adminSession = await adminAuth(req);
    if (!adminSession) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    // System info
    const cpuUsage = getCpuUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramPercent = Math.round((usedMem / totalMem) * 100);
    const uptime = os.uptime();
    const platform = os.platform();
    const arch = os.arch();
    const osType = os.type();
    const osRelease = os.release();
    const hostname = os.hostname();
    const cpuModel = os.cpus()[0]?.model || "N/A";
    const cpuCores = os.cpus().length;
    const nodeVersion = process.version;

    // Process memory
    const processMemory = process.memoryUsage();

    // Database stats
    let dbStats = { totalUsers: 0, activeSessions: 0, totalTransactions: 0, pendingTransactions: 0 };
    try {
      const [totalUsers, activeSessions, totalTransactions, pendingTransactions] = await Promise.all([
        prisma.user.count(),
        prisma.session.count({ where: { isActive: true } }),
        prisma.transaction.count(),
        prisma.transaction.count({ where: { status: "PENDING" } }),
      ]);
      dbStats = { totalUsers, activeSessions, totalTransactions, pendingTransactions };
    } catch {
      // DB may not be available
    }

    // DB latency measurement
    let dbLatency = "N/A";
    try {
      const start = performance.now();
      await prisma.$queryRaw`SELECT 1`;
      const end = performance.now();
      dbLatency = `${Math.round(end - start)}ms`;
    } catch {
      dbLatency = "Erreur";
    }

    return NextResponse.json({
      cpu: {
        usage: `${cpuUsage}%`,
        usageNum: cpuUsage,
        model: cpuModel,
        cores: cpuCores,
        arch,
      },
      ram: {
        total: formatBytes(totalMem),
        used: formatBytes(usedMem),
        free: formatBytes(freeMem),
        percent: `${ramPercent}%`,
        percentNum: ramPercent,
      },
      process: {
        heapUsed: formatBytes(processMemory.heapUsed),
        heapTotal: formatBytes(processMemory.heapTotal),
        rss: formatBytes(processMemory.rss),
        external: formatBytes(processMemory.external),
      },
      system: {
        platform,
        osType,
        osRelease,
        hostname,
        uptime: formatUptime(uptime),
        uptimeSeconds: uptime,
        nodeVersion,
      },
      database: {
        ...dbStats,
        latency: dbLatency,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("SERVER_STATS_ERROR:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
