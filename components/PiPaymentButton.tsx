"use client";

import { toast } from "sonner";

export default function PiPaymentButton() {
  const startPayment = async () => {
    try {
      // 1. Demande de paiement via le SDK Pi
      const payment = await window.Pi.createPayment({
        amount: 1.0,
        memo: "Recharge de compte Pimpay",
        metadata: { type: "wallet_deposit" },
      }, {
        // Appelé quand le wallet est prêt à ce que ton serveur approuve
        onReadyForServerApproval: async (paymentId: string) => {
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          if (!res.ok) throw new Error("Approbation serveur échouée");
        },
        // Appelé quand l'utilisateur a signé la transaction sur la blockchain
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
          if (res.ok) {
            toast.success("Transaction confirmée !");
          }
        },
        onCancel: (paymentId: string) => toast.info("Paiement annulé"),
        onError: (error: Error) => toast.error("Erreur Pi: " + error.message),
      });
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'initialiser le paiement");
    }
  };

  return (
    <button 
      onClick={startPayment}
      className="w-full h-14 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl font-black italic uppercase tracking-widest text-white shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
    >
      Payer 1 π
    </button>
  );
}
