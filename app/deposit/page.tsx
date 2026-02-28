"use client";
import { useState, useEffect, useMemo } from "react"; import { useRouter } from "next/navigation"; import { motion, AnimatePresence } from "framer-motion"; import { ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin, ShieldCheck, Zap, Loader2, RefreshCcw, ChevronDown, CheckCircle2, Shield, Search, Lock } from "lucide-react"; import countriesData from "world-countries"; import { getCountryCallingCode, CountryCode } from "libphonenumber-js"; import { BottomNav } from "@/components/bottom-nav"; import SideMenu from "@/components/SideMenu"; import { toast } from "sonner"; import { useLanguage } from "@/context/LanguageContext"; import "flag-icons/css/flag-icons.min.css";
type Operator = { id: string; name: string; icon: string; color: string; }; type PimPayCountry = { name: string; code: string; dialCode: string; currency: string; operators: Operator[]; }; const PI_GCV_PRICE = 314159;
const OPERATORS_DB: Record<string, Operator[]> = { CG: [{ id: "mtn_cg", name: "MTN Congo", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg", color: "#FFCC00" }, { id: "airtel_cg", name: "Airtel Congo", icon: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Airtel_logo.png", color: "#E11900" }], CD: [{ id: "vodacom_cd", name: "Vodacom RDC", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Vodacom_Logo.svg/1200px-Vodacom_Logo.svg.png", color: "#E60000" }, { id: "orange_cd", name: "Orange RDC", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/1200px-Orange_logo.svg.png", color: "#FF7900" }], CM: [{ id: "orange_cm", name: "Orange Cameroun", icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Orange_logo.svg/1200px-Orange_logo.svg.png", color: "#FF7900" }, { id: "mtn_cm", name: "MTN Cameroon", icon: "https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg", color: "#FFCC00" }], CI: [{ id: "moov_ci", name: "Moov CI", icon: "https://upload.wikimedia.org/wikipedia/fr/0/04/Moov_Africa_Logo.png", color: "#0055A4" }] };
function DepositBanner({ t }: { t: (key: string) => string }) { return ( <section className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-600/15 via-blue-800/10 to-transparent border border-white/5 overflow-hidden"> <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.04]"><Zap size={120} className="text-blue-500" /></div> <div className="flex items-start gap-4 relative z-10"> <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20 shrink-0"><ShieldCheck size={24} /></div> <div><p className="text-[11px] font-black uppercase tracking-widest text-blue-400">{t("deposit.secureDeposit")}</p><p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">{t("deposit.secureBanner")}</p></div> </div> </section> ); }
function SecuritySection({ t }: { t: (key: string) => string }) { return ( <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6 space-y-5 mb-10"> <div className="flex items-center gap-2"><Shield size={14} className="text-blue-400" /><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Garanties de sécurité</span></div> <div className="grid gap-4"> <div className="flex items-center gap-4"> <div className="p-2 bg-emerald-500/10 rounded-lg"><Lock size={18} className="text-emerald-500" /></div> <div><p className="text-[10px] font-black uppercase text-white">Chiffrement AES-256</p><p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Vos données de paiement ne sont jamais stockées en clair sur PimPay.</p></div> </div> </div> </section> ); }
export default function DepositPage() {
  const router = useRouter(); const { t } = useLanguage(); const [mounted, setMounted] = useState(false); const [isLoading, setIsLoading] = useState(false); const [isMenuOpen, setIsMenuOpen] = useState(false); const [activeTab, setActiveTab] = useState("mobile"); const [amount, setAmount] = useState(""); const [phoneNumber, setPhoneNumber] = useState(""); const [searchQuery, setSearchQuery] = useState(""); const [isCountryModalOpen, setIsCountryModalOpen] = useState(false); const [isOperatorModalOpen, setIsOperatorModalOpen] = useState(false);
  const allCountries = useMemo(() => { return countriesData.map(c => { try { const dialCode = getCountryCallingCode(c.cca2 as CountryCode); return { name: c.name.common, code: c.cca2, dialCode: `+${dialCode}`, currency: Object.keys(c.currencies || {})[0] || "USD", operators: OPERATORS_DB[c.cca2] || [] }; } catch { return null; } }).filter((c): c is PimPayCountry => c !== null).sort((a, b) => a.name.localeCompare(b.name)); }, []);
  const [selectedCountry, setSelectedCountry] = useState<PimPayCountry>(() => allCountries.find((c) => c.code === "CG") || allCountries[0]); const [selectedOperator, setSelectedOperator] = useState<Operator | null>(selectedCountry.operators[0] || null); const filteredCountries = useMemo(() => allCountries.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || c.code.toLowerCase().includes(searchQuery.toLowerCase())), [allCountries, searchQuery]);
  const feesCalculation = useMemo(() => { const val = parseFloat(amount) || 0; const fee = val * 0.01; return { fee: fee.toFixed(2), total: (val + fee).toFixed(2), piEquivalent: val > 0 ? (val / PI_GCV_PRICE).toFixed(7) : "0" }; }, [amount]);
  useEffect(() => { setMounted(true); }, []);
  const handleInitiateDeposit = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Montant invalide"); return; }
    setIsLoading(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        fee: parseFloat(feesCalculation.fee),
        type: "DEPOSIT",
        currency: "USD",
        method: activeTab,
        operatorId: activeTab === "mobile" ? selectedOperator?.id : "pi_network",
        description: `Dépôt via ${activeTab === "mobile" ? selectedOperator?.name : "Pi Network"}`,
        accountNumber: activeTab === "mobile" ? `${selectedCountry.dialCode}${phoneNumber}` : null,
        countryCode: selectedCountry.code,
        ...(activeTab === "crypto" && { piEquivalent: parseFloat(feesCalculation.piEquivalent) })
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
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Choisir un pays</label><button onClick={() => setIsCountryModalOpen(true)} className="w-full h-16 bg-slate-900/50 rounded-2xl border border-white/10 px-5 flex items-center justify-between"><div className="flex items-center gap-4"><span className={`fi fi-${selectedCountry.code.toLowerCase()} rounded-sm scale-110`} /><div className="text-left"><span className="text-sm font-black uppercase tracking-tight block">{selectedCountry.name}</span><span className="text-[9px] text-slate-500 font-bold">{selectedCountry.dialCode}</span></div></div><ChevronDown size={18} className="text-slate-500" /></button></div>
            <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Opérateur</label><button onClick={() => setIsOperatorModalOpen(true)} className="w-full h-16 bg-slate-900/50 rounded-2xl border border-white/10 px-5 flex items-center justify-between">{selectedOperator ? <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-xl bg-white p-1.5 shadow-inner"><img src={selectedOperator.icon} className="w-full h-full object-contain" alt="op" /></div><span className="text-sm font-black uppercase tracking-tight">{selectedOperator.name}</span></div> : <span className="text-sm font-bold text-slate-500">Choisir</span>}<ChevronDown size={18} className="text-slate-500" /></button></div>
            <div className="bg-slate-900/30 rounded-3xl border border-white/5 p-6 space-y-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Montant USD</label><input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black text-blue-500 outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 uppercase ml-1">Téléphone</label><div className="flex gap-2"><div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center text-blue-500 font-black">{selectedCountry.dialCode}</div><input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="000 000 000" className="flex-1 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 font-black outline-none" /></div></div>
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
      <AnimatePresence>
        {isOperatorModalOpen && (
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col">
            <div className="flex items-center justify-between mb-8"><h2 className="text-xl font-black uppercase">Opérateur</h2><button onClick={() => setIsOperatorModalOpen(false)} className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black">ANNULER</button></div>
            <div className="space-y-3">{selectedCountry.operators.map((op) => (<button key={op.id} onClick={() => { setSelectedOperator(op); setIsOperatorModalOpen(false); }} className={`w-full p-5 flex items-center gap-5 rounded-3xl border ${selectedOperator?.id === op.id ? "bg-blue-600 border-blue-400" : "bg-white/5 border-white/10"}`}><div className="w-12 h-12 bg-white rounded-2xl p-2"><img src={op.icon} className="w-full h-full object-contain" alt="op-icon" /></div><span className="text-sm font-black uppercase flex-1 text-left">{op.name}</span>{selectedOperator?.id === op.id && <CheckCircle2 size={20} />}</button>))}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
