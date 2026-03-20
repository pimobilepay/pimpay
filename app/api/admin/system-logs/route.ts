export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const level = searchParams.get("level") || "";
    const source = searchParams.get("source") || "";
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (level) where.level = level;
    if (source) where.source = source;
    if (search) {
      where.OR = [
        { message: { contains: search, mode: "insensitive" } },
        { action: { contains: search, mode: "insensitive" } },
        { requestId: { contains: search, mode: "insensitive" } },
      ];
    }

    const [logs, total, stats] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.systemLog.count({ where }),
      prisma.systemLog.groupBy({
        by: ["level"],
        _count: { level: true },
      }),
    ]);

    // Get unique sources for filter
    const sources = await prisma.systemLog.findMany({
      distinct: ["source"],
      select: { source: true },
      orderBy: { source: "asc" },
    });

    return NextResponse.json({
      logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: stats.reduce((acc, s) => ({ ...acc, [s.level]: s._count.level }), {}),
      sources: sources.map((s) => s.source),
    });
  } catch (error: any) {
    console.error("[SYSTEM_LOGS_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a new system log entry
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { level, source, action, message, details, userId, requestId, duration, ip, userAgent } = body;

    if (!source || !action || !message) {
      return NextResponse.json({ error: "source, action et message sont requis" }, { status: 400 });
    }

    const log = await prisma.systemLog.create({
      data: {
        level: level || "INFO",
        source,
        action,
        message,
        details: details || null,
        userId: userId || null,
        requestId: requestId || null,
        duration: duration || null,
        ip: ip || null,
        userAgent: userAgent || null,
      },
    });

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error("[SYSTEM_LOG_CREATE_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Clear old logs (older than X days)
export async function DELETE(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "30");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const result = await prisma.systemLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (error: any) {
    console.error("[SYSTEM_LOG_DELETE_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
