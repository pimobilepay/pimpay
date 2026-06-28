// [IDS] Moteur de détection proxy / VPN / Tor / datacenter.
// Stratégie : API spécialisée (proxycheck.io) avec repli heuristique 100% local.
// Résultats mis en cache en mémoire pour limiter la latence et les appels réseau.

export interface ProxyInfo {
  ip: string;
  isProxy: boolean;
  isVpn: boolean;
  isTor: boolean;
  isDatacenter: boolean;
  proxyType: string | null; // VPN | TOR | PUB | DCH | SES | RES...
  riskScore: number; // 0-100
  country: string | null;
  countryCode: string | null;
  isp: string | null;
  provider: string | null;
  source: "api" | "heuristic" | "private";
}

interface CacheEntry {
  info: ProxyInfo;
  expiresAt: number;
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h
const cache = new Map<string, CacheEntry>();

// Plages privées / réservées — jamais considérées comme proxy.
function isPrivateIp(ip: string): boolean {
  if (!ip || ip === "unknown") return true;
  if (ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || ip.startsWith("fe80")) return true;
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) {
    // IPv6 ou format inattendu : ne pas traiter en heuristique
    return ip.includes(":") ? false : true;
  }
  const [a, b] = p;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

// Mots-clés d'ISP/organisation indiquant un hébergeur / datacenter / VPN connu.
const DATACENTER_KEYWORDS = [
  "amazon", "aws", "google", "azure", "microsoft", "digitalocean", "ovh", "hetzner",
  "linode", "vultr", "scaleway", "oracle", "alibaba", "tencent", "contabo", "leaseweb",
  "choopa", "m247", "datacamp", "cloudflare", "hosting", "datacenter", "data center",
  "server", "colo", "vps", "cloud",
];
const VPN_KEYWORDS = [
  "vpn", "nordvpn", "expressvpn", "private internet access", "mullvad", "surfshark",
  "cyberghost", "protonvpn", "ipvanish", "windscribe", "tunnelbear", "hide.me", "purevpn",
];

function heuristicDetect(ip: string, isp?: string | null): ProxyInfo {
  const org = (isp || "").toLowerCase();
  const isVpn = VPN_KEYWORDS.some((k) => org.includes(k));
  const isDatacenter = !isVpn && DATACENTER_KEYWORDS.some((k) => org.includes(k));
  const isProxy = isVpn || isDatacenter;
  let riskScore = 0;
  if (isVpn) riskScore = 85;
  else if (isDatacenter) riskScore = 60;
  return {
    ip,
    isProxy,
    isVpn,
    isTor: false,
    isDatacenter,
    proxyType: isVpn ? "VPN" : isDatacenter ? "DCH" : null,
    riskScore,
    country: null,
    countryCode: null,
    isp: isp || null,
    provider: isp || null,
    source: "heuristic",
  };
}

// Détecte les en-têtes de proxy suspects sur la requête entrante (chaînage de proxy).
//
// IMPORTANT — réduction des faux positifs : les CDN/hébergeurs légitimes (Vercel,
// Cloudflare, load-balancers…) ajoutent normalement `via`, `forwarded`,
// `x-forwarded-host`, `x-forwarded-for`. Ces en-têtes ne sont donc PAS suspects en
// soi. On ne signale que les en-têtes typiques d'outils de proxy/anonymisation ou
// un chaînage de proxys anormalement long.
export function hasSuspiciousProxyHeaders(headers: Headers): boolean {
  // En-têtes rarement présents hors outils de proxy/anonymisation.
  const suspicious = [
    "proxy-connection", "x-proxy-id", "x-real-ip-forwarded",
    "proxy-authorization", "x-anonymizer",
  ];
  if (suspicious.some((h) => headers.has(h))) return true;

  // Chaînage de proxys anormalement long (> 4 sauts) — au-delà de l'infra normale.
  const xff = headers.get("x-forwarded-for");
  if (xff && xff.split(",").filter(Boolean).length > 4) return true;

  return false;
}

// Signatures d'agents automatisés (bots / scrapers / outils en ligne de commande).
const BOT_UA_PATTERNS: { re: RegExp; name: string }[] = [
  { re: /\bcurl\//i, name: "curl" },
  { re: /\bwget\//i, name: "wget" },
  { re: /python-requests|aiohttp|httpx|urllib/i, name: "python" },
  { re: /\bgo-http-client\b/i, name: "go-http" },
  { re: /\bjava\/|okhttp|apache-httpclient/i, name: "java" },
  { re: /\b(scrapy|puppeteer|playwright|headlesschrome|phantomjs|selenium)\b/i, name: "headless" },
  { re: /\b(masscan|nmap|nikto|sqlmap|nuclei|zgrab|dirbuster|gobuster|wpscan)\b/i, name: "scanner" },
  { re: /\b(libwww-perl|guzzlehttp|node-fetch|axios|got)\b/i, name: "http-lib" },
  { re: /\bbot\b|crawler|spider/i, name: "crawler" },
];

export interface BotInfo {
  isBot: boolean;
  botName: string | null;
}

// Détection d'agent automatisé à partir du User-Agent. Les UA vides sont aussi
// considérés comme automatisés (un navigateur réel envoie toujours un UA).
export function detectBotUserAgent(userAgent: string | null | undefined): BotInfo {
  const ua = (userAgent || "").trim();
  if (!ua) return { isBot: true, botName: "no-user-agent" };
  for (const { re, name } of BOT_UA_PATTERNS) {
    if (re.test(ua)) return { isBot: true, botName: name };
  }
  return { isBot: false, botName: null };
}

async function apiDetect(ip: string): Promise<ProxyInfo | null> {
  const key = process.env.PROXYCHECK_API_KEY || "";
  // proxycheck.io fonctionne sans clé à faible volume ; la clé augmente les quotas.
  const url = `https://proxycheck.io/v2/${ip}?vpn=3&asn=1&risk=1${key ? `&key=${key}` : ""}`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
    clearTimeout(t);
    if (!res.ok) return null;
    const data: any = await res.json();
    if (data.status !== "ok" && data.status !== "warning") return null;
    const node = data[ip];
    if (!node) return null;

    const type = (node.type || "").toUpperCase(); // VPN, TOR, PUB, DCH, SES...
    const isProxyFlag = String(node.proxy || "no").toLowerCase() === "yes";
    const isTor = type === "TOR";
    const isVpn = type === "VPN" || String(node.vpn || "no").toLowerCase() === "yes";
    const isDatacenter = type === "DCH" || type === "SES";
    const risk = typeof node.risk === "number" ? node.risk : isProxyFlag ? 75 : 0;

    return {
      ip,
      isProxy: isProxyFlag || isVpn || isTor,
      isVpn,
      isTor,
      isDatacenter,
      proxyType: type || (isProxyFlag ? "PUB" : null),
      riskScore: Math.max(0, Math.min(100, risk)),
      country: node.country || null,
      countryCode: node.isocode || null,
      isp: node.isp || node.provider || null,
      provider: node.provider || node.organisation || null,
      source: "api",
    };
  } catch {
    return null;
  }
}

export async function detectProxy(ip: string): Promise<ProxyInfo> {
  if (isPrivateIp(ip)) {
    return {
      ip,
      isProxy: false,
      isVpn: false,
      isTor: false,
      isDatacenter: false,
      proxyType: null,
      riskScore: 0,
      country: null,
      countryCode: null,
      isp: null,
      provider: null,
      source: "private",
    };
  }

  const cached = cache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.info;

  let info = await apiDetect(ip);
  if (!info) info = heuristicDetect(ip);

  cache.set(ip, { info, expiresAt: Date.now() + CACHE_TTL_MS });
  return info;
}

export function clearProxyCache(ip?: string) {
  if (ip) cache.delete(ip);
  else cache.clear();
}
