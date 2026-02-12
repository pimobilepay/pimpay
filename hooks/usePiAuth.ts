"use client";

import { useState } from 'react';
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
  }
}

export const usePiAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  /**
   * Checklist 10 du Mainnet : Récupération des transactions bloquées
   */
  const handleIncompletePayment = async (payment: any) => {
    console.warn("⚠️ PimPay - Récupération d'un paiement incomplet :", payment.identifier);
    try {
      const response = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid
        }),
      });

      if (response.ok) {
        await window.Pi.completePayment(payment.identifier);
        console.log("✅ Checklist 10 validée pour le paiement:", payment.identifier);
      }
    } catch (error) {
      console.error("Erreur protocole Checklist 10 :", error);
    }
  };

  /**
   * Authentification Pi Network synchronisée avec Prisma
   */
  const loginWithPi = async () => {
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Veuillez ouvrir PimPay via le Pi Browser.");
      return { success: false };
    }

    setLoading(true);

    try {
      const Pi = window.Pi;

      // 🛡️ ÉTAPE CRUCIALE SDK 2.0 : Initialisation manuelle si pas déjà faite
      // Cela évite l'erreur d'authentification précoce.
      try {
        await Pi.init({ version: "2.0", sandbox: false });
      } catch (e) {
        // Souvent déjà initialisé, on continue
        console.log("Pi SDK déjà initialisé ou en cours.");
      }

      // Permissions nécessaires pour PimPay
      const scopes = ['username', 'payments', 'wallet_address'];

      // Authentification native
      const auth = await Pi.authenticate(scopes, handleIncompletePayment);

      if (!auth || !auth.user) {
        throw new Error("Autorisation refusée par l'utilisateur.");
      }

      /**
       * Synchronisation Backend (API / Prisma)
       */
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
        throw new Error(result.error || "Échec de synchronisation PimPay");
      }

      /**
       * GESTION SESSION
       */
      const sessionValue = result.user?.id || auth.user.uid;
      document.cookie = `pi_session_token=${sessionValue}; path=/; max-age=86400; SameSite=Lax; Secure`;

      setUser(auth.user);
      localStorage.setItem("pimpay_user", JSON.stringify(result.user));

      return { success: true, user: result.user };

    } catch (error: any) {
      console.error("Erreur d'authentification Pi:", error);

      let errorMsg = "Échec de la connexion sécurisée";
      if (error.message?.includes("User cancelled")) errorMsg = "Connexion annulée";
      if (error.message?.includes("disallowed")) errorMsg = "Permissions refusées";
      if (error.message?.includes("timed out")) errorMsg = "Le SDK Pi ne répond pas (Timeout)";

      toast.error(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  };

  return {
    loginWithPi,
    user,
    loading,
    handleIncompletePayment
  };
};
