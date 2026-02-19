export { fr } from "./locales/fr";
export type { TranslationKeys } from "./locales/fr";
export { en } from "./locales/en";

export type Locale = "fr" | "en";

export const locales: Record<Locale, () => Promise<{ default: any } | any>> = {
  fr: async () => (await import("./locales/fr")).fr,
  en: async () => (await import("./locales/en")).en,
};

export const LOCALE_STORAGE_KEY = "pimpay-locale";

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "fr";
  const lang = navigator.language || (navigator as any).userLanguage || "fr";
  return lang.startsWith("en") ? "en" : "fr";
}
