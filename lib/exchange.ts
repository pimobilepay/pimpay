/**
 * CONFIGURATION DU CONSENSUS PI & TAUX DE CHANGE PIMPAY
 * 
 * Supporte : crypto natives (PI, SDA), major cryptos, stablecoins et devises fiat.
 * Tous les prix crypto sont en USD. Les taux fiat sont "combien de X pour 1 USD".
 */

/* ------------------------------------------------------------------ */
/*  CONSTANTES                                                         */
/* ------------------------------------------------------------------ */

export const PI_CONSENSUS_RATE = 314159.0;
export const PI_CONSENSUS_USD = PI_CONSENSUS_RATE;

/** Liste exhaustive des IDs crypto reconnus par PimPay */
export const CRYPTO_IDS = [
  "PI", "SDA",
  "BTC", "ETH", "BNB", "SOL", "XRP", "XLM",
  "TRX", "ADA", "DOGE", "TON",
  "USDT", "USDC", "DAI", "BUSD",
] as const;

export type CryptoId = (typeof CRYPTO_IDS)[number];

/** Prix crypto par defaut (en USD) - utilises comme fallback */
export const DEFAULT_CRYPTO_PRICES: Record<string, number> = {
  PI: PI_CONSENSUS_RATE,
  SDA: 1.2,
  BTC: 95000,
  ETH: 3200,
  BNB: 600,
  SOL: 180,
  XRP: 2.5,
  XLM: 0.4,
  TRX: 0.12,
  ADA: 0.65,
  DOGE: 0.15,
  TON: 5.5,
  USDT: 1,
  USDC: 1,
  DAI: 1,
  BUSD: 1,
};

/** Taux fiat par defaut (combien de X pour 1 USD) - MIS A JOUR AUTOMATIQUEMENT */
export const FIAT_RATES: Record<string, number> = {
  // Base
  USD: 1,
  // Europe
  EUR: 0.92,
  GBP: 0.79,
  CHF: 0.88,
  PLN: 4.0,
  SEK: 10.5,
  NOK: 10.8,
  DKK: 6.9,
  CZK: 23.5,
  HUF: 365,
  RON: 4.6,
  BGN: 1.8,
  TRY: 32,
  RUB: 92,
  UAH: 41,
  // Africa
  XAF: 603,
  XOF: 603,
  NGN: 1580,
  GHS: 15.5,
  KES: 129,
  ZAR: 18.5,
  EGP: 49,
  MAD: 10,
  TND: 3.12,
  CDF: 2800,
  AOA: 850,
  GNF: 8600,
  UGX: 3700,
  TZS: 2560,
  RWF: 1280,
  ETB: 57,
  MGA: 4500,
  ZMW: 26,
  MZN: 64,
  // Americas
  CAD: 1.36,
  MXN: 17.2,
  BRL: 4.95,
  ARS: 870,
  CLP: 930,
  COP: 3950,
  PEN: 3.72,
  HTG: 132,
  DOP: 59,
  JMD: 156,
  // Asia & Oceania
  CNY: 7.24,
  JPY: 154,
  INR: 83.5,
  KRW: 1340,
  VND: 25450,
  THB: 36,
  IDR: 15800,
  PHP: 57,
  MYR: 4.7,
  SGD: 1.35,
  HKD: 7.82,
  PKR: 280,
  BDT: 110,
  AED: 3.67,
  SAR: 3.75,
  AUD: 1.53,
  NZD: 1.65,
};

// Cache for live rates
let liveRatesCache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch live exchange rates from API
 */
export async function fetchLiveRates(): Promise<Record<string, number>> {
  const now = Date.now();
  
  // Return cached rates if still valid
  if (liveRatesCache && now - liveRatesCache.timestamp < CACHE_TTL) {
    return liveRatesCache.rates;
  }
  
  try {
    const response = await fetch('/api/exchange-rates');
    if (!response.ok) throw new Error('Failed to fetch rates');
    
    const data = await response.json();
    if (data.success && data.rates) {
      liveRatesCache = { rates: data.rates, timestamp: now };
      return data.rates;
    }
    throw new Error('Invalid response');
  } catch (error) {
    console.error('Failed to fetch live rates:', error);
    return FIAT_RATES; // Fallback to static rates
  }
}

/**
 * Get the current rate for a currency (uses cached rates if available)
 */
export function getRate(currency: string): number {
  const upperCurrency = currency.toUpperCase();
  if (liveRatesCache?.rates[upperCurrency] !== undefined) {
    return liveRatesCache.rates[upperCurrency];
  }
  return FIAT_RATES[upperCurrency] || 1;
}

/** Toutes les devises reconnues */
export const CURRENCIES = {
  // Crypto
  PI: "PI",
  SDA: "SDA",
  BTC: "BTC",
  ETH: "ETH",
  BNB: "BNB",
  SOL: "SOL",
  XRP: "XRP",
  XLM: "XLM",
  TRX: "TRX",
  ADA: "ADA",
  DOGE: "DOGE",
  TON: "TON",
  USDT: "USDT",
  USDC: "USDC",
  DAI: "DAI",
  BUSD: "BUSD",
  // Fiat
  USD: "USD",
  EUR: "EUR",
  XAF: "XAF",
  XOF: "XOF",
  CDF: "CDF",
  NGN: "NGN",
  AED: "AED",
  CNY: "CNY",
  VND: "VND",
} as const;

/* ------------------------------------------------------------------ */
/*  HELPERS                                                            */
/* ------------------------------------------------------------------ */

/** Verifie si un ID est une crypto */
export function isCrypto(id: string): boolean {
  return (CRYPTO_IDS as readonly string[]).includes(id.toUpperCase());
}

/**
 * Convertit un montant en sa valeur USD equivalente.
 * - Crypto : montant * prixUSD
 * - Fiat   : montant / tauxFiat  (car taux = combien de fiat par 1 USD)
 */
export function toUsd(
  assetId: string,
  amount: number,
  prices: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES }
): number {
  const id = assetId.toUpperCase();
  if (isCrypto(id)) {
    return amount * (prices[id] || 0);
  }
  return amount / (prices[id] || 1);
}

/**
 * Convertit une valeur USD vers un montant dans l'actif cible.
 * - Crypto : usdValue / prixUSD
 * - Fiat   : usdValue * tauxFiat
 */
export function fromUsd(
  assetId: string,
  usdValue: number,
  prices: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES }
): number {
  const id = assetId.toUpperCase();
  if (isCrypto(id)) {
    return usdValue / (prices[id] || 1);
  }
  return usdValue * (prices[id] || 1);
}

/**
 * Conversion directe entre deux actifs quelconques (crypto <-> crypto, crypto <-> fiat, fiat <-> fiat).
 * Utilise USD comme pivot.
 */
export function convert(
  fromId: string,
  toId: string,
  amount: number,
  prices: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES }
): number {
  if (amount <= 0) return 0;
  const usdValue = toUsd(fromId, amount, prices);
  return fromUsd(toId, usdValue, prices);
}

/* ------------------------------------------------------------------ */
/*  CALCULS AVEC FRAIS                                                 */
/* ------------------------------------------------------------------ */

/**
 * Calcule la conversion PI -> Fiat avec une commission de plateforme (0.1% par defaut)
 */
export const calculateExchangeWithFee = (
  amountInPi: number,
  targetCurrency: string,
  feePercent = 0.001
) => {
  const rate = FIAT_RATES[targetCurrency] || 1;
  const rawValue = amountInPi * PI_CONSENSUS_USD * rate;
  const fee = rawValue * feePercent;

  return {
    subtotal: rawValue,
    fee,
    total: rawValue - fee,
    rateUsed: rate,
  };
};

/**
 * Calcule la conversion generique entre deux actifs avec frais.
 */
export const calculateSwapWithFee = (
  amount: number,
  fromId: string,
  toId: string,
  feePercent = 0.001,
  prices: Record<string, number> = { ...DEFAULT_CRYPTO_PRICES, ...FIAT_RATES }
) => {
  const rawResult = convert(fromId, toId, amount, prices);
  const fee = rawResult * feePercent;

  return {
    subtotal: rawResult,
    fee,
    total: rawResult - fee,
    rate: amount > 0 ? rawResult / amount : 0,
  };
};

/**
 * Convertit un montant Fiat vers Pi
 */
export const convertFiatToPi = (amountInFiat: number, fromCurrency: string): number => {
  const rate = FIAT_RATES[fromCurrency] || 1;
  if (amountInFiat <= 0) return 0;
  return amountInFiat / (PI_CONSENSUS_USD * rate);
};

/* ------------------------------------------------------------------ */
/*  FORMATAGE                                                          */
/* ------------------------------------------------------------------ */

const LOCALES: Record<string, string> = {
  USD: "en-US",
  EUR: "de-DE",
  XAF: "fr-CM",
  XOF: "fr-SN",
  NGN: "en-NG",
  CNY: "zh-CN",
  VND: "vi-VN",
  CDF: "fr-CD",
  AED: "ar-AE",
};

/**
 * Formate le montant selon la locale et la devise
 */
export const formatLocalCurrency = (amount: number, currency: string) => {
  try {
    const locale = LOCALES[currency] || "en-US";
    const formatter = new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency === "PI" ? "USD" : currency,
      maximumFractionDigits: currency === "PI" ? 4 : 2,
    });

    let formatted = formatter.format(amount);

    if (currency === "PI") {
      return formatted.replace(/[A-Z$]+/g, "").trim() + " PI";
    }

    return formatted;
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
};
