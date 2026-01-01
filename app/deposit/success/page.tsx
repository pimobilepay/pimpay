"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowRight, Receipt, Wallet, Sparkles } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function DepositSuccessPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-20 px-8 text-center font-sans overflow-hidden">
      
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col items-center w-full animate-in fade-in zoom-in duration-700">
        {/* Animated Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-12">
          <Sparkles size={12} className="text-emerald-500" />
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Transaction Approuvée</span>
        </div>

        {/* Success Icon with Double Ring */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-[2.5rem] blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[2.5rem] flex items-center justify-center border border-white/20 shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
            <CheckCircle2 className="text-white" size={48} strokeWidth={3} />
          </div>
        </div>
                                      
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">
          Succès !
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] max-w-[200px] leading-relaxed">
          Le réseau a validé votre dépôt avec succès
        </p>

        {/* Mini Receipt Preview */}
        <div className="mt-10 w-full max-w-[260px] p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
           <div className="flex justify-between items-center opacity-50">
              <span className="text-[8px] font-black uppercase text-slate-400">Réf. Transaction</span>
              <span className="text-[9px] font-mono text-white">{ref?.slice(0, 10) || "TX-PIM-99"}...</span>
           </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-4 relative z-10">
        <Link href={`/deposit/details?ref=${ref}`} className="block">
          <Button className="w-full h-20 bg-white text-black hover:bg-slate-100 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-between px-8 shadow-xl shadow-white/5 group">
            <div className="flex items-center gap-3">
               <Receipt size={20} className="text-blue-600" />
               <span className="text-sm">Voir le reçu</span>
            </div>
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </Link>

        <Link href="/" className="block">
          <Button className="w-full h-16 bg-blue-600/10 border border-blue-500/20 text-blue-400 hover:bg-blue-600/20 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3">
            <Wallet size={18} />
            Mon Portefeuille
          </Button>
        </Link>

        <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mt-4">
          Protocole de sécurité PimPay v4.0
        </p>
      </div>
    </div>
  );
}
