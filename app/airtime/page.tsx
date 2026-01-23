"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, Globe, ChevronRight, CheckCircle2,
  Wallet2, X, Search, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { countries, type Country } from "@/lib/country-data";
import { toast } from "sonner";

export default function RechargePage() {
  const router = useRouter();
  
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [loading, setLoading] = useState(false);

  const filteredCountries = useMemo(() => {
    return countries.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
    );
  }, [searchQuery]);

  const piPrice = 314159.0;
  const piAmount = amount ? (Number.parseFloat(amount) / piPrice).toFixed(9) : "0.000000000";
  const localAmount = amount
    ? (Number.parseFloat(amount) * selectedCountry.piToLocalRate).toFixed(2)
    : "0.00";

  // MODIFICATION ICI : Redirection vers la page Summary
  const handleRecharge = async () => {
    if (!phoneNumber || !amount || !selectedOperator) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    
    setLoading(true);
    
    // On simule une petite préparation du protocole PimPay
    setTimeout(() => {
      setLoading(false);
      
      // On passe les données via l'URL pour la page de résumé
      const params = new URLSearchParams({
        type: "airtime",
        phone: `${selectedCountry.dialCode}${phoneNumber}`,
        operator: selectedOperator,
        usd: amount,
        pi: piAmount,
        local: localAmount,
        currency: selectedCountry.currency
      });

      router.push(`/airtime/summary?${params.toString()}`);
    }, 1500);
  };

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">

      {/* HEADER */}
      <header className="px-6 pt-10 pb-5 sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center border border-white/10">
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-tighter italic">Airtime</h1>
            <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">Pimpay Protocol</p>
          </div>
          <div className="w-9 h-9 bg-blue-600/10 rounded-xl flex items-center justify-center border border-blue-500/20">
            <Zap size={16} className="text-blue-400" />
          </div>
        </div>
      </header>

      <main className="px-6 py-6 space-y-6">
        {/* SECTION PAYS */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Destination</h3>
          <button
            onClick={() => setIsCountryModalOpen(true)}
            className="w-full bg-white/5 rounded-[2rem] border border-white/10 p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-white/5">
                <Globe size={20} className="text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-xs font-black uppercase tracking-tight">{selectedCountry.name}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase">{selectedCountry.currency} • {selectedCountry.dialCode}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-600" />
          </button>
        </section>

        {/* SECTION OPÉRATEURS */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Réseau Mobile</h3>
          <div className="grid grid-cols-1 gap-2">
            {(selectedCountry?.operators || []).map((op) => (
              <button
                key={`op-${op.id}`}
                onClick={() => setSelectedOperator(op.name)}
                className={`w-full flex items-center justify-between p-4 rounded-[1.5rem] border transition-all ${
                  op.name === selectedOperator ? 'bg-blue-600 border-blue-400' : 'bg-white/5 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10">
                    <img src={op.icon} alt="" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider">{op.name}</span>
                </div>
                {op.name === selectedOperator && <CheckCircle2 size={12} className="text-white" />}
              </button>
            ))}
          </div>
        </section>

        {/* FORMULAIRE */}
        <section className="space-y-3">
          <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Détails</h3>
          <div className="bg-white/5 rounded-[2rem] border border-white/10 p-6 space-y-5">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro</label>
              <div className="flex gap-2">
                <div className="h-12 px-4 bg-slate-900 rounded-xl border border-white/5 flex items-center justify-center font-black text-blue-400 text-xs">
                  {selectedCountry.dialCode}
                </div>
                <input
                  type="tel"
                  placeholder="812345678"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 h-12 px-4 bg-slate-900 rounded-xl border border-white/5 outline-none font-black text-sm text-white"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant (USD)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="1.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-12 pl-10 pr-4 bg-slate-900 rounded-xl border border-white/5 outline-none font-black text-lg text-white"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 font-black">$</div>
              </div>
            </div>
          </div>
        </section>

        <AnimatePresence mode="wait">
          {amount && (
            <motion.div
              key="summary-box"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-blue-600/10 rounded-[2rem] border border-blue-500/20 p-6 flex justify-between items-end overflow-hidden"
            >
              <div>
                <p className="text-[9px] font-black text-blue-400 uppercase mb-1">Débit π</p>
                <p className="text-xl font-black italic">π {piAmount}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-0.5">Local</p>
                <p className="text-xs font-black">{localAmount} {selectedCountry.currency}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleRecharge}
          disabled={loading || !amount || !phoneNumber || !selectedOperator}
          className="w-full h-14 rounded-[1.5rem] bg-blue-600 flex items-center justify-center gap-3 font-black uppercase text-[11px] tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <><Wallet2 size={18} /> Confirmer</>}
        </button>
      </main>

      {/* MODAL PAYS */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div
            key="country-modal"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-0 z-[100] bg-[#020617] flex flex-col"
          >
            <div className="p-6 pt-10 border-b border-white/5 flex items-center gap-3">
              <button onClick={() => setIsCountryModalOpen(false)} className="p-2.5 bg-white/5 rounded-xl"><X size={18} /></button>
              <input
                placeholder="RECHERCHER..."
                className="flex-1 h-11 bg-white/5 border border-white/10 rounded-xl px-4 text-[11px] font-bold outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {filteredCountries.map((c) => (
                <button
                  key={`country-${c.code}`}
                  onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); }}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-[1.5rem]"
                >
                  <span className="text-xs font-black">{c.name}</span>
                  <span className="text-[10px] text-blue-500 font-black">{c.dialCode}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
