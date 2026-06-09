"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    google?: any;
    __GIS_SCRIPT_LOADED__?: boolean;
  }
}

const GIS_SRC = "https://accounts.google.com/gsi/client";

/**
 * Hook d'authentification Google pour PimPay.
 *
 * Reproduit le flux de usePiAuth :
 *   popup OAuth (code flow) -> sync backend (/api/auth/google-login) -> session cookie.
 * Charge dynamiquement le script Google Identity Services puis ouvre la popup
 * de consentement et echange le code d'autorisation cote serveur.
 */
export const useGoogleAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const authInProgressRef = useRef(false);
  const codeClientRef = useRef<any>(null);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  /**
   * Charger le script Google Identity Services une seule fois.
   */
  const loadGisScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") return resolve(false);
      if (window.google?.accounts?.oauth2) return resolve(true);

      const existing = document.querySelector(
        `script[src="${GIS_SRC}"]`
      ) as HTMLScriptElement | null;

      if (existing) {
        if (window.google?.accounts?.oauth2) return resolve(true);
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.src = GIS_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.__GIS_SCRIPT_LOADED__ = true;
        resolve(true);
      };
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }, []);

  // Precharger le script des le montage.
  useEffect(() => {
    loadGisScript();
  }, [loadGisScript]);

  /**
   * Connexion Google : ouvre la popup, recupere le code, synchronise le backend.
   */
  const loginWithGoogle = useCallback(async () => {
    if (typeof window === "undefined") {
      return { success: false, error: "SSR non supporte" };
    }

    if (!clientId) {
      const msg = "Configuration Google manquante";
      toast.error(msg, { duration: 5000 });
      return { success: false, error: msg };
    }

    if (authInProgressRef.current) {
      return { success: false, error: "Authentification en cours" };
    }

    authInProgressRef.current = true;
    setLoading(true);

    try {
      const ready = await loadGisScript();
      if (!ready || !window.google?.accounts?.oauth2) {
        const msg = "Impossible de charger Google. Verifiez votre connexion.";
        toast.error(msg, { duration: 5000 });
        return { success: false, error: msg };
      }

      // On enveloppe le callback de la popup dans une promesse.
      const code = await new Promise<string>((resolve, reject) => {
        codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: clientId,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: (response: any) => {
            if (response?.error) {
              reject(new Error(response.error));
              return;
            }
            if (!response?.code) {
              reject(new Error("Aucun code recu de Google"));
              return;
            }
            resolve(response.code);
          },
          error_callback: (err: any) => {
            reject(new Error(err?.type || "popup_closed"));
          },
        });

        codeClientRef.current.requestCode();
      });

      // Echange du code cote serveur + synchronisation PimPay.
      const response = await fetch("/api/auth/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code, redirectUri: "postmessage" }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Echec de synchronisation PimPay");
      }

      setUser(result.user);
      localStorage.setItem("pimpay_user", JSON.stringify(result.user));

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("[PimPay] Erreur authentification Google:", error);

      let errorMsg = "Echec de la connexion Google";
      const errStr = String(error?.message || error || "").toLowerCase();

      if (
        errStr.includes("popup_closed") ||
        errStr.includes("closed") ||
        errStr.includes("cancel")
      ) {
        errorMsg = "Connexion annulee";
      } else if (errStr.includes("access_denied") || errStr.includes("denied")) {
        errorMsg = "Acces refuse. Veuillez autoriser PimPay.";
      } else if (errStr.includes("network") || errStr.includes("fetch")) {
        errorMsg = "Erreur reseau. Verifiez votre connexion internet.";
      } else if (errStr.includes("server") || errStr.includes("500")) {
        errorMsg = "Erreur serveur. Veuillez reessayer.";
      }

      // On evite un toast bruyant si l'utilisateur a simplement ferme la popup.
      if (errorMsg !== "Connexion annulee") {
        toast.error(errorMsg, { duration: 5000 });
      }
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
      authInProgressRef.current = false;
    }
  }, [clientId, loadGisScript]);

  return {
    loginWithGoogle,
    user,
    loading,
  };
};
