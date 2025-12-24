"use client";

import { toast } from "sonner";

export const usePiPayment = () => {
  const handlePayment = async (amount: number, memo: string) => {
    if (!window.Pi) {
      toast.error("Le SDK Pi n'est pas chargé");
      return;
    }

    try {
      // 1. Appeler ton API pour créer la commande
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, memo }),
      });
      const { orderId } = await res.json();

      // 2. Lancer le paiement via le SDK Pi
      const payment = await window.Pi.createPayment({
        amount: amount,
        memo: memo,
        metadata: { orderId: orderId },
      }, {
        // Fonctions de rappel (Callbacks)
        onReadyForServerApproval: (paymentId: string) => {
          console.log("Paiement prêt pour approbation :", paymentId);
          // Ici, tu devrais envoyer le paymentId à ton serveur pour validation
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log("Paiement terminé :", txid);
          toast.success("Paiement réussi !");
        },
        onCancel: (paymentId: string) => toast.info("Paiement annulé"),
        onError: (error: Error, payment?: any) => toast.error("Erreur Pi: " + error.message),
      });

    } catch (error: any) {
      console.error(error);
      toast.error("Échec du transfert");
    }
  };

  return { handlePayment };
};
