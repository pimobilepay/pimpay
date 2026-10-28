"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { CRYPTO_ASSETS } from "@/lib/crypto-config";

const ASSETS = ["PI", "SDA", "USDT", "USDC", "BTC", "ETH", "BNB", "SOL", "XRP", "XLM", "TRX", "DOGE", "DAI", "BUSD", "EURC", "OUSD"];

export function AdminAssetTransfer({ userId }: { userId: string }) {
  const [currency, setCurrency] = useState("PI");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!amount || !address.trim()) return toast.error("Montant et adresse obligatoires");
    if (!window.confirm(`Confirmer le transfert externe de ${amount} ${currency} ? Le solde utilisateur sera débité immédiatement.`)) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/asset-transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency, amount, address, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Transfert refusé");
      toast.success(`${data.message} Référence ${data.reference}`);
      setAmount(""); setAddress(""); setNote("");
    } catch (error: any) { toast.error(error.message || "Erreur de transfert"); }
    finally { setSubmitting(false); }
  }

  const asset = CRYPTO_ASSETS[currency];
  return (
    <section className="bg-slate-900/40 border border-amber-500/20 rounded-[2rem] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><Send size={16} /></div>
        <div><h3 className="text-[10px] font-black text-white uppercase tracking-widest">Transfert externe administrateur</h3><p className="text-[9px] text-slate-500 mt-1">Débite le portefeuille de cet utilisateur et place le retrait en file de traitement.</p></div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-[9px] font-bold text-rose-300"><AlertTriangle size={13} className="shrink-0" />Vérifiez le réseau et l&apos;adresse. Cette opération est auditée et le débit est immédiat.</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Actif<select value={currency} onChange={e => setCurrency(e.target.value)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-xs font-black text-white outline-none focus:border-amber-500">{ASSETS.map(code => <option key={code} value={code}>{code} — {CRYPTO_ASSETS[code]?.network || "Réseau"}</option>)}</select></label>
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Montant<input value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-xs font-black text-white outline-none focus:border-amber-500" /></label>
      </div>
      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Adresse externe<input value={address} onChange={e => setAddress(e.target.value)} placeholder={`Adresse ${currency} (${asset?.network || "réseau"})`} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-[11px] font-mono text-white outline-none focus:border-amber-500" /></label>
      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Motif<input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Motif interne facultatif" className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-xs font-bold text-white outline-none focus:border-amber-500" /></label>
      <button onClick={submit} disabled={submitting} className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-40 hover:bg-amber-400">{submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />} Enregistrer le transfert externe</button>
    </section>
  );
}
