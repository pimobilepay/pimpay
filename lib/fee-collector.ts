/**
 * FEE COLLECTOR — PimPay
 *
 * Centralise TOUS les frais de la plateforme vers une adresse centrale,
 * choisie selon le RÉSEAU de la devise :
 *
 *   ┌─────────────────────┬──────────────────────────────────────────────┐
 *   │ Réseau              │ Adresse centrale (variable d'environnement)    │
 *   ├─────────────────────┼──────────────────────────────────────────────┤
 *   │ TRON  (TRX, USDT)   │ TRON_OPERATOR_ADDRESS                          │
 *   │ STELLAR (XLM, PI)   │ PI_WALLET_PUBLIC_KEY / PI_OPERATOR_ADDRESS     │
 *   │ EVM / SIDRA (reste) │ SDA_OPERATOR_ADDRESS                           │
 *   │   → BNB, ETH, USDC, │                                                │
 *   │     DAI, BUSD, SDA… │                                                │
 *   └─────────────────────┴──────────────────────────────────────────────┘
 *
 * L'envoi on-chain réel n'est possible que pour les devises EVM (via ethers).
 * Pour TRON et Stellar, le routage retourne l'adresse centrale correcte afin
 * que la comptabilité et les vues admin restent cohérentes (collecte gérée
 * par les opérateurs dédiés TRON / Pi).
 */

import { ethers } from "ethers";

// ─── Familles de réseaux ──────────────────────────────────────────────────────
export type FeeNetwork = "TRON" | "STELLAR" | "EVM";

// ─── Adresses centrales par réseau ────────────────────────────────────────────
/** Adresse centrale TRON (TRX + USDT TRC20) */
export const TRON_FEE_ADDRESS =
  process.env.TRON_OPERATOR_ADDRESS || "";

/** Adresse centrale Stellar (XLM + Pi Network) */
export const STELLAR_FEE_ADDRESS =
  process.env.PI_WALLET_PUBLIC_KEY ||
  process.env.PI_OPERATOR_ADDRESS ||
  "GCD7XUKTQPYDNJL2XJDIHNDUEVRXY7VOGLBD75WAE2DAAGPXP2GAJFBB";

/** Adresse centrale EVM / Sidra Chain (BNB, ETH, USDC, DAI, BUSD, SDA, etc.) */
export const EVM_FEE_ADDRESS =
  process.env.SDA_OPERATOR_ADDRESS ||
  "0xe72cC1d1698497440D06B1256216CEEad07Ea3DB";

// ─── Mapping devise → réseau de collecte ──────────────────────────────────────
const CURRENCY_NETWORK: Record<string, FeeNetwork> = {
  // TRON
  TRX: "TRON",
  USDT: "TRON",
  // STELLAR
  XLM: "STELLAR",
  PI: "STELLAR",
  // EVM / Sidra (par défaut pour tout le reste)
  SDA: "EVM",
  SIDRA: "EVM",
  BNB: "EVM",
  ETH: "EVM",
  USDC: "EVM",
  DAI: "EVM",
  BUSD: "EVM",
};

/**
 * Retourne le réseau de collecte pour une devise donnée.
 * Toute devise inconnue est routée par défaut vers l'EVM / Sidra Chain.
 */
export function getFeeNetwork(currency: string): FeeNetwork {
  return CURRENCY_NETWORK[currency.toUpperCase()] || "EVM";
}

/**
 * Retourne l'adresse centrale de collecte des frais pour une devise donnée,
 * selon son réseau. C'est LE point d'entrée unique pour savoir où vont les frais.
 */
export function getCentralFeeAddress(currency: string): string {
  switch (getFeeNetwork(currency)) {
    case "TRON":
      return TRON_FEE_ADDRESS;
    case "STELLAR":
      return STELLAR_FEE_ADDRESS;
    case "EVM":
    default:
      return EVM_FEE_ADDRESS;
  }
}

/** Toutes les adresses centrales regroupées par réseau (pour l'affichage admin). */
export function getAllCentralFeeAddresses() {
  return {
    TRON: { address: TRON_FEE_ADDRESS, currencies: ["TRX", "USDT"] },
    STELLAR: { address: STELLAR_FEE_ADDRESS, currencies: ["XLM", "PI"] },
    EVM: {
      address: EVM_FEE_ADDRESS,
      currencies: ["SDA", "BNB", "ETH", "USDC", "DAI", "BUSD"],
    },
  };
}

// ─── Compat : adresse EVM historique + devises envoyées on-chain via ethers ────
/** @deprecated Utiliser getCentralFeeAddress(currency). Conservé pour compat. */
export const FEE_COLLECTOR_ADDRESS = EVM_FEE_ADDRESS;

/** Devises pour lesquelles l'envoi on-chain est réalisé via ethers (réseau EVM). */
export const FEE_COLLECTED_CURRENCIES = [
  "BNB",
  "ETH",
  "SDA",
  "SIDRA",
  "USDC",
  "DAI",
  "BUSD",
] as const;
export type FeeCollectedCurrency = (typeof FEE_COLLECTED_CURRENCIES)[number];

// ─── RPC par devise EVM ───────────────────────────────────────────────────────
const RPC_URLS: Record<string, string> = {
  SDA: "https://node.sidrachain.com",
  SIDRA: "https://node.sidrachain.com",
  BNB: "https://bsc-dataseed1.binance.org",
  ETH: "https://cloudflare-eth.com",
  // Stablecoins ERC-20 — collecte du token nécessite l'adresse du contrat,
  // ces RPC servent pour le solde natif de gas.
  USDC: "https://cloudflare-eth.com",
  DAI: "https://cloudflare-eth.com",
  BUSD: "https://bsc-dataseed1.binance.org",
};

export interface FeeCollectResult {
  success: boolean;
  currency: string;
  network: FeeNetwork;
  centralAddress: string;
  feeAmount: number;
  txHash?: string;
  error?: string;
  skipped?: boolean;
  skipReason?: string;
}

/**
 * Envoie les frais on-chain vers l'adresse centrale correspondant au réseau
 * de la devise.
 *
 * - EVM : envoi natif réel via ethers vers EVM_FEE_ADDRESS.
 * - TRON / STELLAR : routage comptable (retourne l'adresse centrale) — l'envoi
 *   on-chain réel est géré par les opérateurs TRON / Pi dédiés.
 *
 * @param currency  La devise du frais
 * @param feeAmount Le montant du frais (unité native)
 * @param fromPrivateKey  Clé privée EVM (décryptée, préfixée 0x) — requise pour EVM
 */
export async function collectFeeOnChain(
  currency: string,
  feeAmount: number,
  fromPrivateKey: string
): Promise<FeeCollectResult> {
  const curr = currency.toUpperCase();
  const network = getFeeNetwork(curr);
  const centralAddress = getCentralFeeAddress(curr);

  // TRON & STELLAR : routage comptable uniquement (collecte via opérateurs dédiés)
  if (network !== "EVM") {
    return {
      success: true,
      currency: curr,
      network,
      centralAddress,
      feeAmount,
      skipped: true,
      skipReason: `${curr} routé vers l'adresse centrale ${network} (${centralAddress}). Collecte on-chain gérée par l'opérateur ${network}.`,
    };
  }

  // Vérifier le montant minimum (évite les gas > fee)
  const MIN_FEE: Record<string, number> = {
    BNB: 0.00005,
    ETH: 0.00001,
    SDA: 0.001,
    SIDRA: 0.001,
    USDC: 0.01,
    DAI: 0.01,
    BUSD: 0.01,
  };
  if (feeAmount < (MIN_FEE[curr] ?? 0.00001)) {
    return {
      success: true,
      currency: curr,
      network,
      centralAddress,
      feeAmount,
      skipped: true,
      skipReason: `Montant trop faible pour couvrir le gas (${feeAmount} ${curr})`,
    };
  }

  const rpcUrl = RPC_URLS[curr];
  if (!rpcUrl) {
    return {
      success: false,
      currency: curr,
      network,
      centralAddress,
      feeAmount,
      error: `Aucun RPC configuré pour ${curr}`,
    };
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const senderWallet = new ethers.Wallet(fromPrivateKey, provider);

    // Estimer le gas
    const gasLimit = BigInt(21000);
    let gasPrice =
      curr === "BNB" || curr === "BUSD"
        ? ethers.parseUnits("5", "gwei")
        : ethers.parseUnits("1", "gwei");

    try {
      const feeData = await provider.getFeeData();
      if (feeData.gasPrice) gasPrice = feeData.gasPrice;
    } catch {
      // Garder les valeurs par défaut si le RPC ne répond pas
    }

    const gasCost = gasLimit * gasPrice;
    const feeInWei = ethers.parseEther(
      feeAmount.toFixed(18).replace(/\.?0+$/, "")
    );

    // S'assurer que le frais couvre le gas
    if (feeInWei <= gasCost) {
      return {
        success: true,
        currency: curr,
        network,
        centralAddress,
        feeAmount,
        skipped: true,
        skipReason: `Frais (${feeAmount} ${curr}) inférieur au gas estimé`,
      };
    }

    // Vérifier que le solde du wallet source est suffisant
    const senderBalance = await provider.getBalance(senderWallet.address);
    if (senderBalance < feeInWei) {
      return {
        success: false,
        currency: curr,
        network,
        centralAddress,
        feeAmount,
        error: `Solde insuffisant pour envoyer ${feeAmount} ${curr} (disponible: ${ethers.formatEther(senderBalance)})`,
      };
    }

    // Envoyer les frais vers l'adresse centrale EVM
    const tx = await senderWallet.sendTransaction({
      to: centralAddress,
      value: feeInWei,
      gasLimit,
      gasPrice,
    });

    // Anti double-envoi : la tx est diffusée dès sendTransaction(). On capture
    // le hash immédiatement et on traite un échec de confirmation comme un
    // succès (avec hash), sinon un retry renverrait les frais on-chain en double.
    let txHash = tx.hash;
    try {
      const receipt = await tx.wait();
      txHash = receipt?.hash || tx.hash;
    } catch (waitErr: any) {
      console.warn(
        `[FEE_COLLECTOR] ${curr} diffusée mais confirmation non lue (${waitErr?.message}). Hash conservé: ${txHash}`
      );
    }

    console.log(
      `[FEE_COLLECTOR] ✅ ${feeAmount} ${curr} → ${centralAddress} (${network}) | txHash: ${txHash}`
    );

    return {
      success: true,
      currency: curr,
      network,
      centralAddress,
      feeAmount,
      txHash,
    };
  } catch (err: any) {
    console.error(`[FEE_COLLECTOR] ❌ Erreur ${curr}:`, err.message);
    return {
      success: false,
      currency: curr,
      network,
      centralAddress,
      feeAmount,
      error: err.message,
    };
  }
}

/**
 * Collecte les frais depuis le wallet opérateur SDA (SIDRA_OPERATOR_PRIVATE_KEY).
 * Utilisé pour les frais générés par les retraits SDA signés par l'opérateur.
 */
export async function collectSdaOperatorFee(
  feeAmount: number
): Promise<FeeCollectResult> {
  const key = process.env.SIDRA_OPERATOR_PRIVATE_KEY;
  if (!key) {
    return {
      success: true,
      currency: "SDA",
      network: "EVM",
      centralAddress: EVM_FEE_ADDRESS,
      feeAmount,
      skipped: true,
      skipReason: "SIDRA_OPERATOR_PRIVATE_KEY non configuré",
    };
  }

  let privateKey = key.trim();
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;
  if (!/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    return {
      success: false,
      currency: "SDA",
      network: "EVM",
      centralAddress: EVM_FEE_ADDRESS,
      feeAmount,
      error: "Format SIDRA_OPERATOR_PRIVATE_KEY invalide",
    };
  }

  return collectFeeOnChain("SDA", feeAmount, privateKey);
}
