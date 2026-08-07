// lib/geniuspay-env.ts
// -----------------------------------------------------------------------------
// Bascule Sandbox <-> Production de GeniusPay (Mobile Money) SANS redéploiement.
//
// Principe :
//   - La valeur pilotée par l'admin est persistée dans SystemConfig.geniuspayEnv.
//   - Elle est projetée dans `process.env.GENIUSPAY_ENV`, qui reste la source de
//     vérité lue par `lib/geniuspay.ts` (getGeniusPayEnv / resolveEnvVar).
//   - Chaque worker serverless froid s'aligne via `hydrateGeniusPayEnv()`,
//     appelée automatiquement avant tout appel HTTP à GeniusPay.
//
// Les CLÉS restent exclusivement dans les variables d'environnement du projet :
//   GENIUSPAY_API_KEY_SANDBOX     / GENIUSPAY_API_KEY_LIVE
//   GENIUSPAY_API_SECRET_SANDBOX  / GENIUSPAY_API_SECRET_LIVE
//   GENIUSPAY_WEBHOOK_SECRET_SANDBOX / GENIUSPAY_WEBHOOK_SECRET_LIVE
//   GENIUSPAY_WALLET_ID_SANDBOX   / GENIUSPAY_WALLET_ID_LIVE
// (repli automatique sur les variables génériques sans suffixe)
// -----------------------------------------------------------------------------

import { prisma } from "./prisma";
import { normalizeGeniusPayEnv, type GeniusPayEnv } from "./geniuspay";

export const GENIUSPAY_CONFIG_KEY = "GLOBAL_CONFIG";

/** Durée de vie du cache mémoire par worker (ms). */
const TTL_MS = 15_000;

let cachedAt = 0;
let inFlight: Promise<GeniusPayEnv> | null = null;

/** Lit l'environnement piloté par l'admin en base (sans cache). */
export async function readGeniusPayEnvFromDb(): Promise<GeniusPayEnv | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const cfg = await prisma.systemConfig.findUnique({
      where: { id: GENIUSPAY_CONFIG_KEY },
      select: { geniuspayEnv: true } as any,
    });
    const val = (cfg as any)?.geniuspayEnv;
    return val ? normalizeGeniusPayEnv(val) : null;
  } catch {
    // Colonne absente (migration non appliquée) -> on garde la variable d'env.
    return null;
  }
}

/**
 * Aligne `process.env.GENIUSPAY_ENV` sur la valeur choisie par l'admin.
 * Résultat mis en cache 15 s par worker pour ne pas taper la base à chaque appel.
 */
export async function hydrateGeniusPayEnv(
  force = false
): Promise<GeniusPayEnv> {
  const now = Date.now();
  if (!force && now - cachedAt < TTL_MS) {
    return normalizeGeniusPayEnv(process.env.GENIUSPAY_ENV);
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    const dbEnv = await readGeniusPayEnvFromDb();
    if (dbEnv) process.env.GENIUSPAY_ENV = dbEnv;
    cachedAt = Date.now();
    inFlight = null;
    return normalizeGeniusPayEnv(process.env.GENIUSPAY_ENV);
  })();

  return inFlight;
}

/** Persiste le nouvel environnement et l'applique immédiatement. */
export async function setGeniusPayEnv(
  next: GeniusPayEnv
): Promise<GeniusPayEnv> {
  await prisma.systemConfig.upsert({
    where: { id: GENIUSPAY_CONFIG_KEY },
    update: { geniuspayEnv: next } as any,
    create: { id: GENIUSPAY_CONFIG_KEY, geniuspayEnv: next } as any,
  });
  process.env.GENIUSPAY_ENV = next;
  cachedAt = Date.now();
  return next;
}
