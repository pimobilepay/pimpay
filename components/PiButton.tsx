"use client";

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
  /** Montant en Pi à envoyer */
  amount: number;
  /** Texte descriptif du paiement */
  memo?: string;
  /** Métadonnées supplémentaires */
  metadata?: Record<string, any>;
  /** Callback après succès — reçoit le txid */
  onSuccess?: (txid: string) => void;
  /** Callback en cas d'erreur */
  onError?: (error: string) => void;
  /** Label du bouton (par défaut: "Déposer X Pi") */
  label?: string;
  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * PiButton — Bouton de paiement Pi Network (U2A, Sandbox/Testnet)
 *
 * Flux conforme à la documentation officielle Pi Network :
 *   1. Pi.init({ version: "2.0", sandbox: true })   ← testnet
 *   2. Pi.authenticate(["username", "payments"], onIncompletePaymentFound)
 *   3. Pi.createPayment(data, { onReadyForServerApproval, onReadyForServerCompletion, onCancel, onError })
 *
 * Le backend reçoit :
 *   POST /api/payments/approve  → appelle https://api.minepi.com/v2/payments/:id/approve
 *   POST /api/payments/complete → appelle https://api.minepi.com/v2/payments/:id/complete
 */
export function PiButton({
  amount,
  memo,
  metadata = {},
  onSuccess,
  onError,
  label,
  className = "",
}: PiButtonProps) {
  const [loading, setLoading] = useState(false);
  const paymentInProgressRef = useRef(false);

  // ── Ensure SDK is initialised (sandbox: true — testnet) ─────────────────
  const ensureSdkReady = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    if (!window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser pour effectuer cette opération.");
      return false;
    }

    if (window.__PI_SDK_READY__) return true;

    if (window.__PI_SDK_INITIALIZING__) {
      const start = Date.now();
      while (Date.now() - start < 4000) {
        await new Promise((r) => setTimeout(r, 100));
        if (window.__PI_SDK_READY__) return true;
      }
      return false;
    }

    try {
      window.__PI_SDK_INITIALIZING__ = true;
      // SANDBOX = true → testnet (wallet non encore sur mainnet)
      window.Pi.init({ version: "2.0", sandbox: true });
      window.__PI_SDK_READY__ = true;
      window.__PI_SDK_INITIALIZING__ = false;
      console.log("[PimPay] Pi SDK 2.0 initialisé (sandbox / testnet)");
      return true;
    } catch (e: any) {
      window.__PI_SDK_INITIALIZING__ = false;
      if (e?.message?.includes("already")) {
        window.__PI_SDK_READY__ = true;
        return true;
      }
      console.error("[PimPay] Erreur init SDK Pi:", e);
      return false;
    }
  }, []);

  // ── onIncompletePaymentFound (OBLIGATOIRE selon la doc Pi) ───────────────
  // Appelé automatiquement par le SDK si un paiement précédent est resté en suspend.
  const onIncompletePaymentFound = useCallback(async (payment: any) => {
    console.log(
      "[PimPay] Paiement incomplet détecté:",
      payment.identifier,
      "txid:",
      payment.transaction?.txid
    );
    try {
      const res = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok && data.action === "completed") {
        toast.success(`Paiement récupéré : ${data.message}`);
      }
    } catch (err) {
      console.error("[PimPay] Erreur traitement paiement incomplet:", err);
    }
  }, []);

  // ── Main payment handler ─────────────────────────────────────────────────
  const handlePayment = async () => {
    if (paymentInProgressRef.current) {
      console.warn("[PimPay] Paiement déjà en cours");
      return;
    }

    if (!amount || amount <= 0) {
      toast.error("Veuillez entrer un montant valide.");
      return;
    }

    const sdkReady = await ensureSdkReady();
    if (!sdkReady) return;

    paymentInProgressRef.current = true;
    setLoading(true);
    const loadingToast = toast.loading("Connexion au réseau Pi...");

    try {
      // ── Step 1 : authenticate avec scope "payments" ──────────────────
      // OBLIGATOIRE avant createPayment — étend les permissions de l'utilisateur
      console.log("[PimPay] Authentification (scope: payments)...");
      const auth = await window.Pi.authenticate(
        ["username", "payments"],
        onIncompletePaymentFound
      );

      if (!auth?.user) {
        throw new Error("Autorisation refusée par l'utilisateur.");
      }
      console.log("[PimPay] Authentifié :", auth.user.username);

      toast.loading("Ouverture du wallet Pi...", { id: loadingToast });

      const paymentMemo = memo || `Dépôt PimPay — ${amount} Pi`;
      const paymentMetadata = {
        type: "BALANCE_TOPUP",
        currency: "PI",
        productId: "balance_topup",
        app: "pimpay_core",
        timestamp: new Date().toISOString(),
        ...metadata,
      };

      // ── Step 2 : createPayment avec les 3 callbacks obligatoires ────
      await new Promise<void>((resolve, reject) => {
        window.Pi.createPayment(
          {
            amount,
            memo: paymentMemo,
            metadata: paymentMetadata,
          },
          {
            // Phase I — Server-Side Approval
            // Le SDK passe le paymentId ; notre backend appelle /approve sur Pi Network
            onReadyForServerApproval: async (paymentId: string) => {
              console.log("[PimPay] onReadyForServerApproval:", paymentId);
              toast.loading("Approbation en cours...", { id: loadingToast });

              try {
                const res = await fetch("/api/payments/approve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    paymentId,
                    amount,
                    memo: paymentMemo,
                    ...paymentMetadata,
                  }),
                });

                if (!res.ok) {
                  const errData = await res.json();
                  console.error("[PimPay] Erreur approbation:", errData);
                  // Ne pas reject ici — Pi SDK appelle onError si nécessaire
                } else {
                  console.log("[PimPay] Paiement approuvé :", paymentId);
                  toast.loading(
                    "Signez la transaction dans Pi Browser...",
                    { id: loadingToast }
                  );
                }
              } catch (err) {
                console.error("[PimPay] Erreur réseau approbation:", err);
              }
            },

            // Phase III — Server-Side Completion
            // L'utilisateur a signé ; notre backend appelle /complete sur Pi Network
            // et crédite le solde interne PimPay
            onReadyForServerCompletion: async (
              paymentId: string,
              txid: string
            ) => {
              console.log(
                "[PimPay] onReadyForServerCompletion:",
                paymentId,
                "txid:",
                txid
              );
              toast.loading("Finalisation du dépôt...", { id: loadingToast });

              try {
                const res = await fetch("/api/payments/complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ paymentId, txid }),
                });

                toast.dismiss(loadingToast);

                if (res.ok) {
                  toast.success(`Dépôt de ${amount} Pi réussi !`, {
                    duration: 5000,
                  });
                  onSuccess?.(txid);
                } else {
                  // Le solde sera rattrapé par le recovery automatique
                  toast.info(
                    "Transaction validée — solde mis à jour dans quelques instants."
                  );
                  onSuccess?.(txid);
                }
              } catch (err) {
                console.error("[PimPay] Erreur réseau complétion:", err);
                toast.dismiss(loadingToast);
                toast.info(
                  "Transaction envoyée — vérifiez votre solde dans quelques instants."
                );
                onSuccess?.(txid);
              } finally {
                setLoading(false);
                paymentInProgressRef.current = false;
                resolve();
              }
            },

            // L'utilisateur a annulé
            onCancel: () => {
              toast.dismiss(loadingToast);
              toast.info("Paiement annulé.");
              setLoading(false);
              paymentInProgressRef.current = false;
              resolve();
            },

            // Erreur SDK Pi
            onError: (error: Error) => {
              toast.dismiss(loadingToast);
              console.error("[PimPay] Erreur SDK Pi:", error.message);
              const msg = "Erreur réseau Pi. Veuillez réessayer.";
              toast.error(msg);
              onError?.(msg);
              setLoading(false);
              paymentInProgressRef.current = false;
              reject(error);
            },
          }
        );
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("[PimPay] Erreur critique:", err);
      paymentInProgressRef.current = false;
      setLoading(false);

      let errorMsg = "Action impossible pour le moment.";
      if (
        err.message?.includes("User cancelled") ||
        err.message?.includes("cancelled")
      ) {
        errorMsg = "Paiement annulé.";
      } else if (
        err.message?.includes("disallowed") ||
        err.message?.includes("scope")
      ) {
        errorMsg = "Veuillez autoriser l'accès aux paiements dans Pi Browser.";
      } else if (
        err.message?.includes("timed out") ||
        err.message?.includes("timeout")
      ) {
        errorMsg = "Connexion expirée. Veuillez réessayer.";
      } else if (
        err.message?.includes("not initialized") ||
        err.message?.includes("init")
      ) {
        errorMsg = "SDK Pi non initialisé. Rechargez la page.";
      }

      toast.error(errorMsg, { duration: 5000 });
      onError?.(errorMsg);
    }
  };

  const isDisabled = loading || !amount || amount <= 0;

  return (
    <button
      onClick={handlePayment}
      disabled={isDisabled}
      className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 ${
        isDisabled
          ? "bg-slate-800 text-slate-500 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-blue-500/20 hover:from-blue-500 hover:to-indigo-600"
      } ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Ouverture du wallet Pi...</span>
        </>
      ) : (
        <>
          {/* Pi logo inline */}
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
          </svg>
          <span>{label ?? `Payer ${amount > 0 ? `${amount} Pi` : ""} avec Pi`}</span>
        </>
      )}
    </button>
  );
}

export default PiButton;
