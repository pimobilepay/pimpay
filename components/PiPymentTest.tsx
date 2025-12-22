"use client";

import { useEffect } from "react";
import { toast } from "sonner";

export default function PiPaymentTest() {
  
  const handlePayment = async () => {
    try {
      const payment = await window.Pi.createPayment({
        amount: 1,
        memo: "Test de paiement Pimpay",
        metadata: { productId: "test-123" },
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          // Étape 1 : Le serveur approuve le paiement
          await fetch("/api/payments/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId }),
          });
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          // Étape 2 : Le serveur finalise après avoir vu la transaction sur la blockchain
          await fetch("/api/payments/complete", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid }),
          });
          toast.success("Paiement réussi !");
        },
        onCancel: (paymentId: string) => console.log("Annulé"),
        onError: (error: Error, paymentId?: string) => {
          console.error(error);
          toast.error("Erreur de paiement");
        },
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button 
      onClick={handlePayment}
      className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold"
    >
      Tester paiement 1 π (Testnet)
    </button>
  );
}
