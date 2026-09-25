"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeletePiAddressesButton({ userId, hasAddresses }: { userId: string; hasAddresses: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!hasAddresses || loading) return;
    if (!window.confirm("Supprimer uniquement l'adresse du wallet Pi de cet utilisateur ?")) return;

    setLoading(true);
    try {
      const response = await fetch("/api/admin/users/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action: "DELETE_PI_ADDRESSES" }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Suppression impossible");
      router.refresh();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Suppression impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={!hasAddresses || loading}
      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      Supprimer les adresses Pi
    </button>
  );
}
