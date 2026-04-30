"use client";

import { getErrorMessage } from '@/lib/error-utils';
import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
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
  const paymentInProgressRef = useRef(false);

  const ensureSdkReady = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    if (!window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser pour effectuer cette operation.");
      return false;
    }

    // Deja pret
    if (window.__PI_SDK_READY__) return true;

    // En cours d'init
    if (window.__PI_SDK_INITIALIZING__) {
      // Attendre max 3s
      const start = Date.now();
      while (Date.now() - start < 3000) {
        await new Promise(r => setTimeout(r, 100));
        if (window.__PI_SDK_READY__) return true;
      }
      return false;
    }

    // Tenter l'init
    try {
      window.__PI_SDK_INITIALIZING__ = true;
      window.Pi.init({ version: "2.0", sandbox: false });
      window.__PI_SDK_READY__ = true;
      window.__PI_SDK_INITIALIZING__ = false;
      return true;
    } catch (e: unknown) {
      window.__PI_SDK_INITIALIZING__ = false;
      if ((e as Error)?.message?.includes("already")) {
        window.__PI_SDK_READY__ = true;
        return true;
      }
      return false;
    }
  }, []);

  const handleIncompletePayment = useCallback(async (payment: { identifier: string; transaction?: { txid: string } }) => {
    console.log("[PimPay] Paiement incomplet detecte:", payment.identifier, "txid:", payment.transaction?.txid);
    try {
      const res = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid || null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.action === "completed") {
        toast.success(`Paiement recupere: ${data.message}`);
      }
    } catch (error) {
      console.error("[PimPay] Erreur traitement paiement incomplet:", error);
    }
  }, []);

  const handlePayment = async () => {
    // Eviter les doubles paiements
    if (paymentInProgressRef.current) {
      console.warn("[PimPay] Paiement deja en cours");
      return;
    }

    const sdkReady = await ensureSdkReady();
    if (!sdkReady) return;

    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    paymentInProgressRef.current = true;
    setLoading(true);
    const loadingToast = toast.loading("Connexion au reseau Pi...");

    try {
      // Etape 1: Authentification pour obtenir les scopes payments
      console.log("[PimPay] Authentification pour paiement...");
      const auth = await window.Pi.authenticate(
        ["username", "payments"],
        handleIncompletePayment
      );

      if (!auth || !auth.user) {
        throw new Error("Autorisation refusee par l'utilisateur.");
      }

      console.log("[PimPay] Authentifie, creation du paiement...");
      toast.loading("Ouverture du wallet Pi...", { id: loadingToast });

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
            toast.loading("Approbation en cours...", { id: loadingToast });

            const res = await fetch("/api/payments/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                paymentId,
                amount,
                memo: paymentMemo,
              }),
            });

            if (!res.ok) {
              const errorData = await res.json();
              console.error("[PimPay] Erreur approbation:", errorData);
              throw new Error(errorData.error || "Approbation refusee par le serveur.");
            }

            console.log("[PimPay] Paiement approuve, en attente signature utilisateur...");
            toast.loading("Signez la transaction dans Pi Browser...", { id: loadingToast });
            return res.json();
          },

          onReadyForServerCompletion: async (paymentId: string, txid: string) => {
            console.log("[PimPay] Transaction blockchain confirmee, txid:", txid);
            toast.loading("Finalisation du depot...", { id: loadingToast });

            const res = await fetch("/api/payments/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ paymentId, txid }),
            });

            toast.dismiss(loadingToast);
            paymentInProgressRef.current = false;

            if (res.ok) {
              toast.success(`Depot de ${amount} Pi reussi !`, { duration: 5000 });
              onSuccess?.(txid);
            } else {
              // Meme si la completion echoue, le paiement sera recupere plus tard
              toast.info("Le solde sera mis a jour dans quelques instants.");
              onSuccess?.(txid);
            }
            setLoading(false);
          },

          onCancel: () => {
            toast.dismiss(loadingToast);
            toast.info("Paiement annule.");
            setLoading(false);
            paymentInProgressRef.current = false;
          },

          onError: (error: Error) => {
            toast.dismiss(loadingToast);
            console.error("[PimPay] Erreur SDK:", getErrorMessage(error));
            const msg = "Erreur reseau Pi. Veuillez reessayer.";
            toast.error(msg);
            onError?.(msg);
            setLoading(false);
            paymentInProgressRef.current = false;
          },
        }
      );
    } catch (err: unknown) {
      toast.dismiss(loadingToast);
      console.error("[PimPay] Erreur critique:", err);
      paymentInProgressRef.current = false;

      let errorMsg = "Action impossible pour le moment.";
      if (getErrorMessage(err)?.includes("User cancelled") || getErrorMessage(err)?.includes("cancelled")) {
        errorMsg = "Paiement annule.";
      } else if (getErrorMessage(err)?.includes("disallowed") || getErrorMessage(err)?.includes("scope")) {
        errorMsg = "Veuillez autoriser l'acces aux paiements.";
      } else if (getErrorMessage(err)?.includes("timed out") || getErrorMessage(err)?.includes("timeout")) {
        errorMsg = "Connexion expiree. Veuillez reessayer.";
      } else if (getErrorMessage(err)?.includes("not initialized") || getErrorMessage(err)?.includes("init")) {
        errorMsg = "SDK Pi non initialise. Rechargez la page.";
      }

      toast.error(errorMsg, { duration: 5000 });
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
