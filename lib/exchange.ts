/**
 * CONFIGURATION DU CONSENSUS PI & TAUX FIAT
 */

// Correction de l'erreur de build : Exportation de PI_CONSENSUS_RATE attendu par l'API Transfer
export const PI_CONSENSUS_RATE = 314159.00; 
export const PI_CONSENSUS_USD = PI_CONSENSUS_RATE;

export const FIAT_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.91,
  XAF: 605.00,
  NGN: 1450.00,
  CNY: 7.24,
  VND: 25450.00,
  CDF: 2309.00,
};

export const CURRENCIES = {
  PI: "PI",
  USD: "USD",
  EUR: "EUR",
  XAF: "XAF",
  NGN: "NGN",
  CNY: "CNY",
  VND: "VND",
  CDF: "CDF",
} as const;

/**
 * Calcule la conversion avec une commission de plateforme (ex: 0.1%)
 */
export const calculateExchangeWithFee = (amountInPi: number, targetCurrency: string) => {
  const feePercent = 0.001; // 0.1% de frais
  const rate = FIAT_RATES[targetCurrency] || 1;
  
  const rawValue = amountInPi * PI_CONSENSUS_USD * rate;
  const fee = rawValue * feePercent;
  
  return {
    subtotal: rawValue,
    fee: fee,
    total: rawValue - fee,
    rateUsed: rate
  };
};

/**
 * Convertit un montant Fiat vers Pi (Utile pour les retraits ou paiements)
 */
export const convertFiatToPi = (amountInFiat: number, fromCurrency: string): number => {
  const rate = FIAT_RATES[fromCurrency] || 1;
  if (amountInFiat <= 0) return 0;
  return amountInFiat / (PI_CONSENSUS_USD * rate);
};

/**
 * Formate le montant selon la locale et la devise
 */
export const formatLocalCurrency = (amount: number, currency: string) => {
  const locales: Record<string, string> = {
    USD: 'en-US',
    EUR: 'de-DE',
    XAF: 'fr-CM',
    NGN: 'en-NG',
    CNY: 'zh-CN',
    VND: 'vi-VN',
    CDF: 'fr-CD',
  };

  try {
    const formatter = new Intl.NumberFormat(locales[currency] || 'en-US', {
      style: 'currency',
      currency: currency === 'PI' ? 'USD' : currency,
      maximumFractionDigits: currency === 'PI' ? 4 : 2,
    });

    let formatted = formatter.format(amount);

    // Si c'est du Pi, on remplace le symbole monétaire par π
    if (currency === 'PI') {
      return formatted.replace(/[A-Z$]+/g, 'π').trim();
    }

    return formatted;
  } catch (error) {
    return `${amount.toFixed(2)} ${currency}`;
  }
};
