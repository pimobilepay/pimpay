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
import { detectProxy, hasSuspiciousProxyHeaders, detectBotUserAgent, type ProxyInfo } from "@/lib/proxyDetection";
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

// Verrouillage total : si l'admin descend le seuil de risque à cette valeur ou
// en dessous, on considère qu'il s'agit d'un blocage volontaire de TOUT le
// trafic entrant (mode panique). Seules les IP de la liste blanche passent.
export const LOCKDOWN_THRESHOLD = 30;

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
    blockBots: data?.blockBots ?? false,
    blockHeaderSpoof: data?.blockHeaderSpoof ?? false,
    // 75 = équilibré : assez haut pour ne pas bloquer les IP normales/à faible
    // risque, assez bas pour stopper VPN/proxy à risque avéré.
    riskScoreThreshold: data?.riskScoreThreshold ?? 75,
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

function shouldBlock(
  proxy: ProxyInfo,
  s: any,
  bot?: { isBot: boolean; botName: string | null },
): { block: boolean; reason: string } {
  const reasons: string[] = [];

  // Tor = réseau d'anonymisation à risque par nature → bloqué dès que la catégorie
  // est activée, indépendamment du score.
  if (proxy.isTor && s.blockTor) reasons.push("Tor");

  // VPN / Proxy / Datacenter : on n'applique le blocage QUE si le score de risque
  // atteint le seuil configuré. Cela évite de bloquer des IP normales/à faible
  // risque que les heuristiques marquent comme "proxy" sans réelle menace.
  const meetsThreshold = proxy.riskScore >= s.riskScoreThreshold;
  if (proxy.isVpn && s.blockVpn && meetsThreshold) reasons.push(`VPN (risque ${proxy.riskScore})`);
  if (proxy.isProxy && !proxy.isVpn && !proxy.isTor && s.blockProxy && meetsThreshold)
    reasons.push(`Proxy (risque ${proxy.riskScore})`);
  if (proxy.isDatacenter && s.blockDatacenter && meetsThreshold)
    reasons.push(`Datacenter (risque ${proxy.riskScore})`);

  // Bot / scraper / outil automatisé détecté via le User-Agent.
  if (bot?.isBot && s.blockBots) reasons.push(`Bot (${bot.botName})`);

  return { block: reasons.length > 0, reason: reasons.join(", ") };
}

/**
 * Analyse complète d'une requête entrante. À appeler en début de handler.
 */
export async function guardRequest(req: Request, opts: GuardOptions): Promise<GuardResult> {
  const ip = normalizeIp(getClientIp(req));
  const userAgent = req.headers.get("user-agent") || undefined;

  const settings = await getDefenseSettings();

  // 1. Liste blanche (IP/CIDR de confiance) — priorité absolue.
  //    Court-circuite TOUTE analyse, y compris la liste noire et le
  //    verrouillage total. Une IP de confiance ne doit jamais être bloquée.
  if (ipInWhitelist(ip, settings.ipWhitelist)) {
    return { allowed: true, status: 200, ip };
  }

  // 2. Liste noire admin (riposte).
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

  // 3. Détection désactivée → on laisse passer.
  if (!settings.proxyDetectionEnabled) {
    return { allowed: true, status: 200, ip };
  }

  // 3b. Verrouillage total : seuil descendu à 30 ou moins → l'admin bloque
  //     volontairement TOUT le trafic entrant (la liste blanche ci-dessus reste
  //     prioritaire pour ne pas verrouiller les IP de confiance).
  if (settings.riskScoreThreshold <= LOCKDOWN_THRESHOLD) {
    const enforce = settings.proxyDetectionMode === "BLOCK";
    await logSystemEvent({
      level: enforce ? "WARN" : "INFO",
      source: "SECURITY",
      action: enforce ? "LOCKDOWN_BLOCKED" : "LOCKDOWN_DETECTED",
      message: `${enforce ? "Accès refusé" : "Détection"} (verrouillage total, seuil ${settings.riskScoreThreshold}) sur ${opts.context} — ${ip}`,
      details: { ip, context: opts.context, riskScoreThreshold: settings.riskScoreThreshold, lockdown: true },
      ip,
      userAgent,
      userId: opts.userId ?? undefined,
    });
    if (enforce) {
      return {
        allowed: false,
        status: 403,
        reason: "Verrouillage total actif — tout accès est temporairement bloqué",
        ip,
      };
    }
    // Mode SURVEILLER : on journalise mais on laisse passer.
    return { allowed: true, status: 200, ip };
  }

  // 4. Détection proxy / VPN / Tor / datacenter.
  const proxy = await detectProxy(ip);

  // 4b. En-têtes proxy falsifiés / chaînage anormal — uniquement si l'admin
  //     active cette catégorie (évite les faux positifs liés aux CDN légitimes).
  const headerSuspicion = settings.blockHeaderSpoof && hasSuspiciousProxyHeaders(req.headers);
  if (headerSuspicion && !proxy.isProxy) {
    proxy.isProxy = true;
    proxy.proxyType = proxy.proxyType || "PUB";
    proxy.riskScore = Math.max(proxy.riskScore, settings.riskScoreThreshold);
  }

  // 4c. Détection d'agent automatisé (bot / scraper / outil) via le User-Agent.
  const bot = detectBotUserAgent(userAgent);

  // Rien de suspect : aucune trace pour ne pas polluer le journal.
  const botFlagged = bot.isBot && settings.blockBots;
  if (!proxy.isProxy && !proxy.isVpn && !proxy.isTor && !proxy.isDatacenter && !botFlagged) {
    return { allowed: true, status: 200, ip, proxy };
  }

  const { block, reason } = shouldBlock(proxy, settings, bot);
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
