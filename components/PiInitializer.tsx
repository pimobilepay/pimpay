"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Pi: any;
  }
}

export function PiInitializer() {
  useEffect(() => {
    // Fonction d'initialisation propre
    const initPi = () => {
      if (window.Pi) {
        try {
          // MODIFICATION CRUCIALE : sandbox à false pour le VRAI PI
          window.Pi.init({
            version: "2.0",
            sandbox: false 
          });
          console.log("PimPay Core: SDK Pi Initialisé sur le MAINNET 🚀");
        } catch (error) {
          console.error("Erreur critique initialisation Pi:", error);
        }
      }
    };

    // Vérification immédiate
    if (window.Pi) {
      initPi();
    } else {
      // Système de surveillance si le script sdk-pi.js est lent au démarrage
      const interval = setInterval(() => {
        if (window.Pi) {
          initPi();
          clearInterval(interval);
        }
      }, 500);

      // Nettoyage si le composant est démonté avant l'initialisation
      return () => clearInterval(interval);
    }
  }, []);

  return null;
}
