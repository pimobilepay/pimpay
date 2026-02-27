"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Zap, ChevronRight, Wallet2, X, Search,
  Loader2, Smartphone, TrendingUp, CircleDot, Activity,
  Info, Signal
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
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("");
  
  // États pour le solde réel
  const [balance, setBalance] = useState(0);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    countries.find((c) => c.code === "CD") || countries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState("");

  const SUGGESTIONS = ["5", "10", "15", "20", "25", "50"];

  // RÉCUPÉRATION DU SOLDE RÉEL
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (data.success && data.user?.balances) {
          setBalance(data.user.balances.pi || 0);
        }
      } catch (error) {
        console.error("Erreur solde:", error);
      } finally {
        setIsBalanceLoading(false);
      }
    };

    fetchBalance();
  }, []);

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

  const piPrice = 314159.0;
  const piEquivalent = amount ? (Number.parseFloat(amount) / piPrice).toFixed(9) : "0.000000000";
  const localAmount = amount
    ? (Number.parseFloat(amount) * (selectedCountry.piToLocalRate || 2500)).toLocaleString()
    : "0.00";

  const isFormValid = phoneNumber.length >= 6 && amount && selectedOperator;

  const handleContinue = () => {
    if (!isFormValid) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (parseFloat(piEquivalent) > balance) {
      toast.error("Solde Pi insuffisant");
      return;
    }

    const params = new URLSearchParams({
      phone: `${selectedCountry.dialCode}${phoneNumber}`,
      operator: selectedOperator,
      usd: amount,
      pi: piEquivalent,
      local: localAmount,
      currency: selectedCountry.currency,
      country: selectedCountry.name,
    });
    router.push(`/airtime/summary?${params.toString()}`);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-30 border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter">Airtime</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[2px]">Telecom Recharge</p>
          </div>
        </div>
        <button className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <Signal size={20} />
        </button>
      </header>

      <main className="px-6 pt-8 pb-32 space-y-6">

        {/* BALANCE CARD - CORRIGÉ AVEC LE SYMBOLE π */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[2rem] blur-sm opacity-60" />
          <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md overflow-hidden">
            <div className="absolute right-[-10px] bottom-[-15px] opacity-[0.04] -rotate-12">
              <TrendingUp size={140} strokeWidth={1.5} />
            </div>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 relative z-10">PI BALANCE AVAILABLE</p>
            <div className="flex items-baseline gap-2 relative z-10">
              {isBalanceLoading ? (
                <Loader2 size={24} className="animate-spin text-blue-500" />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-4xl font-black tracking-tighter text-white">
                    π {balance.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-xl font-bold text-blue-500">PI</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* COUNTRY SELECTOR */}
        <section className="space-y-2">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Pays de destination</label>
          <button
            onClick={() => setIsCountryModalOpen(true)}
            className="w-full bg-white/[0.02] border border-white/10 rounded-[2rem] p-4 flex items-center justify-between hover:bg-white/[0.04] transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-[1px] scale-125`}></span>
              </div>
              <div className="text-left">
                <span className="text-xs font-black uppercase tracking-tight block">{selectedCountry.name}</span>
                <span className="text-[9px] font-bold text-blue-500">{selectedCountry.dialCode} - {selectedCountry.currency}</span>
              </div>
            </div>
            <ChevronRight size={18} className="text-slate-600" />
          </button>
        </section>

        {/* OPERATORS */}
        <section className="space-y-3">
          <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Operateur</label>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {(selectedCountry?.operators || []).map((op) => (
              <button
                key={op.id}
                onClick={() => setSelectedOperator(op.name)}
                className={`flex-shrink-0 flex items-center gap-3 p-3 pr-5 rounded-2xl border transition-all active:scale-95 ${
                  op.name === selectedOperator
                    ? "bg-blue-600 border-blue-400 shadow-lg shadow-blue-600/20"
                    : "bg-white/[0.03] border-white/5"
                }`}
              >
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                  <img src={op.icon} alt={op.name} className="w-full h-full object-cover" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">{op.name}</span>
              </button>
            ))}
          </div>
        </section>

        {/* FORM */}
        <section className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2 flex items-center gap-2">
              <Smartphone size={12} className="text-blue-500" /> Numero de telephone
            </label>
            <div className="flex gap-2">
              <div className="h-14 px-4 bg-slate-900/60 rounded-2xl border border-white/10 flex items-center justify-center text-xs font-black text-blue-500">
                {selectedCountry.dialCode}
              </div>
              <input
                type="tel"
                placeholder="812345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="flex-1 h-14 bg-slate-900/60 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white placeholder:text-slate-700 focus:border-blue-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-2">Montant (USD)</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-16 bg-slate-900/60 rounded-2xl border border-white/10 px-6 text-2xl font-black outline-none text-blue-500 focus:border-blue-500/50 transition-all"
              />
              <div className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-600/60 font-black text-lg">$</div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SUGGESTIONS.map((val) => (
                <button
                  key={val}
                  onClick={() => setAmount(val)}
                  className={`py-3 rounded-xl border font-black text-[10px] transition-all active:scale-90 ${
                    amount === val
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20"
                      : "bg-white/[0.03] border-white/5 text-slate-400"
                  }`}
                >
                  ${val}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* LIVE RECAP - CORRIGÉ AVEC LE SYMBOLE π */}
        <AnimatePresence>
          {amount && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-blue-600/5 rounded-[2rem] border border-blue-500/10 p-5 space-y-3"
            >
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cout en Pi</span>
                <span className={`text-xs font-black ${parseFloat(piEquivalent) > balance ? "text-red-500" : "text-white"}`}>
                  π {piEquivalent} PI
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Operateur</span>
                <span className="text-xs font-black text-blue-400">{selectedOperator || "---"}</span>
              </div>
              <div className="pt-3 border-t border-white/5 flex justify-between items-end">
                <div>
                  <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Valeur Airtime</p>
                  <p className="text-xl font-black text-white">{localAmount}</p>
                </div>
                <span className="text-[10px] font-black text-slate-500 mb-1">{selectedCountry.currency}</span>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <button
          onClick={handleContinue}
          disabled={!isFormValid || isBalanceLoading}
          className="w-full p-5 bg-blue-600 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:shadow-none"
        >
          <Wallet2 size={18} /> Continuer vers le paiement
        </button>

        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] p-5 flex items-start gap-4">
          <div className="p-2 bg-emerald-500/10 rounded-xl flex-shrink-0">
            <Zap size={16} className="text-emerald-500" />
          </div>
          <div>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Livraison Instantanee</p>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
              Le credit est envoye directement sur le numero apres validation. Debite de votre solde Pi PimPay.
            </p>
          </div>
        </div>
      </main>

      {/* COUNTRY MODAL */}
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-0 z-50 bg-[#020617] flex flex-col"
          >
            <div className="px-6 pt-12 pb-4 border-b border-white/5 flex items-center gap-3">
              <button onClick={() => setIsCountryModalOpen(false)} className="p-3 bg-white/5 rounded-2xl border border-white/10">
                <X size={20} />
              </button>
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                <input
                  placeholder="Rechercher un pays..."
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 text-xs font-bold outline-none focus:border-blue-500/50 transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredCountries.map(c => (
                <button
                  key={c.code}
                  onClick={() => { setSelectedCountry(c); setIsCountryModalOpen(false); setSearchQuery(""); }}
                  className={`w-full p-4 flex items-center justify-between rounded-2xl border transition-all active:scale-[0.98] ${
                    c.code === selectedCountry.code
                      ? "bg-blue-600/10 border-blue-500/20"
                      : "bg-white/[0.02] border-white/5"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className={`fi fi-${c.code.toLowerCase()} rounded-[1px] scale-125`}></span>
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-black uppercase tracking-tight block">{c.name}</span>
                      <span className="text-[9px] font-bold text-slate-600">{c.currency}</span>
                    </div>
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
