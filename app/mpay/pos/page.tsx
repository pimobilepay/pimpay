"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, QrCode, ShieldCheck, Store, X } from "lucide-react";
import { toast } from "sonner";
import { QRScanner } from "@/components/qr-scanner";
import { parseUserQRValue } from "@/lib/agent-qr";

type Merchant = { value: string; label: string };

export default function PosPaymentPage() {
  const router = useRouter();
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [merchantInput, setMerchantInput] = useState("");
  const [amount, setAmount] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const selectMerchant = (raw: string) => {
    const parsed = parseUserQRValue(raw);
    const value = parsed?.id || parsed?.username || parsed?.searchTerm || raw.trim();
    if (!value) return;
    setMerchant({ value, label: parsed?.name || (parsed?.username ? `@${parsed.username}` : value) });
    setMerchantInput(value);
    setScannerOpen(false);
  };

  const submitPayment = async () => {
    const numericAmount = Number(amount);
    if (!merchant?.value) return toast.error("Ajoutez un identifiant commerçant");
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return toast.error("Saisissez un montant valide");
    setProcessing(true);
    try {
      const response = await fetch("/api/mpay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: numericAmount, to: merchant.value, method: "POS", txid: `POS-${Date.now()}` }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.message || "Paiement refusé");
      setSuccess(data.data.txid);
      setAmount("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de traiter le paiement");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] px-5 pb-12 text-white">
      <header className="sticky top-0 z-10 mx-auto flex max-w-md items-center justify-between border-b border-white/5 bg-[#020617]/90 py-5 backdrop-blur-xl">
        <button onClick={() => router.push("/mpay")} className="rounded-2xl border border-white/10 bg-white/5 p-3" aria-label="Retour"><ArrowLeft size={19} /></button>
        <div className="text-center"><h1 className="text-sm font-black uppercase tracking-tight">POS Payment</h1><p className="mt-1 text-[9px] font-bold uppercase tracking-[3px] text-indigo-400">Paiement commerçant</p></div>
        <button onClick={() => router.push("/mpay")} className="rounded-2xl border border-white/10 bg-white/5 p-3" aria-label="Fermer"><X size={19} /></button>
      </header>

      <section className="mx-auto max-w-md space-y-5 pt-7">
        {success ? (
          <div className="rounded-[2rem] border border-emerald-400/20 bg-emerald-500/10 p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={54} />
            <h2 className="text-xl font-black">Paiement effectué</h2>
            <p className="mt-2 text-xs text-slate-400">Référence : {success}</p>
            <button onClick={() => setSuccess(null)} className="mt-7 w-full rounded-2xl bg-emerald-500 py-4 text-xs font-black uppercase tracking-widest text-slate-950">Nouveau paiement</button>
          </div>
        ) : (
          <>
            <div className="rounded-[2rem] border border-indigo-400/20 bg-gradient-to-br from-indigo-600/20 to-violet-600/5 p-6">
              <Store className="mb-5 text-indigo-300" size={28} />
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Régler un commerçant</p>
              <h2 className="mt-2 text-2xl font-black">Scannez ou saisissez le POS</h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">Le paiement est débité de votre wallet Pi et transféré instantanément au commerçant.</p>
            </div>

            <div className="space-y-3 rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Commerçant / Merchant ID</label>
              <div className="flex gap-2">
                <input value={merchantInput} onChange={(e) => { setMerchantInput(e.target.value); setMerchant(e.target.value.trim() ? { value: e.target.value.trim(), label: e.target.value.trim() } : null); }} placeholder="PIMOBIPAY-... ou username" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs font-bold text-white outline-none focus:border-indigo-400" />
                <button onClick={() => setScannerOpen(true)} className="rounded-2xl bg-indigo-600 px-4" aria-label="Scanner le QR du commerçant"><QrCode size={19} /></button>
              </div>
              {merchant && <p className="text-[10px] font-bold text-emerald-400">Commerçant sélectionné : {merchant.label}</p>}
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Montant à payer (Pi)</label>
              <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" className="mt-3 w-full bg-transparent text-4xl font-black outline-none placeholder:text-slate-700" />
              <button disabled={processing} onClick={submitPayment} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-indigo-400 disabled:opacity-50">{processing ? <><Loader2 className="animate-spin" size={16} /> Traitement...</> : "Payer maintenant"}</button>
            </div>
            <p className="flex items-center justify-center gap-2 text-center text-[10px] text-slate-500"><ShieldCheck size={14} className="text-emerald-500" /> Paiement sécurisé, validation côté serveur</p>
          </>
        )}
      </section>
      {scannerOpen && <QRScanner onClose={(data) => { if (data) selectMerchant(data); else setScannerOpen(false); }} hint="Scannez le QR du commerçant" />}
    </main>
  );
}
