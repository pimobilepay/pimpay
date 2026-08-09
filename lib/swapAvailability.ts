/**
 * DISPONIBILITE DES ACTIFS AU SWAP
 * --------------------------------
 * Source unique de verite : SystemConfig.swapPiEnabled / swapSdaEnabled,
 * pilotes depuis Admin > Reglages > Apercu.
 *
 * Quand un actif est suspendu, le swap VERS cet actif est refuse cote serveur
 * et le client affiche "Bientot disponible".
 */

import { prisma } from "@/lib/prisma";

/** Actifs dont la disponibilite est pilotable par l'admin. */
export const TOGGLEABLE_SWAP_ASSETS = ["PI", "SDA"] as const;

export type ToggleableSwapAsset = (typeof TOGGLEABLE_SWAP_ASSETS)[number];

export interface SwapAvailability {
  /** Swap vers PI autorise */
  PI: boolean;
  /** Swap vers SDA autorise */
  SDA: boolean;
}

export const SWAP_ASSET_LABELS: Record<ToggleableSwapAsset, string> = {
  PI: "Pi Network (PI)",
  SDA: "Sidra Chain (SDA)",
};

/** Par defaut tout est ouvert : aucune regression si la BDD est injoignable. */
const DEFAULT_AVAILABILITY: SwapAvailability = { PI: true, SDA: true };

export async function getSwapAvailability(): Promise<SwapAvailability> {
  if (!process.env.DATABASE_URL) return DEFAULT_AVAILABILITY;
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: "GLOBAL_CONFIG" },
      select: { swapPiEnabled: true, swapSdaEnabled: true },
    });
    if (!config) return DEFAULT_AVAILABILITY;
    return {
      PI: config.swapPiEnabled !== false,
      SDA: config.swapSdaEnabled !== false,
    };
  } catch {
    return DEFAULT_AVAILABILITY;
  }
}

/**
 * Retourne le libelle de l'actif si le swap vers `currency` est suspendu,
 * sinon null. Utilise par les routes de swap pour bloquer la transaction.
 */
export async function getBlockedSwapTarget(currency: string): Promise<string | null> {
  const target = (currency || "").toUpperCase();
  if (!TOGGLEABLE_SWAP_ASSETS.includes(target as ToggleableSwapAsset)) return null;
  const availability = await getSwapAvailability();
  if (availability[target as ToggleableSwapAsset]) return null;
  return SWAP_ASSET_LABELS[target as ToggleableSwapAsset];
}

/**
 * Retourne le libelle de l'actif si `currency` (PI ou SDA) est suspendu,
 * QUEL QUE SOIT LE SENS de l'operation (source OU destination).
 *
 * Avant ce correctif, seul le sens "vers PI/SDA" etait bloque : un actif
 * suspendu pouvait encore etre VENDU (swap depuis PI/SDA vers autre chose).
 * Desormais, suspendre PI ou SDA depuis Admin > Reglages > Apercu gele
 * totalement l'actif au swap, dans les deux sens.
 */
export async function getBlockedSwapAsset(currency: string): Promise<string | null> {
  const asset = (currency || "").toUpperCase();
  if (!TOGGLEABLE_SWAP_ASSETS.includes(asset as ToggleableSwapAsset)) return null;
  const availability = await getSwapAvailability();
  if (availability[asset as ToggleableSwapAsset]) return null;
  return SWAP_ASSET_LABELS[asset as ToggleableSwapAsset];
}

/**
 * Verifie source ET destination d'un swap en un seul appel (une seule
 * lecture de SystemConfig). Retourne le libelle du premier actif bloque
 * rencontre (source d'abord), sinon null.
 */
export async function getBlockedSwapPair(
  sourceCurrency: string,
  targetCurrency: string
): Promise<string | null> {
  const source = (sourceCurrency || "").toUpperCase();
  const target = (targetCurrency || "").toUpperCase();
  const sourceIsToggleable = TOGGLEABLE_SWAP_ASSETS.includes(source as ToggleableSwapAsset);
  const targetIsToggleable = TOGGLEABLE_SWAP_ASSETS.includes(target as ToggleableSwapAsset);
  if (!sourceIsToggleable && !targetIsToggleable) return null;

  const availability = await getSwapAvailability();
  if (sourceIsToggleable && !availability[source as ToggleableSwapAsset]) {
    return SWAP_ASSET_LABELS[source as ToggleableSwapAsset];
  }
  if (targetIsToggleable && !availability[target as ToggleableSwapAsset]) {
    return SWAP_ASSET_LABELS[target as ToggleableSwapAsset];
  }
  return null;
}
