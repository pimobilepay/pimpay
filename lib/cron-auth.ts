/**
 * lib/cron-auth.ts — Vérification centralisée pour toutes les routes CRON
 *
 * [FIX V21] — Validation du CRON_SECRET centralisée.
 *
 * Pour la rotation du secret :
 *   1. Générer un nouveau secret : openssl rand -hex 32
 *   2. Ajouter CRON_SECRET_NEXT=<nouveau> dans les variables d'environnement Vercel
 *   3. Mettre à jour le secret dans Vercel Cron Settings
 *   4. Attendre 1 cycle de cron (max 24h)
 *   5. Renommer CRON_SECRET_NEXT → CRON_SECRET, supprimer l'ancien
 *
 * Ce module accepte les deux secrets pendant la période de transition.
 */

import { NextRequest } from "next/server";

/**
 * Vérifie que la requête provient d'un CRON Vercel autorisé.
 * Accepte CRON_SECRET et CRON_SECRET_NEXT (rotation en cours).
 * Retourne true si autorisé, false sinon.
 */
export function verifyCronSecret(req: NextRequest | Request): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const provided = authHeader.replace("Bearer ", "");
  const current  = process.env.CRON_SECRET;
  const next     = process.env.CRON_SECRET_NEXT; // Pendant la rotation

  if (!current) {
    console.error("[CRON_AUTH] CRON_SECRET non défini — route CRON bloquée");
    return false;
  }

  return provided === current || (!!next && provided === next);
}

/**
 * Log d'exécution standardisé pour tous les CRONs.
 */
export function logCronStart(name: string, req: NextRequest | Request): void {
  const ip = (req.headers.get("x-forwarded-for") || "vercel-cron").split(",")[0];
  console.log(`[CRON:${name}] Démarrage — ${new Date().toISOString()} — IP: ${ip}`);
}

export function logCronEnd(name: string, stats: Record<string, number | string>): void {
  console.log(`[CRON:${name}] Terminé — ${new Date().toISOString()} —`, JSON.stringify(stats));
}
