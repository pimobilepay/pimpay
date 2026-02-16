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
 */
const onIncompletePaymentFound = (payment: any) => {
  console.log("⚠️ Paiement incomplet détecté:", payment);
  // Ici, tu devrais appeler ton API /api/payments/complete pour régulariser
};
