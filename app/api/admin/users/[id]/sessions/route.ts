export const dynamic = 'force-dynamic';

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. AUTHENTIFICATION
    const authUserId = await getAuthUserId();
    if (!authUserId) {
      return NextResponse.json({ error: "Non autorise (Token manquant)" }, { status: 401 });
    }

    // 2. VERIFICATION STRICTE DU ROLE ADMIN
    const admin = await prisma.user.findUnique({ where: { id: authUserId } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Acces refuse (Admin requis)" }, { status: 403 });
    }

    const { id: userId } = await params;

    // 4. RECUPERATION DES SESSIONS
    const sessions = await prisma.session.findMany({
      where: { userId: userId },
      orderBy: { lastActiveAt: "desc" },
    });

    // 5. RECUPERATION DES DERNIERES ACTIVITES
    let recentActivity: any[] = [];
    try {
      recentActivity = await (prisma as any).userActivity.findMany({
        where: { userId: userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          page: true,
          action: true,
          ip: true,
          device: true,
          browser: true,
          os: true,
          country: true,
          city: true,
          createdAt: true,
        },
      });
    } catch {
      // UserActivity table might not exist yet
    }

    // 6. ENRICHISSEMENT AVEC GEOLOCALISATION
    const enrichedSessions = await Promise.all(
      sessions.map(async (s) => {
        let geoCity = s.city || "Inconnu";
        const currentIp = s.ip;
        
        if (currentIp && currentIp !== "::1" && currentIp !== "127.0.0.1" && !s.city) {
          try {
            const geoRes = await fetch(`http://ip-api.com/json/${currentIp}?fields=city,country`, {
                next: { revalidate: 3600 }
            });
            const geo = await geoRes.json();
            geoCity = geo.city || "Inconnu";
          } catch {
            // silent
          }
        }
        return { ...s, city: geoCity };
      })
    );

    // 7. RECUPERATION DES SECURITY LOGS
    const securityLogs = await prisma.securityLog.findMany({
      where: { userId: userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ 
      sessions: enrichedSessions,
      recentActivity,
      securityLogs,
    });
    
  } catch (error: any) {
    console.error("ADMIN_GET_SESSIONS_ERROR:", error.message);
    // Si le token est invalide ou expiré
    if (error.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
