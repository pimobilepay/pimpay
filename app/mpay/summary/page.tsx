"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Zap, Info, ChevronRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function PaymentSummary() {
  const router = useRouter();
  const params = useSearchParams();
  const [isConfirming, setIsConfirming] = useState(false);

  const data = {
    amount: params.get("amount") || "0",
    to: params.get("to") || "Utilisateur PimPay",
    method: params.get("method") || "wallet",
    txid: params.get("txid") || "N/A"
  };

  const handleFinalConfirm = async () => {
    setIsConfirming(true);
    try {
      const res = await fetch("/api/mpay/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success) {
        router.push(`/mpay/success?txid=${data.txid}&amount=${data.amount}&to=${data.to}`);
      } else {
        router.push(`/mpay/failed?reason=${result.message}`);
      }
    } catch (err) {
      router.push(`/mpay/failed?reason=Erreur de connexion serveur`);
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white p-6 pt-12">
      <div className="max-w-md mx-auto">
        <button onClick={() => router.back()} className="mb-8 p-3 bg-white/5 rounded-2xl border border-white/10">
          <ArrowLeft size={20} />
        </button>

        <h1 className="text-2xl font-black uppercase italic mb-2">Résumé du paiement</h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-10">Vérifiez les détails avant de confirmer</p>

        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Montant à envoyer</p>
              <p className="text-4xl font-black italic">{data.amount} <span className="text-blue-500">π</span></p>
            </div>
            <Zap className="text-blue-500 opacity-20" size={40} />
          </div>

          <div className="space-y-4 pt-6 border-t border-white/5">
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Destinataire</span>
              <span className="text-xs font-black uppercase">{data.to}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Mode de paiement</span>
              <span className="text-xs font-black uppercase text-blue-400">{data.method}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Frais Réseau</span>
              <span className="text-xs font-black uppercase text-emerald-500">0.01 π</span>
            </div>
          </div>

          <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-2xl flex gap-3">
            <Info size={18} className="text-blue-500 shrink-0" />
            <p className="text-[10px] text-slate-300 leading-relaxed font-medium">
              En confirmant, vous autorisez PimPay à débiter votre solde immédiatement. Cette action est irréversible sur la blockchain.
            </p>
          </div>
        </div>

        <button
          onClick={handleFinalConfirm}
          disabled={isConfirming}
          className="w-full h-16 bg-blue-600 rounded-[22px] mt-10 font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 disabled:opacity-50"
        >
          {isConfirming ? <Loader2 className="animate-spin" /> : <>Confirmer & Payer <ChevronRight size={18} /></>}
        </button>
      </div>
    </main>
  );
}
