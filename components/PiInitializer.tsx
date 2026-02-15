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
    const initPi = () => {
      if (window.Pi && !window.__PI_SDK_READY__) {
        try {
          window.Pi.init({ version: "2.0", sandbox: false });
          window.__PI_SDK_READY__ = true;
          console.log("[PimPay] SDK Pi 2.0 initialise avec succes");
        } catch (error) {
          console.error("[PimPay] Erreur init SDK Pi:", error);
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

      // Timeout securite apres 8s
      const timeout = setTimeout(() => clearInterval(interval), 8000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, []);

  return null;
}
