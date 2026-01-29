"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, ChevronRight, Wallet2, X, Search, Loader2, Smartphone, TrendingUp, CircleDot
} from "lucide-react";
import { useRouter } from "next/navigation";
import { countries, type Country } from "@/lib/country-data";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { toast } from "sonner";
import "flag-icons/css/flag-icons.min.css";

export default function RechargePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [balance] = useState(314.159); // Simulé comme sur la page retrait

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");

  const SUGGESTIONS = ["5", "10", "15", "20"];

  useEffect(() => {
    setMounted(true);
    if (selectedCountry?.operators?.length > 0) {
      setSelectedOperator(selectedCountry.operators[0].name);
    }
  }, [selectedCountry]);

  const filteredCountries = useMemo(() => {
    return countries.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
    );
  }, [searchQuery]);

  // Calculs
  const piPrice = 314159.0;
  const piEquivalent = amount ? (Number.parseFloat(amount) / piPrice).toFixed(9) : "0.000000000";
  const localAmount = amount
    ? (Number.parseFloat(amount) * (selectedCountry.piToLocalRate || 2500)).toLocaleString()
    : "0.00";

  const handleRecharge = async () => {
    if (!phoneNumber || !amount || !selectedOperator) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    // Simulation du débit sur le solde PimPay
    setTimeout(() => {
      setLoading(false);
      toast.success("Recharge réussie avec votre solde PimPay");
      router.push(`/dashboard`);
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
      <header className="px-6 pt-10 pb-6 flex items-center gap-4 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">Airtime</h1>
          <div className="flex items-center gap-2 mt-1">
            <CircleDot size={8} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Telecom Recharge</span>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-6">
        
        {/* CARD SOLDE (Harmonisée avec Retrait) */}
        <section className="relative p-7 rounded-[1.8rem] bg-gradient-to-br from-blue-600/15 to-blue-900/5 border border-white/5 overflow-hidden">
          <div className="absolute right-[-10px] bottom-[-15px] opacity-[0.04] -rotate-12">
             <TrendingUp size={140} strokeWidth={1.5} />
          </div>
          <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2 relative z-10">Solde Disponible</p>
          <div className="flex items-baseline gap-2 relative z-10">
             <span className="text-4xl font-black tracking-tighter italic text-white">π {balance.toFixed(3)}</span>
          </div>
        </section>

        {/* SÉLECTION PAYS */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Pays de destination</label>
          <button 
            onClick={() => setIsCountryModalOpen(true)}
            className="w-full h-16 bg-slate-900/50 rounded-2xl border border-white/10 px-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-[1px] scale-110`}></span>
              <span className="text-sm font-black uppercase tracking-tight">{selectedCountry.name}</span>
            </div>
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </div>

        {/* SECTION OPÉRATEURS */}
        <div className="space-y-3">
          <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Opérateur</label>
          <div className="grid grid-cols-2 gap-3">
            {(selectedCountry?.operators || []).map((op) => (
              <button
                key={op.id}
                onClick={() => setSelectedOperator(op.name)}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                  op.name === selectedOperator ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20' : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                  <img src={op.icon} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter truncate">{op.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* FORMULAIRE RECHARGE */}
        <div className="bg-slate-900/30 rounded-[1.8rem] border border-white/5 p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Numéro de téléphone</label>
            <div className="flex gap-2">
              <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-blue-500">
                {selectedCountry.dialCode}
              </div>
              <input 
                type="tel" placeholder="812345678" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white placeholder:text-slate-700"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Montant (USD)</label>
            <div className="relative">
              <input 
                type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)}
                className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-600 font-black text-lg">$</div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {SUGGESTIONS.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-3 rounded-xl border font-black text-[10px] transition-all ${
                    amount === val ? 'bg-blue-600 border-blue-400 text-white' : 'bg-white/5 border-white/5 text-slate-400'
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RÉCAPITULATIF DYNAMIQUE */}
        <AnimatePresence>
          {amount && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="bg-blue-600/5 rounded-[1.8rem] border border-blue-500/10 p-6 space-y-3"
            >
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                <span>Coût en Pi</span>
                <span className="text-white">π {piEquivalent}</span>
              </div>
              <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                <div>
                  <p className="text-[9px] font-black text-blue-500 uppercase italic">Valeur Airtime</p>
                  <p className="text-2xl font-black text-white">{localAmount}</p>
                </div>
                <span className="text-[11px] font-black text-slate-400 mb-1">{selectedCountry.currency}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={handleRecharge}
          disabled={loading || !amount || !phoneNumber || !selectedOperator}
          className="w-full h-16 bg-blue-600 rounded-[1.8rem] font-black uppercase text-[12px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          {loading ? <Loader2 className="animate-spin" /> : <><Wallet2 size={18} /> Payer avec mon solde</>}
        </button>

        {/* INFO SÉCURITÉ SQUIRCLE */}
        <div className="p-6 rounded-[1.8rem] bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-4">
          <Zap size={20} className="text-emerald-500 mt-1" />
          <div>
            <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mb-1">Livraison Instantanée</p>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              Le crédit est envoyé directement sur le numéro après validation. Débité de votre solde Pi PimPay.
            </p>
          </div>
        </div>
      </main>

      {/* MODAL PAYS (Harmonisé) */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div 
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            className="fixed inset-0 z-50 bg-[#020617] flex flex-col"
          >
             <div className="p-6 pt-10 border-b border-white/5 flex items-center gap-3">
               <button onClick={() => setIsCountryModalOpen(false)} className="p-3 bg-white/5 rounded-xl"><X size={20} /></button>
               <div className="flex-1 relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                 <input 
                   placeholder="RECHERCHER UN PAYS..." 
                   className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 text-[11px] font-black outline-none uppercase tracking-widest"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                 />
               </div>
             </div>
             <div className="flex-1 overflow-y-auto p-4 space-y-2">
               {filteredCountries.map(c => (
                 <button 
                   key={c.code}
                   onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); }}
                   className="w-full p-5 flex items-center justify-between bg-white/5 rounded-2xl border border-white/5 active:border-blue-500 transition-colors"
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
