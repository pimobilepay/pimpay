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
