"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, ShieldCheck,
  ChevronRight, Wallet2, Search, CheckCircle2,
  Globe, Loader2, X
} from "lucide-react";
import { useRouter } from "next/navigation";
import { countries, type Country } from "@/lib/country-data";
import { toast } from "sonner";

export default function RechargePage() {
  const router = useRouter();

  // États
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");
  const [loading, setLoading] = useState(false);

  // Filtrage des pays pour la recherche
  const filteredCountries = useMemo(() => {
    return countries.filter(c =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.dialCode.includes(searchQuery)
    );
  }, [searchQuery]);

  // Calculs financiers
  const piPrice = 314159.0;
  const piAmount = amount ? (Number.parseFloat(amount) / piPrice).toFixed(9) : "0.000000000";
  const localAmount = amount
    ? (Number.parseFloat(amount) * selectedCountry.piToLocalRate).toFixed(2)
    : "0.00";

  const handleRecharge = async () => {
    if (!phoneNumber || !amount || !selectedOperator) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      toast.success("Transaction transmise au réseau Pimpay");
      setLoading(false);
      router.push("/dashboard");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Airtime</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Pimpay Protocol</p>
          </div>
          <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20 shadow-[0_0_15px_rgba(37,99,235,0.1)]">
            <Zap size={18} className="text-blue-400" />
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-8">

        {/* SELECTEUR DE PAYS */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Destination</h3>
          <button
            onClick={() => setIsCountryModalOpen(true)}
            className="w-full bg-white/5 rounded-[2.5rem] border border-white/10 p-5 flex items-center justify-between hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-2xl border border-white/5 shadow-inner">
                <Globe size={24} className="text-blue-500" />
              </div>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-tight">{selectedCountry.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{selectedCountry.currency} • {selectedCountry.dialCode}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </section>

        {/* SELECTEUR D'OPÉRATEUR (CORRIGÉ) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Réseau Mobile</h3>
          <div className="grid grid-cols-1 gap-2">
            {selectedCountry.operators && selectedCountry.operators.length > 0 ? (
              selectedCountry.operators.map((op) => (
                <button
                  key={op.id}
                  onClick={() => setSelectedOperator(op.name)}
                  className={`w-full flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 ${
                    op.name === selectedOperator 
                    ? 'bg-blue-600 border-blue-400 shadow-[0_10px_20px_rgba(37,99,235,0.2)]' 
                    : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 border border-white/5">
                        <img src={op.icon} alt={op.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-sm font-black uppercase tracking-wider">{op.name}</span>
                  </div>
                  {op.name === selectedOperator && (
                    <div className="bg-white rounded-full p-1">
                        <CheckCircle2 size={14} className="text-blue-600" />
                    </div>
                  )}
                </button>
              ))
            ) : (
              <div className="p-10 text-center bg-white/5 border border-dashed border-white/10 rounded-[2.5rem]">
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Indisponible dans cette zone</p>
              </div>
            )}
          </div>
        </section>

        {/* NUMERO ET MONTANT */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Détails de Recharge</h3>
          <div className="bg-white/5 rounded-[2.5rem] border border-white/10 p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
              <div className="flex gap-3">
                <div className="h-16 px-5 bg-slate-900 rounded-[1.5rem] border border-white/5 flex items-center justify-center font-black text-blue-400 text-sm">
                  {selectedCountry.dialCode}
                </div>
                <input
                  type="tel"
                  placeholder="000 000 000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 h-16 px-6 bg-slate-900 rounded-[1.5rem] border border-white/5 focus:border-blue-500/50 outline-none font-black text-lg placeholder:text-slate-800 text-white transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant (USD)</label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 bg-slate-900 rounded-[1.5rem] border border-white/5 focus:border-blue-500/50 outline-none font-black text-2xl text-white transition-all"
                />
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-600 font-black text-xl">$</div>
              </div>
            </div>
          </div>
        </section>

        {/* RÉCAPITULATIF */}
        <AnimatePresence>
          {amount && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-600/10 rounded-[2.5rem] border border-blue-500/20 p-8 flex justify-between items-end"
            >
              <div>
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[2px] mb-2">Débit π Estimé</p>
                <p className="text-2xl font-black tracking-tighter text-white italic">π {piAmount}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Valeur Locale</p>
                <p className="text-sm font-black text-white">{localAmount} {selectedCountry.currency}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleRecharge}
          disabled={loading || !amount || !selectedOperator || (selectedCountry.operators?.length === 0)}
          className={`w-full h-20 rounded-[2rem] bg-blue-600 flex items-center justify-center gap-4 shadow-xl shadow-blue-500/20 transition-all ${
            loading ? 'opacity-50' : 'hover:bg-blue-500 active:scale-95'
          }`}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Wallet2 size={22} className="text-white" />
              <span className="font-black uppercase tracking-[0.2em] text-[13px] text-white">Confirmer le paiement</span>
            </>
          )}
        </button>
      </main>

      {/* MODAL DE SÉLECTION DE PAYS */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed inset-0 z-[100] bg-[#020617] flex flex-col"
          >
            <div className="p-6 pt-12 border-b border-white/5 flex items-center gap-4">
              <button onClick={() => setIsCountryModalOpen(false)} className="p-3 bg-white/5 rounded-2xl">
                <X size={20} />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  autoFocus
                  type="text"
                  placeholder="Rechercher une nation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 outline-none focus:border-blue-500 text-sm font-bold uppercase"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setSelectedOperator("");
                    setIsCountryModalOpen(false);
                  }}
                  className="w-full p-5 flex items-center justify-between hover:bg-white/5 rounded-[2rem] transition-all border border-transparent hover:border-white/5"
                >
                  <div className="flex items-center gap-5">
                    <span className="text-2xl opacity-80">{c.code}</span>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight text-white">{c.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{c.currency}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-blue-500 italic">{c.dialCode}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
