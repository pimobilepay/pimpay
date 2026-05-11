"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

const SESSION_CHECK_INTERVAL = 10000; // 10 seconds - for instant logout detection across devices

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
  // Flag pour savoir si c'est l'utilisateur lui-même qui a révoqué une session
  // depuis la page settings/sessions (pas l'admin, pas un autre appareil)
  const selfRevokedRef = useRef(false);

  // Écouter l'event dispatché par RevokeSessionButton / LogoutOthersButton
  // pour savoir que c'est une révocation volontaire par l'utilisateur lui-même
  useEffect(() => {
    const handleSelfRevoke = () => {
      selfRevokedRef.current = true;
      // Reset après 15s pour ne pas bloquer les futures vraies déconnexions forcées
      setTimeout(() => { selfRevokedRef.current = false; }, 15000);
    };
    window.addEventListener("pimpay:session-revoked", handleSelfRevoke);
    return () => window.removeEventListener("pimpay:session-revoked", handleSelfRevoke);
  }, []);

  const forceLogout = useCallback(async (reason: string) => {
    // Nettoyer les cookies et localStorage
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie = "pi_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    document.cookie = "pimpay_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.clear();

    // Afficher un message approprié selon la raison et l'origine
    if (reason === "session_revoked") {
      if (selfRevokedRef.current) {
        // L'utilisateur a lui-même révoqué sa propre session depuis settings
        // (ex: "Déconnecter les autres appareils" ou révocation d'une session active)
        // → pas de toast d'erreur alarmant, juste une info neutre
        toast.info("Session déconnectée avec succès.", { duration: 3000 });
      } else {
        // Révocation par l'admin ou depuis un autre appareil
        toast.error("Votre session a été déconnectée par l'administrateur.", {
          duration: 6000,
        });
      }
    } else if (reason === "session_expired") {
      toast.error("Votre session a expiré. Veuillez vous reconnecter.", {
        duration: 4000,
      });
    } else {
      toast.error("Session terminée.", { duration: 3000 });
    }

    selfRevokedRef.current = false;

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
