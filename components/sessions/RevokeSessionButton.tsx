"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function RevokeSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRevoke = async () => {
    if (!confirm(t("sessions.confirmRevokeDevice"))) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success(t("sessions.deviceDisconnectedSuccess"));
        // Signaler que c'est une révocation volontaire par l'utilisateur lui-même
        // (pas l'admin, pas un autre appareil) — utilisé par SessionGuard pour
        // adapter le message toast si cet appareil se retrouve déconnecté
        window.dispatchEvent(
          new CustomEvent("pimpay:session-revoked", { detail: { source: "self" } })
        );
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || t("sessions.revokeErrorSession"));
      }
    } catch {
      toast.error(t("sessions.genericError"));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      onClick={handleRevoke}
      disabled={isDeleting}
      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title={t("sessions.revokeTitle")}
    >
      <Trash2 size={18} className={isDeleting ? "animate-pulse text-red-400" : ""} />
    </button>
  );
}

