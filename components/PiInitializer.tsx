"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
    __PI_INCOMPLETE_CHECKED__: boolean;
  }
}

/**
 * PiInitializer - Point unique d'initialisation du SDK Pi Network
 * 
 * Ce composant est monte dans le RootLayout et sert de source de verite
 * pour l'initialisation du SDK. Les hooks (usePiAuth, usePiPayment) 
 * peuvent aussi initialiser le SDK si necessaire (thread-safe).
 * 
 * Il gere aussi la detection automatique des paiements incomplets au chargement.
 */
export function PiInitializer() {
  const checkedRef = useRef(false);
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    // Eviter l'execution cote serveur
    if (typeof window === "undefined") return;

    const initPi = () => {
      // Ne pas re-initialiser si deja fait
      if (window.__PI_SDK_READY__) return true;
      
      // Eviter les initialisations concurrentes
      if (window.__PI_SDK_INITIALIZING__) return false;

      if (window.Pi) {
        try {
          window.__PI_SDK_INITIALIZING__ = true;
          window.Pi.init({ version: "2.0", sandbox: false });
          window.__PI_SDK_READY__ = true;
          window.__PI_SDK_INITIALIZING__ = false;
          console.log("[PimPay] SDK Pi 2.0 initialise avec succes");
          return true;
        } catch (error: any) {
          window.__PI_SDK_INITIALIZING__ = false;
          // Si l'erreur est "already initialized", on considere que c'est OK
          if (error?.message?.includes("already initialized") || error?.message?.includes("already")) {
            window.__PI_SDK_READY__ = true;
            console.log("[PimPay] SDK Pi deja initialise");
            return true;
          } else {
            console.error("[PimPay] Erreur init SDK Pi:", error);
            return false;
          }
        }
      }
      return false;
    };

    // Proactive server-side check for incomplete payments (runs once per session)
    const checkIncompletePayments = async () => {
      if (checkedRef.current || window.__PI_INCOMPLETE_CHECKED__) return;
      checkedRef.current = true;
      window.__PI_INCOMPLETE_CHECKED__ = true;

      try {
        const res = await fetch("/api/payments/incomplete", {
          credentials: "include", // Important pour envoyer les cookies
        });
        const data = await res.json();
        if (data.details?.length > 0) {
          console.log(`[PimPay] ${data.details.length} paiement(s) incomplet(s) resolus au chargement`);
        }
      } catch {
        // Silencieux - ne pas bloquer l'app
      }
    };

    // Verification immediate
    if (window.Pi && !initAttemptedRef.current) {
      initAttemptedRef.current = true;
      initPi();
      checkIncompletePayments();
    } else if (!window.Pi) {
      // Polling si le script sdk n'est pas encore charge
      const interval = setInterval(() => {
        if (window.Pi && !initAttemptedRef.current) {
          initAttemptedRef.current = true;
          initPi();
          checkIncompletePayments();
          clearInterval(interval);
        }
      }, 200); // Check plus frequent (200ms au lieu de 300ms)

      // Timeout securite apres 15s (plus long pour Pi Browser lent)
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!window.Pi) {
          console.log("[PimPay] SDK Pi non disponible (navigateur classique)");
        }
        // Still try to resolve incomplete payments via server even without SDK
        checkIncompletePayments();
      }, 15000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  return null;
}
