/**
 * lib/tx-rate-limit.ts — Rate limiting DISTRIBUÉ pour les endpoints d'écriture financiers.
 *
 * Contrairement à lib/rate-limit.ts (in-memory, non partagé entre les lambdas Vercel
 * et réinitialisé à chaque cold start), ce module s'appuie sur Upstash Redis afin
 * d'appliquer une limite réellement globale, partagée par toutes les régions et toutes
 * les instances serverless.
 *
 * Politique : 2 requêtes par fenêtre glissante de 60 secondes.
 *   - Clé PRIMAIRE  : l'identifiant utilisateur authentifié (impossible à usurper).
 *   - Clé SECONDAIRE: l'adresse IP (anti-bot / création de comptes jetables).
 * Une requête est bloquée si l'une OU l'autre limite est dépassée.
 *
 * Variables d'environnement requises (fournies par l'intégration Upstash sur Vercel) :
 *   - UPSTASH_REDIS_REST_URL   (repli : KV_REST_API_URL)
 *   - UPSTASH_REDIS_REST_TOKEN (repli : KV_REST_API_TOKEN)
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

/** Nombre maximum de requêtes d'écriture par fenêtre. */
export const TX_RATE_LIMIT = 2;
/** Durée de la fenêtre glissante. */
export const TX_RATE_WINDOW = "60 s" as const;

/**
 * Singleton Redis + Ratelimit.
 * `null` si les variables d'environnement Upstash sont absentes : dans ce cas, on
 * échoue de manière sûre (fail-closed côté production, voir enforceTxRateLimit).
 */
let limiter: Ratelimit | null = null;

function getLimiter(): Ratelimit | null {
  if (limiter) return limiter;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });

  limiter = new Ratelimit({
    redis,
    // Sliding window : protège contre les rafales en début/fin de fenêtre,
    // exactement le scénario "dizaines de requêtes à la même seconde".
    limiter: Ratelimit.slidingWindow(TX_RATE_LIMIT, TX_RATE_WINDOW),
    analytics: false,
    prefix: "pimpay:tx",
  });

  return limiter;
}

export interface RateLimitContext {
  /** Identifiant de l'utilisateur authentifié (jamais issu du body client). */
  userId: string;
  /** Adresse IP du client. */
  ip: string;
  /** Action concernée — sert à cloisonner les compteurs (send, swap, withdraw, deposit). */
  action: "send" | "swap" | "withdraw" | "deposit";
}

/**
 * Applique la limite distribuée. Renvoie une `NextResponse` 429 si la limite est
 * dépassée (ou si Redis est indisponible en production = fail-closed), sinon `null`.
 *
 * Usage dans une route :
 *   const limited = await enforceTxRateLimit({ userId, ip, action: "send" });
 *   if (limited) return limited;
 */
export async function enforceTxRateLimit(
  ctx: RateLimitContext
): Promise<NextResponse | null> {
  const rl = getLimiter();

  // Pas de Redis configuré.
  if (!rl) {
    if (process.env.NODE_ENV === "production") {
      // Fail-closed : sur une plateforme financière, on refuse plutôt que d'ouvrir
      // une porte sans protection. Indique une mauvaise configuration à corriger.
      console.error(
        "[tx-rate-limit] Upstash non configuré (UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN manquants)."
      );
      return NextResponse.json(
        { error: "Service temporairement indisponible." },
        { status: 503 }
      );
    }
    // En développement local sans Redis, on laisse passer pour ne pas bloquer le DX.
    return null;
  }

  // Deux compteurs indépendants : on bloque dès que l'un est dépassé.
  const [byUser, byIp] = await Promise.all([
    rl.limit(`${ctx.action}:user:${ctx.userId}`),
    rl.limit(`${ctx.action}:ip:${ctx.ip}`),
  ]);

  const blocked = !byUser.success || !byIp.success;
  if (!blocked) return null;

  // On expose le délai d'attente le plus contraignant.
  const reset = Math.max(byUser.reset, byIp.reset);
  const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: "Trop de requêtes. Veuillez patienter avant de réessayer.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(TX_RATE_LIMIT),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(reset),
      },
    }
  );
}

/**
 * Extrait l'IP du client depuis les headers (compatible Vercel / reverse proxy).
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}
