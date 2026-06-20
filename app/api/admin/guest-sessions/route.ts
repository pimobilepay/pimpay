export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";

/** Formatte un "il y a X" lisible en français à partir d'une date */
function timeAgo(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "À l'instant";
  const min = Math.floor(sec / 60);
  if (min < 60) return `Il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days} j`;
}

// GET - Liste des visiteurs invités (non connectés) ayant accédé à la plateforme
export async function GET(req: NextRequest) {
  const admin = await adminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ guests: [] });
  }

  try {
    const guests = await prisma.guestSession.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 100,
    });

    const mapped = guests.map((g) => ({
      id: g.id,
      guestId: g.guestId,
      ip: g.ip || "—",
      device: [g.browser, g.os].filter(Boolean).join(" / ") || g.device || "Inconnu",
      location:
        g.city && g.country
          ? `${g.city}, ${g.country}`
          : g.country || g.city || "Localisation inconnue",
      page: g.page || "—",
      referrer: g.referrer || "—",
      visitCount: g.visitCount,
      firstSeen: timeAgo(g.firstSeenAt),
      lastSeen: timeAgo(g.lastSeenAt),
      firstSeenAt: g.firstSeenAt,
      lastSeenAt: g.lastSeenAt,
    }));

    return NextResponse.json({ guests: mapped, total: mapped.length });
  } catch (error) {
    console.error("[ADMIN_GUEST_SESSIONS_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
