export const dynamic = 'force-dynamic';

export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { jwtVerify } from "jose"; // Utilisation de jose pour la compatibilité Next.js Edge/Server
import { cookies } from "next/headers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. RÉCUPÉRATION DU TOKEN DEPUIS LES COOKIES (Méthode Dashboard)
    const token = cookies().get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Non autorisé (Token manquant)" }, { status: 401 });
    }

    // 2. VÉRIFICATION DU TOKEN
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload }: any = await jwtVerify(token, secret);

    // 3. VÉRIFICATION STRICTE DU RÔLE ADMIN
    const admin = await prisma.user.findUnique({ where: { id: payload.id } });
    if (!admin || admin.role !== "ADMIN") {
      return NextResponse.json({ error: "Accès refusé (Admin requis)" }, { status: 403 });
    }

    const userId = params.id;

    // 4. RÉCUPÉRATION DES SESSIONS
    const sessions = await prisma.session.findMany({
      where: { userId: userId },
      orderBy: { lastActiveAt: "desc" },
    });

    // 5. ENRICHISSEMENT AVEC GEOLOCALISATION
    const enrichedSessions = await Promise.all(
      sessions.map(async (s) => {
        let city = "Inconnu";
        // Correction : On utilise 'ipAddress' ou 'ip' selon ton schéma
        const currentIp = (s as any).ipAddress || (s as any).ip;
        
        if (currentIp && currentIp !== "::1" && currentIp !== "127.0.0.1") {
          try {
            const geoRes = await fetch(`http://ip-api.com/json/${currentIp}?fields=city`, {
                next: { revalidate: 3600 } // Cache pour éviter de spammer l'API IP
            });
            const geo = await geoRes.json();
            city = geo.city || "Inconnu";
          } catch (e) {
            console.error("Geo fetch failed for IP:", currentIp);
          }
        }
        return { ...s, city };
      })
    );

    return NextResponse.json({ sessions: enrichedSessions });
    
  } catch (error: any) {
    console.error("ADMIN_GET_SESSIONS_ERROR:", error.message);
    // Si le token est invalide ou expiré
    if (error.code === 'ERR_JWT_EXPIRED') {
        return NextResponse.json({ error: "Session expirée" }, { status: 401 });
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
