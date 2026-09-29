"use client";

import { useState } from "react";
import { ArrowLeft, CreditCard, Loader2, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";

export function CardDepositFlow({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    const value = Number(amount);
    if (!Number.isInteger(value) || value < 200) {
      toast.error("Le montant minimum est de 200 XOF.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/mpay/card-deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: value, email: email.trim() || undefined }),
      });
      const data = await response.json();
      if (!response.ok || !data.checkoutUrl) throw new Error(data.error || "Impossible de créer le paiement");
      window.location.assign(data.checkoutUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Le paiement par carte a échoué");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-lg">
        <button onClick={onClose} className="mb-10 flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white" aria-label="Retour">
          <ArrowLeft size={16} /> Retour à MPay
        </button>
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-300"><CreditCard /></div><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-blue-300">Dépôt sécurisé</p><h1 className="text-2xl font-black">Par carte bancaire</h1></div></div>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-white/10 hover:text-white" aria-label="Fermer"><X size={18} /></button>
        </div>
        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5 shadow-2xl">
          <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-400" htmlFor="card-amount">Montant à déposer</label>
          <div className="relative"><input id="card-amount" inputMode="numeric" type="number" min="200" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="200" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-4 pr-16 text-2xl font-black outline-none focus:border-blue-400" /><span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-slate-500">XOF</span></div>
          <label className="mb-2 mt-5 block text-[10px] font-black uppercase tracking-widest text-slate-400" htmlFor="card-email">E-mail de reçu (optionnel)</label>
          <input id="card-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" className="w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-blue-400" />
          <button onClick={startCheckout} disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-500 py-4 text-xs font-black uppercase tracking-wider text-white transition hover:bg-blue-400 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={16} /> : <CreditCard size={16} />} Continuer vers GeniusPay</button>
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[10px] text-slate-500"><ShieldCheck size={14} className="text-emerald-400" /> Paiement traité de manière sécurisée par GeniusPay</p>
        </section>
      </div>
    </main>
  );
}
