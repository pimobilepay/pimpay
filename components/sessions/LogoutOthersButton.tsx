"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

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
        alert("Sécurité mise à jour : les autres sessions ont été fermées.");
        router.refresh(); 
      } else {
        const data = await res.json();
        alert(data.error || "Une erreur est survenue.");
      }
    } catch (error) {
      alert("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogoutOthers}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-semibold transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : <LogOut size={18} />}
      Déconnexion globale
    </button>
  );
}
