"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin,
  ShieldCheck, Coins, Zap, Loader2, Lock, RefreshCcw, Globe, ChevronDown
} from "lucide-react";

import { countries, type Country } from "@/lib/country-data";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { PiButton } from "@/components/PiButton";
import { toast } from "sonner";
import { processDeposit } from "@/app/actions/deposit";
import "flag-icons/css/flag-icons.min.css";

const PI_GCV_PRICE = 314159;

export default function DepositPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("mobile");

  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CG") || countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");

  useEffect(() => {
    setMounted(true);
    if (selectedCountry?.operators?.length > 0) {
      setSelectedOperator(selectedCountry.operators[0].name);
    }
  }, [selectedCountry]);

  const refreshData = useCallback(() => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast.info("Protocole synchronisé");
    }, 800);
  }, []);

  const calculatePiToReceive = () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return "0.000000";
    return (val / PI_GCV_PRICE).toFixed(8);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">Dépôt</h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={8} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Liquidity Inflow</span>
            </div>
          </div>
        </div>
        <button onClick={refreshData} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          <RefreshCcw size={18} className={isRefreshing ? "animate-spin text-blue-500" : "text-slate-400"} />
        </button>
      </header>

      <main className="px-6 space-y-6">
        
        {/* BANNER INFO SQUIRCLE */}
        <section className="relative p-7 rounded-[1.8rem] bg-gradient-to-br from-blue-600/15 to-blue-900/5 border border-white/5 overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05]">
            <Zap size={120} className="text-blue-500" />
          </div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">PimPay Secure</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic leading-relaxed">
                Approvisionnement via Pi SDK & Mobile Money.
              </p>
            </div>
          </div>
        </section>

        {/* SÉLECTION DU PAYS (Correction Drapeau) */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Pays de résidence</label>
          <button 
            onClick={() => setIsCountryModalOpen(true)}
            className="w-full h-16 bg-slate-900/50 rounded-2xl border border-white/10 px-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-[1px] scale-110`}></span>
              <span className="text-sm font-black uppercase tracking-tight">{selectedCountry.name}</span>
            </div>
            <ChevronDown size={18} className="text-slate-500" />
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <nav className="grid grid-cols-3 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
          {[
            { id: "mobile", label: "Mobile", icon: <Smartphone size={16}/> },
            { id: "card", label: "Carte", icon: <CreditCard size={16}/> },
            { id: "crypto", label: "Crypto", icon: <Bitcoin size={16}/> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10.5px] font-black uppercase transition-all ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        {/* CONTENU DYNAMIQUE */}
        <AnimatePresence mode="wait">
          {activeTab === "mobile" && (
            <motion.div 
              key="mobile-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Montant (USD)</label>
                <div className="relative">
                  <input 
                    type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                    className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black">USD</div>
                </div>
                {amount && (
                  <p className="text-[10px] text-slate-500 italic ml-2">
                    ≈ { (Number(amount) * (selectedCountry.piToLocalRate || 2500)).toLocaleString() } {selectedCountry.currency}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Opérateur</label>
                <select 
                  value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-black uppercase outline-none text-white appearance-none"
                >
                  {selectedCountry.operators?.map(op => (
                    <option key={op.id} value={op.name} className="bg-slate-950">{op.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Numéro Mobile</label>
                <div className="flex gap-2">
                  <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-blue-500">
                    {selectedCountry.dialCode}
                  </div>
                  <input 
                    type="tel" placeholder="000 000 000" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                    className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white"
                  />
                </div>
              </div>

              <button 
                onClick={() => setIsLoading(true)}
                className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
              >
                {isLoading ? <Loader2 className="animate-spin mx-auto" /> : "Initier le Dépôt"}
              </button>
            </motion.div>
          )}

          {activeTab === "card" && (
            <motion.div key="card-tab" className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2 text-emerald-500">
                <Lock size={14} /> 
                <span className="text-[10px] font-black uppercase tracking-widest">Paiement Sécurisé SSL</span>
              </div>
              <input placeholder="Numéro de Carte" className="w-full h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="MM/YY" className="h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none" />
                <input placeholder="CVC" className="h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none" />
              </div>
              <button className="w-full h-14 bg-emerald-600 rounded-2xl font-black uppercase tracking-widest text-[11px]">Valider la Carte</button>
            </motion.div>
          )}

          {activeTab === "crypto" && (
            <motion.div key="crypto-tab" className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-8 space-y-6 text-center">
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                <Bitcoin size={40} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-black italic tracking-tighter">PI NETWORK GATEWAY</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">PimPay Secure Protocol</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Conversion GCV</span>
                <span className="text-sm font-black text-blue-400 italic">≈ {calculatePiToReceive()} PI</span>
              </div>
              <PiButton amountUsd={amount || "0"} piAmount={calculatePiToReceive()} onSuccess={() => router.push('/dashboard')} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-5 rounded-[1.8rem] border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Temps Estimé</p>
            <p className="text-lg font-black text-white mt-1">~3-5 Min</p>
          </div>
          <div className="bg-white/5 p-5 rounded-[1.8rem] border border-white/5 text-center">
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">Frais Réseau</p>
            <p className="text-lg font-black text-emerald-400 mt-1">0.00%</p>
          </div>
        </div>
      </main>

      {/* MODAL SÉLECTION PAYS */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col"
          >
             <div className="flex items-center justify-between mb-8 pt-4">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">SÉLECTION PAYS</h2>
               <button onClick={() => setIsCountryModalOpen(false)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase">Fermer</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2">
               {countries.map(c => (
                 <button 
                   key={c.code}
                   onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); }}
                   className="w-full p-5 flex items-center justify-between bg-white/5 rounded-2xl border border-white/5 active:border-blue-500"
                 >
                   <div className="flex items-center gap-4">
                     <span className={`fi fi-${c.code.toLowerCase()} rounded-[1px] scale-125`}></span>
                     <span className="text-xs font-black uppercase tracking-tight">{c.name}</span>
                   </div>
                   <span className="text-[11px] font-black text-blue-500">{c.dialCode}</span>
                 </button>
               ))}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
