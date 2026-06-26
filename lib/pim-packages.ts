/**
 * Source de verite SERVEUR pour la tarification des PIM Coins.
 *
 * Ces valeurs ne doivent JAMAIS etre derivees d'un input client : c'est ici
 * (et uniquement ici) que l'on decide combien de PIM crediter pour un montant
 * de Pi reellement paye. Le hook client (hooks/usePimCoinPurchase.ts) doit
 * rester aligne sur ces packages, mais en cas de divergence c'est cette table
 * qui fait foi.
 */

export interface PimPackageDef {
  id: string;
  pimCoins: number; // total credite (base + bonus)
  piCost: number; // cout en Pi
  bonus: number;
}

export const PIM_PACKAGES: PimPackageDef[] = [
  { id: "pim_100", pimCoins: 100, piCost: 1, bonus: 0 },
  { id: "pim_550", pimCoins: 550, piCost: 5, bonus: 50 },
  { id: "pim_1200", pimCoins: 1200, piCost: 10, bonus: 200 },
  { id: "pim_2600", pimCoins: 2600, piCost: 20, bonus: 600 },
  { id: "pim_7000", pimCoins: 7000, piCost: 50, bonus: 2000 },
];

/** Taux de base pour les achats personnalises : 100 PIM pour 1 Pi. */
export const PIM_BASE_RATE = 100;

/** Tolerance sur le montant Pi (arrondis / frais reseau). */
const PI_AMOUNT_TOLERANCE = 0.01;

export interface ResolvedPim {
  ok: boolean;
  pimCoins: number;
  bonus: number;
  reason?: string;
}

/**
 * Determine combien de PIM crediter, a partir du montant de Pi REELLEMENT
 * verifie par Pi Network (et non d'une valeur fournie par le client).
 *
 * - Pour un package connu : on exige que le montant paye corresponde au piCost
 *   du package, puis on credite le pimCoins officiel du package.
 * - Pour un achat custom : on applique le taux de base au montant verifie.
 */
export function resolvePimCoins(
  productId: string | undefined,
  verifiedPiAmount: number
): ResolvedPim {
  if (!Number.isFinite(verifiedPiAmount) || verifiedPiAmount <= 0) {
    return { ok: false, pimCoins: 0, bonus: 0, reason: "Montant Pi invalide" };
  }

  if (productId && productId !== "custom") {
    const pkg = PIM_PACKAGES.find((p) => p.id === productId);
    if (!pkg) {
      return { ok: false, pimCoins: 0, bonus: 0, reason: "Package inconnu" };
    }
    if (Math.abs(verifiedPiAmount - pkg.piCost) > PI_AMOUNT_TOLERANCE) {
      return {
        ok: false,
        pimCoins: 0,
        bonus: 0,
        reason: `Montant paye (${verifiedPiAmount} Pi) incoherent avec le package (${pkg.piCost} Pi)`,
      };
    }
    return { ok: true, pimCoins: pkg.pimCoins, bonus: pkg.bonus };
  }

  // Achat personnalise : credit strictement proportionnel au montant verifie.
  const pimCoins = Math.floor(verifiedPiAmount * PIM_BASE_RATE);
  return { ok: true, pimCoins, bonus: 0 };
}
