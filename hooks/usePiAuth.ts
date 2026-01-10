"use client";

import { useState } from 'react';
import { toast } from "sonner";

// Définition des types pour le SDK Pi Network
declare global {
  interface Window {
    Pi: any;
  }
}

export const usePiAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  /**
   * Gère les paiements qui ont été interrompus (Checklist 10 du Mainnet)
   * Référence schéma : TransactionStatus.PENDING -> TransactionStatus.SUCCESS
   */
  const handleIncompletePayment = async (payment: any) => {
    console.warn("⚠️ PimPay - Récupération d'un paiement incomplet :", payment.identifier);

    try {
      const response = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid // Utilise l'ID de transaction blockchain
        }),
      });

      if (response.ok) {
        // Validation finale côté SDK pour débloquer le flux Pi
        await window.Pi.completePayment(payment.identifier);
        toast.success("Votre transaction a été récupérée et validée avec succès !");
      }
    } catch (error) {
      console.error("Erreur protocole Checklist 10 :", error);
    }
  };

  /**
   * Authentification principale synchronisée avec Prisma
   */
  const loginWithPi = async () => {
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Veuillez ouvrir PimPay via le Pi Browser.");
      return;
    }

    setLoading(true);
    try {
      const Pi = window.Pi;

      // 1. Demande l'authentification (username pour le profil, payments pour le wallet)
      const auth = await Pi.authenticate(
        ['username', 'payments'],
        handleIncompletePayment
      );

      /**
       * 2. Synchronisation Backend Prisma
       * On envoie le piUserId et l'accessToken au serveur
       */
      const response = await fetch("/api/auth/pi-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: auth.accessToken,
          piUserId: auth.user.uid,      // Correspond à User.piUserId dans ton schéma
          username: auth.user.username,  // Correspond à User.username
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur de synchronisation PimPay");
      }

      // 3. Mise à jour de l'état local
      setUser(auth.user);
      toast.success(`Heureux de vous revoir sur PimPay, ${auth.user.username} !`);

      return auth;
    } catch (error: any) {
      console.error("Erreur d'authentification Pi:", error);

      const errorMsg = error.message?.includes("User cancelled")
        ? "Connexion annulée"
        : "Échec de la connexion sécurisée Pi Network";

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
