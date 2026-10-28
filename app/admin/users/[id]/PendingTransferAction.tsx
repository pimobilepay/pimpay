"use client";

import { Loader2, RotateCcw, Ban } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function PendingTransferAction({ transactionId }: { transactionId: string }) {
  const [loading, setLoading] = useState(false);

  async function retry() {
    if (!window.confirm("Remettre ce transfert dans la file de traitement ? Le solde ne sera pas débité une seconde fois.")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/transactions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, action: "retry" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Relance refusée");
      toast.success("Transfert remis en file de traitement");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la relance");
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!window.confirm("Annuler ce transfert et recréditer le solde ? Cette action est irréversible et ne fonctionne que si aucun hash blockchain n'existe.")) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/transactions/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId, action: "cancel" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Annulation refusée");
      toast.success("Transfert annulé et solde recrédité");
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'annulation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex items-center gap-2">
      <button onClick={retry} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-amber-400 hover:bg-amber-500/20 disabled:opacity-50">
        {loading ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
        Relancer
      </button>
      <button onClick={cancel} disabled={loading} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-rose-400 hover:bg-rose-500/20 disabled:opacity-50">
        {loading ? <Loader2 size={11} className="animate-spin" /> : <Ban size={11} />}
        Annuler et recréditer
      </button>
    </div>
  );
}
