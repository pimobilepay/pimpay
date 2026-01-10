"use client";

import { toast } from "sonner";

export const createPimpayTransfer = async (amount: number, memo: string, recipientId: string) => {
  if (!window.Pi) {
    toast.error("Ouvrez Pimpay dans le Pi Browser pour effectuer des paiements.");
    return;
  }

  // Lancement du flux de paiement Pi Network
  window.Pi.createPayment({
    amount: amount,
    memo: memo,
    metadata: { 
      recipientId: recipientId, // ID de l'utilisateur qui reçoit dans ton Prisma
      app: "pimpay_core" 
    },
  }, {
    // ÉTAPE 1 : Ton serveur enregistre la transaction comme "PENDING" et approuve l'ID
    onReadyForServerApproval: async (paymentId: string) => {
      console.log("Approbation du paiement :", paymentId);
      
      const res = await fetch("/api/pi/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, amount, recipientId }),
      });

      if (!res.ok) throw new Error("Le serveur Pimpay a refusé l'approbation.");
      return res.json();
    },

    // ÉTAPE 2 : L'utilisateur a signé. On valide la transaction blockchain sur ton serveur.
    onReadyForServerCompletion: async (paymentId: string, txid: string) => {
      console.log("Signature détectée. TXID :", txid);
      
      const res = await fetch("/api/pi/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, txid }),
      });

      if (res.ok) {
        toast.success("Transaction enregistrée sur le Ledger !");
        // Optionnel : Redirection vers la page de succès
        window.location.href = `/dashboard/transactions/${paymentId}`;
      }
      return res.json();
    },

    onCancel: (paymentId: string) => {
      console.log("Paiement annulé :", paymentId);
      toast.warning("Paiement annulé.");
    },

    onError: (error: Error, payment?: any) => {
      console.error("Erreur de paiement :", error);
      toast.error("Échec du paiement Pi Network.");
    },
  });
};
