"use client";

import { useState } from "react";
import {
  CheckCircle2, Download, Share2, Home,
  ExternalLink, ShieldCheck, Zap, Copy,
  Check, ArrowLeft, Clock, Landmark
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function PaymentDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  const amount = searchParams.get("amount") || "0.00";
  const to = searchParams.get("to") || "Utilisateur PimPay";
  const txid = searchParams.get("txid") || "TX-PI-" + Math.random().toString(36).substr(2, 9).toUpperCase();
  const method = searchParams.get("method") || "wallet";
  const date = new Date().toLocaleString("fr-FR", {
    day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
  });

  const copyTxid = () => {
    navigator.clipboard.writeText(txid);
    setCopied(true);
    toast.success("ID copie !");
    setTimeout(() => setCopied(false), 2000);
  };

  const methodLabels: Record<string, string> = {
    wallet: "Pi Wallet",
    usd: "Solde USD",
    card: "Visa PimPay",
    external: "Pi Browser"
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[35%] bg-emerald-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-12 pb-12">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Details</p>
            <p className="text-[10px] text-slate-500 uppercase font-bold">Transaction</p>
          </div>
          <div className="w-11" />
        </header>

        {/* Status Badge */}
        <div className="flex justify-center mb-8 animate-in zoom-in duration-500">
          <div className="flex items-center gap-2.5 bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 rounded-full">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Confirme</span>
          </div>
        </div>

        {/* Receipt Card */}
        <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] overflow-hidden mb-6 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Amount section */}
          <div className="p-8 text-center relative">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
              <Zap size={80} />
            </div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant total</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-5xl font-black tracking-tighter">{amount}</span>
              <span className="text-xl font-black text-blue-500">Pi</span>
            </div>
          </div>

          {/* Dashed separator (receipt style) */}
          <div className="relative mx-6">
            <div className="border-t-2 border-dashed border-white/10" />
            <div className="absolute -left-9 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#020617] rounded-full" />
            <div className="absolute -right-9 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#020617] rounded-full" />
          </div>

          {/* Details section */}
          <div className="p-8 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destinataire</span>
              <span className="text-xs font-black uppercase">{to}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Methode</span>
              <span className="text-xs font-black uppercase text-blue-400">{methodLabels[method] || method}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</span>
              <div className="flex items-center gap-1.5">
                <Clock size={10} className="text-slate-600" />
                <span className="text-xs font-bold text-slate-300">{date}</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Frais</span>
              <span className="text-xs font-black uppercase text-emerald-400">0.01 Pi</span>
            </div>

            {/* TX ID */}
            <div className="pt-4 border-t border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">ID Transaction</span>
              <button
                onClick={copyTxid}
                className="w-full flex items-center justify-between gap-2 bg-white/5 px-4 py-3 rounded-xl border border-white/5 hover:bg-white/10 transition-all"
              >
                <span className="text-[10px] font-mono text-slate-400 truncate">{txid}</span>
                {copied ? <Check size={14} className="text-emerald-500 shrink-0" /> : <Copy size={14} className="text-slate-500 shrink-0" />}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3 mb-6 animate-in fade-in duration-500 delay-100">
          <button className="flex flex-col items-center gap-2 p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] transition-all active:scale-95">
            <Download size={16} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-wider">PDF</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] transition-all active:scale-95">
            <Share2 size={16} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-wider">Partager</span>
          </button>
          <button className="flex flex-col items-center gap-2 p-4 bg-white/[0.03] border border-white/10 rounded-2xl hover:bg-white/[0.06] transition-all active:scale-95">
            <ExternalLink size={16} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-wider">Explorer</span>
          </button>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push("/mpay")}
          className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-95 transition-all mb-3"
        >
          <Home size={16} /> Retour a mPay
        </button>

        <div className="mt-8 flex items-center justify-center gap-2 opacity-30">
          <ShieldCheck size={12} className="text-emerald-500" />
          <p className="text-[8px] font-black uppercase tracking-[0.3em]">Certifie PimPay Ledger</p>
        </div>
      </div>
    </main>
  );
}
