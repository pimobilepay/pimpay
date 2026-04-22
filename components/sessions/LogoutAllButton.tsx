"use client";

import { useState } from "react";
import { Power, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LogoutAllButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogoutAll = async () => {
    if (!confirm("Voulez-vous déconnecter TOUS les appareils, y compris celui-ci ? Vous serez redirigé vers la page de connexion.")) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/session/logout-all", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        // Supprimer les cookies côté client
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        document.cookie = "pi_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        document.cookie = "pimpay_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        localStorage.clear();
        
        toast.success("Toutes les sessions ont été déconnectées");
        
        // Rediriger vers la page de connexion
        router.push("/auth/login");
      } else {
        const data = await res.json();
        toast.error(data.error || "Une erreur est survenue");
      }
    } catch (error) {
      toast.error("Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogoutAll}
      disabled={loading}
      className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-rose-600/10 to-red-600/10 px-5 py-3 text-[13px] font-semibold text-rose-400 ring-1 ring-rose-500/20 transition-all hover:from-rose-600/15 hover:to-red-600/15 hover:ring-rose-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="animate-spin" size={16} strokeWidth={2} />
      ) : (
        <Power size={16} strokeWidth={2} />
      )}
      Déconnecter TOUTES les sessions
    </button>
  );
}
