"use client";

import { useState } from "react";
import { toast } from "sonner";

// On le nomme PiButton pour correspondre à l'import dans app/deposit/page.tsx
export const PiButton = ({ amount }: { amount: number }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    // @ts-ignore
    if (!window.Pi) {
      toast.error("Le SDK Pi n'est pas encore chargé. Réessayez dans un instant.");
      return;
    }

    setLoading(true);

    try {
      // @ts-ignore
      await window.Pi.createPayment({
        amount: amount,
        memo: `Dépôt de ${amount} Pi sur votre compte PimPay`,
        metadata: {
          type: "deposit",
          wallet_id: "pimpay_core_ledger"
        },
      }, {
        onReadyForServerApproval: (paymentId: string) => {
          console.log("Approbation, ID:", paymentId);
          return fetch("/api/payments/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId }),
          });
        },
        onReadyForServerCompletion: (paymentId: string, txid: string) => {
          console.log("Complété, TXID:", txid);
          toast.success("Transaction réussie ! Solde mis à jour.");
          setLoading(false);
          return fetch("/api/payments/complete", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid }),
          });
        },
        onCancel: (paymentId: string) => {
          console.log("Annulé");
          setLoading(false);
        },
        onError: (error: Error, payment?: any) => {
          console.error("Erreur:", error);
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
      className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] ${
        loading || amount <= 0 
        ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
        : "bg-gradient-to-r from-orange-500 to-yellow-600 text-white shadow-orange-500/20"
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Traitement...
        </span>
      ) : (
        `Confirmer le dépôt de ${amount} Pi`
      )}
    </button>
  );
};

// On garde l'export default par sécurité si tu l'utilises ailleurs
export default PiButton;
