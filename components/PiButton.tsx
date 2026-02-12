"use client";

import { useState } from "react";
import { toast } from "sonner";

export const PiButton = ({ amount }: { amount: number }) => {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Le SDK Pi n'est pas chargé. Ouvrez PimPay dans le Pi Browser.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Initialisation sécurisée...");

    try {
      // 🛡️ IMPORTANT : On s'assure d'abord que la session est valide
      const scopes = ['payments', 'wallet_address'];
      await window.Pi.authenticate(scopes, (onIncompletePayment) => {
          console.log("Paiement incomplet trouvé:", onIncompletePayment);
      });

      // 🚀 Lancement du paiement avec les DEUX arguments séparés
      await window.Pi.createPayment({
        // Argument 1 : Les données du paiement
        amount: amount,
        memo: `Dépôt PimPay - ${amount} Pi`,
        metadata: { orderId: `pim-${Date.now()}`, type: "deposit" },
      }, {
        // Argument 2 : Les callbacks (Le moteur de l'action)
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("[PIMPAY] Approbation en cours pour:", paymentId);
          
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // On envoie aussi amount pour que le serveur sache quoi enregistrer
            body: JSON.stringify({ paymentId, amount }), 
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Approbation refusée");
          }
          
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("[PIMPAY] Finalisation Blockchain TX:", txid);
          
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });

          toast.dismiss(loadingToast);
          if (res.ok) {
            toast.success("Bravo ! Votre solde PimPay a été crédité.", { duration: 5000 });
            // Optionnel: Redirection vers le wallet ici
          } else {
            toast.error("Erreur de synchronisation finale.");
          }
          setLoading(false);
        },
        onCancel: (paymentId: string) => {
          toast.dismiss(loadingToast);
          console.log("[PIMPAY] Utilisateur a annulé:", paymentId);
          setLoading(false);
          toast.info("Transaction annulée.");
        },
        onError: (error: Error, payment?: any) => {
          toast.dismiss(loadingToast);
          console.error("[PIMPAY] Erreur SDK:", error.message);
          toast.error("Le SDK Pi a rencontré une erreur.");
          setLoading(false);
        },
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("Erreur critique bouton:", err);
      toast.error(err.message || "Erreur d'initialisation");
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
          COMMUNICATION SDK...
        </>
      ) : (
        `Confirmer le dépôt de ${amount} Pi`
      )}
    </button>
  );
};

export default PiButton;
