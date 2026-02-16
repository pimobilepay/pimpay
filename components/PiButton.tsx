"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
  }
}

interface PiButtonProps {
  /** Montant en Pi a envoyer */
  amount: number;
  /** Texte descriptif du paiement */
  memo?: string;
  /** Callback apres succes */
  onSuccess?: (txid: string) => void;
  /** Callback en cas d'erreur */
  onError?: (error: string) => void;
  /** Label du bouton */
  label?: string;
}

/**
 * Bouton de paiement Pi Network pour PimPay
 * 
 * S'appuie sur PiInitializer pour l'init du SDK (charge dans layout.tsx).
 * Gere le flux complet: authenticate -> createPayment -> approve -> complete.
 */
export function PiButton({ amount, memo, onSuccess, onError, label }: PiButtonProps) {
  const [loading, setLoading] = useState(false);

  const ensureSdkReady = useCallback((): boolean => {
    if (typeof window === "undefined") return false;

    if (!window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser pour effectuer cette operation.");
      return false;
    }

    // Si le SDK est present mais pas encore initialise, on tente l'init
    if (!window.__PI_SDK_READY__) {
      try {
        window.Pi.init({ version: "2.0", sandbox: false });
        window.__PI_SDK_READY__ = true;
      } catch {
        // Deja initialise - on continue
        window.__PI_SDK_READY__ = true;
      }
    }

    return true;
  }, []);

  const handleIncompletePayment = useCallback(async (payment: any) => {
    console.log("[PimPay] Paiement incomplet detecte:", payment.identifier);
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
      console.error("[PimPay] Erreur traitement paiement incomplet:", error);
    }
  }, []);

  const handlePayment = async () => {
    if (!ensureSdkReady()) return;

    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    setLoading(true);
    const loadingToast = toast.loading("Connexion au reseau Pi...");

    try {
      // Etape 1: Authentification pour obtenir les scopes payments
      const auth = await window.Pi.authenticate(
        ["username", "payments", "wallet_address"],
        handleIncompletePayment
      );

      if (!auth || !auth.user) {
        throw new Error("Autorisation refusee par l'utilisateur.");
      }

      // Etape 2: Creation du paiement
      const paymentMemo = memo || `Depot PimPay - ${amount} Pi`;

      await window.Pi.createPayment(
        {
          amount: amount,
          memo: paymentMemo,
          metadata: {
            orderId: `pim-dep-${Date.now()}`,
            type: "deposit",
            app: "pimpay_core",
          },
        },
        {
          onReadyForServerApproval: async (paymentId: string) => {
            console.log("[PimPay] Approbation serveur pour:", paymentId);

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
            console.log("[PimPay] Paiement blockchain detecte, txid:", txid);

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
            setLoading(false);
          },

          onCancel: () => {
            toast.dismiss(loadingToast);
            toast.info("Paiement annule.");
            setLoading(false);
          },

          onError: (error: Error) => {
            toast.dismiss(loadingToast);
            console.error("[PimPay] Erreur SDK:", error.message);
            const msg = "Erreur reseau Pi. Veuillez reessayer.";
            toast.error(msg);
            onError?.(msg);
            setLoading(false);
          },
        }
      );
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("[PimPay] Erreur critique:", err);

      let errorMsg = "Action impossible pour le moment.";
      if (err.message?.includes("User cancelled")) errorMsg = "Connexion annulee.";
      if (err.message?.includes("disallowed")) errorMsg = "Permissions refusees.";
      if (err.message?.includes("timed out")) errorMsg = "Le SDK Pi ne repond pas.";
      if (err.message?.includes("not initialized")) errorMsg = "SDK Pi non initialise. Rechargez la page.";

      toast.error(errorMsg);
      onError?.(errorMsg);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading || !amount || amount <= 0}
      className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
        loading || !amount || amount <= 0
          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-blue-500/20"
      }`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Ouverture du wallet Pi...</span>
        </>
      ) : (
        label || `Deposer ${amount > 0 ? amount + " Pi" : ""}`
      )}
    </button>
  );
}

export default PiButton;
