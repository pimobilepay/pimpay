"use client";

// Définition des types pour éviter les erreurs TypeScript sur window.Pi
declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
  }
}

/**
 * Initialise le SDK Pi en mode Sandbox
 */
export const initPiSDK = () => {
  if (typeof window !== "undefined" && window.Pi) {
    try {
      // Ne pas re-initialiser si deja fait par PiInitializer
      if (window.__PI_SDK_READY__) return;
      window.Pi.init({ version: "2.0", sandbox: false });
      window.__PI_SDK_READY__ = true;
      console.log("[PimPay] Pi SDK 2.0 initialise");
    } catch (error: any) {
      if (error?.message?.includes("already")) {
        window.__PI_SDK_READY__ = true;
      } else {
        console.error("[PimPay] Erreur init SDK Pi:", error);
      }
    }
  }
};

/**
 * Fonction d'authentification universelle pour Pimpay
 */
export const authenticateWithPi = async () => {
  if (!window.Pi) {
    throw new Error("Le SDK Pi n'est pas chargé. Utilisez le Pi Browser.");
  }

  const scopes = ["username", "payments", "wallet_address"];

  return new Promise((resolve, reject) => {
    window.Pi.authenticate(scopes, onIncompletePaymentFound)
      .then((auth: any) => {
        // Stockage des infos pour la session Pimpay
        localStorage.setItem("pimpay_user", JSON.stringify(auth.user));
        localStorage.setItem("pi_token", auth.accessToken);
        resolve(auth);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
};

/**
 * Gestionnaire des paiements incomplets (obligatoire selon la doc Pi)
 * 
 * Cette fonction est appelee automatiquement par le SDK Pi quand un paiement
 * est reste en suspend. Elle tente de le completer ou de l'annuler via notre API.
 */
const onIncompletePaymentFound = async (payment: any) => {
  console.log("[PimPay] Paiement incomplet detecte:", payment.identifier, "txid:", payment.transaction?.txid);
  
  try {
    const response = await fetch("/api/payments/incomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: payment.identifier,
        txid: payment.transaction?.txid || null,
      }),
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`[PimPay] Paiement incomplet ${payment.identifier} traite: ${data.action} - ${data.message}`);
    } else {
      console.error(`[PimPay] Echec traitement paiement incomplet ${payment.identifier}:`, data);
    }
  } catch (error) {
    console.error("[PimPay] Erreur reseau lors du traitement du paiement incomplet:", error);
  }
};
