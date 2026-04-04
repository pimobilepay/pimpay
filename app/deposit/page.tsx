"use client";
import { useState, useEffect, useMemo } from "react"; import { useRouter } from "next/navigation"; import { motion, AnimatePresence } from "framer-motion"; import { ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin, ShieldCheck, Zap, Loader2, RefreshCcw, ChevronDown, CheckCircle2, Shield, Search, Lock } from "lucide-react"; import { countries, searchCountries, type Country, type MobileOperator } from "@/lib/country-data"; import { BottomNav } from "@/components/bottom-nav"; import SideMenu from "@/components/SideMenu"; import { toast } from "sonner"; import { useLanguage } from "@/context/LanguageContext"; import "flag-icons/css/flag-icons.min.css";
const PI_GCV_PRICE = 314159;
function DepositBanner({ t }: { t: (key: string) => string }) { return ( <section className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-600/15 via-blue-800/10 to-transparent border border-white/5 overflow-hidden"> <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.04]"><Zap size={120} className="text-blue-500" /></div> <div className="flex items-start gap-4 relative z-10"> <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20 shrink-0"><ShieldCheck size={24} /></div> <div><p className="text-[11px] font-black uppercase tracking-widest text-blue-400">{t("deposit.secureDeposit")}</p><p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">{t("deposit.secureBanner")}</p></div> </div> </section> ); }
function SecuritySection({ t }: { t: (key: string) => string }) { return ( <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6 space-y-5 mb-10"> <div className="flex items-center gap-2"><Shield size={14} className="text-blue-400" /><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Garanties de sécurité</span></div> <div className="grid gap-4"> <div className="flex items-center gap-4"> <div className="p-2 bg-emerald-500/10 rounded-lg"><Lock size={18} className="text-emerald-500" /></div> <div><p className="text-[10px] font-black uppercase text-white">Chiffrement AES-256</p><p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Vos données de paiement ne sont jamais stockées en clair sur PimPay.</p></div> </div> </div> </section> ); }
export default function DepositPage() {
  const router = useRouter(); const { t } = useLanguage(); const [mounted, setMounted] = useState(false); const [isLoading, setIsLoading] = useState(false); const [isMenuOpen, setIsMenuOpen] = useState(false); const [activeTab, setActiveTab] = useState("mobile"); const [amount, setAmount] = useState(""); const [phoneNumber, setPhoneNumber] = useState(""); const [searchQuery, setSearchQuery] = useState(""); const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const allCountries = countries;
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find((c) => c.code === "CG") || countries[0]); const [selectedOperator, setSelectedOperator] = useState<MobileOperator | null>(selectedCountry.operators[0] || null); const filteredCountries = useMemo(() => allCountries.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase())), [allCountries, searchQuery]);
  const feesCalculation = useMemo(() => { const val = parseFloat(amount) || 0; const fee = val * 0.01; return { fee: fee.toFixed(2), total: (val + fee).toFixed(2), piEquivalent: val > 0 ? (val / PI_GCV_PRICE).toFixed(7) : "0" }; }, [amount]);
  useEffect(() => { setMounted(true); }, []);
  const handleInitiateDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Montant invalide"); return; }
    setIsLoading(true);
    try {
      // Pour les dépôts crypto, on envoie directement le montant en PI et la devise PI
      // afin d'éviter la création d'une double transaction (USD + PI)
      const isCrypto = activeTab === "crypto";
      const piAmount = parseFloat(feesCalculation.piEquivalent);
      const payload = {
        amount: isCrypto ? piAmount : parseFloat(amount),
        fee: isCrypto ? piAmount * 0.01 : parseFloat(feesCalculation.fee),
        type: "DEPOSIT",
        currency: isCrypto ? "PI" : "USD",
        method: activeTab,
        operatorId: isCrypto ? "pi_network" : selectedOperator?.id,
        description: isCrypto ? "Dépôt via Pi Network" : `Dépôt via ${selectedOperator?.name}`,
        accountNumber: isCrypto ? "PI_NETWORK" : `${selectedCountry.dialCode}${phoneNumber}`,
        countryCode: selectedCountry.code,
      };
      const res = await fetch("/api/pi/transaction", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const text = await res.text(); let result; try { result = JSON.parse(text); } catch (e) { throw new Error("Réponse serveur corrompue"); }
      if (res.ok && result.reference) {
        router.push(`/deposit/summary?ref=${result.reference}&amount=${amount}&method=${activeTab}`);
      } else { toast.error(result.error || "Erreur lors de l'initialisation"); }
    } catch (e: any) { toast.error(e.message || "Erreur de connexion"); } finally { setIsLoading(false); }
  };
  if (!mounted) return null;
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-transform"><ArrowLeft size={20} /></button>
          <div><h1 className="text-xl font-black tracking-tighter uppercase leading-none">{t("deposit.title")}</h1><div className="flex items-center gap-2 mt-1"><CircleDot size={8} className="text-blue-500 animate-pulse" /><span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">PimPay Secure Node</span></div></div>
        </div>
        <button onClick={() => window.location.reload()}><RefreshCcw size={18} className="text-slate-500 hover:text-blue-400 transition-colors" /></button>
      </header>
      <main className="px-6 mt-6 space-y-6">
        <DepositBanner t={t} />
        <nav className="grid grid-cols-3 bg-slate-900/50 p-1.5 rounded-2xl border border-white/5">
          {[{ id: "mobile", label: "Mobile", icon: <Smartphone size={16} /> }, { id: "card", label: "Card", icon: <CreditCard size={16} /> }, { id: "crypto", label: "Crypto", icon: <Bitcoin size={16} /> }].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:text-slate-300"}`}>{tab.icon} {tab.label}</button>
          ))}
        </nav>
        {activeTab === "mobile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Choisir un pays</label>
                <button onClick={() => setIsCountryModalOpen(true)} className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 flex items-center justify-between hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-3">
                    <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm text-lg`} />
                    <div className="text-left">
                      <span className="text-xs font-black uppercase tracking-tight block">{selectedCountry.name}</span>
                      <span className="text-[9px] font-bold text-blue-500">{selectedCountry.dialCode}</span>
                    </div>
                  </div>
                  <ChevronDown size={16} className="text-slate-500" />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Opérateur</label>
                {selectedCountry.operators.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2">
                    {selectedCountry.operators.map((op) => (
                      <button
                        key={op.id}
                        onClick={() => setSelectedOperator(op)}
                        className={`p-4 rounded-2xl border transition-all flex items-center gap-3 active:scale-95 ${
                          selectedOperator?.id === op.id
                            ? "bg-blue-600/10 border-blue-500/30"
                            : "bg-white/[0.03] border-white/5 hover:border-white/10"
                        }`}
                      >
                        <img
                          src={op.icon}
                          alt={op.name}
                          className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1"
                          crossOrigin="anonymous"
                        />
                        <div className="text-left">
                          <span className="text-[10px] font-black uppercase block">{op.name}</span>
                          <span className="text-[7px] font-bold text-emerald-500 uppercase">Cash In</span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-3">
                    <Loader2 size={16} className="text-amber-400" />
                    <p className="text-[10px] font-bold text-amber-400">Aucun opérateur disponible pour ce pays</p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Téléphone</label>
                <div className="flex gap-2 w-full overflow-hidden">
                  <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center justify-center gap-2 shrink-0">
                    <span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm`} />
                    <span className="text-xs font-black text-blue-500">{selectedCountry.dialCode}</span>
                  </div>
                  <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Ex: 812345678" className="flex-1 min-w-0 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700" />
                </div>
              </div>
            </div>
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant USD</label><input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black text-blue-500 outline-none placeholder:text-slate-800 focus:border-blue-500/50 transition-colors" /></div>
                <button onClick={handleInitiateDeposit} disabled={isLoading || !amount || !phoneNumber} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">{isLoading ? <Loader2 className="animate-spin" /> : "GÉNÉRER LE RÉCAPITULATIF"}</button>
            </div>
          </motion.div>
        )}
        {activeTab === "crypto" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/30 rounded-3xl border border-white/5 p-6 space-y-6 text-center">
            <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20"><Bitcoin size={40} className="text-blue-500" /></div>
            <h3 className="text-lg font-black uppercase tracking-tighter">Pi Network GCV Bridge</h3>
            <div className="space-y-2 text-left"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Montant USD souhaité</label><input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black text-center text-blue-500 outline-none" /></div>
            {parseFloat(amount) > 0 && (
              <div className="bg-black/40 p-5 rounded-xl border border-white/5 space-y-3">
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500"><span>Montant saisi</span><span className="text-white">${parseFloat(amount).toLocaleString()} USD</span></div>
                <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500"><span>Taux GCV</span><span className="text-blue-400">1 Pi = $314,159</span></div>
                <div className="border-t border-white/5 pt-3 flex justify-between text-[12px] font-black uppercase"><span>Équivalent Pi</span><span className="text-emerald-400">{feesCalculation.piEquivalent} Pi</span></div>
              </div>
            )}
            <button onClick={handleInitiateDeposit} disabled={isLoading || !amount || parseFloat(amount) <= 0} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">{isLoading ? <Loader2 className="animate-spin" /> : "VÉRIFIER LE DÉPÔT"}</button>
          </motion.div>
        )}
        {activeTab === "card" && <div className="bg-slate-900/30 rounded-3xl border border-white/5 p-10 text-center"><CreditCard size={48} className="mx-auto text-slate-700" /><p className="text-[10px] font-black uppercase text-slate-500 mt-4">Bientôt disponible sur PimPay</p></div>}
        <SecuritySection t={t} />
      </main>
      <AnimatePresence>
        {isCountryModalOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-6"><h2 className="text-xl font-black uppercase">Choisir un pays</h2><button onClick={() => setIsCountryModalOpen(false)} className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black">FERMER</button></div>
            <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} /><input placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 outline-none" /></div>
            <div className="flex-1 overflow-y-auto space-y-2">{filteredCountries.map((c) => (<button key={c.code} onClick={() => { setSelectedCountry(c); setSelectedOperator(c.operators[0] || null); setIsCountryModalOpen(false); }} className="w-full p-4 flex items-center justify-between rounded-2xl bg-white/5 border border-white/5"><div className="flex items-center gap-4"><span className={`fi fi-${c.code.toLowerCase()} scale-125`} /><span className="text-xs font-black uppercase">{c.name}</span></div><span className="text-blue-500 font-black">{c.dialCode}</span></button>))}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
