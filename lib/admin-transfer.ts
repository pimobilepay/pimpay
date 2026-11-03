/**
 * lib/admin-transfer.ts — Règles partagées du transfert externe administrateur.
 *
 * Fichier SANS dépendance serveur : importé à la fois par la route API
 * (app/api/admin/users/[id]/asset-transfer) et par le composant client
 * (AdminAssetTransfer.tsx) afin que l'UI et le serveur n'aient jamais deux
 * listes d'actifs ou deux formules de frais différentes.
 */

/**
 * Actifs réellement diffusables par le worker (app/api/worker/withdraw).
 * Tout autre actif échouerait au broadcast ("Broadcast non implémenté") APRÈS
 * le débit : on le refuse donc AVANT toute écriture en base.
 */
export const ADMIN_TRANSFER_ASSETS = {
  PI: { network: "Pi Network", family: "STELLAR" },
  DOGE: { network: "Dogecoin", family: "DOGE" },
  TRX: { network: "TRON", family: "TRON" },
  USDT: { network: "TRON (TRC20)", family: "TRON" },
} as const;

export type AdminTransferAsset = keyof typeof ADMIN_TRANSFER_ASSETS;

export function isAdminTransferAsset(code: string): code is AdminTransferAsset {
  return Object.prototype.hasOwnProperty.call(ADMIN_TRANSFER_ASSETS, code);
}

/**
 * Réserve de TRX à conserver sur l'adresse TRON de l'utilisateur pour payer les
 * frais RÉSEAU (bande passante / énergie), distincts des frais plateforme.
 * Le worker effectue 2 envois : le transfert, puis la collecte des frais.
 * Surchargeable par variables d'environnement.
 */
export function tronGasReserve(currency: "TRX" | "USDT"): number {
  const fromEnv = Number(
    currency === "TRX" ? process.env.TRON_MIN_GAS_TRX : process.env.TRON_USDT_MIN_GAS_TRX
  );
  if (Number.isFinite(fromEnv) && fromEnv >= 0) return fromEnv;
  return currency === "TRX" ? 2 : 10;
}

/** Arrondi à 8 décimales (précision des soldes) pour éviter les résidus flottants. */
export function round8(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}
