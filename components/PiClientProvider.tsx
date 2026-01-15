"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter, usePathname } from "next/navigation";

export default function PiClientProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handlePiAuth = async () => {
    // Si on est déjà sur le dashboard, pas besoin de ré-authentifier via le script
    if (pathname.includes('/dashboard') || isAuthenticating) return;

    const Pi = (window as any).Pi;
    if (!Pi) return;

    setIsAuthenticating(true);

    try {
      // 1. Initialisation
      await Pi.init({ version: "2.0", sandbox: false });

      // 2. Authentification Pi Network
      const auth = await Pi.authenticate(['username', 'payments'], (payment: any) => {
        console.log("Paiement incomplet détecté:", payment);
      });

      // 3. Envoi au Backend Pimpay
      const response = await fetch("/api/auth/pi-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piUserId: auth.user.uid,
          username: auth.user.username,
          accessToken: auth.accessToken
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log("✅ Authentification Pimpay réussie");
        
        // 4. REDIRECTION FORCÉE
        // On utilise window.location pour forcer le navigateur à recharger les cookies
        // C'est plus radical et fiable que router.push() pour les sessions
        window.location.href = "/dashboard";
      } else {
        console.error("❌ Erreur serveur Pimpay:", data.error);
        setIsAuthenticating(false);
      }
    } catch (error: any) {
      console.error("💥 Erreur critique d'authentification:", error);
      setIsAuthenticating(false);
    }
  };

  return (
    <>
      <Script
        src="https://sdk.minepi.com/pi-sdk.js"
        strategy="afterInteractive"
        onLoad={handlePiAuth}
      />
      {/* Optionnel : Afficher un loader si l'authentification est en cours */}
      {isAuthenticating && (
        <div className="fixed inset-0 bg-[#020617] z-[9999] flex items-center justify-center">
           <div className="text-center">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-blue-400 font-black uppercase tracking-widest text-xs">Protocole Elara : Connexion...</p>
           </div>
        </div>
      )}
    </>
  );
}
