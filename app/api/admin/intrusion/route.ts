export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminAuth } from "@/lib/adminAuth";
import { logSystemEvent } from "@/lib/systemLogger";
import { invalidateIpCache, normalizeIp } from "@/lib/ipBlock";
import { getDefenseSettings, invalidateSettingsCache } from "@/lib/defenseGuard";

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

    // 3. IP actuellement bloquées (riposte active) — actives affichées en premier
    const blockedIps = blockedRecords
      .map((b) => ({
        id: b.id,
        ip: b.ip,
        reason: b.reason,
        threat: b.threat,
        blockedBy: b.blockedBy,
        active: b.active && (!b.expiresAt || b.expiresAt > now),
        hits: b.hits,
        expiresAt: b.expiresAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      }))
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    // 4. Réglages de défense (toggles proxy/VPN/Tor) + journal des détections proxy
    const settings = await getDefenseSettings();

    let proxyDetections: any[] = [];
    let proxyStats = { detected24h: 0, blocked24h: 0, vpn: 0, tor: 0, datacenter: 0 };
    try {
      const [detections, detected24h, blocked24h, vpn, tor, datacenter] = await Promise.all([
        prisma.proxyDetection.findMany({
          orderBy: { createdAt: "desc" },
          take: 60,
        }),
        prisma.proxyDetection.count({ where: { createdAt: { gte: last24h } } }),
        prisma.proxyDetection.count({
          where: { createdAt: { gte: last24h }, action: { in: ["BLOCKED", "AUTO_BLOCKED"] } },
        }),
        prisma.proxyDetection.count({ where: { createdAt: { gte: last7d }, isVpn: true } }),
        prisma.proxyDetection.count({ where: { createdAt: { gte: last7d }, isTor: true } }),
        prisma.proxyDetection.count({ where: { createdAt: { gte: last7d }, isDatacenter: true } }),
      ]);
      proxyDetections = detections.map((d) => ({
        id: d.id,
        ip: d.ip,
        isProxy: d.isProxy,
        isVpn: d.isVpn,
        isTor: d.isTor,
        isDatacenter: d.isDatacenter,
        proxyType: d.proxyType,
        riskScore: d.riskScore,
        country: d.country,
        countryCode: d.countryCode,
        isp: d.isp,
        action: d.action,
        context: d.context,
        source: d.source,
        createdAt: d.createdAt.toISOString(),
      }));
      proxyStats = { detected24h, blocked24h, vpn, tor, datacenter };
    } catch {
      // Table absente (migration non appliquée) → on renvoie des valeurs vides.
    }

    // 5. Statistiques rapides
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
      settings,
      proxyDetections,
      stats: {
        events24h,
        uniqueSources: byIp.size,
        activeBlocks,
        critical: criticalCount,
        proxyDetected24h: proxyStats.detected24h,
        proxyBlocked24h: proxyStats.blocked24h,
        vpnDetected: proxyStats.vpn,
        torDetected: proxyStats.tor,
        datacenterDetected: proxyStats.datacenter,
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
    const action = body.action as
      | "block"
      | "unblock"
      | "update-settings"
      | "whitelist-add"
      | "whitelist-remove";

    // ===== Liste blanche : ajout / retrait d'une entrée (IP ou CIDR) =====
    if (action === "whitelist-add" || action === "whitelist-remove") {
      const raw = String(body.entry || "").trim();
      if (!raw) {
        return NextResponse.json({ error: "Adresse manquante" }, { status: 400 });
      }
      // Valide une IPv4 ou un CIDR IPv4 (ex. 203.0.113.4 ou 198.51.100.0/24).
      const isValid = /^(\d{1,3}\.){3}\d{1,3}(\/(\d|[12]\d|3[0-2]))?$/.test(raw)
        && raw.split("/")[0].split(".").every((o) => Number(o) >= 0 && Number(o) <= 255);
      if (action === "whitelist-add" && !isValid) {
        return NextResponse.json({ error: "Adresse IP ou CIDR invalide" }, { status: 400 });
      }

      const settings = await getDefenseSettings();
      const list = String(settings.ipWhitelist || "")
        .split(",")
        .map((e: string) => e.trim())
        .filter(Boolean);

      let next: string[];
      if (action === "whitelist-add") {
        if (list.includes(raw)) {
          return NextResponse.json({ error: "Adresse déjà présente", settings }, { status: 409 });
        }
        next = [...list, raw];
      } else {
        next = list.filter((e) => e !== raw);
      }

      const ipWhitelist = next.join(", ").slice(0, 2000);
      await prisma.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        create: { id: "GLOBAL_CONFIG", ipWhitelist },
        update: { ipWhitelist },
      });
      invalidateSettingsCache();

      await logSystemEvent({
        level: "INFO",
        source: "SECURITY",
        action: action === "whitelist-add" ? "WHITELIST_IP_ADDED" : "WHITELIST_IP_REMOVED",
        message: `${action === "whitelist-add" ? "Ajout" : "Retrait"} de ${raw} ${action === "whitelist-add" ? "à" : "de"} la liste blanche`,
        details: { entry: raw, adminId: payload.id, adminEmail: payload.email },
      });

      try {
        await prisma.auditLog.create({
          data: {
            adminId: payload.id,
            adminName: payload.name || payload.email || "Admin",
            action: action === "whitelist-add" ? "WHITELIST_ADD" : "WHITELIST_REMOVE",
            targetId: raw,
            details: `${action === "whitelist-add" ? "Ajout" : "Retrait"} liste blanche : ${raw}`,
          },
        });
      } catch {}

      const updated = await getDefenseSettings();
      return NextResponse.json({ success: true, settings: updated });
    }

    // ===== Mise à jour des réglages de défense (protection proxy/VPN/Tor) =====
    if (action === "update-settings") {
      const s = body.settings || {};
      const data: any = {};
      if (typeof s.proxyDetectionEnabled === "boolean") data.proxyDetectionEnabled = s.proxyDetectionEnabled;
      if (s.proxyDetectionMode === "BLOCK" || s.proxyDetectionMode === "MONITOR") data.proxyDetectionMode = s.proxyDetectionMode;
      if (typeof s.blockVpn === "boolean") data.blockVpn = s.blockVpn;
      if (typeof s.blockProxy === "boolean") data.blockProxy = s.blockProxy;
      if (typeof s.blockTor === "boolean") data.blockTor = s.blockTor;
      if (typeof s.blockDatacenter === "boolean") data.blockDatacenter = s.blockDatacenter;
      if (typeof s.autoBlockOnDetection === "boolean") data.autoBlockOnDetection = s.autoBlockOnDetection;
      if (Number.isFinite(s.riskScoreThreshold)) {
        data.riskScoreThreshold = Math.max(0, Math.min(100, Math.floor(s.riskScoreThreshold)));
      }
      if (typeof s.ipWhitelist === "string") data.ipWhitelist = s.ipWhitelist.slice(0, 2000);

      await prisma.systemConfig.upsert({
        where: { id: "GLOBAL_CONFIG" },
        create: { id: "GLOBAL_CONFIG", ...data },
        update: data,
      });
      invalidateSettingsCache();

      await logSystemEvent({
        level: "INFO",
        source: "SECURITY",
        action: "DEFENSE_SETTINGS_UPDATED",
        message: `Réglages de défense proxy/VPN mis à jour par l'admin`,
        details: { changes: data, adminId: payload.id, adminEmail: payload.email },
      });

      try {
        await prisma.auditLog.create({
          data: {
            adminId: payload.id,
            adminName: payload.name || payload.email || "Admin",
            action: "UPDATE_DEFENSE_SETTINGS",
            targetId: "GLOBAL_CONFIG",
            details: `Mise à jour de la protection proxy/VPN : ${JSON.stringify(data)}`,
          },
        });
      } catch {}

      const settings = await getDefenseSettings();
      return NextResponse.json({ success: true, settings });
    }

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
    // Validation stricte du format (IPv4 ou IPv6) avant tout enregistrement.
    const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipv4Match = ip.match(ipv4);
    const validIpv4 = !!ipv4Match && ipv4Match.slice(1).every((o) => Number(o) >= 0 && Number(o) <= 255);
    const validIpv6 = /^(([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{0,4}|::1|::)$/.test(ip);
    if (!validIpv4 && !validIpv6) {
      return NextResponse.json({ error: "Format d'adresse IP invalide" }, { status: 400 });
    }

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
