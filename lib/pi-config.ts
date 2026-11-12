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

let cached: boolean | null = null;
let inflight: Promise<boolean> | null = null;

/** Lit la valeur sandbox deja resolue (sans declencher de fetch). */
export function getCachedPiSandbox(): boolean | null {
  if (typeof window !== "undefined" && typeof window.__PI_SANDBOX__ === "boolean") {
    return window.__PI_SANDBOX__;
  }
  return cached;
}

/** Recupere le reseau actif; une configuration absente ne doit jamais basculer en testnet. */
export async function getPiSandbox(): Promise<boolean> {
  if (typeof window === "undefined") throw new Error("Pi SDK indisponible cote serveur");
  if (inflight) return inflight;

  const previousNetwork = typeof window.__PI_SANDBOX__ === "boolean" ? window.__PI_SANDBOX__ : cached;
  inflight = fetch("/api/pi-network", { credentials: "include", cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Configuration Pi Network indisponible");
      const data = await response.json();
      if (data.ready !== true || !["testnet", "mainnet"].includes(data.network)) {
        throw new Error("Configuration Pi Network invalide");
      }
      const sandbox = data.network === "testnet";
      if (data.sandbox !== sandbox) throw new Error("Mode sandbox Pi incoherent avec le reseau actif");
      if (previousNetwork !== null && previousNetwork !== sandbox) {
        throw new Error("Le réseau Pi a changé. Rechargez la page avant de continuer.");
      }
      cached = sandbox;
      window.__PI_SANDBOX__ = sandbox;
      return sandbox;
    })
    .catch((error) => {
      cached = null;
      throw error;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}
