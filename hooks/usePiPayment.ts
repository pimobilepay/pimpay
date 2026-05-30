"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
  }
}

interface PaymentConfig {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
}

interface PaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => Promise<void>;
  onReadyForServerCompletion: (paymentId: string, txid: string) => Promise<void>;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: any) => void;
}

/**
 * Hook pour les paiements Pi Network (U2A - User to App)
 * 
 * Utilise pour la recharge de solde : l'utilisateur paie en Pi pour crediter son compte PimPay.
 * 
 * Le flux complet :
 * 1. Pi.createPayment() ouvre le dialog de paiement Pi
 * 2. onReadyForServerApproval: backend appelle /approve sur Pi Network
 * 3. L'utilisateur signe la transaction dans Pi Browser
 * 4. onReadyForServerCompletion: backend appelle /complete sur Pi Network et credite le compte
 */
export const usePiPayment = () => {
  const [loading, setLoading] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const paymentInProgressRef = useRef(false);

  /**
   * Initialiser le SDK Pi de maniere thread-safe
   */
  const initializePiSDK = useCallback((): boolean => {
    if (typeof window === "undefined" || !window.Pi) {
      return false;
    }

    if (window.__PI_SDK_READY__) {
      return true;
    }

    if (window.__PI_SDK_INITIALIZING__) {
      return false;
    }

    try {
      window.__PI_SDK_INITIALIZING__ = true;
      window.Pi.init({ version: "2.0", sandbox: true });
      window.__PI_SDK_READY__ = true;
      window.__PI_SDK_INITIALIZING__ = false;
      console.log("[PimPay] SDK Pi 2.0 initialise par usePiPayment");
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

  /**
   * Attendre que le SDK Pi soit disponible et initialise
   */
  const waitForPiSDK = useCallback(async (maxWait = 10000): Promise<boolean> => {
    const start = Date.now();
    const checkInterval = 100;
    
    while (Date.now() - start < maxWait) {
      if (window.__PI_SDK_READY__) {
        return true;
      }
      
      if (window.Pi) {
        if (initializePiSDK()) {
          return true;
        }
        if (window.__PI_SDK_INITIALIZING__) {
          await new Promise(resolve => setTimeout(resolve, 50));
          if (window.__PI_SDK_READY__) {
            return true;
          }
        }
      }
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    return window.__PI_SDK_READY__ || false;
  }, [initializePiSDK]);

  /**
   * Gestionnaire des paiements incomplets (obligatoire selon la doc Pi)
   * 
   * Cette fonction est appelee automatiquement par le SDK Pi quand un paiement
   * est reste en suspend. Elle tente de le completer via notre API.
   */
  const onIncompletePaymentFound = useCallback(async (payment: any) => {
    console.log("[PimPay] Paiement incomplet detecte:", payment.identifier, "txid:", payment.transaction?.txid);
    
    try {
      const response = await fetch("/api/payments/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction?.txid || null,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`[PimPay] Paiement incomplet ${payment.identifier} traite: ${data.action}`);
        if (data.action === "completed") {
          toast.success(`Paiement recupere: ${data.message}`);
        }
      } else {
        console.error(`[PimPay] Echec traitement paiement incomplet:`, data);
      }
    } catch (error) {
      console.error("[PimPay] Erreur reseau lors du traitement du paiement incomplet:", error);
    }
  }, []);

  /**
   * Creer un paiement Pi (U2A - User to App)
   * 
   * @param config Configuration du paiement (amount, memo, metadata)
   * @returns Promise avec le resultat du paiement
   */
  const createPayment = useCallback(async (config: PaymentConfig): Promise<{ success: boolean; txid?: string; error?: string }> => {
    if (typeof window === "undefined") {
      return { success: false, error: "SSR non supporte" };
    }

    if (paymentInProgressRef.current) {
      console.warn("[PimPay] Paiement deja en cours");
      return { success: false, error: "Un paiement est deja en cours" };
    }

    paymentInProgressRef.current = true;
    setLoading(true);

    try {
      // Attendre que le SDK soit pret
      const sdkReady = await waitForPiSDK(10000);
      
      if (!sdkReady || !window.Pi) {
        const errorMsg = !window.Pi 
          ? "Veuillez ouvrir PimPay dans le Pi Browser."
          : "Le SDK Pi n'a pas pu s'initialiser. Rechargez la page.";
        toast.error(errorMsg, { duration: 5000 });
        return { success: false, error: errorMsg };
      }

      // Etape obligatoire: authentifier l'utilisateur avec le scope "payments"
      // avant de pouvoir creer un paiement. Sans cela, le SDK Pi renvoie
      // l'erreur "Cannot create a payment without 'payments' scope".
      try {
        await window.Pi.authenticate(["username", "payments"], onIncompletePaymentFound);
        console.log("[PimPay] Authentification avec scope payments reussie");
      } catch (authError: any) {
        console.error("[PimPay] Erreur authentification scope payments:", authError);
        const msg = authError?.message || "Authentification Pi requise pour le paiement";
        toast.error(msg, { duration: 5000 });
        return { success: false, error: msg };
      }

      console.log("[PimPay] Creation paiement Pi:", config);

      return new Promise((resolve) => {
        const paymentData = {
          amount: config.amount,
          memo: config.memo,
          metadata: config.metadata,
        };

        const paymentCallbacks: PaymentCallbacks = {
          // Callback 1: Le paiement est cree, on doit l'approuver cote serveur
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
                console.error("[PimPay] Erreur approbation:", data);
                toast.error(data.error || "Erreur lors de l'approbation");
                // On ne resolve pas ici, on attend onError ou onCancel
              } else {
                console.log("[PimPay] Paiement approuve:", id);
              }
            } catch (error: any) {
              console.error("[PimPay] Erreur reseau approbation:", error);
              toast.error("Erreur reseau lors de l'approbation");
            }
          },

          // Callback 2: L'utilisateur a signe, on doit completer cote serveur
          onReadyForServerCompletion: async (id: string, txid: string) => {
            console.log("[PimPay] onReadyForServerCompletion:", id, "txid:", txid);
            
            try {
              const res = await fetch("/api/payments/complete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  paymentId: id,
                  txid,
                }),
              });

              const data = await res.json();

              if (!res.ok) {
                console.error("[PimPay] Erreur completion:", data);
                toast.error(data.error || "Erreur lors de la completion");
                resolve({ success: false, error: data.error });
              } else {
                console.log("[PimPay] Paiement complete:", id);
                if (config.metadata?.type === "PIM_COIN_PURCHASE") {
                  toast.success("Paiement confirme !");
                } else {
                  toast.success(`Recharge de ${config.amount} Pi effectuee !`);
                }
                resolve({ success: true, txid });
              }
            } catch (error: any) {
              console.error("[PimPay] Erreur reseau completion:", error);
              toast.error("Erreur reseau lors de la completion");
              resolve({ success: false, error: "Erreur reseau" });
            }
          },

          // Callback 3: L'utilisateur a annule
          onCancel: (id: string) => {
            console.log("[PimPay] Paiement annule:", id);
            toast.info("Paiement annule");
            resolve({ success: false, error: "Paiement annule par l'utilisateur" });
          },

          // Callback 4: Une erreur est survenue
          onError: (error: Error, payment?: any) => {
            console.error("[PimPay] Erreur paiement:", error, payment);
            toast.error(error.message || "Erreur lors du paiement");
            resolve({ success: false, error: error.message });
          },
        };

        // Lancer le paiement Pi avec les callbacks
        window.Pi.createPayment(paymentData, paymentCallbacks);
      });

    } catch (error: any) {
      console.error("[PimPay] Erreur creation paiement:", error);
      toast.error(error.message || "Erreur lors du paiement");
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
      paymentInProgressRef.current = false;
    }
  }, [waitForPiSDK, onIncompletePaymentFound]);

  /**
   * Creer une recharge de solde Pi
   * 
   * @param amount Montant en Pi a recharger
   * @returns Promise avec le resultat
   */
  const createBalanceTopUp = useCallback(async (amount: number): Promise<{ success: boolean; txid?: string; error?: string }> => {
    if (amount <= 0) {
      toast.error("Le montant doit etre superieur a 0");
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
  }, [createPayment]);

  return {
    createPayment,
    createBalanceTopUp,
    loading,
    paymentId,
    onIncompletePaymentFound,
  };
};
