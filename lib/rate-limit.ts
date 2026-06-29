/**
 * lib/rate-limit.ts — Rate limiting in-memory (Node.js runtime)
 *
 * [FIX #7] Implémentation sans dépendance externe.
 * Utilisé directement dans les routes API (login, withdraw, transfer).
 *
 * Limites appliquées :
 *   - /api/auth/login  : 10 req / 60s par IP  → brute force
 *   - /api/withdraw    : 20 req / 60s par IP  → wash trading / DDoS financier
 *   - /api/transfer    : 20 req / 60s par IP
 *
 * Pour un rate limiting distribué multi-région Vercel,
 * migrer vers @upstash/ratelimit + Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number; // timestamp ms
}

// Store global — persistant sur la durée de vie du process Node.js
const store = new Map<string, RateLimitEntry>();

/**
 * Nettoyage périodique pour éviter les fuites mémoire.
 * N'itère que si le store dépasse 10 000 entrées.
 */
function cleanup(): void {
  if (store.size < 10_000) return;
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(key);
  }
}

/**
 * Vérifie si une clé a dépassé sa limite.
 *
 * @param key      Clé unique — ex: "login:192.168.1.1"
 * @param limit    Nombre max de requêtes autorisées sur la fenêtre
 * @param windowMs Durée de la fenêtre en ms (ex: 60_000 = 1 minute)
 * @returns        { limited: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; remaining: number; resetAt: number } {
  cleanup();

  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    // Nouvelle fenêtre
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { limited: false, remaining: limit - 1, resetAt };
  }

  entry.count += 1;

  const limited   = entry.count > limit;
  const remaining = Math.max(0, limit - entry.count);

  return { limited, remaining, resetAt: entry.resetAt };
}

/**
 * Extrait l'IP du client depuis les headers de la requête.
 * Compatible Vercel Edge / reverse proxy.
 *
 * IMPORTANT — Cohérence du blocage IP :
 * On privilégie `x-forwarded-for` (1ère entrée = vrai client d'origine), car
 * c'est cette valeur qui est journalisée et affichée dans le tableau de bord
 * d'intrusion. Le garde de défense (isIpBlocked) DOIT vérifier exactement la
 * même IP que celle qui est affichée/bloquée par l'admin, sinon le blocage ne
 * correspond jamais et l'utilisateur passe quand même.
 *
 * On nettoie aussi le préfixe IPv6-mapped (::ffff:1.2.3.4 → 1.2.3.4) pour
 * garantir une correspondance exacte avec les IPv4 stockées en liste noire.
 */
export function getClientIp(req: Request): string {
  const headers = req.headers as Headers;
  const raw =
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip")?.trim() ||
    "unknown";
  return stripIpv6MappedPrefix(raw);
}

/** Normalise les IPv4 encapsulées en IPv6 (::ffff:1.2.3.4 → 1.2.3.4). */
function stripIpv6MappedPrefix(ip: string): string {
  if (!ip) return "unknown";
  const lower = ip.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v4)) return v4;
  }
  return ip;
}
