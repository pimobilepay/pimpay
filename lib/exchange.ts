// lib/exchange.ts

export const PI_CONSENSUS_USD = 314159.00;

export const FIAT_RATES: { [key: string]: number } = {
  USD: 1,
  EUR: 0.91,
  XAF: 605.00,
  NGN: 1450.00,
  CNY: 7.24,
  VND: 25450.00,
  CDF: 2850.00, // Taux indicatif : 1 USD = 2850 CDF
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
};

/**
 * Calcule la conversion avec une commission de plateforme (ex: 0.1%)
 */
export const calculateExchangeWithFee = (amountInPi: number, targetCurrency: string) => {
  const feePercent = 0.001; // 0.1% de frais
  const rawValue = amountInPi * PI_CONSENSUS_USD * (FIAT_RATES[targetCurrency] || 1);
  const fee = rawValue * feePercent;
  return {
    total: rawValue - fee,
    fee: fee
  };
};

export const formatLocalCurrency = (amount: number, currency: string) => {
  const locales: { [key: string]: string } = {
    USD: 'en-US',
    EUR: 'de-DE',
    XAF: 'fr-CM',
    NGN: 'en-NG',
    CNY: 'zh-CN',
    VND: 'vi-VN',
    CDF: 'fr-CD', // Locale pour la RD Congo
  };

  return new Intl.NumberFormat(locales[currency] || 'en-US', {
    style: 'currency',
    currency: currency === 'PI' ? 'USD' : currency,
  }).format(amount).replace('US$', 'π');
};
