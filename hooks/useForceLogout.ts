"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

/**
 * Hook partagé — déconnexion forcée immédiate.
 * Même logique que l'admin dashboard :
 *  1. Appel API /api/auth/logout pour supprimer la session en DB
 *  2. Purge de tous les cookies de session côté client
 *  3. Vide localStorage + sessionStorage
 *  4. Redirect vers /auth/login
 */
export function useForceLogout() {
  const router = useRouter();

  const forceLogout = useCallback(async () => {
    // 1. Supprimer la session côté serveur
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Continuer même si l'API échoue
    }

    // 2. Purger tous les cookies de session
    const cookiesToClear = [
      "pimpay_token",
      "token",
      "pi_session_token",
      "next-auth.session-token",
      "next-auth.csrf-token",
    ];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });

    // 3. Vider le storage local
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignoré si le storage est désactivé
    }

    // 4. Rediriger et invalider le cache Next.js
    router.push("/auth/login");
    router.refresh();
  }, [router]);

  return { forceLogout };
}
