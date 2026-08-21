"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const cookies = document.cookie.split(";").map((cookie) => cookie.trim());

    // [FIX DECONNEXION] La route /api/auth/logout pose un marqueur lisible
    // `pimpay_loggedout`. En contexte cross-site (iframe Pi Browser / iOS), un
    // cookie de token peut survivre à l'effacement et faire rebondir vers le
    // dashboard. Si ce marqueur est présent, l'utilisateur vient de se
    // déconnecter : on le consomme et on force l'affichage du login.
    const justLoggedOut = cookies.some((cookie) => cookie.split("=")[0] === "pimpay_loggedout");
    if (justLoggedOut) {
      document.cookie = "pimpay_loggedout=; Path=/; Max-Age=0";
      router.replace("/auth/login");
      return;
    }

    // La session d'authentification est portée par les cookies. Ne jamais
    // utiliser un ancien token du localStorage pour décider d'ouvrir le dashboard
    // après une déconnexion.
    const hasSessionCookie = cookies.some((cookie) => {
      const name = cookie.split("=")[0];
      return name === "token" || name === "pimpay_token" || name === "pi_session_token";
    });

    if (!hasSessionCookie) {
      router.replace("/auth/login");
    } else {
      // 🚀 LOGIQUE PIMOBIPAY : Préparer les wallets avant la redirection
      const syncBlockchainIdentities = async () => {
        try {
          // On appelle l'API de génération d'adresses
          // Même si l'utilisateur en a déjà, l'API sécurisée ne fera rien
          await fetch("/api/wallet/generate/adresses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Erreur de synchronisation silencieuse:", error);
        } finally {
          // Une fois l'appel fini (ou en cas d'erreur), on redirige
          router.replace("/dashboard");
        }
      };

      syncBlockchainIdentities();
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-3">
      {/* Loader unifié PIMOBIPAY */}
      <div
        className="rounded-full border-2 border-blue-500/25 border-t-blue-500 animate-spin"
        style={{ width: 28, height: 28, animationDuration: "0.6s" }}
      />
      <p className="text-blue-500 text-sm font-medium tracking-tight">
        Sécurisation de votre accès...
      </p>
    </div>
  );
}
