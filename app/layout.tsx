"use client";

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import { useEffect, useState } from "react";

// CORRECTION : L'import doit correspondre exactement au nom du fichier sur le disque
import SideMenu from "@/components/SideMenu"; 
import { BottomNav } from "@/components/bottom-nav"; // Changé 'BottomNav' en 'bottom-nav'

// Déclaration pour éviter les erreurs TypeScript sur window.Pi
declare global {
  interface Window {
    Pi: any;
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const initPi = () => {
      // Vérification sécurisée de l'existence de window et window.Pi
      if (typeof window !== "undefined" && window.Pi) {
        try {
          // Initialisation du SDK en mode Sandbox pour tes tests
          window.Pi.init({ version: "1.5", sandbox: true });
          console.log("🚀 Pi SDK Initialisé (Mode Sandbox)");
        } catch (err) {
          console.error("❌ Erreur initialisation Pi SDK:", err);
        }
      }
    };

    // Initialisation immédiate si disponible, sinon via l'événement
    if (typeof window !== "undefined") {
      if (window.Pi) {
        initPi();
      } else {
        window.addEventListener("pi_sdk_loaded", initPi);
      }
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("pi_sdk_loaded", initPi);
      }
    };
  }, []);

  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="bg-[#020617] text-white antialiased">
        {/* Chargement du SDK Pi avec la stratégie recommandée par Next.js */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="afterInteractive"
        />

        {/* 1. Menu Latéral (Overlay) */}
        <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {/* 2. Contenu principal : pb-24 laisse de la place pour la navigation fixe */}
        <main className="min-h-screen pb-24 relative z-0">
          {children}
        </main>

        {/* 3. Navigation Basse fixe */}
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />

        {/* Notifications système (Toasts) */}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
