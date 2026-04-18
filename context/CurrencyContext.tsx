"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CurrencyCode = "XAF" | "EUR" | "USD" | "XOF" | "GBP" | "CDF" | "AED" | "NGN" | "MGA";

export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  rateToXAF: number;
  decimals: number;
  locale: string;
}

// ─── Currency Data ───────────────────────────────────────────────────────────

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  XAF: { 
    code: "XAF", 
    name: "Franc CFA BEAC", 
    symbol: "FCFA", 
    flag: "🇨🇲", 
    rateToXAF: 1, 
    decimals: 0,
    locale: "fr-CM"
  },
  XOF: { 
    code: "XOF", 
    name: "Franc CFA BCEAO", 
    symbol: "FCFA", 
    flag: "🇸🇳", 
    rateToXAF: 1, 
    decimals: 0,
    locale: "fr-SN"
  },
  EUR: { 
    code: "EUR", 
    name: "Euro", 
    symbol: "€", 
    flag: "🇪🇺", 
    rateToXAF: 655.957, 
    decimals: 2,
    locale: "fr-FR"
  },
  USD: { 
    code: "USD", 
    name: "Dollar US", 
    symbol: "$", 
    flag: "🇺🇸", 
    rateToXAF: 601.32, 
    decimals: 2,
    locale: "en-US"
  },
  GBP: { 
    code: "GBP", 
    name: "Livre Sterling", 
    symbol: "£", 
    flag: "🇬🇧", 
    rateToXAF: 762.45, 
    decimals: 2,
    locale: "en-GB"
  },
  CDF: {
    code: "CDF",
    name: "Franc Congolais",
    symbol: "FC",
    flag: "🇨🇩",
    rateToXAF: 0.215,
    decimals: 0,
    locale: "fr-CD"
  },
  AED: {
    code: "AED",
    name: "Dirham emiratis",
    symbol: "AED",
    flag: "🇦🇪",
    rateToXAF: 163.71,
    decimals: 2,
    locale: "ar-AE"
  },
  NGN: {
    code: "NGN",
    name: "Naira nigerien",
    symbol: "₦",
    flag: "🇳🇬",
    rateToXAF: 0.38,
    decimals: 0,
    locale: "en-NG"
  },
  MGA: {
    code: "MGA",
    name: "Ariary malgache",
    symbol: "Ar",
    flag: "🇲🇬",
    rateToXAF: 0.134,
    decimals: 0,
    locale: "fr-MG"
  },
};

export const CURRENCY_STORAGE_KEY = "pimpay-currency";
export const DEFAULT_CURRENCY: CurrencyCode = "USD";

// ─── Context ─────────────────────────────────────────────────────────────────

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyInfo: CurrencyInfo;
  setCurrency: (currency: CurrencyCode) => void;
  formatAmount: (amountInXAF: number, showSymbol?: boolean) => string;
  convertFromXAF: (amountInXAF: number) => number;
  convertToXAF: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

// ─── Provider ────────────────────────────────────────────────────────────────

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  // Load saved currency on mount
  useEffect(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode | null;
    if (saved && CURRENCIES[saved]) {
      setCurrencyState(saved);
    }
  }, []);

  // Set currency and save to localStorage
  const setCurrency = useCallback((newCurrency: CurrencyCode) => {
    if (CURRENCIES[newCurrency]) {
      setCurrencyState(newCurrency);
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
    }
  }, []);

  // Get current currency info
  const currencyInfo = useMemo(() => CURRENCIES[currency], [currency]);

  // Convert XAF to current currency
  const convertFromXAF = useCallback((amountInXAF: number): number => {
    if (!isFinite(amountInXAF)) return 0;
    const info = CURRENCIES[currency];
    return amountInXAF / info.rateToXAF;
  }, [currency]);

  // Convert current currency to XAF
  const convertToXAF = useCallback((amount: number): number => {
    if (!isFinite(amount)) return 0;
    const info = CURRENCIES[currency];
    return amount * info.rateToXAF;
  }, [currency]);

  // Format amount in current currency
  const formatAmount = useCallback((amountInXAF: number, showSymbol = true): string => {
    if (!isFinite(amountInXAF)) return showSymbol ? `— ${currencyInfo.symbol}` : "—";
    
    const converted = convertFromXAF(amountInXAF);
    const info = currencyInfo;
    
    if (info.code === "XAF" || info.code === "XOF") {
      // Format FCFA with space separator
      const rounded = Math.round(converted);
      const isNegative = rounded < 0;
      const abs = Math.abs(rounded);
      const parts = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
      const formatted = `${isNegative ? "-" : ""}${parts}`;
      return showSymbol ? `${formatted}\u00A0FCFA` : formatted;
    }

    if (info.code === "CDF" || info.code === "NGN" || info.code === "MGA") {
      // Format whole-number currencies
      const rounded = Math.round(converted);
      const isNegative = rounded < 0;
      const abs = Math.abs(rounded);
      const parts = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
      const formatted = `${isNegative ? "-" : ""}${parts}`;
      return showSymbol ? `${formatted}\u00A0${info.symbol}` : formatted;
    }
    
    // Format other currencies
    if (showSymbol) {
      return new Intl.NumberFormat(info.locale, {
        style: "currency",
        currency: info.code,
        minimumFractionDigits: info.decimals,
        maximumFractionDigits: info.decimals,
      }).format(converted);
    }
    
    return new Intl.NumberFormat(info.locale, {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    }).format(converted);
  }, [currencyInfo, convertFromXAF]);

  const contextValue = useMemo(
    () => ({
      currency,
      currencyInfo,
      setCurrency,
      formatAmount,
      convertFromXAF,
      convertToXAF,
    }),
    [currency, currencyInfo, setCurrency, formatAmount, convertFromXAF, convertToXAF]
  );

  return (
    <CurrencyContext.Provider value={contextValue}>
      {children}
    </CurrencyContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    // Fallback for usage outside provider
    return {
      currency: DEFAULT_CURRENCY,
      currencyInfo: CURRENCIES[DEFAULT_CURRENCY],
      setCurrency: () => {},
      formatAmount: (amountInXAF: number, showSymbol = true) => {
        const rounded = Math.round(amountInXAF);
        const parts = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
        const formatted = `${rounded < 0 ? "-" : ""}${parts}`;
        return showSymbol ? `${formatted}\u00A0FCFA` : formatted;
      },
      convertFromXAF: (amount: number) => amount,
      convertToXAF: (amount: number) => amount,
    };
  }
  return context;
}
