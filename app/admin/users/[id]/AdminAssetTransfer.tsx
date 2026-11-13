"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { ADMIN_TRANSFER_ASSETS, type AdminTransferAsset } from "@/lib/admin-transfer";

type Quote = { balance: number; feeRate: number | null; fee: number | null; totalDebit: number | null; sufficient: boolean };
type KeyedQuote = { key: string; data: Quote };

const ASSETS = Object.keys(ADMIN_TRANSFER_ASSETS) as AdminTransferAsset[];

export function AdminAssetTransfer({ userId }: { userId: string }) {
  const [currency, setCurrency] = useState<AdminTransferAsset>("TRX");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState<KeyedQuote | null>(null);
  const quoteKey = `${currency}:${amount.trim()}`;
  const currentQuote = quote?.key === quoteKey ? quote.data : null;

  // Aperçu serveur (frais + solde), avec anti-rebond. Mêmes frais que ceux
  // réellement débités : ils viennent de la même config (SystemConfig).
  useEffect(() => {
    const controller = new AbortController();
    setQuote(null);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/${userId}/asset-transfer?currency=${currency}&amount=${encodeURIComponent(amount)}`, { signal: controller.signal });
        const data = await res.json();
        if (res.ok && !controller.signal.aborted) setQuote({ key: quoteKey, data });
      } catch {
        if (!controller.signal.aborted) setQuote(null);
      }
    }, 400);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [userId, currency, amount, quoteKey]);

  const hasQuote = currentQuote?.fee != null && currentQuote.totalDebit != null;
  const insufficient = hasQuote && !currentQuote!.sufficient;

  async function submit() {
    if (!amount || !address.trim()) return toast.error("Montant et adresse obligatoires");
    if (insufficient) return toast.error(`Solde ${currency} insuffisant (montant + frais)`);
    if (!hasQuote) return toast.error("Attendez que l’aperçu des frais et du solde soit disponible");
    const detail = ` Frais : ${currentQuote!.fee} ${currency} — total débité : ${currentQuote!.totalDebit} ${currency}.`;
    if (!window.confirm(`Confirmer le transfert externe de ${amount} ${currency} ?${detail} Le solde utilisateur sera débité immédiatement.`)) return;
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/asset-transfer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ currency, amount, address, note }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Transfert refusé");
      toast.success(`${data.message} Référence ${data.reference} — frais ${data.fee} ${data.currency}`);
      if (data.warning) toast.warning(data.warning);
      setAmount(""); setAddress(""); setNote("");
    } catch (error: any) { toast.error(error.message || "Erreur de transfert"); }
    finally { setSubmitting(false); }
  }

  const asset = ADMIN_TRANSFER_ASSETS[currency];
  return (
    <section className="bg-slate-900/40 border border-amber-500/20 rounded-[2rem] p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400"><Send size={16} /></div>
        <div><h3 className="text-[10px] font-black text-white uppercase tracking-widest">Transfert externe administrateur</h3><p className="text-[9px] text-slate-500 mt-1">Débite le portefeuille (montant + frais) et diffuse le retrait sur la blockchain.</p></div>
      </div>
      <div className="flex items-start gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-[9px] font-bold text-rose-300"><AlertTriangle size={13} className="shrink-0" />Vérifiez le réseau et l&apos;adresse. Cette opération est auditée et le débit est immédiat.</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Actif<select value={currency} onChange={e => setCurrency(e.target.value as AdminTransferAsset)} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-xs font-black text-white outline-none focus:border-amber-500">{ASSETS.map(code => <option key={code} value={code}>{code} — {ADMIN_TRANSFER_ASSETS[code].network}</option>)}</select></label>
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Montant<input value={amount} onChange={e => setAmount(e.target.value.replace(",", "."))} inputMode="decimal" placeholder="0.00" className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-xs font-black text-white outline-none focus:border-amber-500" /></label>
      </div>
      <div className="rounded-xl bg-slate-950/60 border border-white/5 p-3 space-y-1 text-[10px] font-bold text-slate-400">
        <div className="flex justify-between"><span>Solde {currency}</span><span className="text-white">{currentQuote ? currentQuote.balance : "…"}</span></div>
        <div className="flex justify-between"><span>Frais{currentQuote?.feeRate != null ? ` (${Math.round(currentQuote.feeRate * 10000) / 100}%)` : ""}</span><span className="text-white">{hasQuote ? `${currentQuote!.fee} ${currency}` : "—"}</span></div>
        <div className="flex justify-between"><span>Total débité</span><span className={insufficient ? "text-rose-400" : "text-amber-400"}>{hasQuote ? `${currentQuote!.totalDebit} ${currency}` : "—"}</span></div>
        {insufficient && <p className="text-rose-400 pt-1">Solde insuffisant pour couvrir le montant et les frais.</p>}
      </div>
      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Adresse externe<input value={address} onChange={e => setAddress(e.target.value)} placeholder={`Adresse ${currency} (${asset.network})`} className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-[11px] font-mono text-white outline-none focus:border-amber-500" /></label>
      <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest">Motif<input value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="Motif interne facultatif" className="mt-1 w-full rounded-xl bg-slate-950 border border-white/10 px-3 py-3 text-xs font-bold text-white outline-none focus:border-amber-500" /></label>
      <button onClick={submit} disabled={submitting || !hasQuote || !!insufficient} className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-40 hover:bg-amber-400">{submitting ? <Loader2 size={14} className="animate-spin" /> : <ArrowUpRight size={14} />} Enregistrer le transfert externe</button>
    </section>
  );
}
