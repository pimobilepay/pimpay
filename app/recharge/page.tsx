"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Smartphone, Zap, ShieldCheck, 
  ChevronRight, Wallet2, Search, CheckCircle2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { countries, type Country } from "@/lib/country-data";
import { toast } from "sonner";
import Link from "next/link";

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
  const piAmount = amount ? (Number.parseFloat(amount) / piPrice).toFixed(8) : "0.00000000";
  const localAmount = amount
    ? (Number.parseFloat(amount) * selectedCountry.piToLocalRate).toFixed(2)
    : "0.00";

  const handleRecharge = async () => {
    if (!phoneNumber || !amount || !selectedOperator) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    // Simulation API ou appel réel ici
    setTimeout(() => {
      toast.success("Transaction transmise au réseau Pi");
      setLoading(false);
      router.push("/wallet");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 sticky top-0 z-40 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between">
          <Link href="/">
            <button className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tighter">Mobile Top-up</h1>
            <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Global Network</p>
          </div>
          <div className="w-10 h-10 bg-blue-600/10 rounded-2xl flex items-center justify-center border border-blue-500/20">
            <Zap size={18} className="text-blue-400" />
          </div>
        </div>
      </header>

      <main className="px-6 py-8 space-y-8">
        
        {/* SELECTEUR DE PAYS (LISTE) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Destination</h3>
          <button 
            onClick={() => setIsCountryModalOpen(true)}
            className="w-full bg-white/5 rounded-[32px] border border-white/10 p-5 flex items-center justify-between hover:bg-white/10 transition-all"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">{selectedCountry.flag}</span>
              <div className="text-left">
                <p className="text-sm font-bold">{selectedCountry.name}</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase">{selectedCountry.currency} • {selectedCountry.dialCode}</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </section>

        {/* SELECTEUR D'OPÉRATEUR (LISTE) */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Opérateur Mobile</h3>
          <div className="bg-white/5 rounded-[32px] border border-white/10 overflow-hidden">
            {selectedCountry.mobileMoneyOperators.map((op, index) => (
              <button
                key={typeof op === 'string' ? op : index}
                onClick={() => setSelectedOperator(typeof op === 'string' ? op : op.name)}
                className={`w-full flex items-center justify-between p-5 transition-all border-b border-white/5 last:border-0 ${
                  (typeof op === 'string' ? op : op.name) === selectedOperator ? 'bg-blue-600/20' : 'active:bg-white/5'
                }`}
              >
                <span className="text-sm font-bold uppercase tracking-wider">
                  {/* Correction de l'erreur : on affiche uniquement une string */}
                  {typeof op === 'string' ? op : op.name}
                </span>
                {(typeof op === 'string' ? op : op.name) === selectedOperator && (
                  <CheckCircle2 size={18} className="text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* NUMERO ET MONTANT */}
        <section className="space-y-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] ml-2">Détails de Recharge</h3>
          <div className="bg-white/5 rounded-[32px] border border-white/10 p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Numéro de téléphone</label>
              <div className="flex gap-2">
                <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center font-bold text-blue-400">
                  {selectedCountry.dialCode}
                </div>
                <input 
                  type="tel"
                  placeholder="000 000 000"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="flex-1 h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 focus:border-blue-500 outline-none font-bold placeholder:text-slate-700 bg-transparent text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Montant (USD)</label>
              <div className="relative">
                <input 
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-14 pl-12 pr-4 bg-slate-900 rounded-2xl border border-white/10 focus:border-blue-500 outline-none font-bold text-xl text-white bg-transparent"
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">$</div>
              </div>
            </div>
          </div>
        </section>

        {/* RÉCAPITULATIF WEB3 */}
        <AnimatePresence>
          {amount && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-blue-600/10 rounded-[32px] border border-blue-500/20 p-6"
            >
              <div className="flex justify-between items-center mb-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[2px]">Estimation Pi Network</p>
                <ShieldCheck size={16} className="text-blue-400" />
              </div>
              <div className="flex justify-between items-end text-white">
                <div>
                  <p className="text-2xl font-black tracking-tighter text-white">π {piAmount}</p>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mt-1 tracking-widest">Protocol Fee Incl.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">{localAmount} {selectedCountry.currency}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleRecharge}
          disabled={loading || !amount || !selectedOperator}
          className={`w-full h-16 rounded-[24px] bg-blue-600 flex items-center justify-center gap-3 shadow-xl shadow-blue-500/20 transition-all ${
            loading ? 'opacity-50' : 'hover:bg-blue-500 active:scale-95'
          }`}
        >
          {loading ? (
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Wallet2 size={20} className="text-white" />
              <span className="font-black uppercase tracking-widest text-sm text-white">Confirmer le paiement</span>
            </>
          )}
        </button>
      </main>

      {/* MODAL DE SÉLECTION DE PAYS (Toutes les pays du monde) */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[100] bg-[#020617] flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex items-center gap-4">
              <button onClick={() => setIsCountryModalOpen(false)} className="p-2 bg-white/5 rounded-xl">
                <ArrowLeft size={20} />
              </button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Rechercher un pays..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 outline-none focus:border-blue-500 text-sm font-bold"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setSelectedOperator("");
                    setIsCountryModalOpen(false);
                  }}
                  className="w-full p-4 flex items-center justify-between hover:bg-white/5 rounded-2xl transition-all"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{c.flag}</span>
                    <div className="text-left">
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase">{c.currency}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-blue-500">{c.dialCode}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
