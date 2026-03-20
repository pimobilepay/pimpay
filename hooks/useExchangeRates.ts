"use client";

import useSWR from "swr";
import { FIAT_RATES } from "@/lib/exchange";

interface ExchangeRatesResponse {
  success: boolean;
  rates: Record<string, number>;
  source: "live" | "cache" | "fallback";
  timestamp: number;
  baseCurrency: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useExchangeRates() {
  const { data, error, isLoading, mutate } = useSWR<ExchangeRatesResponse>(
    "/api/exchange-rates",
    fetcher,
    {
      refreshInterval: 60 * 60 * 1000, // Refresh every hour
      revalidateOnFocus: false,
      dedupingInterval: 60 * 1000, // Dedupe requests within 1 minute
      fallbackData: {
        success: true,
        rates: FIAT_RATES,
        source: "fallback",
        timestamp: Date.now(),
        baseCurrency: "USD",
      },
    }
  );

  const rates = data?.rates || FIAT_RATES;

  /**
   * Convert amount from one currency to another
   */
  const convert = (amount: number, from: string, to: string): number => {
    if (amount <= 0) return 0;
    const fromRate = rates[from.toUpperCase()] || 1;
    const toRate = rates[to.toUpperCase()] || 1;
    // Convert to USD first, then to target
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  };

  /**
   * Get the USD value of an amount in a given currency
   */
  const toUSD = (amount: number, currency: string): number => {
    const rate = rates[currency.toUpperCase()] || 1;
    return amount / rate;
  };

  /**
   * Convert USD to a specific currency
   */
  const fromUSD = (usdAmount: number, currency: string): number => {
    const rate = rates[currency.toUpperCase()] || 1;
    return usdAmount * rate;
  };

  /**
   * Get the rate for a specific currency (how many of that currency per 1 USD)
   */
  const getRate = (currency: string): number => {
    return rates[currency.toUpperCase()] || 1;
  };

  /**
   * Format currency with proper locale
   */
  const formatCurrency = (amount: number, currency: string): string => {
    const currencyUpper = currency.toUpperCase();
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyUpper,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currencyUpper}`;
    }
  };

  return {
    rates,
    isLoading,
    error,
    source: data?.source || "fallback",
    lastUpdated: data?.timestamp ? new Date(data.timestamp) : null,
    convert,
    toUSD,
    fromUSD,
    getRate,
    formatCurrency,
    refresh: mutate,
  };
}

export default useExchangeRates;
