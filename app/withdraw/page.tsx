"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Smartphone, Building2, Clock,
  ShieldCheck, CircleDot, ChevronDown, Landmark, CheckCircle2, TrendingUp, Wallet as WalletIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { countries, type Country } from "@/lib/country-data";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { PI_CONSENSUS_USD, calculateExchangeWithFee } from "@/lib/exchange";
import "flag-icons/css/flag-icons.min.css";

export default function WithdrawPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("mobile");

  const [piAmount, setPiAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  
  const [wallets, setWallets] = useState<any[]>([]);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const walletRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    fetchWallets();

    const handleClickOutside = (event: MouseEvent) => {
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setShowWalletSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchWallets() {
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const json = await res.json();
        const userWallets = json.user.wallets || [];
        setWallets(userWallets);
        
        const piIdx = userWallets.findIndex((w: any) => w.currency === "PI");
        if (piIdx !== -1) setActiveWalletIndex(piIdx);
      }
    } catch (err) {
      console.error("Erreur récupération soldes:", err);
    }
  }

  if (!mounted) return null;

  const currentWallet = wallets[activeWalletIndex] || { balance: 0, currency: "PI" };
  const balance = currentWallet.balance;
  const rate = currentWallet.currency === "PI" ? PI_CONSENSUS_USD : 1;
  const marketValueUsd = piAmount ? parseFloat(piAmount) * rate : 0;
  const feesUsd = marketValueUsd * 0.02;
  const conversion = piAmount ? calculateExchangeWithFee((marketValueUsd - feesUsd) / (currentWallet.currency === "PI" ? PI_CONSENSUS_USD : 1), selectedCountry.currency) : { total: 0 };

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="px-6 pt-10 pb-6 flex items-center gap-4 sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">Retrait</h1>
          <div className="flex items-center gap-2 mt-1">
            <CircleDot size={8} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Liquidity Outflow</span>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6">
        <section className="relative p-7 rounded-[1.8rem] bg-gradient-to-br from-blue-600/15 to-blue-900/5 border border-white/5 overflow-visible">
          <div className="absolute right-[-10px] bottom-[-15px] opacity-[0.04] -rotate-12 pointer-events-none">
             <TrendingUp size={140} strokeWidth={1.5} />
          </div>
          
          <div className="flex justify-between items-start relative z-10 mb-2">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Solde {currentWallet.currency} Disponible</p>
            
            <div className="relative" ref={walletRef}>
              <button 
                onClick={() => setShowWalletSelector(!showWalletSelector)}
                className="bg-white/10 hover:bg-white/20 p-2.5 rounded-xl border border-white/10 transition-all flex items-center gap-2"
              >
                <WalletIcon size={14} className="text-blue-400" />
                <ChevronDown size={12} className={`text-slate-500 transition-transform duration-300 ${showWalletSelector ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showWalletSelector && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                    className="absolute right-0 mt-3 w-36 bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-[20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-1.5 z-[100]"
                  >
                    {wallets.map((w, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setActiveWalletIndex(idx);
                          setShowWalletSelector(false);
                          setPiAmount("");
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-colors ${activeWalletIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                      >
                        {w.currency}
                        {activeWalletIndex === idx && <CheckCircle2 size={12} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-4xl font-black tracking-tighter italic text-white">
               {currentWallet.currency === "PI" ? "π" : currentWallet.currency === "XAF" ? "" : ""} {formatValue(balance)}
             </span>
             <span className="text-sm font-black text-blue-400">{currentWallet.currency}</span>
          </div>
        </section>

        <nav className="grid grid-cols-3 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
          {[
            { id: "mobile", label: "Mobile", icon: <Smartphone size={16}/> },
            { id: "bank", label: "Banque", icon: <Building2 size={16}/> },
            { id: "logs", label: "Logs", icon: <Clock size={16}/> }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10.5px] font-black uppercase transition-all ${
                activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          {activeTab === "mobile" && (
            <motion.div key="mobile-tab" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Pays de destination</label>
                  <button onClick={() => setIsCountryModalOpen(true)} className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 flex items-center justify-between active:bg-slate-800 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-[1px]`}></span>
                      <span className="text-xs font-black uppercase tracking-tight">{selectedCountry.name}</span>
                    </div>
                    <ChevronDown size={16} className="text-slate-500" />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Réseau Mobile</label>
                  <div className="relative">
                    <select value={selectedOperator} onChange={(e) => setSelectedOperator(e.target.value)}
                      className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-black uppercase appearance-none outline-none text-white focus:border-blue-500/50 transition-colors">
                      <option value="" disabled>Sélectionnez un réseau</option>
                      {selectedCountry.operators.map(op => <option key={op.id} value={op.name} className="bg-slate-900">{op.name}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Numéro bénéficiaire</label>
                  <div className="flex gap-2">
                    <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-blue-500">{selectedCountry.dialCode}</div>
                    <input type="tel" placeholder="Ex: 812345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors" />
                  </div>
                </div>
              </div>

              {activeTab !== "logs" && (
                <div className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-5">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Montant à retirer ({currentWallet.currency})</label>
                    <div className="relative">
                      <input type="number" placeholder="0.00" value={piAmount} onChange={(e) => setPiAmount(e.target.value)}
                        className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 placeholder:text-slate-800" />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">{currentWallet.currency}</div>
                    </div>
                  </div>

                  {piAmount && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                        <span>Valeur brute</span>
                        <span className="text-white">$ {formatValue(marketValueUsd)}</span>
                      </div>
                      <div className="flex justify-between items-center text-[10px] font-black uppercase text-rose-500 italic">
                        <span>Frais PimPay (2%)</span>
                        <span>- $ {formatValue(feesUsd)}</span>
                      </div>
                      <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-blue-500 uppercase italic">Cashout Net Estimé</span>
                          <span className="text-2xl font-black text-white">{formatValue(conversion.total)}</span>
                        </div>
                        <span className="text-[11px] font-black text-slate-400">{selectedCountry.currency}</span>
                      </div>
                    </motion.div>
                  )}

                  <button 
                    disabled={!piAmount || parseFloat(piAmount) > balance}
                    className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] ${
                      !piAmount || parseFloat(piAmount) > balance ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-blue-600 text-white shadow-blue-600/20'
                    }`}
                  >
                    {parseFloat(piAmount) > balance ? "Solde insuffisant" : "Vérifier le Cashout"}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 rounded-[1.8rem] bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-500">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-1">PimPay Protection</p>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              Fonds protégés. Traitement : 15 min (Mobile) à 48h (Banque). Projet PimPay 2026.
            </p>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[200] bg-[#020617] p-6 flex flex-col">
             <div className="flex items-center justify-between mb-8 pt-4">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">SÉLECTION PAYS</h2>
               <button onClick={() => setIsCountryModalOpen(false)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase">Fermer</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
               {countries.map(c => (
                 <button key={c.code} onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); }}
                   className="w-full p-5 flex items-center justify-between bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors active:bg-white/10">
                   <div className="flex items-center gap-4">
                     <span className={`fi fi-${c.code.toLowerCase()} rounded-[1px] scale-125`}></span>
                     <span className="text-xs font-black uppercase tracking-tight">{c.name}</span>
                   </div>
                   <span className="text-[11px] font-black text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">{c.dialCode}</span>
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
