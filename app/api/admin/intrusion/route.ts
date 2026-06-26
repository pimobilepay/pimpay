export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { logSystemEvent } from "@/lib/systemLogger";
import { invalidateIpCache, normalizeIp } from "@/lib/ipBlock";

// Actions considérées comme des évènements de sécurité / intrusion.
const INTRUSION_ACTIONS = [
  "FAILED_LOGIN",
  "ACCOUNT_LOCKED",
  "RATE_LIMITED",
  "BLOCKED_IP_HIT",
  "SUSPICIOUS_REQUEST",
  "UNAUTHORIZED_ACCESS",
  "FORBIDDEN",
  "INVALID_TOKEN",
];

type ThreatLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

function scoreThreat(opts: {
  count: number;
  hasLock: boolean;
  hasRateLimit: boolean;
}): ThreatLevel {
  const { count, hasLock, hasRateLimit } = opts;
  if (count >= 20 || (hasLock && count >= 10)) return "CRITICAL";
  if (count >= 10 || hasRateLimit) return "HIGH";
  if (count >= 4 || hasLock) return "MEDIUM";
  return "LOW";
}

// GET : journal des évènements + agrégation des menaces par IP + IP bloquées
export async function GET(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "40");
    const search = searchParams.get("search") || "";
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const baseWhere: any = {
      OR: [
        { source: { in: ["AUTH", "SECURITY", "PROXY"] }, action: { in: INTRUSION_ACTIONS } },
        { action: { in: INTRUSION_ACTIONS } },
      ],
    };
    const where: any = search
      ? {
          AND: [
            baseWhere,
            {
              OR: [
                { message: { contains: search, mode: "insensitive" } },
                { ip: { contains: search, mode: "insensitive" } },
                { action: { contains: search, mode: "insensitive" } },
              ],
            },
          ],
        }
      : baseWhere;

    // 1. Journal paginé des évènements de sécurité
    const [events, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.systemLog.count({ where }),
    ]);

    // 2. Agrégation des menaces par IP sur 7 jours (sources d'intrusion répétées)
    const recent = await prisma.systemLog.findMany({
      where: { ...baseWhere, createdAt: { gte: last7d }, ip: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: { ip: true, action: true, createdAt: true, message: true, details: true },
    });

    const byIp = new Map<
      string,
      { ip: string; count: number; lastSeen: Date; firstSeen: Date; actions: Set<string>; location: string | null }
    >();
    for (const e of recent) {
      const ip = normalizeIp(e.ip);
      if (ip === "unknown") continue;
      const entry = byIp.get(ip);
      const loc = (e.details as any)?.location || null;
      if (!entry) {
        byIp.set(ip, {
          ip,
          count: 1,
          lastSeen: e.createdAt,
          firstSeen: e.createdAt,
          actions: new Set([e.action]),
          location: loc,
        });
      } else {
        entry.count += 1;
        entry.actions.add(e.action);
        if (e.createdAt < entry.firstSeen) entry.firstSeen = e.createdAt;
        if (!entry.location && loc) entry.location = loc;
      }
    }

    const blockedRecords = await prisma.blockedIp.findMany({
      orderBy: { createdAt: "desc" },
    });
    const blockedSet = new Map(blockedRecords.map((b) => [b.ip, b]));

    const threats = Array.from(byIp.values())
      .map((t) => {
        const blocked = blockedSet.get(t.ip);
        const isActive =
          !!blocked && blocked.active && (!blocked.expiresAt || blocked.expiresAt > now);
        return {
          ip: t.ip,
          count: t.count,
          lastSeen: t.lastSeen.toISOString(),
          firstSeen: t.firstSeen.toISOString(),
          actions: Array.from(t.actions),
          location: t.location,
          threat: scoreThreat({
            count: t.count,
            hasLock: t.actions.has("ACCOUNT_LOCKED"),
            hasRateLimit: t.actions.has("RATE_LIMITED") || t.actions.has("BLOCKED_IP_HIT"),
          }),
          blocked: isActive,
          blockedRecord: blocked
            ? {
                reason: blocked.reason,
                hits: blocked.hits,
                expiresAt: blocked.expiresAt?.toISOString() || null,
              }
            : null,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    // 3. IP actuellement bloquées (riposte active)
    const blockedIps = blockedRecords.map((b) => ({
      id: b.id,
      ip: b.ip,
      reason: b.reason,
      threat: b.threat,
      blockedBy: b.blockedBy,
      active: b.active && (!b.expiresAt || b.expiresAt > now),
      hits: b.hits,
      expiresAt: b.expiresAt?.toISOString() || null,
      createdAt: b.createdAt.toISOString(),
    }));

    // 4. Statistiques rapides
    const events24h = await prisma.systemLog.count({
      where: { ...baseWhere, createdAt: { gte: last24h } },
    });
    const criticalCount = threats.filter((t) => t.threat === "CRITICAL").length;
    const activeBlocks = blockedIps.filter((b) => b.active).length;

    return NextResponse.json({
      events,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      threats,
      blockedIps,
      stats: {
        events24h,
        uniqueSources: byIp.size,
        activeBlocks,
        critical: criticalCount,
      },
    });
  } catch (error: any) {
    console.error("[INTRUSION_GET_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST : riposte défensive — bloquer ou débloquer une IP
//
// Cadre éthique : la seule "riposte" disponible est le blocage du trafic ENTRANT
// (défense active). Aucune action offensive sortante n'est possible.
export async function POST(req: NextRequest) {
  try {
    const payload = await adminAuth(req);
    if (!payload) {
      return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action as "block" | "unblock";
    const ip = normalizeIp(body.ip);

    if (!ip || ip === "unknown") {
      return NextResponse.json({ error: "Adresse IP invalide" }, { status: 400 });
    }

    if (action === "unblock") {
      const existing = await prisma.blockedIp.findUnique({ where: { ip } });
      if (!existing) {
        return NextResponse.json({ error: "IP non trouvee dans la liste noire" }, { status: 404 });
      }
      await prisma.blockedIp.update({
        where: { ip },
        data: { active: false },
      });
      invalidateIpCache(ip);

      await logSystemEvent({
        level: "INFO",
        source: "SECURITY",
        action: "IP_UNBLOCKED",
        message: `IP debloquee manuellement par l'admin : ${ip}`,
        details: { ip, adminId: payload.id, adminEmail: payload.email },
        ip,
      });

      try {
        await prisma.auditLog.create({
          data: {
            adminId: payload.id,
            adminName: payload.name || payload.email || "Admin",
            action: "UNBLOCK_IP",
            targetId: existing.id,
            details: `Levée du blocage sur l'IP ${ip}`,
          },
        });
      } catch {}

      return NextResponse.json({ success: true });
    }

    // action === "block" → riposte
    const reason: string = (body.reason || "Activité malveillante détectée").toString().slice(0, 280);
    const threat: ThreatLevel = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(body.threat)
      ? body.threat
      : "HIGH";
    const durationMinutes = Number.isFinite(body.durationMinutes)
      ? Math.max(0, Math.floor(body.durationMinutes))
      : 0; // 0 = blocage permanent
    const expiresAt = durationMinutes > 0 ? new Date(Date.now() + durationMinutes * 60_000) : null;

    const blocked = await prisma.blockedIp.upsert({
      where: { ip },
      create: {
        ip,
        reason,
        threat,
        blockedBy: payload.id,
        active: true,
        expiresAt,
      },
      update: {
        reason,
        threat,
        blockedBy: payload.id,
        active: true,
        expiresAt,
      },
    });
    invalidateIpCache(ip);

    await logSystemEvent({
      level: "WARN",
      source: "SECURITY",
      action: "IP_BLOCKED",
      message: `Riposte : IP ${ip} bloquee (${threat})${
        expiresAt ? ` jusqu'au ${expiresAt.toISOString()}` : " de maniere permanente"
      }`,
      details: { ip, reason, threat, adminId: payload.id, adminEmail: payload.email, expiresAt },
      ip,
    });

    try {
      await prisma.auditLog.create({
        data: {
          adminId: payload.id,
          adminName: payload.name || payload.email || "Admin",
          action: "BLOCK_IP",
          targetId: blocked.id,
          details: `Blocage (riposte) de l'IP ${ip} — menace ${threat} — ${reason}`,
        },
      });
    } catch {}

    return NextResponse.json({ success: true, blocked });
  } catch (error: any) {
    console.error("[INTRUSION_POST_ERROR]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
