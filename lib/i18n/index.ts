export { fr } from "./locales/fr";
export type { TranslationKeys } from "./locales/fr";
export { en } from "./locales/en";
export { zh } from "./locales/zh";

export type Locale = "fr" | "en" | "zh";

export const locales: Record<Locale, () => Promise<{ default: any } | any>> = {
  fr: async () => (await import("./locales/fr")).fr,
  en: async () => (await import("./locales/en")).en,
  zh: async () => (await import("./locales/zh")).zh,
};

export const LOCALE_STORAGE_KEY = "pimpay-locale";

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "fr";
  const lang = navigator.language || (navigator as any).userLanguage || "fr";
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  return "fr";
}
