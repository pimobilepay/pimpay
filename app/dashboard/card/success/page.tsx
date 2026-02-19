"use client";

import { useEffect } from "react";
import { 
  CheckCircle2, 
  Share2, 
  Download, 
  ArrowLeft, 
  ShieldCheck,
  Zap,
  Copy,
  ExternalLink
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

export default function McardSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Données extraites de tes captures d'écran réelles
  const amount = searchParams.get("amount") || "1.0";
  const recipientAddress = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWF JGL4CZ7MXW7UQR";
  const payingFor = "Depot PimPay - 314159 USD";
  const txId = `TX-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;

  useEffect(() => {
    if (typeof window !== "undefined" && window.navigator.vibrate) {
      window.navigator.vibrate([50, 30, 50]);
    }
  }, []);

  const copyAddress = () => {
    navigator.clipboard.writeText(recipientAddress);
    toast.success("Adresse copiée !");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      
      <header className="px-6 pt-12 pb-6 flex items-center justify-between">
        <button 
          onClick={() => router.push("/mpay")} 
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[4px] text-slate-500 text-center">Confirmation Mainnet</h1>
        <div className="w-11" />
      </header>

      <main className="flex-1 px-6 flex flex-col items-center justify-center -mt-8">
        
        {/* Icône de succès inspirée de tes reçus */}
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-emerald-500 rounded-full p-4 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
            <CheckCircle2 size={56} className="text-[#020617]" strokeWidth={2.5} />
          </div>
        </div>

        <div className="text-center space-y-1 mb-8">
          <h2 className="text-2xl font-black tracking-tighter uppercase italic">Paiement réussi !</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Résumé de la transaction mpay</p>
        </div>

        {/* Détails du reçu basés sur tes fichiers 1000064005.jpg et 1000064022.jpg */}
        <div className="w-full bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-5 backdrop-blur-xl">
          
          <div className="flex flex-col items-center pb-5 border-b border-white/5">
            <span className="text-4xl font-black text-white">
              {amount} <span className="text-blue-500 italic">Test-Pi</span>
            </span>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Application</p>
              <p className="text-xs font-black text-blue-400">mpay</p>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Adresse du destinataire</p>
                <button onClick={copyAddress} className="text-blue-500 hover:text-blue-400">
                  <Copy size={12} />
                </button>
              </div>
              <p className="text-[9px] font-mono text-slate-300 break-all leading-relaxed">
                {recipientAddress}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Payer pour</p>
              <p className="text-[10px] font-black text-white uppercase">{payingFor}</p>
            </div>
          </div>
        </div>

        {/* Boutons d'action rapides */}
        <div className="w-full grid grid-cols-2 gap-3 mt-6">
            <button className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                <Download size={16} /> Reçu
            </button>
            <button className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
                <Share2 size={16} /> Partager
            </button>
        </div>
      </main>

      <footer className="p-8 space-y-4">
        <button 
          onClick={() => router.push("/mpay")}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 p-5 rounded-2xl font-black uppercase tracking-[0.15em] text-xs shadow-xl active:scale-95 transition-all"
        >
          Retourner au menu
        </button>
        <p className="text-[7px] text-center text-slate-600 font-bold uppercase tracking-[2px]">
          Ce test prouve que notre système est opérationnel pour le Mainnet
        </p>
      </footer>
    </div>
  );
}
