"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { fr as frDict } from "@/lib/i18n/locales/fr";
import { en as enDict } from "@/lib/i18n/locales/en";
import type { Locale } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY, detectBrowserLocale } from "@/lib/i18n";

const dictionaries = { fr: frDict, en: enDict } as const;

// Utility: deep get by dot-notation key, e.g. "auth.login.title"
function getNestedValue(obj: any, path: string): string {
  const keys = path.split(".");
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = current[key];
  }
  return typeof current === "string" ? current : path;
}

interface LanguageContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  useEffect(() => {
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY) as Locale | null;
    if (saved && (saved === "fr" || saved === "en")) {
      setLocaleState(saved);
    } else {
      const detected = detectBrowserLocale();
      setLocaleState(detected);
      localStorage.setItem(LOCALE_STORAGE_KEY, detected);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    // Update the html lang attribute
    document.documentElement.lang = newLocale;
  }, []);

  const t = useCallback(
    (key: string): string => {
      // Try current locale first, fall back to French
      const value = getNestedValue(dictionaries[locale], key);
      if (value !== key) return value;
      // Fallback to French
      return getNestedValue(dictionaries.fr, key);
    },
    [locale]
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback for usage outside provider (e.g. in server components)
    return {
      locale: "fr" as Locale,
      setLocale: () => {},
      t: (key: string) => getNestedValue(frDict, key),
    };
  }
  return context;
}
