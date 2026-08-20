import { clearSessionKeepLanguage } from "@/lib/clear-session";

const SESSION_COOKIE_NAMES = [
  "pimpay_token",
  "token",
  "pi_session_token",
  "refresh_token",
  "next-auth.session-token",
  "next-auth.csrf-token",
];

function clearClientCookies() {
  if (typeof document === "undefined") return;

  for (const name of SESSION_COOKIE_NAMES) {
    for (const path of ["/", "/api/auth/refresh"]) {
      document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path};`;
    }
    document.cookie = `${name}=; Max-Age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname};`;
  }
}

export async function performClientLogout() {
  if (typeof window === "undefined") return;

  window.dispatchEvent(new Event("pimpay:logging-out"));

  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });
  } catch {
    // Le nettoyage local et la navigation doivent toujours avoir lieu.
  } finally {
    clearClientCookies();
    clearSessionKeepLanguage();
    window.location.replace("/auth/login");
  }
}
