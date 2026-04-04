import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyAuth } from "@/lib/auth";

// Helper to check if user has bank admin access
async function checkBankAccess(req: Request) {
  const session = await verifyAuth(req as any);
  if (!session) {
    return { error: "Non autorise", status: 401 };
  }
  if (session.role !== "BANK_ADMIN" && session.role !== "ADMIN") {
    return { error: "Acces refuse. Portail reserve aux administrateurs de la Banque.", status: 403 };
  }
  return { session };
}

// Helper to calculate date range
function getDateFilter(range: string) {
  const now = new Date();
  switch (range) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case "90d":
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

// GET - List audit logs and system logs
export async function GET(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "audit"; // "audit" or "system"
    const search = searchParams.get("search") || "";
    const action = searchParams.get("action") || "all";
    const level = searchParams.get("level") || "all";
    const dateRange = searchParams.get("dateRange") || "7d";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "30");
    const skip = (page - 1) * limit;

    const dateFilter = getDateFilter(dateRange);

    if (type === "audit") {
      // Build where clause for audit logs
      const where: any = {
        createdAt: { gte: dateFilter },
      };

      if (search) {
        where.OR = [
          { action: { contains: search, mode: "insensitive" } },
          { details: { contains: search, mode: "insensitive" } },
          { targetEmail: { contains: search, mode: "insensitive" } },
          { adminName: { contains: search, mode: "insensitive" } },
        ];
      }

      if (action !== "all") {
        where.action = action;
      }

      const [logs, total, actionStats] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          include: {
            admin: {
              select: { name: true, email: true },
            },
            target: {
              select: { name: true, email: true },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
        prisma.auditLog.groupBy({
          by: ["action"],
          where: { createdAt: { gte: dateFilter } },
          _count: true,
        }),
      ]);

      // Get additional stats
      const [totalAuditLogs, recentActivity] = await Promise.all([
        prisma.auditLog.count(),
        prisma.auditLog.count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
      ]);

      const totalSystemLogs = await prisma.systemLog.count();
      const criticalErrors = await prisma.systemLog.count({
        where: { level: { in: ["ERROR", "FATAL"] }, createdAt: { gte: dateFilter } },
      });

      return NextResponse.json({
        logs: logs.map((log) => ({
          id: log.id,
          adminId: log.adminId,
          adminName: log.admin?.name || log.adminName || "System",
          action: log.action,
          targetId: log.targetId,
          targetEmail: log.target?.email || log.targetEmail,
          details: log.details,
          createdAt: log.createdAt.toISOString(),
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        statistics: {
          totalAuditLogs,
          totalSystemLogs,
          byAction: actionStats.reduce((acc, s) => ({ ...acc, [s.action]: s._count }), {}),
          byLevel: {},
          recentActivity,
          criticalErrors,
        },
      });
    } else {
      // System logs
      const where: any = {
        createdAt: { gte: dateFilter },
      };

      if (search) {
        where.OR = [
          { action: { contains: search, mode: "insensitive" } },
          { message: { contains: search, mode: "insensitive" } },
          { source: { contains: search, mode: "insensitive" } },
        ];
      }

      if (level !== "all") {
        where.level = level;
      }

      const [logs, total, levelStats] = await Promise.all([
        prisma.systemLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.systemLog.count({ where }),
        prisma.systemLog.groupBy({
          by: ["level"],
          where: { createdAt: { gte: dateFilter } },
          _count: true,
        }),
      ]);

      // Get additional stats
      const [totalAuditLogs, totalSystemLogs, recentActivity, criticalErrors] = await Promise.all([
        prisma.auditLog.count(),
        prisma.systemLog.count(),
        prisma.systemLog.count({
          where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        }),
        prisma.systemLog.count({
          where: { level: { in: ["ERROR", "FATAL"] }, createdAt: { gte: dateFilter } },
        }),
      ]);

      return NextResponse.json({
        logs: logs.map((log) => ({
          id: log.id,
          level: log.level,
          source: log.source,
          action: log.action,
          message: log.message,
          details: log.details,
          ip: log.ip,
          userAgent: log.userAgent,
          userId: log.userId,
          requestId: log.requestId,
          duration: log.duration,
          createdAt: log.createdAt.toISOString(),
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        statistics: {
          totalAuditLogs,
          totalSystemLogs,
          byAction: {},
          byLevel: levelStats.reduce((acc, s) => ({ ...acc, [s.level]: s._count }), {}),
          recentActivity,
          criticalErrors,
        },
      });
    }
  } catch (error) {
    console.error("Bank audit error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// POST - Create a new audit log entry
export async function POST(req: Request) {
  try {
    const access = await checkBankAccess(req);
    if ("error" in access) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const { action, targetId, targetEmail, details } = body;

    if (!action) {
      return NextResponse.json({ error: "Action requise" }, { status: 400 });
    }

    const log = await prisma.auditLog.create({
      data: {
        action,
        adminId: access.session.id,
        adminName: access.session.username || "System",
        targetId: targetId || undefined,
        targetEmail: targetEmail || undefined,
        details: details || undefined,
      },
    });

    return NextResponse.json({
      message: "Log cree avec succes",
      log,
    });
  } catch (error) {
    console.error("Create audit log error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
