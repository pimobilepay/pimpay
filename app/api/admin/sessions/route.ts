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

/** Construit un libellé d'appareil à partir des champs de session */
function deviceLabel(s: {
  browser?: string | null;
  os?: string | null;
  deviceName?: string | null;
}): string {
  const parts = [s.browser, s.os].filter(Boolean);
  if (parts.length > 0) return parts.join(" / ");
  return s.deviceName || "Appareil inconnu";
}

// GET - Liste des sessions actives réelles (toutes plateformes confondues)
export async function GET(req: NextRequest) {
  const admin = await adminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ sessions: [] });
  }

  try {
    const sessions = await prisma.session.findMany({
      where: { isActive: true },
      orderBy: { lastActiveAt: "desc" },
      take: 50,
      select: {
        id: true,
        ip: true,
        deviceName: true,
        browser: true,
        os: true,
        city: true,
        country: true,
        lastActiveAt: true,
        user: { select: { username: true, email: true, name: true } },
      },
    });

    const mapped = sessions.map((s) => ({
      id: s.id,
      device: deviceLabel(s),
      ip: s.ip || "—",
      location:
        s.city && s.country
          ? `${s.city}, ${s.country}`
          : s.country || s.city || "Localisation inconnue",
      user: s.user?.username || s.user?.name || s.user?.email || "Utilisateur",
      lastActive: timeAgo(s.lastActiveAt),
    }));

    return NextResponse.json({ sessions: mapped });
  } catch (error) {
    console.error("[ADMIN_SESSIONS_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// DELETE - Termine une session précise (?id=) ou toutes les sessions (?all=true)
export async function DELETE(req: NextRequest) {
  const admin = await adminAuth(req);
  if (!admin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const all = searchParams.get("all") === "true";

    if (all) {
      const result = await prisma.session.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
      await prisma.auditLog.create({
        data: {
          adminId: admin.id,
          adminName: admin.email || admin.name || "Admin",
          action: "TERMINATE_ALL_SESSIONS",
          details: `${result.count} session(s) terminée(s) depuis le panneau de sécurité`,
        },
      }).catch(() => null);
      return NextResponse.json({ success: true, count: result.count });
    }

    if (!id) {
      return NextResponse.json({ error: "ID de session manquant" }, { status: 400 });
    }

    await prisma.session.update({
      where: { id },
      data: { isActive: false },
    });
    await prisma.auditLog.create({
      data: {
        adminId: admin.id,
        adminName: admin.email || admin.name || "Admin",
        action: "TERMINATE_SESSION",
        details: `Session ${id} terminée depuis le panneau de sécurité`,
      },
    }).catch(() => null);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ADMIN_SESSIONS_DELETE_ERROR]:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
