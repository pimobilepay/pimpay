"use client";

// Définition des types pour éviter les erreurs TypeScript sur window.Pi
declare global {
  interface Window {
    Pi: any;
  }
}

/**
 * Initialise le SDK Pi en mode Sandbox
 */
export const initPiSDK = () => {
  if (typeof window !== "undefined" && window.Pi) {
    try {
      window.Pi.init({ version: "1.5", sandbox: true });
      console.log("✅ Pi SDK initialisé (Sandbox: ON)");
    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du SDK Pi:", error);
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
