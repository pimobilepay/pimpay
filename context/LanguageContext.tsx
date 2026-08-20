"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { fr as frDict } from "@/lib/i18n/locales/fr";
import { en as enDict } from "@/lib/i18n/locales/en";
import { zh as zhDict } from "@/lib/i18n/locales/zh";
import { id as idDict } from "@/lib/i18n/locales/id";
import { es as esDict } from "@/lib/i18n/locales/es";
import { pt as ptDict } from "@/lib/i18n/locales/pt";
import { ar as arDict } from "@/lib/i18n/locales/ar";
import { hi as hiDict } from "@/lib/i18n/locales/hi";
import { ja as jaDict } from "@/lib/i18n/locales/ja";
import type { Locale } from "@/lib/i18n";
import { LOCALE_STORAGE_KEY, detectBrowserLocale } from "@/lib/i18n";

const dictionaries = { fr: frDict, en: enDict, zh: zhDict, id: idDict, es: esDict, pt: ptDict, ar: arDict, hi: hiDict, ja: jaDict } as const;

// Utility: deep get by dot-notation key, e.g. "auth.login.title"
function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return path;
    current = (current as Record<string, unknown>)[key];
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
    const supportedLocales: Locale[] = ["fr", "en", "zh", "id", "es", "pt", "ar", "hi", "ja"];
    if (saved && supportedLocales.includes(saved)) {
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
    document.documentElement.dir = newLocale === "ar" ? "rtl" : "ltr";
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
