export { fr } from "./locales/fr";
export type { TranslationKeys } from "./locales/fr";
export { en } from "./locales/en";
export { zh } from "./locales/zh";
export { id } from "./locales/id";
export { es } from "./locales/es";
export { pt } from "./locales/pt";
export { ar } from "./locales/ar";
export { hi } from "./locales/hi";
export { ja } from "./locales/ja";

export type Locale = "fr" | "en" | "zh" | "id" | "es" | "pt" | "ar" | "hi" | "ja";

export const locales: Record<Locale, () => Promise<TranslationKeys>> = {
  fr: async () => (await import("./locales/fr")).fr,
  en: async () => (await import("./locales/en")).en,
  zh: async () => (await import("./locales/zh")).zh,
  id: async () => (await import("./locales/id")).id,
  es: async () => (await import("./locales/es")).es,
  pt: async () => (await import("./locales/pt")).pt,
  ar: async () => (await import("./locales/ar")).ar,
  hi: async () => (await import("./locales/hi")).hi,
  ja: async () => (await import("./locales/ja")).ja,
};

export const LOCALE_STORAGE_KEY = "pimpay-locale";

export function detectBrowserLocale(): Locale {
  if (typeof navigator === "undefined") return "fr";
  const lang = navigator.language || (navigator as Navigator & { userLanguage?: string }).userLanguage || "fr";
  if (lang.startsWith("zh")) return "zh";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("id")) return "id";
  if (lang.startsWith("es")) return "es";
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("hi")) return "hi";
  if (lang.startsWith("ja")) return "ja";
  return "fr";
}
