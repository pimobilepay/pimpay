"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
  }
}

/**
 * PiInitializer - Point unique d'initialisation du SDK Pi Network
 * 
 * Ce composant est monte dans le RootLayout et sert de source de verite
 * pour l'initialisation du SDK. Les hooks (usePiAuth, usePiPayment) 
 * ne doivent PAS reinitialiser le SDK eux-memes.
 */
export function PiInitializer() {
  useEffect(() => {
    // Eviter l'execution cote serveur
    if (typeof window === "undefined") return;

    const initPi = () => {
      // Ne pas re-initialiser si deja fait
      if (window.__PI_SDK_READY__) return;

      if (window.Pi) {
        try {
          window.Pi.init({ version: "2.0", sandbox: false });
          window.__PI_SDK_READY__ = true;
          console.log("[PimPay] SDK Pi 2.0 initialise avec succes");
        } catch (error: any) {
          // Si l'erreur est "already initialized", on considere que c'est OK
          if (error?.message?.includes("already initialized") || error?.message?.includes("already")) {
            window.__PI_SDK_READY__ = true;
            console.log("[PimPay] SDK Pi deja initialise");
          } else {
            console.error("[PimPay] Erreur init SDK Pi:", error);
          }
        }
      }
    };

    // Verification immediate
    if (window.Pi) {
      initPi();
    } else {
      // Polling si le script sdk n'est pas encore charge
      const interval = setInterval(() => {
        if (window.Pi) {
          initPi();
          clearInterval(interval);
        }
      }, 300);

      // Timeout securite apres 10s
      const timeout = setTimeout(() => {
        clearInterval(interval);
        // Si on est pas dans le Pi Browser, ce n'est pas une erreur
        if (!window.Pi) {
          console.log("[PimPay] SDK Pi non disponible (navigateur classique)");
        }
      }, 10000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  return null;
}
