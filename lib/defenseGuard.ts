// [IDS] Garde de défense unifié.
// Point d'entrée unique appelé par les routes sensibles (login, transfert,
// retrait, dépôt...). Il combine :
//   1. Liste blanche (IP/CIDR de confiance) — court-circuite toute analyse.
//   2. Liste noire (riposte admin) via isIpBlocked.
//   3. Détection proxy / VPN / Tor / datacenter (proxycheck.io + heuristiques).
//   4. Évaluation selon les réglages admin (mode BLOCK / MONITOR, seuils).
//   5. Journalisation (ProxyDetection + SystemLog) et auto-blocage optionnel.
//
// DÉFENSE uniquement : on refuse/limite le trafic entrant suspect. Aucune
// action offensive sortante n'est entreprise.

import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { isIpBlocked, normalizeIp, invalidateIpCache } from "@/lib/ipBlock";
import { detectProxy, hasSuspiciousProxyHeaders, type ProxyInfo } from "@/lib/proxyDetection";
import { logSystemEvent } from "@/lib/systemLogger";

export interface GuardResult {
  allowed: boolean;
  status: number; // code HTTP suggéré si bloqué
  reason?: string;
  ip: string;
  proxy?: ProxyInfo;
  blockedByList?: boolean;
}

interface GuardOptions {
  context: string; // "login", "transfer", "withdraw"...
  userId?: string | null;
}

// Cache court des réglages pour éviter un hit DB par requête.
let settingsCache: { data: any; expiresAt: number } | null = null;
const SETTINGS_TTL_MS = 30_000;

export async function getDefenseSettings() {
  if (settingsCache && settingsCache.expiresAt > Date.now()) return settingsCache.data;
  let data: any = null;
  try {
    data = await prisma.systemConfig.findUnique({ where: { id: "GLOBAL_CONFIG" } });
  } catch {
    data = null;
  }
  const settings = {
    proxyDetectionEnabled: data?.proxyDetectionEnabled ?? true,
    proxyDetectionMode: data?.proxyDetectionMode ?? "BLOCK",
    blockVpn: data?.blockVpn ?? true,
    blockProxy: data?.blockProxy ?? true,
    blockTor: data?.blockTor ?? true,
    blockDatacenter: data?.blockDatacenter ?? false,
    riskScoreThreshold: data?.riskScoreThreshold ?? 70,
    ipWhitelist: data?.ipWhitelist ?? "",
    autoBlockOnDetection: data?.autoBlockOnDetection ?? false,
  };
  settingsCache = { data: settings, expiresAt: Date.now() + SETTINGS_TTL_MS };
  return settings;
}

export function invalidateSettingsCache() {
  settingsCache = null;
}

// Vérifie l'appartenance d'une IP à une liste blanche (IP exactes ou CIDR /24, /16, /8).
function ipInWhitelist(ip: string, whitelist: string): boolean {
  if (!whitelist) return false;
  const entries = whitelist.split(",").map((e) => e.trim()).filter(Boolean);
  for (const entry of entries) {
    if (entry === ip) return true;
    if (entry.includes("/")) {
      const [base, bitsStr] = entry.split("/");
      const bits = Number(bitsStr);
      if (matchCidr(ip, base, bits)) return true;
    }
  }
  return false;
}

function ipToInt(ip: string): number | null {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return null;
  return ((p[0] << 24) >>> 0) + (p[1] << 16) + (p[2] << 8) + p[3];
}

function matchCidr(ip: string, base: string, bits: number): boolean {
  const ipInt = ipToInt(ip);
  const baseInt = ipToInt(base);
  if (ipInt === null || baseInt === null || bits < 0 || bits > 32) return false;
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipInt & mask) === (baseInt & mask);
}

function shouldBlock(proxy: ProxyInfo, s: any): { block: boolean; reason: string } {
  const reasons: string[] = [];
  if (proxy.isTor && s.blockTor) reasons.push("Tor");
  if (proxy.isVpn && s.blockVpn) reasons.push("VPN");
  if (proxy.isProxy && !proxy.isVpn && !proxy.isTor && s.blockProxy) reasons.push("Proxy");
  if (proxy.isDatacenter && s.blockDatacenter) reasons.push("Datacenter");
  if (proxy.riskScore >= s.riskScoreThreshold && proxy.isProxy) reasons.push(`Risque élevé (${proxy.riskScore})`);
  return { block: reasons.length > 0, reason: reasons.join(", ") };
}

/**
 * Analyse complète d'une requête entrante. À appeler en début de handler.
 */
export async function guardRequest(req: Request, opts: GuardOptions): Promise<GuardResult> {
  const ip = normalizeIp(getClientIp(req));
  const userAgent = req.headers.get("user-agent") || undefined;

  // 1. Liste noire admin (riposte) — prioritaire.
  if (await isIpBlocked(ip)) {
    await logSystemEvent({
      level: "WARN",
      source: "SECURITY",
      action: "BLOCKED_IP_HIT",
      message: `Requête rejetée (IP en liste noire) sur ${opts.context} : ${ip}`,
      details: { ip, context: opts.context },
      ip,
      userId: opts.userId ?? undefined,
    });
    return { allowed: false, status: 403, reason: "IP bloquée", ip, blockedByList: true };
  }

  const settings = await getDefenseSettings();

  // 2. Liste blanche — court-circuite la détection proxy.
  if (ipInWhitelist(ip, settings.ipWhitelist)) {
    return { allowed: true, status: 200, ip };
  }

  // 3. Détection désactivée → on laisse passer.
  if (!settings.proxyDetectionEnabled) {
    return { allowed: true, status: 200, ip };
  }

  // 4. Détection proxy / VPN / Tor / datacenter.
  const proxy = await detectProxy(ip);
  const headerSuspicion = hasSuspiciousProxyHeaders(req.headers);
  if (headerSuspicion && !proxy.isProxy) {
    proxy.isProxy = true;
    proxy.proxyType = proxy.proxyType || "PUB";
    proxy.riskScore = Math.max(proxy.riskScore, 55);
  }

  // Rien de suspect : aucune trace pour ne pas polluer le journal.
  if (!proxy.isProxy && !proxy.isVpn && !proxy.isTor && !proxy.isDatacenter) {
    return { allowed: true, status: 200, ip, proxy };
  }

  const { block, reason } = shouldBlock(proxy, settings);
  const enforce = block && settings.proxyDetectionMode === "BLOCK";
  let action: "LOGGED" | "BLOCKED" | "AUTO_BLOCKED" = enforce ? "BLOCKED" : "LOGGED";

  // 5. Auto-blocage durable (liste noire) si activé et menace avérée.
  if (enforce && settings.autoBlockOnDetection) {
    try {
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await prisma.blockedIp.upsert({
        where: { ip },
        create: {
          ip,
          reason: `Auto-blocage IDS : ${reason}`,
          threat: proxy.riskScore >= 85 ? "CRITICAL" : "HIGH",
          blockedBy: "system",
          active: true,
          expiresAt,
        },
        update: { active: true, reason: `Auto-blocage IDS : ${reason}`, expiresAt },
      });
      invalidateIpCache(ip);
      action = "AUTO_BLOCKED";
    } catch {
      /* best-effort */
    }
  }

  // Journalisation structurée (best-effort, non bloquant pour la latence).
  prisma.proxyDetection
    .create({
      data: {
        ip,
        isProxy: proxy.isProxy,
        isVpn: proxy.isVpn,
        isTor: proxy.isTor,
        isDatacenter: proxy.isDatacenter,
        proxyType: proxy.proxyType,
        riskScore: proxy.riskScore,
        country: proxy.country,
        countryCode: proxy.countryCode,
        isp: proxy.isp,
        provider: proxy.provider,
        action,
        context: opts.context,
        userId: opts.userId ?? null,
        userAgent,
        source: proxy.source === "private" ? "heuristic" : proxy.source,
      },
    })
    .catch(() => {});

  await logSystemEvent({
    level: enforce ? "WARN" : "INFO",
    source: "SECURITY",
    action: enforce ? "PROXY_BLOCKED" : "PROXY_DETECTED",
    message: `${enforce ? "Accès refusé" : "Détection"} ${proxy.proxyType || "PROXY"} sur ${opts.context} — ${ip} (risque ${proxy.riskScore})`,
    details: {
      ip,
      context: opts.context,
      proxyType: proxy.proxyType,
      isVpn: proxy.isVpn,
      isTor: proxy.isTor,
      isDatacenter: proxy.isDatacenter,
      riskScore: proxy.riskScore,
      country: proxy.country,
      isp: proxy.isp,
      reason,
    },
    ip,
    userAgent,
    userId: opts.userId ?? undefined,
  });

  if (enforce) {
    return {
      allowed: false,
      status: 403,
      reason: `Accès via ${reason} non autorisé`,
      ip,
      proxy,
    };
  }

  return { allowed: true, status: 200, ip, proxy };
}
