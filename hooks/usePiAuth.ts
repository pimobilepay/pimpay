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
  const waitForPiSDK = useCallback(async (maxWait = 10000): Promise<boolean> => {
    const start = Date.now();
    const checkInterval = 100;
    let attempts = 0;
    
    console.log("[PimPay] Attente du SDK Pi...");
    
    while (Date.now() - start < maxWait) {
      attempts++;
      
      // Verifier si deja pret
      if (window.__PI_SDK_READY__) {
        console.log(`[PimPay] SDK Pi deja pret (tentative ${attempts})`);
        return true;
      }
      
      if (window.Pi) {
        // SDK charge, on tente l'initialisation
        if (initializePiSDK()) {
          console.log(`[PimPay] SDK Pi initialise avec succes (tentative ${attempts})`);
          return true;
        }
        // Si en cours d'init par un autre, attendre un peu plus
        if (window.__PI_SDK_INITIALIZING__) {
          await new Promise(resolve => setTimeout(resolve, 50));
          if (window.__PI_SDK_READY__) {
            console.log(`[PimPay] SDK Pi initialise par un autre processus (tentative ${attempts})`);
            return true;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.warn(`[PimPay] SDK Pi non disponible apres ${maxWait}ms (${attempts} tentatives). window.Pi=${!!window.Pi}, __PI_SDK_READY__=${window.__PI_SDK_READY__}`);
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
      // Verifier d'abord si on est dans un environnement avec Pi SDK
      if (typeof window.Pi === "undefined") {
        console.warn("[PimPay] window.Pi n'existe pas - pas dans Pi Browser?");
      }
      
      // Attendre que le SDK soit charge et initialise (max 10s)
      const sdkReady = await waitForPiSDK(10000);
      
      if (!sdkReady || !window.Pi) {
        const errorMsg = !window.Pi 
          ? "Veuillez ouvrir PimPay dans le Pi Browser pour vous connecter."
          : "Le SDK Pi n'a pas pu s'initialiser. Rechargez la page.";
        toast.error(errorMsg, { duration: 5000 });
        return { success: false, error: errorMsg };
      }
      
      // Scopes: username et payments uniquement (conformement a la config Mainnet de l'app)
      // phone_number retire car il necessite une approbation separee et declenche
      // une redemande d'autorisation bloquante dans le Pi Browser.
      const scopes = ["username", "payments"];
      
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
      // Pi Network retourne le phone dans auth.user.credentials.phone_number si le scope est approuve
      const phone = auth.user?.credentials?.phone_number || null;
      
      const response = await fetch("/api/auth/pi-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // Important pour recevoir les cookies
        body: JSON.stringify({
          accessToken: auth.accessToken,
          piUserId: auth.user.uid,
          username: auth.user.username,
          phone: phone,
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
      
      // Messages d'erreur plus clairs selon le type d'erreur
      const errStr = String(error?.message || error || "").toLowerCase();
      
      if (errStr.includes("user cancelled") || errStr.includes("cancelled") || errStr.includes("canceled")) {
        errorMsg = "Connexion annulee par l'utilisateur";
      } else if (errStr.includes("disallowed") || errStr.includes("scope") || errStr.includes("permission")) {
        errorMsg = "Veuillez autoriser l'acces a votre compte Pi";
      } else if (errStr.includes("timed out") || errStr.includes("timeout")) {
        errorMsg = "Connexion expiree. Veuillez reessayer.";
      } else if (errStr.includes("not initialized") || errStr.includes("init")) {
        errorMsg = "SDK Pi non initialise. Rechargez la page.";
      } else if (errStr.includes("network") || errStr.includes("fetch") || errStr.includes("failed to fetch")) {
        errorMsg = "Erreur reseau. Verifiez votre connexion internet.";
      } else if (errStr.includes("pi browser") || errStr.includes("browser")) {
        errorMsg = "Veuillez utiliser le Pi Browser";
      } else if (errStr.includes("unauthorized") || errStr.includes("401")) {
        errorMsg = "Session expiree. Veuillez reessayer.";
      } else if (errStr.includes("server") || errStr.includes("500") || errStr.includes("503")) {
        errorMsg = "Erreur serveur. Veuillez reessayer dans quelques instants.";
      } else if (errStr.includes("access token") || errStr.includes("token")) {
        errorMsg = "Probleme d'authentification. Veuillez reessayer.";
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
