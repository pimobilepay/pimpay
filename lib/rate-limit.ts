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
 */
export function getClientIp(req: Request): string {
  const headers = req.headers as Headers;
  return (
    headers.get("x-real-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
