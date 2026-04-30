export const dynamic = 'force-dynamic';

export const runtime = "nodejs";
import { getErrorMessage } from '@/lib/error-utils';
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";

// DELETE - Deconnecter toutes les sessions d'un utilisateur
export async function DELETE(
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

    // 3. VERIFICATION QUE L'UTILISATEUR EXISTE
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    // 4. SUPPRESSION DE TOUTES LES SESSIONS
    const deletedSessions = await prisma.session.deleteMany({
      where: { userId: userId }
    });

    // 5. LOG DE L'ACTION
    await prisma.auditLog.create({
      data: {
        adminId: authUserId,
        action: "DISCONNECT_USER",
        targetId: userId,
        details: `Deconnexion forcee de ${targetUser.username || targetUser.email || userId} - ${deletedSessions.count} session(s) supprimee(s)`,
      }
    });

    // 6. CREATION D'UNE NOTIFICATION POUR L'UTILISATEUR
    await prisma.notification.create({
      data: {
        userId: userId,
        type: "SECURITY",
        title: "Sessions fermees",
        message: "Toutes vos sessions ont ete fermees par un administrateur. Veuillez vous reconnecter.",
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `${deletedSessions.count} session(s) deconnectee(s)`,
      count: deletedSessions.count
    });
    
  } catch (error: unknown) {
    console.error("ADMIN_DISCONNECT_USER_ERROR:", getErrorMessage(error));
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

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
    
  } catch (error: unknown) {
    console.error("ADMIN_GET_SESSIONS_ERROR:", getErrorMessage(error));
    // Si le token est invalide ou expiré
    if (error.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
