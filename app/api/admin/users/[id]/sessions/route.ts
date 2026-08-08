export const dynamic = 'force-dynamic';

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserId } from "@/lib/auth";
import * as jose from "jose";
import { revokeToken } from "@/lib/tokenBlacklist";

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

    // 4. RÉVOCATION DE TOUTES LES SESSIONS
    // [FIX] AVANT : `session.deleteMany(...)` supprimait purement et
    // simplement les lignes Session. Or `verifyJWT()` / `verifyAuth()` /
    // `getAuthUserIdFromBearer()` (lib/auth.ts) considèrent un utilisateur
    // révoqué UNIQUEMENT si `totalCount > 0 && activeCount === 0` (des
    // sessions existent mais aucune active). En supprimant TOUTES les
    // lignes, `totalCount` retombait à 0 -> cette condition devenait fausse
    // -> le JWT déjà émis (valide jusqu'à 30 jours pour les connexions
    // Pi Browser / Google) continuait d'être accepté par TOUTES les routes
    // de l'app malgré la "déconnexion" côté admin. On MARQUE désormais les
    // sessions comme inactives (`isActive: false`) au lieu de les supprimer,
    // ce qui déclenche correctement la révocation.
    const targetSessions = await prisma.session.findMany({
      where: { userId, isActive: true },
      select: { id: true, token: true },
    });

    const updated = await prisma.session.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // 5. RÉVOCATION IMMÉDIATE DES JWT (jti) — ceinture + bretelles.
    // Ne dépend pas du heuristique "sessions actives" : même si un appel
    // concurrent recréait une session entre-temps, ces tokens précis
    // resteront bloqués jusqu'à leur expiration naturelle.
    for (const session of targetSessions) {
      try {
        const decoded = jose.decodeJwt(session.token);
        const jti = decoded?.jti as string | undefined;
        const exp = decoded?.exp as number | undefined;
        if (jti) {
          const ttl = exp ? Math.max(60, exp - Math.floor(Date.now() / 1000)) : 60 * 60 * 24 * 30;
          await revokeToken(jti, ttl);
        }
      } catch {
        // Token illisible (format inattendu) — on ignore, la révocation par
        // session.isActive reste effective.
      }
    }

    // 6. LOG DE L'ACTION
    await prisma.auditLog.create({
      data: {
        adminId: authUserId,
        action: "DISCONNECT_USER",
        targetId: userId,
        details: `Deconnexion forcee de ${targetUser.username || targetUser.email || userId} - ${updated.count} session(s) revoquee(s)`,
      }
    });

    // 7. CREATION D'UNE NOTIFICATION POUR L'UTILISATEUR
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
      message: `${updated.count} session(s) deconnectee(s)`,
      count: updated.count
    });
    
  } catch (error: any) {
    console.error("ADMIN_DISCONNECT_USER_ERROR:", error.message);
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
    
  } catch (error: any) {
    console.error("ADMIN_GET_SESSIONS_ERROR:", error.message);
    // Si le token est invalide ou expiré
    if (error.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
