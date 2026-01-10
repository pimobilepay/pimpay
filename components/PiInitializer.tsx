"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Pi: any;
  }
}

export function PiInitializer() {
  useEffect(() => {
    // On attend que l'objet Pi soit disponible sur l'objet window
    const initPi = () => {
      if (window.Pi) {
        try {
          window.Pi.init({ 
            version: "2.0", 
            sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true" 
          });
          console.log("Pimpay Core: SDK Pi Initialisé");
        } catch (error) {
          console.error("Erreur initialisation Pi:", error);
        }
      }
    };

    // Petite sécurité si le script met du temps à charger
    if (window.Pi) {
      initPi();
    } else {
      const interval = setInterval(() => {
        if (window.Pi) {
          initPi();
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
