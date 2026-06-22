"use client";

import { useState } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

export default function LogoutOthersButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { t } = useLanguage();

  const handleLogoutOthers = async () => {
    if (!confirm(t("sessions.confirmLogoutOthers"))) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/session/logout-others", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const data = await res.json();
        const count = data.count || 0;
        toast.success(
          count > 0
            ? `${count} ${t("sessions.devicesDisconnectedInstantly")}`
            : t("sessions.noOtherSessions")
        );
        window.dispatchEvent(
          new CustomEvent("pimpay:session-revoked", { detail: { source: "self" } })
        );
        router.refresh();
      } else {
        const data = await res.json();
        toast.error(data.error || t("sessions.genericError"));
      }
    } catch {
      toast.error(t("sessions.serverError"));
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
      {t("sessions.logoutOthers")}
    </button>
  );
}
