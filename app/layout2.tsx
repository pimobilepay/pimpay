"use client"; // On passe en client pour gérer l'initialisation du SDK

import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import "./globals.css";
import { Toaster } from "sonner";
import Script from "next/script";
import { useEffect, useState } from "react";
import SideMenu from "@/components/SideMenu";
import { BottomNav } from "@/components/BottomNav";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // État pour gérer l'ouverture du menu latéral
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Fonction pour initialiser le SDK une fois chargé
    const initPi = () => {
      if (window.Pi) {
        try {
          window.Pi.init({ version: "1.5", sandbox: true });
          console.log("Pi SDK Initialisé en mode Sandbox");
        } catch (err) {
          console.error("Erreur initialisation Pi SDK:", err);
        }
      }
    };

    // Si le script est déjà chargé, on initialise
    if (window.Pi) {
      initPi();
    } else {
      // Sinon on attend l'événement de chargement (fallback)
      window.addEventListener("pi_sdk_loaded", initPi);
    }
    
    return () => window.removeEventListener("pi_sdk_loaded", initPi);
  }, []);

  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <head>
        {/* Chargement optimisé du SDK via Next.js Script */}
        <Script 
          src="https://sdk.minepi.com/pi-sdk.js" 
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-[#020617] text-white antialiased">
        
        {/* 1. SideMenu : Reçoit l'état et la fonction de fermeture */}
        <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {/* 2. Main Content : Zone d'affichage des pages */}
        <main className="min-h-screen pb-24">
          {children}
        </main>

        {/* 3. BottomNav : Reçoit la fonction d'ouverture du menu */}
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />

        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}

