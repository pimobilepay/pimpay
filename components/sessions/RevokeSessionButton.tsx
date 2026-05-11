"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";

export default function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRevoke = async () => {
    if (!confirm("Voulez-vous vraiment déconnecter cet appareil ?")) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Appareil déconnecté instantanément.");
        window.dispatchEvent(new Event("pimpay:session-revoked"));
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Erreur lors de la révocation");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleRevoke}
      disabled={isDeleting}
      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="Révoquer la session"
    >
      <Trash2 size={18} className={isDeleting ? "animate-pulse text-red-400" : ""} />
    </button>
  );
}

