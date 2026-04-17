"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_INCOMPLETE_CHECKED__: boolean;
    __PI_SCOPES_UPGRADED__: boolean;
  }
}

// Cle localStorage qui marque que les scopes complets ont deja ete accordes
// Une fois pose, ce flag empeche toute re-demande d'autorisation future
const SCOPES_GRANTED_KEY = "pimpay_pi_scopes_v2";

/**
 * Callback pour les paiements incomplets detectes lors de l'authenticate silencieux
 */
const handleIncompletePaymentSilent = async (payment: any) => {
  try {
    await fetch("/api/payments/incomplete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        paymentId: payment.identifier,
        txid: payment.transaction?.txid || null,
      }),
    });
  } catch {
    // Silencieux
  }
};

/**
 * Re-authentifie silencieusement l'utilisateur pour inclure le scope wallet_address.
 * 
 * Appele UNE SEULE FOIS si l'utilisateur est connecte mais n'a pas encore
 * le nouveau scope wallet_address dans sa session Pi Browser.
 * Apres succes, le flag SCOPES_GRANTED_KEY est pose et cette fonction
 * ne sera plus jamais appelee.
 */
const upgradePiScopes = async () => {
  // Deja effectue dans une session precedente
  if (localStorage.getItem(SCOPES_GRANTED_KEY)) return;

  // Pas d'utilisateur connecte - inutile de demander
  const session = localStorage.getItem("pimpay_user");
  if (!session) return;

  // Deja traite dans cette session memoire
  if (window.__PI_SCOPES_UPGRADED__) return;
  window.__PI_SCOPES_UPGRADED__ = true;

  try {
    const scopes = ["username", "payments", "wallet_address"];
    const auth = await window.Pi.authenticate(scopes, handleIncompletePaymentSilent);

    if (auth?.user) {
      // Marquer definitivement que les scopes complets sont accordes
      localStorage.setItem(SCOPES_GRANTED_KEY, "1");

      // Synchroniser le wallet_address avec le backend si disponible
      if (auth.user.wallet_address) {
        fetch("/api/user/update-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: auth.user.wallet_address,
          }),
        }).catch(() => {/* silencieux */});
      }
    }
  } catch {
    // Si l'utilisateur refuse ou si une erreur survient, on ne bloque pas l'app
    // La prochaine ouverture re-tentera jusqu'a ce que l'utilisateur accepte
    window.__PI_SCOPES_UPGRADED__ = false;
  }
};

/**
 * PiInitializer - Point unique d'initialisation du SDK Pi Network
 * 
 * Ce composant est monte dans le RootLayout et sert de source de verite
 * pour l'initialisation du SDK. Les hooks (usePiAuth, usePiPayment) 
 * ne doivent PAS reinitialiser le SDK eux-memes.
 * 
 * Il gere aussi:
 * - La detection automatique des paiements incomplets au chargement
 * - La mise a jour silencieuse des scopes Pi (wallet_address) une seule fois
 */
export function PiInitializer() {
  const checkedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const initPi = () => {
      if (window.__PI_SDK_READY__) return;

      if (window.Pi) {
        try {
          window.Pi.init({ version: "2.0", sandbox: false });
          window.__PI_SDK_READY__ = true;
        } catch (error: any) {
          if (error?.message?.includes("already initialized") || error?.message?.includes("already")) {
            window.__PI_SDK_READY__ = true;
          } else {
            console.error("[PimPay] Erreur init SDK Pi:", error);
          }
        }

        // Apres init, mettre a jour les scopes silencieusement si necessaire
        upgradePiScopes();
      }
    };

    const checkIncompletePayments = async () => {
      if (checkedRef.current || window.__PI_INCOMPLETE_CHECKED__) return;
      checkedRef.current = true;
      window.__PI_INCOMPLETE_CHECKED__ = true;

      try {
        const res = await fetch("/api/payments/incomplete");
        const data = await res.json();
        if (data.details?.length > 0) {
          console.log(`[PimPay] ${data.details.length} paiement(s) incomplet(s) resolus au chargement`);
        }
      } catch {
        // Silencieux
      }
    };

    if (window.Pi) {
      initPi();
      checkIncompletePayments();
    } else {
      const interval = setInterval(() => {
        if (window.Pi) {
          initPi();
          checkIncompletePayments();
          clearInterval(interval);
        }
      }, 300);

      const timeout = setTimeout(() => {
        clearInterval(interval);
        checkIncompletePayments();
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  return null;
}
