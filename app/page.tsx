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
      // 🚀 LOGIQUE PIMPAY : Préparer les wallets avant la redirection
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      {/* Loader stylé pour PimPay */}
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">
        Sécurisation de votre accès...
      </p>
    </div>
  );
}
