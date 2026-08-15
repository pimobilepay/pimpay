/**
 * Accès sûr à localStorage.
 *
 * [FIX iOS / Pi Browser] — Dans l'iframe du Pi Browser sur iPhone (et en
 * navigation privée Safari), l'accès à `window.localStorage` peut lever une
 * `SecurityError` / `QuotaExceededError`. Si cet accès n'est pas protégé, il
 * remonte jusqu'au bloc `catch` du handler de connexion et affiche à tort une
 * "Erreur serveur" alors que le login a réussi.
 *
 * Ces helpers encapsulent tous les accès et échouent silencieusement (avec un
 * log) au lieu de faire planter le flux d'authentification.
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch (e) {
    console.log("[v0] safeGetItem indisponible:", key, e);
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.log("[v0] safeSetItem indisponible:", key, e);
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (e) {
    console.log("[v0] safeRemoveItem indisponible:", key, e);
    return false;
  }
}
