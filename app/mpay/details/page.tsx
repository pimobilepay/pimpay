"use client";

import { useEffect, useState } from "react";
import { 
  CheckCircle2, 
  Download, 
  Share2, 
  Home, 
  ExternalLink, 
  ShieldCheck,
  Zap,
  Copy,
  Check
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";

export default function PaymentDetailsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [copied, setCopied] = useState(false);

  // Récupération des données de l'URL
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
    toast.success("ID copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white font-sans selection:bg-blue-500/30">
      {/* EFFET LUMINEUX DE SUCCÈS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative z-10 max-w-md mx-auto px-6 pt-16 pb-12">
        
        {/* ANIMATION DE SUCCÈS */}
        <div className="flex flex-col items-center mb-10 animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-[35%] flex items-center justify-center mb-6 relative">
             <div className="absolute inset-0 bg-emerald-500/20 blur-2xl rounded-full animate-pulse" />
             <CheckCircle2 size={48} className="text-emerald-500 relative z-10" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tighter italic">Paiement Envoyé</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-2">Transaction validée avec succès</p>
        </div>

        {/* CARTE DU REÇU */}
        <div className="bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 mb-8 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
            <Zap size={100} />
          </div>

          <div className="text-center border-b border-white/5 pb-6 mb-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Montant total</p>
            <div className="inline-flex items-baseline gap-2">
              <span className="text-4xl font-black italic">{amount}</span>
              <span className="text-xl font-black text-blue-500 italic">π</span>
            </div>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Destinataire</span>
              <span className="text-xs font-black uppercase">{to}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Méthode</span>
              <span className="text-xs font-black uppercase text-blue-400">{method.replace('wallet', 'Pi Wallet')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</span>
              <span className="text-xs font-bold text-slate-300">{date}</span>
            </div>
            <div className="flex justify-between items-center gap-4 pt-4 border-t border-white/5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest shrink-0">ID Transaction</span>
              <button 
                onClick={copyTxid}
                className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 transition-all truncate"
              >
                <span className="text-[10px] font-mono text-slate-400 truncate">{txid}</span>
                {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-500" />}
              </button>
            </div>
          </div>
        </div>

        {/* ACTIONS SECONDAIRES */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
            <Download size={16} className="text-blue-500" />
            Recu PDF
          </button>
          <button className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95">
            <Share2 size={16} className="text-blue-500" />
            Partager
          </button>
        </div>

        {/* BOUTON RETOUR ACCUEIL */}
        <button
          onClick={() => router.push("/wallet")}
          className="w-full h-16 bg-blue-600 rounded-[22px] flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95"
        >
          <Home size={18} />
          Retour au Dashboard
        </button>

        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 opacity-30">
            <ShieldCheck size={14} className="text-emerald-500" />
            <p className="text-[9px] font-black uppercase tracking-[0.3em]">Certifié Blockchain Node</p>
          </div>
          <button className="flex items-center gap-2 text-blue-500/50 hover:text-blue-500 transition-colors">
            <span className="text-[9px] font-black uppercase tracking-widest">Voir sur l'explorateur</span>
            <ExternalLink size={12} />
          </button>
        </div>

      </div>
    </main>
  );
}
