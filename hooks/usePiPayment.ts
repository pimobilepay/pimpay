"use client";

import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
  }
}

export const usePiPayment = () => {

  const ensureSdkReady = (): boolean => {
    if (typeof window === "undefined") return false;
    if (!window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser pour effectuer cette operation.");
      return false;
    }
    if (!window.__PI_SDK_READY__) {
      try {
        window.Pi.init({ version: "2.0", sandbox: false });
        window.__PI_SDK_READY__ = true;
      } catch {
        window.__PI_SDK_READY__ = true;
      }
    }
    return true;
  };

  const handleIncompletePayment = async (payment: any) => {
    try {
      await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid,
        }),
      });
    } catch (error) {
      console.error("[PimPay] Erreur paiement incomplet:", error);
    }
  };

  const handlePayment = async (
    amount: number,
    memo: string,
    onSuccess?: (txid: string) => void,
    onError?: (error: string) => void
  ) => {
    if (!ensureSdkReady()) return;

    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    const loadingToast = toast.loading("Ouverture du Pi Wallet...");

    try {
      // Verifier si on a une session Pi active (utilisateur deja authentifie)
      const piSession = localStorage.getItem("pimpay_user");
      
      if (!piSession) {
        toast.dismiss(loadingToast);
        toast.error("Veuillez d'abord vous connecter via Pi Network.");
        return;
      }

      const paymentMemo = memo || `Depot PimPay - ${amount} Pi`;

      // Lancer le paiement via le SDK Pi avec approbation instantanee
      await window.Pi.createPayment(
        {
          amount,
          memo: paymentMemo,
          metadata: {
            orderId: `pim-dep-${Date.now()}`,
            type: "deposit",
            app: "pimpay_core",
          },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            // Approbation serveur instantanee - pas d'admin requis
            const res = await fetch("/api/payments/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId,
                amount,
                memo: paymentMemo,
              }),
            });

            if (!res.ok) {
              const errorData = await res.json();
              throw new Error(errorData.error || "Approbation refusee par le serveur.");
            }

            return res.json();
          },

          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            // Completion automatique cote serveur
            const res = await fetch("/api/payments/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentId, txid }),
            });

            toast.dismiss(loadingToast);

            if (res.ok) {
              toast.success(`Depot de ${amount} Pi reussi !`, { duration: 5000 });
              onSuccess?.(txid);
            } else {
              toast.info("Le solde sera mis a jour dans quelques instants.");
              onSuccess?.(txid);
            }
          },

          onCancel: () => {
            toast.dismiss(loadingToast);
            toast.info("Paiement annule.");
          },

          onError: (error: Error) => {
            toast.dismiss(loadingToast);
            const msg = "Erreur reseau Pi. Veuillez reessayer.";
            toast.error(msg);
            onError?.(msg);
          },
        }
      );
    } catch (error: any) {
      toast.dismiss(loadingToast);

      let errorMsg = "Action impossible pour le moment.";
      if (error.message?.includes("User cancelled")) errorMsg = "Connexion annulee.";
      if (error.message?.includes("disallowed")) errorMsg = "Permissions refusees.";
      if (error.message?.includes("timed out")) errorMsg = "Le SDK Pi ne repond pas.";
      if (error.message?.includes("not initialized")) errorMsg = "SDK Pi non initialise. Rechargez la page.";

      toast.error(errorMsg);
      onError?.(errorMsg);
    }
  };

  return { handlePayment };
};
