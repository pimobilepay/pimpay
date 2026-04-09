"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function LogoutOthersButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogoutOthers = async () => {
    if (!confirm("Voulez-vous déconnecter tous les autres appareils connectés à pimpay ?")) return;

    setLoading(true);
    try {
      // Utilisation du chemin sans "s" comme demandé
      const res = await fetch("/api/auth/session/logout-others", { 
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });

      if (res.ok) {
        const data = await res.json();
        
        // Afficher le toast de succès
        toast.success(data.message || "Toutes les autres sessions ont été déconnectées");
        
        // Rafraîchissement immédiat de la page pour afficher les changements
        router.refresh();
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
      onClick={handleLogoutOthers}
      disabled={loading}
      className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600/10 to-orange-600/10 px-5 py-3 text-[13px] font-semibold text-red-400 ring-1 ring-red-500/20 transition-all hover:from-red-600/15 hover:to-orange-600/15 hover:ring-red-500/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? (
        <Loader2 className="animate-spin" size={16} strokeWidth={2} />
      ) : (
        <LogOut size={16} strokeWidth={2} />
      )}
      Déconnecter les autres appareils
    </button>
  );
}
