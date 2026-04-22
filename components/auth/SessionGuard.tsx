"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

const SESSION_CHECK_INTERVAL = 30000; // 30 seconds - reduced frequency for better performance

// Pages publiques qui ne nécessitent pas de vérification de session
const PUBLIC_PATHS = [
  "/",
  "/auth",
  "/auth/login",
  "/auth/signup",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/verify-email",
  "/auth/business-signup",
  "/login",
  "/register",
  "/signup",
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

    // Vérifier si un token existe côté client (token JWT ou pi_session_token)
    const hasToken = document.cookie.includes("token=") || document.cookie.includes("pi_session_token=");
    if (!hasToken) {
      return; // Pas connecté, pas besoin de vérifier
    }

    isCheckingRef.current = true;

    try {
      const response = await fetch("/api/auth/session/verify", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        // Ne pas deconnecter si c'est juste "no_token" - l'utilisateur n'etait peut-etre pas connecte
        if (data.reason === "no_token") {
          return;
        }
        // Session revoquee ou expiree - forcer la deconnexion
        if (data.reason === "session_revoked" || data.reason === "session_expired" || data.reason === "invalid_token") {
          await forceLogout(data.reason);
        }
      }
    } catch {
      // Erreur reseau - on ne deconnecte pas (peut etre temporaire)
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
