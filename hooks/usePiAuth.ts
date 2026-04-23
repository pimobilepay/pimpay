"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
  }
}

/**
 * Hook d'authentification Pi Network pour PimPay
 * 
 * S'appuie sur PiInitializer pour l'init du SDK.
 * Gere le flux complet: authenticate -> sync backend -> session cookie.
 */
export const usePiAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const authInProgressRef = useRef(false);

  /**
   * Gestion des paiements incomplets (Checklist Mainnet #10)
   * Cette fonction DOIT retourner une Promise pour que le SDK Pi puisse continuer
   */
  const handleIncompletePayment = useCallback(async (payment: any) => {
    console.warn("[PimPay] Paiement incomplet detecte:", payment.identifier, "txid:", payment.transaction?.txid);
    
    try {
      const response = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important pour les cookies
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid || null,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log("[PimPay] Paiement incomplet traite:", payment.identifier, data.action);
        if (data.action === "completed") {
          toast.success(`Paiement recupere: ${data.message}`);
        }
      } else {
        console.error("[PimPay] Echec traitement paiement incomplet:", data);
      }
    } catch (error) {
      console.error("[PimPay] Erreur reseau traitement paiement incomplet:", error);
    }
  }, []);

  /**
   * Initialiser le SDK Pi de maniere thread-safe
   */
  const initializePiSDK = useCallback((): boolean => {
    if (typeof window === "undefined" || !window.Pi) {
      return false;
    }

    // Deja initialise
    if (window.__PI_SDK_READY__) {
      return true;
    }

    // En cours d'initialisation par un autre thread
    if (window.__PI_SDK_INITIALIZING__) {
      return false;
    }

    try {
      window.__PI_SDK_INITIALIZING__ = true;
      window.Pi.init({ version: "2.0", sandbox: false });
      window.__PI_SDK_READY__ = true;
      window.__PI_SDK_INITIALIZING__ = false;
      console.log("[PimPay] SDK Pi 2.0 initialise par usePiAuth");
      return true;
    } catch (e: any) {
      window.__PI_SDK_INITIALIZING__ = false;
      // Si l'erreur dit "already initialized", c'est OK
      if (e?.message?.includes("already")) {
        window.__PI_SDK_READY__ = true;
        return true;
      }
      console.error("[PimPay] Erreur init SDK Pi:", e);
      return false;
    }
  }, []);

  /**
   * Attendre que le SDK Pi soit disponible et initialise
   */
  const waitForPiSDK = useCallback(async (maxWait = 8000): Promise<boolean> => {
    const start = Date.now();
    const checkInterval = 150;
    
    while (Date.now() - start < maxWait) {
      if (window.Pi) {
        // SDK charge, on tente l'initialisation
        if (initializePiSDK()) {
          return true;
        }
        // Si en cours d'init par un autre, attendre un peu plus
        if (window.__PI_SDK_INITIALIZING__) {
          await new Promise(resolve => setTimeout(resolve, 100));
          if (window.__PI_SDK_READY__) return true;
        }
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    return window.__PI_SDK_READY__ || false;
  }, [initializePiSDK]);

  /**
   * Authentification Pi Network synchronisee avec Prisma
   */
  const loginWithPi = useCallback(async () => {
    if (typeof window === "undefined") {
      return { success: false, error: "SSR non supporte" };
    }

    // Eviter les doubles authentifications
    if (authInProgressRef.current) {
      console.warn("[PimPay] Authentification deja en cours");
      return { success: false, error: "Authentification en cours" };
    }

    authInProgressRef.current = true;
    setLoading(true);

    try {
      // Attendre que le SDK soit charge et initialise (max 8s)
      const sdkReady = await waitForPiSDK(8000);
      
      if (!sdkReady || !window.Pi) {
        toast.error("Veuillez ouvrir PimPay via le Pi Browser.", { duration: 5000 });
        return { success: false, error: "SDK Pi non disponible" };
      }

      // Scopes standards uniquement (wallet_address requiert approbation mainnet supplementaire)
      const scopes = ["username", "payments"];
      
      console.log("[PimPay] Demarrage authentification Pi...");
      
      // Timeout de 60s pour l'authentification Pi (l'utilisateur peut prendre du temps)
      const authPromise = window.Pi.authenticate(scopes, handleIncompletePayment);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("timed out")), 60000)
      );
      
      const auth = await Promise.race([authPromise, timeoutPromise]);

      if (!auth || !auth.user) {
        throw new Error("Autorisation refusee par l'utilisateur.");
      }

      console.log("[PimPay] Authentification Pi reussie, sync backend...");

      // Synchronisation avec le backend PimPay
      const response = await fetch("/api/auth/pi-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important pour recevoir les cookies
        body: JSON.stringify({
          accessToken: auth.accessToken,
          piUserId: auth.user.uid,
          username: auth.user.username,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Echec de synchronisation PimPay");
      }

      console.log("[PimPay] Connexion reussie:", result.user?.username);

      // Les cookies httpOnly sont poses automatiquement par la reponse API
      // On stocke uniquement les infos non-sensibles cote client
      setUser(result.user);
      localStorage.setItem("pimpay_user", JSON.stringify(result.user));

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("[PimPay] Erreur authentification Pi:", error);

      let errorMsg = "Echec de la connexion securisee";
      
      // Messages d'erreur plus clairs
      if (error.message?.includes("User cancelled") || error.message?.includes("cancelled")) {
        errorMsg = "Connexion annulee par l'utilisateur";
      } else if (error.message?.includes("disallowed") || error.message?.includes("scope")) {
        errorMsg = "Veuillez autoriser l'acces a votre compte Pi";
      } else if (error.message?.includes("timed out") || error.message?.includes("timeout")) {
        errorMsg = "Connexion expir\u00e9e. Veuillez reessayer.";
      } else if (error.message?.includes("not initialized") || error.message?.includes("init")) {
        errorMsg = "SDK Pi non initialise. Rechargez la page.";
      } else if (error.message?.includes("network") || error.message?.includes("fetch")) {
        errorMsg = "Erreur reseau. Verifiez votre connexion.";
      } else if (error.message?.includes("Pi Browser") || error.message?.includes("browser")) {
        errorMsg = "Veuillez utiliser le Pi Browser";
      }

      toast.error(errorMsg, { duration: 5000 });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
      authInProgressRef.current = false;
    }
  }, [handleIncompletePayment, waitForPiSDK]);

  return {
    loginWithPi,
    user,
    loading,
    handleIncompletePayment,
  };
};
