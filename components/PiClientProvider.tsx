"use client";

import { useEffect } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

export default function PiClientProvider() {
  const router = useRouter();

  const handlePiAuth = async () => {
    const Pi = (window as any).Pi;
    if (!Pi) return;

    try {
      // Initialisation (version 2.0 requise pour les nouvelles apps)
      Pi.init({ version: "2.0", sandbox: false });

      // Authentification
      const auth = await Pi.authenticate(['username', 'payments'], (payment: any) => {
        console.log("Paiement incomplet:", payment);
      });

      // ✅ ENVOI AU BACKEND (Route : /api/auth/pi-login)
      const response = await fetch("/api/auth/pi-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          piUserId: auth.user.uid,   // Le backend attend piUserId
          username: auth.user.username, 
          accessToken: auth.accessToken 
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Une fois connecté, on redirige vers le dashboard ou on rafraîchit
        router.refresh(); 
      }
    } catch (error: any) {
      console.error("Erreur d'authentification Pimpay:", error);
    }
  };

  return (
    <Script
      src="https://sdk.minepi.com/pi-sdk.js"
      strategy="afterInteractive"
      onLoad={handlePiAuth}
    />
  );
}
