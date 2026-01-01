"use client";

import { Button } from "@/components/ui/button";
import { XCircle, RefreshCcw, AlertTriangle, Home, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function DepositFailPage() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-20 px-8 text-center font-sans overflow-hidden">
      
      {/* Background Glow Effect (Red) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Error Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full mb-12">
          <AlertTriangle size={12} className="text-red-500" />
          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">Transaction Interrompue</span>
        </div>

        {/* Fail Icon with Error Treatment */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500/20 rounded-[2.5rem] blur-2xl opacity-50" />
          <div className="relative w-28 h-28 bg-gradient-to-br from-red-500 to-red-900 rounded-[2.5rem] flex items-center justify-center border border-white/10 shadow-2xl -rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <XCircle className="text-white" size={48} strokeWidth={3} />
          </div>
        </div>
                                      
        <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter mb-2">
          Oups !
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] max-w-[240px] leading-relaxed">
          La demande a été rejetée par l'opérateur ou le système.
        </p>

        {/* Error Info Card */}
        <div className="mt-10 w-full max-w-[280px] p-5 bg-red-950/20 border border-red-500/10 rounded-2xl backdrop-blur-md">
           <p className="text-[9px] font-bold text-red-400 uppercase mb-2">Raisons possibles :</p>
           <ul className="text-[8px] font-black text-slate-500 uppercase space-y-1 tracking-widest list-none">
              <li>• Solde insuffisant</li>
              <li>• Code PIN incorrect</li>
              <li>• Délai d'attente expiré</li>
           </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-4 relative z-10">
        <Link href="/deposit" className="block">
          <Button className="w-full h-20 bg-red-600 hover:bg-red-700 text-white rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-between px-8 shadow-xl shadow-red-900/20 group">
            <div className="flex items-center gap-3">
               <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
               <span className="text-sm">Réessayer</span>
            </div>
            <ChevronLeft size={20} className="rotate-180" />
          </Button>
        </Link>

        <Link href="/" className="block">
          <Button className="w-full h-16 bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 rounded-[2rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all">
            <Home size={18} />
            Accueil
          </Button>
        </Link>

        <div className="pt-4">
          <span className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">
            Reference: {ref?.slice(0, 8) || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}
