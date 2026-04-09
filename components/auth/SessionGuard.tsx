"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

const SESSION_CHECK_INTERVAL = 10000; // 10 seconds

// Pages publiques qui ne nécessitent pas de vérification de session
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/login",
  "/register",
];

interface SessionGuardProps {
  children: React.ReactNode;
}

export default function SessionGuard({ children }: SessionGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRef = useRef(false);

  const forceLogout = useCallback(async (reason: string) => {
    // Nettoyer les cookies et localStorage
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie = "pi_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie = "pimpay_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.clear();

    // Afficher un message approprié selon la raison
    if (reason === "session_revoked") {
      toast.error("Votre session a été déconnectée depuis un autre appareil", {
        duration: 5000,
      });
    } else if (reason === "session_expired") {
      toast.error("Votre session a expiré", {
        duration: 3000,
      });
    } else {
      toast.error("Session terminée", {
        duration: 3000,
      });
    }

    // Rediriger vers la page de connexion
    router.push("/auth/login");
    router.refresh();
  }, [router]);

  const checkSession = useCallback(async () => {
    // Éviter les vérifications en parallèle
    if (isCheckingRef.current) return;
    
    // Ne pas vérifier sur les pages publiques
    if (PUBLIC_PATHS.some(path => pathname === path || pathname?.startsWith(path + "/"))) {
      return;
    }

    // Vérifier si un token existe côté client
    const hasToken = document.cookie.includes("token=");
    if (!hasToken) {
      return; // Pas connecté, pas besoin de vérifier
    }

    isCheckingRef.current = true;

    try {
      const response = await fetch("/api/auth/session/verify", {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        // Session invalide - forcer la déconnexion
        await forceLogout(data.reason || "unknown");
      }
    } catch (error) {
      // Erreur réseau - on ne déconnecte pas (peut être temporaire)
      console.error("[SessionGuard] Network error during session check:", error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [pathname, forceLogout]);

  useEffect(() => {
    // Vérification initiale
    checkSession();

    // Vérification périodique toutes les 10 secondes
    intervalRef.current = setInterval(checkSession, SESSION_CHECK_INTERVAL);

    // Vérifier aussi quand la page redevient visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkSession]);

  return <>{children}</>;
}
