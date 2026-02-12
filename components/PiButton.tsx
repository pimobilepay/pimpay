"use client";

import { useState } from "react";
import { toast } from "sonner";

export const PiButton = ({ amount }: { amount: number }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    // 1. Sécurité de base
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser");
      return;
    }

    if (amount <= 0) {
      toast.error("Veuillez entrer un montant");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Connexion au réseau Pi...");

    try {
      // 🚀 LANCEMENT DIRECT : On ne refait pas authenticate() pour ne pas compliquer
      // le flux puisque l'utilisateur est déjà sur sa session PimPay.
      
      await window.Pi.createPayment({
        // Argument 1 : Les détails financiers
        amount: amount,
        memo: `Dépôt PimPay - ${amount} Pi`,
        metadata: { orderId: `pim-${Date.now()}`, type: "deposit" },
      }, {
        // Argument 2 : Les étapes de validation
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("[PIMPAY] En attente d'approbation serveur...");
          
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // On envoie tout ce que ton API attend
            body: JSON.stringify({ 
              paymentId, 
              amount, 
              memo: `Dépôt PimPay - ${amount} Pi` 
            }),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Approbation refusée");
          }

          return res.json();
        },

        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("[PIMPAY] Paiement Blockchain détecté, finalisation...");

          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });

          toast.dismiss(loadingToast);
          if (res.ok) {
            toast.success(`Dépôt de ${amount} Pi réussi !`, { duration: 5000 });
            // Le solde sera mis à jour automatiquement via ton API complete
          } else {
            toast.error("Le solde sera mis à jour dans quelques instants.");
          }
          setLoading(false);
        },

        onCancel: (paymentId: string) => {
          toast.dismiss(loadingToast);
          console.log("[PIMPAY] Annulé par l'utilisateur");
          setLoading(false);
        },

        onError: (error: Error, payment?: any) => {
          toast.dismiss(loadingToast);
          console.error("[PIMPAY] Erreur SDK:", error.message);
          toast.error("Erreur réseau Pi. Réessayez.");
          setLoading(false);
        },
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("Erreur critique:", err);
      toast.error(err.message || "Action impossible pour le moment");
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
        : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-blue-500/20"
      }`}
    >
      {loading ? (
        <>
          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          OUVERTURE DU WALLET PI...
        </>
      ) : (
        `Confirmer le dépôt de ${amount} Pi`
      )}
    </button>
  );
};

export default PiButton;
