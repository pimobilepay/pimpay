"use client";

// Définition des types pour éviter les erreurs TypeScript sur window.Pi
/** Interface minimale du SDK Pi Browser */
interface PiPaymentCallbacks {
  onReadyForServerApproval: (paymentId: string) => void;
  onReadyForServerCompletion: (paymentId: string, txid: string) => void;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPaymentData) => void;
}

interface PiPaymentData {
  identifier: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  transaction?: { txid: string; verified: boolean };
  status: { developer_approved: boolean; transaction_verified: boolean; developer_completed: boolean; cancelled: boolean; user_cancelled: boolean };
}

interface PiAuth {
  accessToken: string;
  user: { uid: string; username: string };
}

interface PiSDK {
  init: (config: { version: string; sandbox: boolean }) => void;
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: PiPaymentData) => Promise<void>
  ) => Promise<PiAuth>;
  createPayment: (
    paymentData: { amount: number; memo: string; metadata: Record<string, unknown> },
    callbacks: PiPaymentCallbacks
  ) => void;
  openShareDialog: (title: string, message: string) => void;
}

declare global {
  interface Window {
    Pi: PiSDK | undefined;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
  }
}

/**
 * Initialise le SDK Pi en mode Production (thread-safe)
 * Retourne true si le SDK est pret, false sinon
 */
export const initPiSDK = (): boolean => {
  if (typeof window === "undefined") return false;
  
  // Deja initialise
  if (window.__PI_SDK_READY__) return true;
  
  // En cours d'initialisation
  if (window.__PI_SDK_INITIALIZING__) return false;
  
  if (window.Pi) {
    try {
      window.__PI_SDK_INITIALIZING__ = true;
      window.Pi.init({ version: "2.0", sandbox: false });
      window.__PI_SDK_READY__ = true;
      window.__PI_SDK_INITIALIZING__ = false;
      console.log("[PimPay] Pi SDK 2.0 initialise");
      return true;
    } catch (error: unknown) {
      window.__PI_SDK_INITIALIZING__ = false;
      if (error instanceof Error && error.message.includes("already")) {
        window.__PI_SDK_READY__ = true;
        return true;
      } else {
        console.error("[PimPay] Erreur init SDK Pi:", error);
        return false;
      }
    }
  }
  return false;
};

/**
 * Attend que le SDK Pi soit disponible et initialise
 */
export const waitForPiSDK = async (maxWait = 8000): Promise<boolean> => {
  if (typeof window === "undefined") return false;
  
  const start = Date.now();
  const checkInterval = 150;
  
  while (Date.now() - start < maxWait) {
    if (window.Pi) {
      if (initPiSDK()) return true;
      // Si en cours d'init, attendre
      if (window.__PI_SDK_INITIALIZING__) {
        await new Promise(resolve => setTimeout(resolve, 100));
        if (window.__PI_SDK_READY__) return true;
      }
    }
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }
  return window.__PI_SDK_READY__ || false;
};

/**
 * Verifie si le SDK Pi est disponible (dans Pi Browser)
 */
export const isPiBrowserAvailable = (): boolean => {
  return typeof window !== "undefined" && !!window.Pi;
};

/**
 * Fonction d'authentification universelle pour Pimpay
 */
export const authenticateWithPi = async () => {
  if (typeof window === "undefined") {
    throw new Error("Execution cote serveur non supportee");
  }
  
  // Attendre que le SDK soit pret
  const ready = await waitForPiSDK(8000);
  
  if (!ready || !window.Pi) {
    throw new Error("Le SDK Pi n'est pas charge. Utilisez le Pi Browser.");
  }

  // Scopes standards (wallet_address necessite approbation mainnet)
  const scopes = ["username", "payments"];

  return new Promise((resolve, reject) => {
    window.Pi.authenticate(scopes, onIncompletePaymentFound)
      .then((auth: PiAuth) => {
        // Stockage des infos pour la session Pimpay
        localStorage.setItem("pimpay_user", JSON.stringify(auth.user));
        localStorage.setItem("pi_token", auth.accessToken);
        resolve(auth);
      })
      .catch((err: unknown) => {
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
const onIncompletePaymentFound = async (payment: PiPaymentData) => {
  console.log("[PimPay] Paiement incomplet detecte:", payment.identifier, "txid:", payment.transaction?.txid);
  
  try {
    const response = await fetch("/api/payments/incomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important pour les cookies de session
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
