export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const payload = await adminAuth(req);
    
    if (!payload) {
      return NextResponse.json(
        { error: "Acces refuse. Droits administrateur requis." },
        { status: 403 }
      );
    }

    const { userId } = await context.params;

    // Get user info with country
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        status: true,
        lastLogin: true,
        createdAt: true,
        country: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouve" }, { status: 404 });
    }

    // Get recent activities (last 24 hours)
    let activities: Awaited<ReturnType<typeof prisma.userActivity.findMany>> = [];
    let currentSession: Awaited<ReturnType<typeof prisma.userActivity.findFirst>> = null;
    
    try {
      activities = await prisma.userActivity.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
    } catch {
      // Continue with empty activities if table doesn't exist or query fails
    }

    // Get current session (last 5 minutes)
    try {
      currentSession = await prisma.userActivity.findFirst({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
        orderBy: { createdAt: "desc" },
      });
    } catch {
      // Continue with null session if table doesn't exist or query fails
    }

    // Calculate session stats
    const sessionStartTime = activities.length > 0 
      ? activities[activities.length - 1].createdAt 
      : null;
    
    const totalDuration = activities.reduce((sum, a) => sum + (a.duration || 0), 0);
    
    const pageVisits = activities.reduce((acc, a) => {
      if (a.action === "PAGE_VIEW") {
        acc[a.page] = (acc[a.page] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const clickActions = activities.filter(a => a.action === "CLICK");
    
    // Build page journey
    const pageJourney = activities
      .filter(a => a.action === "PAGE_VIEW")
      .reverse()
      .map((a, i, arr) => ({
        page: a.page,
        timestamp: a.createdAt,
        duration: a.duration || 0,
        nextPage: arr[i + 1]?.page || null,
      }));

    // Is user currently online (active in last 5 minutes)?
    const isOnline = currentSession !== null;

    return NextResponse.json({
      user,
      isOnline,
      currentPage: currentSession?.page || null,
      currentDevice: currentSession?.device || null,
      currentBrowser: currentSession?.browser || null,
      currentOS: currentSession?.os || null,
      currentIP: currentSession?.ip || null,
      sessionStartTime,
      totalDuration,
      totalPageViews: activities.filter(a => a.action === "PAGE_VIEW").length,
      totalClicks: clickActions.length,
      pageVisits: Object.entries(pageVisits)
        .map(([page, count]) => ({ page, count }))
        .sort((a, b) => b.count - a.count),
      pageJourney,
      recentActivities: activities.slice(0, 50).map(a => ({
        id: a.id,
        page: a.page,
        action: a.action,
        duration: a.duration,
        device: a.device,
        browser: a.browser,
        os: a.os,
        ip: a.ip,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("[ADMIN_USER_SESSION_ERROR]:", error);
    const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
    return NextResponse.json(
      { 
        error: "Erreur lors de la recuperation de la session",
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
