"use client";

/**
 * Configuration reseau Pi cote client.
 *
 * Le mode reseau (testnet | mainnet) est defini par l'admin dans
 * Admin -> Reglages -> Politique Monetaire et expose via /api/pi-network.
 *
 *  - testnet  -> sandbox: true   (sandbox.minepi.com, navigateurs externes)
 *  - mainnet  -> sandbox: false  (production, Pi Browser uniquement)
 *
 * Ce module recupere le flag une seule fois et le met en cache (module-level +
 * window.__PI_SANDBOX__) pour que TOUS les points d'initialisation du SDK Pi
 * (PiInitializer, usePiAuth, usePiPayment, lib/pi-sdk) utilisent la meme valeur.
 */

declare global {
  interface Window {
    __PI_SANDBOX__?: boolean;
  }
}

// Valeur par defaut : sandbox (testnet) tant que la config admin n'est pas chargee.
const DEFAULT_SANDBOX = true;

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

/** Lit la valeur sandbox deja resolue (sans declencher de fetch). */
export function getCachedPiSandbox(): boolean {
  if (typeof window !== "undefined" && typeof window.__PI_SANDBOX__ === "boolean") {
    return window.__PI_SANDBOX__;
  }
  return cached ?? DEFAULT_SANDBOX;
}

/**
 * Recupere (et met en cache) le flag sandbox depuis la config admin.
 * Idempotent : les appels concurrents partagent la meme requete.
 */
export async function getPiSandbox(): Promise<boolean> {
  if (typeof window === "undefined") return DEFAULT_SANDBOX;
  if (typeof window.__PI_SANDBOX__ === "boolean") return window.__PI_SANDBOX__;
  if (cached !== null) return cached;
  if (inflight) return inflight;

  inflight = fetch("/api/pi-network", { credentials: "include" })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const sandbox = data ? Boolean(data.sandbox) : DEFAULT_SANDBOX;
      cached = sandbox;
      window.__PI_SANDBOX__ = sandbox;
      console.log(
        `[PimPay] Mode reseau Pi: ${data?.network || "inconnu"} (sandbox=${sandbox})`
      );
      return sandbox;
    })
    .catch(() => {
      cached = DEFAULT_SANDBOX;
      window.__PI_SANDBOX__ = DEFAULT_SANDBOX;
      return DEFAULT_SANDBOX;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
