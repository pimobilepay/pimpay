"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      router.replace("/auth/login");
      return;
    }

    // Timeout de securite pour eviter le blocage infini
    const timeoutId = setTimeout(() => {
      console.error("[v0] Timeout atteint, redirection forcee");
      router.replace("/dashboard");
    }, 5000);

    const syncBlockchainIdentities = async () => {
      const controller = new AbortController();
      const fetchTimeout = setTimeout(() => controller.abort(), 4000);

      try {
        const response = await fetch("/api/wallet/generate/adresses", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        });

        clearTimeout(fetchTimeout);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("[v0] Erreur API:", response.status, errorData);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          console.error("[v0] Requete annulee (timeout)");
        } else {
          console.error("[v0] Erreur de synchronisation:", err);
        }
      } finally {
        clearTimeout(timeoutId);
        router.replace("/dashboard");
      }
    };

    syncBlockchainIdentities();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
      <p className="text-slate-500 text-xs font-medium tracking-widest uppercase">
        Securisation de votre acces...
      </p>
      {error && (
        <p className="text-red-500 text-xs">{error}</p>
      )}
    </div>
  );
}
