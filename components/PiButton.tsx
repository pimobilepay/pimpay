"use client";

import { useState } from "react";
import { toast } from "sonner";

export default function ReceivePiButton({ amount }: { amount: number }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (!window.Pi) {
      toast.error("Le SDK Pi n'est pas encore chargé. Réessayez dans 2 secondes.");
      return;
    }

    setLoading(true);

    try {
      const payment = await window.Pi.createPayment({
        // 1. Le montant en Pi réel
        amount: amount,
        // 2. L'explication pour l'utilisateur
        memo: `Dépôt de ${amount} Pi sur votre compte PimPay`,
        // 3. Les métadonnées pour ton serveur
        metadata: { 
          type: "deposit",
          wallet_id: "pimpay_core_ledger" 
        },
      }, {
        // CALLBACKS OBLIGATOIRES POUR LE SDK
        onReadyForServerApproval: (paymentId: string) => {
          console.log("Paiement approuvé par l'utilisateur, ID:", paymentId);
          // Ici, on enverra l'ID au backend pour approbation finale
          return fetch("/api/payments/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId }),
          });
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log("Paiement complété sur la blockchain, TXID:", txid);
          toast.success("Transaction réussie ! Votre solde PimPay sera mis à jour.");
          return fetch("/api/payments/complete", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid }),
          });
        },
        onCancel: (paymentId: string) => {
          console.log("Paiement annulé par l'utilisateur");
          setLoading(false);
        },
        onError: (error: Error, payment?: any) => {
          console.error("Erreur de paiement Pi:", error);
          toast.error("Le paiement a échoué.");
          setLoading(false);
        },
      });
    } catch (err) {
      console.error("Erreur critique:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || amount <= 0}
      className={`w-full py-4 rounded-2xl font-bold transition-all ${
        loading ? "bg-gray-600" : "bg-gradient-to-r from-orange-500 to-yellow-500"
      }`}
    >
      {loading ? "Traitement en cours..." : `Confirmer le dépôt de ${amount} Pi`}
    </button>
  );
}
