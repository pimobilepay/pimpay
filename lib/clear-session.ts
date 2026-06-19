import { LOCALE_STORAGE_KEY } from "@/lib/i18n";
import { LANGUAGE_ONBOARDED_KEY } from "@/components/auth/LanguageOnboarding";

/**
 * Cles a conserver lors d'une deconnexion. Le choix de langue (et le fait que
 * l'onboarding ait deja ete effectue) doit survivre a la deconnexion afin que
 * l'ecran de choix de langue ne reapparaisse pas a chaque reconnexion.
 */
const PRESERVED_KEYS = [LOCALE_STORAGE_KEY, LANGUAGE_ONBOARDED_KEY];

/**
 * Vide le localStorage et le sessionStorage tout en preservant les preferences
 * de langue. A utiliser partout ou l'on deconnecte l'utilisateur a la place de
 * `localStorage.clear()` / `sessionStorage.clear()`.
 */
export function clearSessionKeepLanguage() {
  if (typeof window === "undefined") return;

  try {
    const preserved: Record<string, string> = {};
    for (const key of PRESERVED_KEYS) {
      const value = localStorage.getItem(key);
      if (value !== null) preserved[key] = value;
    }

    localStorage.clear();
    sessionStorage.clear();

    for (const [key, value] of Object.entries(preserved)) {
      localStorage.setItem(key, value);
    }
  } catch {
    /* ignore storage errors */
  }
}
