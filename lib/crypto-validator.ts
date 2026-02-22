/**
 * PIMPAY CRYPTO VALIDATOR
 * Verrouille la destination pour éviter les pertes de fonds.
 */

export const CRYPTO_RULES = {
  PI: {
    name: "Pi Network",
    prefix: "G",
    regex: /^G[A-Z2-7]{55}$/,
    requiresMemo: false,
  },
  SDA: {
    name: "Sidra Chain",
    prefix: "0x",
    regex: /^0x[a-fA-F0-9]{42}$/,
    requiresMemo: false,
  },
  XRP: {
    name: "Ripple",
    prefix: "r",
    regex: /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/,
    requiresMemo: true, // Souvent nécessaire vers les exchanges
  },
  XLM: {
    name: "Stellar",
    prefix: "G",
    regex: /^G[A-Z2-7]{55}$/,
    requiresMemo: true,
  },
  USDT: {
    name: "Tether (TRC20)",
    prefix: "T",
    regex: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
    requiresMemo: false,
  }
};

export function validateAddress(address: string, currency: string): { isValid: boolean; error?: string } {
  const rule = CRYPTO_RULES[currency as keyof typeof CRYPTO_RULES];
  
  if (!rule) {
    return { isValid: true }; // Si la crypto n'est pas encore bridée, on laisse passer avec prudence
  }

  if (!address || address.trim() === "") {
    return { isValid: false, error: "L'adresse est vide." };
  }

  const cleanAddress = address.trim();

  // Test du format (Regex)
  if (!rule.regex.test(cleanAddress)) {
    return { 
      isValid: false, 
      error: `Format d'adresse ${rule.name} invalide. Elle doit commencer par '${rule.prefix}'.` 
    };
  }

  return { isValid: true };
}
