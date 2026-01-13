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
        toast.success("Transaction récupérée et validée !");
      }
    } catch (error) {
      console.error("Erreur protocole Checklist 10 :", error);
    }
  };

  /**
   * Authentification Pi Network synchronisée avec Prisma
   */
  const loginWithPi = async () => {
    // 1. Vérification de l'environnement Pi Browser
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Veuillez ouvrir PimPay via le Pi Browser.");
      return null;
    }

    setLoading(true);

    try {
      const Pi = window.Pi;

      // 2. Authentification avec Scopes
      // L'utilisateur doit valider la fenêtre d'autorisation Pi ici
      const auth = await Pi.authenticate(
        ['username', 'payments'],
        handleIncompletePayment
      );

      if (!auth || !auth.user) {
        throw new Error("Autorisation refusée par l'utilisateur.");
      }

      /**
       * 3. Synchronisation Backend Prisma
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

      // 4. Succès
      setUser(auth.user);
      
      // Stockage pour la session Elara
      localStorage.setItem("pimpay_user", JSON.stringify(result.user));

      return result; // On retourne le résultat de l'API (qui contient le rôle, etc.)
      
    } catch (error: any) {
      console.error("Erreur d'authentification Pi:", error);

      let errorMsg = "Échec de la connexion sécurisée";
      if (error.message?.includes("User cancelled")) errorMsg = "Connexion annulée";
      if (error.message?.includes("timed out")) errorMsg = "Le SDK Pi ne répond pas (Timeout)";

      toast.error(errorMsg);
      return null;
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
