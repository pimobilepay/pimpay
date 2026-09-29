"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";

const PROVIDERS = [
  { country: "Côte d’Ivoire", code: "CI", name: "CIE", currency: "XOF" },
  { country: "Burkina Faso", code: "BF", name: "SONABEL", currency: "XOF" },
  { country: "Togo", code: "TG", name: "CEET", currency: "XOF" },
  { country: "Bénin", code: "BJ", name: "SBEE", currency: "XOF" },
  { country: "Cameroun", code: "CM", name: "ENEO", currency: "XAF" },
  { country: "RDC", code: "CD", name: "SNEL", currency: "CDF" },
];

export function ElectricityPaymentFlow({ onClose }: { onClose: () => void }) {
  const [providerCode, setProviderCode] = useState("CI");
  const [meterNumber, setMeterNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const provider = PROVIDERS.find((item) => item.code === providerCode) ?? PROVIDERS[0];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!meterNumber.trim() || !Number.isInteger(parsedAmount) || parsedAmount < 200) {
      toast.error("Vérifiez le compteur et le montant", { description: "Le montant minimum est de 200." });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/mpay/electricity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: provider.name, country: provider.code, meterNumber, amount: parsedAmount, customerName, phone }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Impossible d’initier le paiement");
      setCompleted(true);
      if (result.checkoutUrl) window.open(result.checkoutUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error("Paiement électricité impossible", { description: error instanceof Error ? error.message : "Réessayez plus tard." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#020617] px-5 pb-10 pt-8 text-white sm:px-8">
      <div className="mx-auto max-w-xl">
        <button onClick={onClose} className="mb-8 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/10" aria-label="Retour aux services">
          <ArrowLeft size={15} /> Retour
        </button>
        <div className="mb-6 flex items-center gap-4">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/20"><Zap size={25} /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">MPay Utilities</p><h1 className="text-2xl font-black">Acheter de l’électricité</h1><p className="mt-1 text-xs text-slate-400">Paiement sécurisé avec GeniusPay</p></div>
        </div>
        {completed ? (
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-7 text-center"><CheckCircle2 className="mx-auto mb-3 text-emerald-400" size={40} /><h2 className="text-lg font-black">Paiement initié</h2><p className="mt-2 text-sm text-slate-300">La page GeniusPay s’est ouverte pour finaliser votre achat.</p><button onClick={onClose} className="mt-6 rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-900">Retour aux services</button></div>
        ) : (
          <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
            <label className="block text-xs font-bold text-slate-300">Pays et fournisseur<select value={providerCode} onChange={(e) => setProviderCode(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-amber-400/60">{PROVIDERS.map((item) => <option key={item.code} value={item.code}>{item.country} — {item.name} ({item.currency})</option>)}</select></label>
            <label className="block text-xs font-bold text-slate-300">Numéro du compteur<input required value={meterNumber} onChange={(e) => setMeterNumber(e.target.value)} inputMode="numeric" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-amber-400/60" placeholder="Ex. 123456789" /></label>
            <div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold text-slate-300">Montant ({provider.currency})<input required value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-amber-400/60" placeholder="Minimum 200" /></label><label className="block text-xs font-bold text-slate-300">Téléphone<input required value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-amber-400/60" placeholder="+225..." /></label></div>
            <label className="block text-xs font-bold text-slate-300">Nom du client (optionnel)<input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white outline-none focus:border-amber-400/60" placeholder="Nom affiché sur la facture" /></label>
            <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3.5 text-sm font-black text-white shadow-lg shadow-orange-600/20 disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={17} /> : <ExternalLink size={17} />} Continuer avec GeniusPay</button>
            <p className="text-center text-[10px] text-slate-500">Vous serez redirigé vers GeniusPay pour choisir votre moyen de paiement.</p>
          </form>
        )}
      </div>
    </div>
  );
}

export { PROVIDERS };
