"use client";
                                               import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin,
  ShieldCheck, Zap, Loader2, RefreshCcw, ChevronDown, CheckCircle2, Shield, Search, Lock
} from "lucide-react";

import { countries, type Country } from "@/lib/country-data";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { PiButton } from "@/components/PiButton";
import { toast } from "sonner";                import "flag-icons/css/flag-icons.min.css";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);

  // Sélection initiale
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CG") || countries[0]
  );

  const [selectedOperator, setSelectedOperator] = useState(
    selectedCountry.operators?.[0] || null
  );

  const feesCalculation = useMemo(() => {
    const val = parseFloat(amount) || 0;
    const fee = val * 0.02;
    const totalUsd = val + fee;
    const localRate = selectedCountry.piToLocalRate || 600;
    return {
      fee: fee.toFixed(2),
      totalUsd: totalUsd.toFixed(2),
      totalLocal: (totalUsd * localRate).toLocaleString(),
      piEquivalent: (val / PI_GCV_PRICE).toFixed(8)
    };
  }, [amount, selectedCountry]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mise à jour de l'opérateur quand le pays change
  useEffect(() => {
    if (selectedCountry.operators?.length > 0) {
      setSelectedOperator(selectedCountry.operators[0]);
    } else {
      setSelectedOperator(null);
    }
  }, [selectedCountry]);

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <button onClick={() => { setIsRefreshing(true); setTimeout(() => setIsRefreshing(false), 1000); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          <RefreshCcw size={18} className={isRefreshing ? "animate-spin text-blue-500" : "text-slate-400"} />
        </button>
      </header>

      <main className="px-6 space-y-6">
        {/* BANNER INFO */}
        <section className="relative p-7 rounded-[1.8rem] bg-gradient-to-br from-blue-600/15 to-blue-900/5 border border-white/5 overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.05]"><Zap size={120} className="text-blue-500" /></div>
          <div className="flex items-start gap-4 relative z-10">
            <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20"><ShieldCheck size={24} /></div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">PimPay Secure</p>
              <p className="text-[10px] text-slate-400 mt-1 font-medium italic leading-relaxed">Approvisionnement via Pi SDK & Mobile Money.</p>
            </div>
          </div>
        </section>

        {/* 1. TABS NAVIGATION */}
        <nav className="grid grid-cols-3 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
          {[
            { id: "mobile", label: "Mobile", icon: <Smartphone size={16}/> },
            { id: "card", label: "Carte", icon: <CreditCard size={16}/> },
            { id: "crypto", label: "Crypto", icon: <Bitcoin size={16}/> }
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10.5px] font-black uppercase transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg" : "text-slate-500"}`}>{tab.icon} {tab.label}</button>
          ))}
        </nav>

        {/* 2. SÉLECTION DU PAYS (Désormais après les onglets) */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Pays de résidence</label>
          <button onClick={() => setIsCountryModalOpen(true)} className="w-full h-16 bg-slate-900/50 rounded-2xl border border-white/10 px-5 flex items-center justify-between active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-4">
              <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-[1px] scale-110`}></span>
              <span className="text-sm font-black uppercase tracking-tight">{selectedCountry.name}</span>
            </div>
            <ChevronDown size={18} className="text-slate-500" />
          </button>
        </div>

        {/* 3. CONTENU DYNAMIQUE */}
        <AnimatePresence mode="wait">
          {activeTab === "mobile" && (
            <motion.div key="mobile" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-slate-900/30 rounded-[2.5rem] border border-white/5 p-6 space-y-6">

              {/* MONTANT */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Montant (USD)</label>
                <div className="relative">
                  <input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg text-[10px] font-black">USD</div>
                </div>
              </div>

              {/* OPÉRATEURS (Récupération images via lib/country-data) */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Opérateur Mobile</label>
                <div className="grid grid-cols-1 gap-2">
                  {selectedCountry.operators?.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOperator(op)}
                      className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                        selectedOperator?.id === op.id
                        ? "bg-blue-600/10 border-blue-500"
                        : "bg-black/20 border-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white overflow-hidden flex items-center justify-center p-1">
                          <img
                            src={op.icon}
                            alt={op.name}
                            className="w-full h-full object-contain"
                            onError={(e) => { (e.target as any).src = "https://cdn-icons-png.flaticon.com/512/722/722174.png"}}
                          />
                        </div>
                        <span className="text-xs font-black uppercase">{op.name}</span>
                      </div>
                      {selectedOperator?.id === op.id && <CheckCircle2 size={18} className="text-blue-500" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* TICKET RÉCAPITULATIF */}
              {amount && (
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-slate-500">Frais Réseau (2%)</span>
                    <span className="text-red-400">+{feesCalculation.fee} USD</span>
                  </div>
                  <div className="flex justify-between text-[13px] font-black uppercase italic text-emerald-400 pt-2 border-t border-white/5">
                    <span>Total à payer</span>
                    <span>{feesCalculation.totalLocal} {selectedCountry.currency}</span>
                  </div>
                </div>
              )}

              {/* NUMÉRO */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Numéro de téléphone</label>
                <div className="flex gap-2">
                  <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-blue-500">{selectedCountry.dialCode}</div>
                  <input type="tel" placeholder="Ex: 06 444 22 11" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none" />
                </div>
              </div>

              <button onClick={() => setIsLoading(true)} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 flex items-center justify-center">
                {isLoading ? <Loader2 className="animate-spin" /> : "Payer maintenant"}
              </button>
            </motion.div>
          )}

          {activeTab === "card" && (
            <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-5">
              <div className="flex items-center gap-2 mb-2 text-emerald-500">
                <Lock size={14} />
                <span className="text-[10px] font-black uppercase tracking-widest">Paiement Sécurisé SSL</span>
              </div>
              <input placeholder="Numéro de Carte" className="w-full h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input placeholder="MM/YY" className="h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none" />
                <input placeholder="CVC" className="h-14 bg-slate-900/80 border border-white/10 rounded-2xl px-5 text-sm font-black outline-none" />
              </div>
              <button className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase tracking-widest text-[11px]">Débiter la carte</button>
            </motion.div>
          )}

          {activeTab === "crypto" && (
            <motion.div key="crypto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-8 space-y-6 text-center">
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                <Bitcoin size={40} className="text-blue-500" />
              </div>
              <div>
                <h3 className="text-lg font-black italic tracking-tighter uppercase">Pi Network Bridge</h3>
                <p className="text-[10px] text-slate-500 mt-1 font-bold uppercase tracking-widest">Transfert direct Mainnet</p>
              </div>
              <div className="bg-black/40 p-4 rounded-2xl border border-white/5 flex justify-between items-center text-left">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Conversion GCV</span>
                <span className="text-sm font-black text-blue-400 italic">≈ {feesCalculation.piEquivalent} PI</span>
              </div>
              <PiButton amountUsd={amount || "0"} piAmount={feesCalculation.piEquivalent} onSuccess={() => router.push('/dashboard')} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* STATS DE SÉCURITÉ */}
        <section className="bg-white/5 rounded-[2rem] border border-white/5 p-6 space-y-5">
           <div className="space-y-4">
              <div className="flex items-center gap-4">
                <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black uppercase">Fonds Protégés</h4>
                  <p className="text-[9px] text-slate-500 italic">Garantie PimPay sur chaque dépôt.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Shield size={18} className="text-purple-500 shrink-0" />
                <div>
                  <h4 className="text-[10px] font-black uppercase">Audit en temps réel</h4>
                  <p className="text-[9px] text-slate-500 italic">Vérification automatique de la transaction.</p>
                </div>
              </div>
           </div>
        </section>
      </main>

      {/* MODAL SÉLECTION PAYS */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col">
             <div className="flex items-center justify-between mb-6 pt-4">
               <h2 className="text-xl font-black uppercase italic tracking-tighter">SÉLECTION PAYS</h2>
               <button onClick={() => setIsCountryModalOpen(false)} className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase">Fermer</button>
             </div>
             <div className="relative mb-4">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
               <input type="text" placeholder="Rechercher un pays..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 text-sm outline-none font-medium" />
             </div>
             <div className="flex-1 overflow-y-auto space-y-2">
               {filteredCountries.map(c => (
                 <button key={c.code} onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); }} className="w-full p-4 flex items-center justify-between bg-white/5 rounded-2xl border border-white/5 active:bg-blue-600/20 transition-all">
                   <div className="flex items-center gap-4">
                     <span className={`fi fi-${c.code.toLowerCase()} scale-125 rounded-sm`}></span>
                     <span className="text-xs font-black uppercase tracking-tight">{c.name}</span>
                   </div>
                   <span className="text-[10px] font-black text-blue-500">{c.dialCode}</span>
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
