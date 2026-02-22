/**
 * PIMPAY CRYPTO VALIDATOR
 * Verrouille la destination pour eviter les pertes de fonds.
 * Couvre : EVM (0x), Stellar/Pi (G), Tron (T), XRP (r), BTC (bc1/1/3), SOL (Base58)
 */

import { CRYPTO_ASSETS } from "@/lib/crypto-config";

export interface CryptoRule {
  name: string;
  prefix: string;
  regex: RegExp;
  requiresMemo: boolean;
}

export const CRYPTO_RULES: Record<string, CryptoRule> = {
  // --- Stellar / Pi Network (G...) ---
  PI: {
    name: "Pi Network",
    prefix: "G",
    regex: /^G[A-Z2-7]{55}$/,
    requiresMemo: false,
  },
  XLM: {
    name: "Stellar",
    prefix: "G",
    regex: /^G[A-Z2-7]{55}$/,
    requiresMemo: true,
  },

  // --- EVM Group (0x...) : ETH, BNB, SDA, MATIC, USDC, DAI, BUSD ---
  SDA: {
    name: "Sidra Chain (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },
  ETH: {
    name: "Ethereum (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },
  BNB: {
    name: "BNB (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },
  MATIC: {
    name: "Polygon (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },
  USDC: {
    name: "USD Coin (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },
  DAI: {
    name: "Dai (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },
  BUSD: {
    name: "Binance USD (EVM)",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{40}$/,
    requiresMemo: false,
  },

  // --- Tron Group (T...) : TRX, USDT ---
  TRX: {
    name: "Tron (TRC20)",
    prefix: "T",
    regex: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    requiresMemo: false,
  },
  USDT: {
    name: "Tether (TRC20)",
    prefix: "T",
    regex: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    requiresMemo: false,
  },

  // --- XRP Ledger (r...) ---
  XRP: {
    name: "Ripple",
    prefix: "r",
    regex: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
    requiresMemo: true,
  },

  // --- Bitcoin (bc1/1/3) ---
  BTC: {
    name: "Bitcoin",
    prefix: "bc1/1/3",
    regex: /^(bc1[a-zA-HJ-NP-Z0-9]{25,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
    requiresMemo: false,
  },

  // --- Solana (Base58, 32-44 chars) ---
  SOL: {
    name: "Solana",
    prefix: "Base58",
    regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    requiresMemo: false,
  },
};

export function validateAddress(address: string, currency: string): { isValid: boolean; error?: string } {
  const upperCurrency = currency.toUpperCase();
  const rule = CRYPTO_RULES[upperCurrency];

  if (!rule) {
    // Fallback : verifier si le groupe est EVM via la config centralisee
    const assetConfig = CRYPTO_ASSETS[upperCurrency];
    if (assetConfig?.group === "EVM") {
      const evmRule = CRYPTO_RULES.ETH;
      if (!address || address.trim() === "") {
        return { isValid: false, error: "L'adresse est vide." };
      }
      if (!evmRule.regex.test(address.trim())) {
        return {
          isValid: false,
          error: `Format d'adresse EVM invalide. Elle doit commencer par '0x'.`,
        };
      }
      return { isValid: true };
    }
    return { isValid: true }; // Crypto inconnue, on laisse passer avec prudence
  }

  if (!address || address.trim() === "") {
    return { isValid: false, error: "L'adresse est vide." };
  }

  const cleanAddress = address.trim();

  if (!rule.regex.test(cleanAddress)) {
    return {
      isValid: false,
      error: `Format d'adresse ${rule.name} invalide. Elle doit commencer par '${rule.prefix}'.`,
    };
  }

  return { isValid: true };
}
