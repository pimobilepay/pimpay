"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
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

  /**
   * Gestion des paiements incomplets (Checklist Mainnet #10)
   */
  const handleIncompletePayment = useCallback(async (payment: any) => {
    console.warn("[PimPay] Paiement incomplet detecte:", payment.identifier);
    try {
      const response = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid,
        }),
      });

      if (response.ok) {
        console.log("[PimPay] Paiement incomplet traite:", payment.identifier);
      }
    } catch (error) {
      console.error("[PimPay] Erreur traitement paiement incomplet:", error);
    }
  }, []);

  /**
   * Authentification Pi Network synchronisee avec Prisma
   */
  const loginWithPi = useCallback(async () => {
    if (typeof window === "undefined") {
      return { success: false, error: "SSR non supporte" };
    }

    if (!window.Pi) {
      toast.error("Veuillez ouvrir PimPay via le Pi Browser.");
      return { success: false, error: "SDK Pi non disponible" };
    }

    // Attendre que le SDK soit pret (initialise par PiInitializer)
    if (!window.__PI_SDK_READY__) {
      // Attente courte si le SDK est present mais pas encore init
      try {
        window.Pi.init({ version: "2.0", sandbox: false });
        window.__PI_SDK_READY__ = true;
      } catch {
        // Deja initialise, on continue
      }
    }

    setLoading(true);

    try {
      const scopes = ["username", "payments", "wallet_address"];
      const auth = await window.Pi.authenticate(scopes, handleIncompletePayment);

      if (!auth || !auth.user) {
        throw new Error("Autorisation refusee par l'utilisateur.");
      }

      // Synchronisation avec le backend PimPay
      const response = await fetch("/api/auth/pi-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

      // Les cookies httpOnly sont poses automatiquement par la reponse API
      // On stocke uniquement les infos non-sensibles cote client
      setUser(result.user);
      localStorage.setItem("pimpay_user", JSON.stringify(result.user));

      return { success: true, user: result.user };
    } catch (error: any) {
      console.error("[PimPay] Erreur authentification Pi:", error);

      let errorMsg = "Echec de la connexion securisee";
      if (error.message?.includes("User cancelled")) errorMsg = "Connexion annulee";
      if (error.message?.includes("disallowed")) errorMsg = "Permissions refusees";
      if (error.message?.includes("timed out")) errorMsg = "Le SDK Pi ne repond pas";
      if (error.message?.includes("not initialized")) errorMsg = "SDK Pi non initialise. Rechargez la page.";

      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [handleIncompletePayment]);

  return {
    loginWithPi,
    user,
    loading,
    handleIncompletePayment,
  };
};
