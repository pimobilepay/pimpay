export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json(
        { error: "Acces refuse. Droits administrateur requis." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const pageFilter = searchParams.get("pageFilter") || "";
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { username: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    if (pageFilter) {
      where.page = { contains: pageFilter, mode: "insensitive" };
    }

    const [activities, total, onlineUsers, pageStats] = await Promise.all([
      // Main activities list
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatar: true,
              role: true,
              status: true,
            },
          },
        },
      }),

      // Total count for pagination
      prisma.userActivity.count({ where }),

      // Users active in last 5 minutes
      prisma.userActivity.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
        distinct: ["userId"],
        select: {
          userId: true,
          page: true,
          createdAt: true,
          device: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),

      // Page visit stats (top pages)
      prisma.userActivity.groupBy({
        by: ["page"],
        _count: { page: true },
        orderBy: { _count: { page: "desc" } },
        take: 10,
      }),
    ]);

    const formattedActivities = activities.map((a) => ({
      id: a.id,
      userId: a.userId,
      userName: a.user?.name || a.user?.username || "Anonyme",
      userEmail: a.user?.email || "",
      userAvatar: a.user?.avatar || null,
      userRole: a.user?.role || "USER",
      userStatus: a.user?.status || "ACTIVE",
      page: a.page,
      action: a.action,
      device: a.device,
      browser: a.browser,
      os: a.os,
      ip: a.ip,
      createdAt: a.createdAt,
    }));

    return NextResponse.json({
      activities: formattedActivities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      onlineUsers: onlineUsers.map((u) => ({
        userId: u.userId,
        userName: u.user?.name || u.user?.username || "Anonyme",
        userEmail: u.user?.email || "",
        userAvatar: u.user?.avatar || null,
        currentPage: u.page,
        device: u.device,
        lastSeen: u.createdAt,
      })),
      pageStats: pageStats.map((p) => ({
        page: p.page,
        visits: p._count.page,
      })),
    });
  } catch (error) {
    console.error("[ADMIN_USER_ACTIVITY_ERROR]:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation des activites" },
      { status: 500 }
    );
  }
}
