"use client";

import { useState } from "react";
import { toast } from "sonner";

export const PiButton = ({ amount }: { amount: number }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Le SDK Pi n'est pas chargé");
      return;
    }

    setLoading(true);

    try {
      await window.Pi.createPayment({
        amount: amount,
        memo: `Dépôt PimPay - ${amount} Pi`,
        metadata: { orderId: `pim-${Date.now()}` },
        callbacks: {
          // Étape 1 : Approbation par ton serveur
          onReadyForServerApproval: async (paymentId: string) => {
            console.log("[Pi SDK] Approbation requise pour ID:", paymentId);
            const res = await fetch("/api/payments/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId }),
            });
            if (!res.ok) throw new Error("Approbation serveur échouée");
          },
          // Étape 2 : Finalisation après la blockchain
          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            console.log("[Pi SDK] Finalisation blockchain TX:", txid);
            const res = await fetch("/api/payments/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, txid }),
            });
            if (res.ok) {
              toast.success("Paiement réussi !");
            }
            setLoading(false);
          },
          onCancel: (paymentId: string) => {
            console.log("[Pi SDK] Paiement annulé:", paymentId);
            setLoading(false);
            toast.info("Transaction annulée");
          },
          onError: (error: Error, payment?: any) => {
            console.error("[Pi SDK] Erreur fatale:", error.message);
            toast.error("Erreur de transaction : " + error.message);
            setLoading(false);
          },
        },
      });
    } catch (err) {
      console.error("Erreur critique bouton:", err);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || amount <= 0}
      className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
        loading || amount <= 0
        ? "bg-slate-800 text-slate-500 cursor-not-allowed"
        : "bg-gradient-to-r from-orange-500 to-yellow-600 text-white shadow-orange-500/20"
      }`}
    >
      {loading ? (
        <>
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          TRAITEMENT...
        </>
      ) : (
        `Confirmer le dépôt de ${amount} Pi`
      )}
    </button>
  );
};

export default PiButton;
