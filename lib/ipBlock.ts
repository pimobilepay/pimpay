/**
 * lib/ipBlock.ts — Couche d'application de la "riposte" du journal de détection
 * d'intrusion (IDS).
 *
 * IMPORTANT — Cadre éthique / légal :
 * La "riposte" implémentée ici est une mesure de DÉFENSE ACTIVE uniquement.
 * Elle consiste à REFUSER le trafic entrant provenant d'une IP identifiée comme
 * malveillante (blocage / liste noire). Elle ne lance JAMAIS d'action offensive
 * sortante (pas de "hack-back", pas de scan, pas d'attaque) — ce qui serait
 * illégal dans la plupart des juridictions. On bloque, on ne contre-attaque pas.
 *
 * Pour rester performant, un petit cache mémoire (TTL court) évite d'interroger
 * la base à chaque requête. Le cache est volontairement court pour qu'un déblocage
 * admin soit pris en compte rapidement.
 */

import { prisma } from "@/lib/prisma";

type CacheEntry = { blocked: boolean; expiresAt: number };

const CACHE_TTL_MS = 15_000; // 15s — compromis fraîcheur / charge DB
const cache = new Map<string, CacheEntry>();

function normalizeIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  const first = ip.split(",")[0]?.trim();
  if (!first) return "unknown";
  // Normalise les IPv4 encapsulées en IPv6 (::ffff:1.2.3.4 → 1.2.3.4) afin que
  // la comparaison avec les IPv4 stockées en liste noire/blanche soit exacte.
  const lower = first.toLowerCase();
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(v4)) return v4;
  }
  return first;
}

/**
 * Vérifie si une IP est actuellement bloquée (active + non expirée).
 * Incrémente le compteur de "hits" lorsqu'une requête bloquée est rejetée.
 */
export async function isIpBlocked(rawIp: string | null | undefined): Promise<boolean> {
  const ip = normalizeIp(rawIp);
  if (ip === "unknown") return false;

  const now = Date.now();
  const cached = cache.get(ip);
  if (cached && cached.expiresAt > now) {
    return cached.blocked;
  }

  try {
    const record = await prisma.blockedIp.findUnique({ where: { ip } });
    const blocked =
      !!record &&
      record.active &&
      (!record.expiresAt || record.expiresAt.getTime() > now);

    cache.set(ip, { blocked, expiresAt: now + CACHE_TTL_MS });

    // Comptabilise la requête rejetée (best-effort, non bloquant)
    if (blocked && record) {
      prisma.blockedIp
        .update({ where: { id: record.id }, data: { hits: { increment: 1 } } })
        .catch(() => {});
    }

    return blocked;
  } catch {
    // En cas d'erreur DB, on ne bloque pas (fail-open) pour éviter de couper
    // tout le trafic légitime si la table n'existe pas encore.
    return false;
  }
}

/** Invalide l'entrée de cache pour une IP (après blocage / déblocage admin). */
export function invalidateIpCache(rawIp: string | null | undefined): void {
  cache.delete(normalizeIp(rawIp));
}

export { normalizeIp };
