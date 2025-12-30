"use client"

import { useState } from 'react';
import { toast } from "sonner";

export const usePiAuth = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  /**
   * Gère les paiements qui ont été interrompus (Checklist 10)
   */
  const handleIncompletePayment = async (payment: any) => {
    console.log("⚠️ Paiement incomplet détecté par le SDK :", payment);
    
    try {
      const response = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentId: payment.identifier, 
          txid: payment.transaction.txid 
        }),
      });

      if (response.ok) {
        // @ts-ignore
        await window.Pi.completePayment(payment.identifier);
        toast.success("Transaction interrompue récupérée et validée !");
      }
    } catch (error) {
      console.error("Erreur lors de la résolution du paiement incomplet :", error);
    }
  };

  /**
   * Authentification principale via Pi Browser
   */
  const loginWithPi = async () => {
    setLoading(true);
    try {
      // @ts-ignore
      const Pi = window.Pi;

      if (!Pi) {
        throw new Error("Le SDK Pi n'est pas disponible. Utilisez le Pi Browser.");
      }

      // 1. Demander l'authentification avec gestion des paiements incomplets
      const auth = await Pi.authenticate(
        ['username', 'payments'], 
        handleIncompletePayment // Passé comme callback de secours
      );

      // 2. Stocker les infos utilisateur
      setUser(auth.user);
      toast.success(`Bienvenue, ${auth.user.username} !`);

      // 3. Logique de session (facultatif : stocker le token en cookie ou localStorage)
      console.log("Pi Access Token récupéré");

      return auth;
    } catch (error: any) {
      console.error("Erreur d'authentification Pi:", error);
      
      // Message plus clair pour l'utilisateur
      const errorMsg = error.message?.includes("User cancelled") 
        ? "Connexion annulée" 
        : "Échec de la connexion Pi Network";
        
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return { 
    loginWithPi, 
    user, 
    loading,
    handleIncompletePayment // On l'expose au cas où on en aurait besoin ailleurs
  };
};
