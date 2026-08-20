"use client";

import { useCallback } from "react";
import { performClientLogout } from "@/lib/client-logout";

/**
 * Hook partagé — déconnexion forcée immédiate.
 * Même logique que l'admin dashboard :
 *  1. Appel API /api/auth/logout pour supprimer la session en DB
 *  2. Purge de tous les cookies de session côté client
 *  3. Vide localStorage + sessionStorage
 *  4. Redirect vers /auth/login
 */
export function useForceLogout() {
  const forceLogout = useCallback(async () => {
    await performClientLogout();
  }, []);

  return { forceLogout };
}
