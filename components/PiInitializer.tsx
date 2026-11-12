"use client";

import { useEffect, useRef } from "react";
import { getPiSandbox, getCachedPiSandbox } from "@/lib/pi-config";

declare global {
  interface Window {
    Pi: any;
    __PI_SDK_READY__: boolean;
    __PI_SDK_INITIALIZING__: boolean;
  }
}

/**
 * PiInitializer - Point unique d'initialisation du SDK Pi Network
 * 
 * Ce composant est monte dans le RootLayout et sert de source de verite
 * pour l'initialisation du SDK. Les hooks (usePiAuth, usePiPayment) 
 * peuvent aussi initialiser le SDK si necessaire (thread-safe).
 * 
 * Les paiements incomplets sont traites uniquement via le callback authentifie du SDK Pi.
 */
export function PiInitializer() {
  const initAttemptedRef = useRef(false);

  useEffect(() => {
    // Eviter l'execution cote serveur
    if (typeof window === "undefined") return;

    const initPi = () => {
      // Ne pas re-initialiser si deja fait
      if (window.__PI_SDK_READY__) return true;
      
      // Eviter les initialisations concurrentes
      if (window.__PI_SDK_INITIALIZING__) return false;

      const sandbox = getCachedPiSandbox();
      if (window.Pi && sandbox !== null) {
        try {
          window.__PI_SDK_INITIALIZING__ = true;
          window.Pi.init({ version: "2.0", sandbox });
          window.__PI_SDK_READY__ = true;
          window.__PI_SDK_INITIALIZING__ = false;
          console.log(`[PIMOBIPAY] SDK Pi 2.0 initialise (sandbox=${sandbox})`);
          return true;
        } catch (error: any) {
          window.__PI_SDK_INITIALIZING__ = false;
          // Si l'erreur est "already initialized", on considere que c'est OK
          if (error?.message?.includes("already initialized") || error?.message?.includes("already")) {
            window.__PI_SDK_READY__ = true;
            console.log("[PIMOBIPAY] SDK Pi deja initialise");
            return true;
          } else {
            console.error("[PIMOBIPAY] Erreur init SDK Pi:", error);
            return false;
          }
        }
      }
      return false;
    };

    // Resoudre le mode reseau (testnet/mainnet) AVANT toute initialisation,
    // puis initialiser le SDK avec la bonne valeur `sandbox`.
    let disposed = false;
    getPiSandbox()
      .then(() => {
        if (!disposed && window.Pi && !initAttemptedRef.current) {
          initAttemptedRef.current = initPi();
        }
      })
      .catch((error) => {
        console.error("[PIMOBIPAY] Initialisation Pi suspendue: configuration réseau invalide", error);
      });

    if (!window.Pi) {
      // Polling si le script sdk n'est pas encore charge
      const interval = setInterval(() => {
        if (window.Pi && !initAttemptedRef.current && initPi()) {
          initAttemptedRef.current = true;
          clearInterval(interval);
        }
      }, 200); // Check plus frequent (200ms au lieu de 300ms)

      // Timeout securite apres 15s (plus long pour Pi Browser lent)
      const timeout = setTimeout(() => {
        clearInterval(interval);
        if (!window.Pi) {
          console.log("[PIMOBIPAY] SDK Pi non disponible (navigateur classique)");
        }
      }, 15000);

      return () => {
        disposed = true;
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
