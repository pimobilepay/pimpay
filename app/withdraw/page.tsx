"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Smartphone, Building2, Clock, 
  ShieldCheck, CircleDot, ChevronDown, Landmark, CheckCircle2, TrendingUp
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
  const [balance, setBalance] = useState<number>(314.159);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Calcul avec frais de 2%
  const marketValueUsd = piAmount ? parseFloat(piAmount) * PI_CONSENSUS_USD : 0;
  const feesUsd = marketValueUsd * 0.02;
  const netUsd = marketValueUsd - feesUsd;
  const conversion = piAmount ? calculateExchangeWithFee(parseFloat(piAmount) * 0.98, selectedCountry.currency) : { total: 0 };

  const formatValue = (val: number) => {
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
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
        {/* CARD SOLDE AVEC FLÈCHE FILIGRANE */}
        <section className="relative p-7 rounded-[1.8rem] bg-gradient-to-br from-blue-600/15 to-blue-900/5 border border-white/5 overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-15px] opacity-[0.04] -rotate-12">
             <TrendingUp size={140} strokeWidth={1.5} />
          </div>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 relative z-10">Solde Pi Disponible</p>
          <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-4xl font-black tracking-tighter italic text-white">π {balance.toFixed(3)}</span>
          </div>
        </section>

        {/* TABS - Taille de police optimisée */}
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
                  <button onClick={() => setIsCountryModalOpen(true)} className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 flex items-center justify-between">
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
                      className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-black uppercase appearance-none outline-none text-white">
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
                      className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
          {/* ... autres onglets (Banque/Logs) ici ... */}
        </AnimatePresence>

        {/* SECTION MONTANT ET CALCULS */}
        {activeTab !== "logs" && (
          <div className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Montant à retirer (π)</label>
              <div className="relative">
                <input type="number" placeholder="0.00" value={piAmount} onChange={(e) => setPiAmount(e.target.value)}
                  className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 placeholder:text-slate-800" />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">PI</div>
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

            <button className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">
              Vérifier le Cashout
            </button>
          </div>
        )}

        {/* PIMPAY PROTECTION - Coins ajustés */}
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

      {/* MODAL PAYS */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col">
             <div className="flex items-center justify-between mb-8 pt-4">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">SÉLECTION PAYS</h2>
               <button onClick={() => setIsCountryModalOpen(false)} className="px-4 py-2 bg-white/5 rounded-xl text-[10px] font-black uppercase">Fermer</button>
             </div>
             <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
               {countries.map(c => (
                 <button key={c.code} onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); }}
                   className="w-full p-5 flex items-center justify-between bg-white/5 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors">
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
