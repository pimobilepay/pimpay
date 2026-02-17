"use client";

import { useState } from "react";
import { 
  ArrowLeft, CreditCard, ShieldCheck, 
  Lock, Eye, EyeOff, Settings, 
  Plus, History, Info, Sparkles, 
  ChevronRight, Copy, CheckCircle2,
  AlertCircle, Zap, Ban, Globe
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// Mock data pour la carte
const CARD_DATA = {
  number: "4532 8892 0041 3141",
  expiry: "12/28",
  cvv: "314",
  holder: "ELARA PIMPAY",
  status: "active", // active, frozen, pending
  type: "Virtual Visa",
  balance: "1,250.00"
};

const CARD_LOGS = [
  { id: 1, merchant: "Netflix", amount: "-15.99", date: "Hier, 20:01", status: "success" },
  { id: 2, merchant: "Amazon", amount: "-124.50", date: "14 Fév, 12:30", status: "success" },
  { id: 3, merchant: "Apple Store", amount: "-2.99", date: "10 Fév, 09:15", status: "success" },
];

export default function McardPage() {
  const router = useRouter();
  const [showDetails, setShowDetails] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter">M-Card</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isFrozen ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[2px]">
              {isFrozen ? "Carte Gelée" : "Carte Active"}
            </p>
          </div>
        </div>
        <button className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <Settings size={20} />
        </button>
      </header>

      <main className="px-6 pt-8 pb-32 space-y-10">
        
        {/* VIRTUAL CARD SECTION */}
        <section className="relative perspective-1000">
          <div className={`relative w-full aspect-[1.586/1] rounded-[1.5rem] p-6 transition-all duration-700 transform ${isFrozen ? "grayscale opacity-60" : "shadow-2xl shadow-blue-600/20"}`}>
            {/* Background avec dégradé PimPay */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-blue-700 to-slate-900 rounded-[1.5rem] -z-10 overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-20 -mb-20 blur-3xl" />
            </div>

            {/* Content of the Card */}
            <div className="h-full flex flex-col justify-between relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-white/50 uppercase tracking-widest">PimPay Virtual</p>
                  <div className="flex items-center gap-2">
                    <Zap size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-black italic tracking-tighter text-lg">M-CARD</span>
                  </div>
                </div>
                <Globe size={24} className="text-white/30" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between group" onClick={() => copyToClipboard(CARD_DATA.number, "Numéro")}>
                  <p className="text-xl md:text-2xl font-black tracking-[0.2em] font-mono">
                    {showDetails ? CARD_DATA.number : "•••• •••• •••• 3141"}
                  </p>
                </div>

                <div className="flex gap-8">
                  <div>
                    <p className="text-[8px] font-black text-white/40 uppercase mb-1">Expiration</p>
                    <p className="text-sm font-black tracking-widest">{CARD_DATA.expiry}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-white/40 uppercase mb-1">CVV</p>
                    <p className="text-sm font-black tracking-widest">{showDetails ? CARD_DATA.cvv : "•••"}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-end">
                <p className="text-xs font-black uppercase tracking-widest opacity-80">{CARD_DATA.holder}</p>
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-red-500/80 backdrop-blur-sm" />
                  <div className="w-8 h-8 rounded-full bg-amber-500/80 backdrop-blur-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Floating Action sous la carte */}
          <div className="flex justify-center -mt-5">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="bg-white text-black px-6 py-2.5 rounded-full flex items-center gap-2 shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
              <span className="text-[10px] font-black uppercase tracking-widest">
                {showDetails ? "Masquer" : "Révéler les infos"}
              </span>
            </button>
          </div>
        </section>

        {/* CARD SETTINGS ACTIONS */}
        <section className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => {
              setIsFrozen(!isFrozen);
              toast(isFrozen ? "Carte débloquée !" : "Carte gelée par sécurité.");
            }}
            className={`p-4 rounded-3xl border flex flex-col items-center gap-3 transition-all ${isFrozen ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-white/5 border-white/10 text-slate-400"}`}
          >
            {isFrozen ? <CheckCircle2 size={24} /> : <Ban size={24} />}
            <span className="text-[10px] font-black uppercase tracking-widest">{isFrozen ? "Activer" : "Geler la carte"}</span>
          </button>
          
          <button className="p-4 bg-white/5 border border-white/10 rounded-3xl flex flex-col items-center gap-3 text-slate-400 hover:bg-white/10 transition-all">
            <Lock size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Changer Code</span>
          </button>
        </section>

        {/* INFO MESSAGES (LES "TITRES" ET CONSEILS) */}
        <section className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl">
              <Info size={18} className="text-blue-400" />
            </div>
            <h2 className="text-xs font-black uppercase tracking-widest text-blue-400">Conseil Sécurité</h2>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400 font-bold">
            Votre <span className="text-white">M-Card</span> est une carte virtuelle sécurisée. Ne partagez jamais votre CVV ou votre code PIN, même avec un agent PimPay. En cas de doute, utilisez le bouton <span className="text-blue-400">"Geler"</span>.
          </p>
        </section>

        {/* HISTORY */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={14} className="text-slate-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Transactions Carte</h2>
            </div>
            <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Voir tout</button>
          </div>

          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
            {CARD_LOGS.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                    <Sparkles size={18} className="text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-tight">{log.merchant}</p>
                    <p className="text-[9px] font-bold text-slate-600">{log.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black">{log.amount} Pi</p>
                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Payé</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EMPTY STATE / AD PROMO */}
        <section className="relative overflow-hidden rounded-[2rem] p-8 border border-white/5 bg-gradient-to-r from-slate-900 to-blue-900/40">
           <div className="relative z-10">
             <h3 className="text-lg font-black uppercase tracking-tighter mb-2 italic">Besoin d'une carte physique ?</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase mb-4 tracking-widest">Bientôt disponible pour les pionniers certifiés KYC.</p>
             <button className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-[3px]">
               S'inscrire sur la liste <ChevronRight size={14} />
             </button>
           </div>
           <CreditCard size={100} className="absolute -right-4 -bottom-4 opacity-10 rotate-12" />
        </section>

      </main>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <ShieldCheck size={16} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">Protocole de protection Mcard Actif</span>
          </div>
        </div>
      </div>
    </div>
  );
}
