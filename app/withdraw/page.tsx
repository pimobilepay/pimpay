"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
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
              "Authorization": `Bearer ${token}`, // Si ton API utilise le Bearer
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
