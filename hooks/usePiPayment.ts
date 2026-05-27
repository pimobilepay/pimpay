"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
    __PI_AUTH_WITH_PAYMENTS__: boolean;
  }
}

interface PaymentConfig {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}

/**
 * Hook pour les paiements Pi Network (U2A - User to App)
 *
 * Flux conforme à la documentation officielle Pi Network :
 * 1. Pi.init({ version: "2.0", sandbox: true })  — mainnet
 * 2. Pi.authenticate(["username", "payments"], onIncompletePaymentFound)
 * 3. Pi.createPayment(data, { onReadyForServerApproval, onReadyForServerCompletion, onCancel, onError })
 *
 * Le backend appelle :
 *   POST https://api.minepi.com/v2/payments/:id/approve    — dans onReadyForServerApproval
 *   POST https://api.minepi.com/v2/payments/:id/complete   — dans onReadyForServerCompletion
 * avec Authorization: Key <PI_API_KEY>
 */
export const usePiPayment = () => {
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const paymentInProgressRef = useRef(false);

  // ─── SDK Init (mainnet, sandbox: true) ──────────────────────────────────
  const initializePiSDK = useCallback((): boolean => {
    if (typeof window === "undefined" || !window.Pi) return false;
    if (window.__PI_SDK_READY__) return true;
    if (window.__PI_SDK_INITIALIZING__) return false;

    try {
      window.__PI_SDK_INITIALIZING__ = true;
      // IMPORTANT: sandbox MUST be false for mainnet / App Store production
      window.Pi.init({ version: "2.0", sandbox: true });
      window.__PI_SDK_READY__ = true;
      window.__PI_SDK_INITIALIZING__ = false;
      console.log("[PimPay] Pi SDK 2.0 initialisé (mainnet)");
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

  // ─── Wait for SDK ─────────────────────────────────────────────────────────
  const waitForPiSDK = useCallback(
    async (maxWait = 10000): Promise<boolean> => {
      const start = Date.now();
      while (Date.now() - start < maxWait) {
        if (window.__PI_SDK_READY__) return true;
        if (window.Pi) {
          if (initializePiSDK()) return true;
        }
        await new Promise((r) => setTimeout(r, 100));
      }
      return window.__PI_SDK_READY__ || false;
    },
    [initializePiSDK]
  );

  // ─── onIncompletePaymentFound (REQUIRED by Pi Network docs) ──────────────
  // Called automatically by Pi SDK when a stale payment is found during authenticate.
  // Must complete or cancel the in-flight payment via the backend — never ignore it.
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

      if (res.ok) {
        console.log(
          `[PimPay] Paiement incomplet ${payment.identifier} traité: ${data.action}`
        );
        if (data.action === "completed") {
          toast.success(`Paiement récupéré: ${data.message}`);
        }
      } else {
        console.error("[PimPay] Échec traitement paiement incomplet:", data);
      }
    } catch (err) {
      console.error(
        "[PimPay] Erreur réseau — traitement paiement incomplet:",
        err
      );
    }
  }, []);

  // ─── Authenticate with payments scope ────────────────────────────────────
  // Pi Network requires authenticate() with "payments" scope before createPayment.
  // We run it once per session (guarded by __PI_AUTH_WITH_PAYMENTS__).
  const authenticateWithPayments = useCallback(async (): Promise<boolean> => {
    if (!window.Pi) return false;

    // Already done in this session — skip to avoid a second auth dialog
    if (window.__PI_AUTH_WITH_PAYMENTS__) return true;

    try {
      await window.Pi.authenticate(
        ["username", "payments"],
        onIncompletePaymentFound
      );
      window.__PI_AUTH_WITH_PAYMENTS__ = true;
      console.log("[PimPay] Authentification Pi (scope: payments) OK");
      return true;
    } catch (e: any) {
      // If the user is already authenticated the SDK may throw "already authenticated"
      // — treat that as success so createPayment can proceed.
      if (
        e?.message?.includes("already") ||
        e?.message?.includes("authenticated")
      ) {
        window.__PI_AUTH_WITH_PAYMENTS__ = true;
        console.log("[PimPay] Pi déjà authentifié (scope payments assumé OK)");
        return true;
      }
      console.error("[PimPay] Erreur authenticate Pi:", e);
      return false;
    }
  }, [onIncompletePaymentFound]);

  // ─── Create Payment (U2A) ─────────────────────────────────────────────────
  const createPayment = useCallback(
    async (
      config: PaymentConfig
    ): Promise<{ success: boolean; txid?: string; error?: string }> => {
      if (typeof window === "undefined") {
        return { success: false, error: "SSR non supporté" };
      }

      if (paymentInProgressRef.current) {
        console.warn("[PimPay] Paiement déjà en cours");
        return { success: false, error: "Un paiement est déjà en cours" };
      }

      paymentInProgressRef.current = true;
      setLoading(true);

      try {
        // Step 1: Ensure SDK is ready (sandbox: true / mainnet)
        const sdkReady = await waitForPiSDK(10000);
        if (!sdkReady || !window.Pi) {
          const msg = !window.Pi
            ? "Veuillez ouvrir PimPay dans le Pi Browser."
            : "Le SDK Pi n'a pas pu s'initialiser. Rechargez la page.";
          toast.error(msg, { duration: 5000 });
          return { success: false, error: msg };
        }

        // Step 2: Authenticate with "payments" scope BEFORE createPayment
        // This is mandatory per the official Pi Network documentation.
        const authed = await authenticateWithPayments();
        if (!authed) {
          const msg =
            "Authentification Pi échouée. Vérifiez que vous utilisez Pi Browser.";
          toast.error(msg, { duration: 5000 });
          return { success: false, error: msg };
        }

        console.log("[PimPay] Création paiement Pi:", config);

        // Step 3: createPayment with the three-way handshake callbacks
        return new Promise((resolve) => {
          window.Pi.createPayment(
            {
              amount: config.amount,
              memo: config.memo,
              metadata: config.metadata,
            },
            {
              // ── Phase I: Server-Side Approval ──────────────────────────
              // Backend calls POST https://api.minepi.com/v2/payments/:id/approve
              onReadyForServerApproval: async (id: string) => {
                console.log("[PimPay] onReadyForServerApproval:", id);
                setPaymentId(id);

                try {
                  const res = await fetch("/api/payments/approve", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                      paymentId: id,
                      amount: config.amount,
                      memo: config.memo,
                      ...config.metadata,
                    }),
                  });

                  const data = await res.json();

                  if (!res.ok) {
                    console.error("[PimPay] Erreur approbation serveur:", data);
                    toast.error(data.error || "Erreur lors de l'approbation");
                    // Do not resolve here — Pi SDK will call onError or onCancel
                  } else {
                    console.log("[PimPay] Paiement approuvé par le serveur:", id);
                  }
                } catch (err: any) {
                  console.error("[PimPay] Erreur réseau approbation:", err);
                  toast.error("Erreur réseau lors de l'approbation");
                }
              },

              // ── Phase III: Server-Side Completion ──────────────────────
              // Backend calls POST https://api.minepi.com/v2/payments/:id/complete
              onReadyForServerCompletion: async (id: string, txid: string) => {
                console.log(
                  "[PimPay] onReadyForServerCompletion:",
                  id,
                  "txid:",
                  txid
                );

                try {
                  const res = await fetch("/api/payments/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ paymentId: id, txid }),
                  });

                  const data = await res.json();

                  if (!res.ok) {
                    console.error("[PimPay] Erreur completion serveur:", data);
                    toast.error(data.error || "Erreur lors de la complétion");
                    resolve({ success: false, error: data.error });
                  } else {
                    console.log("[PimPay] Paiement complété:", id);
                    toast.success(`Recharge de ${config.amount} Pi effectuée !`);
                    resolve({ success: true, txid });
                  }
                } catch (err: any) {
                  console.error("[PimPay] Erreur réseau complétion:", err);
                  toast.error("Erreur réseau lors de la complétion");
                  resolve({ success: false, error: "Erreur réseau" });
                }
              },

              // ── User cancelled ─────────────────────────────────────────
              onCancel: (id: string) => {
                console.log("[PimPay] Paiement annulé:", id);
                toast.info("Paiement annulé");
                resolve({
                  success: false,
                  error: "Paiement annulé par l'utilisateur",
                });
              },

              // ── SDK error ──────────────────────────────────────────────
              onError: (error: Error, payment?: any) => {
                console.error("[PimPay] Erreur paiement SDK:", error, payment);
                toast.error(error.message || "Erreur lors du paiement");
                resolve({ success: false, error: error.message });
              },
            }
          );
        });
      } catch (err: any) {
        console.error("[PimPay] Erreur création paiement:", err);
        toast.error(err.message || "Erreur lors du paiement");
        return { success: false, error: err.message };
      } finally {
        setLoading(false);
        paymentInProgressRef.current = false;
      }
    },
    [waitForPiSDK, authenticateWithPayments]
  );

  // ─── createBalanceTopUp (dépôt Pi → solde interne PimPay) ─────────────────
  const createBalanceTopUp = useCallback(
    async (
      amount: number
    ): Promise<{ success: boolean; txid?: string; error?: string }> => {
      if (amount <= 0) {
        toast.error("Le montant doit être supérieur à 0");
        return { success: false, error: "Montant invalide" };
      }

      return createPayment({
        amount,
        memo: `Recharge PimPay: ${amount} Pi`,
        metadata: {
          type: "BALANCE_TOPUP",
          currency: "PI",
          productId: "balance_topup",
          timestamp: new Date().toISOString(),
        },
      });
    },
    [createPayment]
  );

  return {
    createPayment,
    createBalanceTopUp,
    loading,
    paymentId,
    onIncompletePaymentFound,
  };
};
