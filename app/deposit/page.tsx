"use client";
import { useState, useEffect, useMemo } from "react"; import { useRouter } from "next/navigation"; import { motion, AnimatePresence } from "framer-motion"; import { ArrowLeft, CircleDot, Smartphone, CreditCard, Bitcoin, ShieldCheck, Zap, Loader2, RefreshCcw, ChevronDown, CheckCircle2, Shield, Search, Lock, Calendar, User } from "lucide-react"; import { countries, searchCountries, type Country, type MobileOperator } from "@/lib/country-data"; import { BottomNav } from "@/components/bottom-nav"; import SideMenu from "@/components/SideMenu"; import { toast } from "sonner"; import { useLanguage } from "@/context/LanguageContext"; import "flag-icons/css/flag-icons.min.css";

// Card type detection based on BIN (Bank Identification Number)
type CardType = "visa" | "mastercard" | "unknown";

const detectCardType = (cardNumber: string): CardType => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  
  // Visa starts with 4
  if (/^4/.test(cleanNumber)) {
    return "visa";
  }
  
  // Mastercard starts with 51-55 or 2221-2720
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
    return "mastercard";
  }
  
  return "unknown";
};

// Format card number with spaces
const formatCardNumber = (value: string): string => {
  const cleanValue = value.replace(/\D/g, "").slice(0, 16);
  const groups = cleanValue.match(/.{1,4}/g);
  return groups ? groups.join(" ") : cleanValue;
};

// Format expiry date
const formatExpiryDate = (value: string): string => {
  const cleanValue = value.replace(/\D/g, "").slice(0, 4);
  if (cleanValue.length >= 2) {
    return cleanValue.slice(0, 2) + "/" + cleanValue.slice(2);
  }
  return cleanValue;
};

// Visa SVG Icon
const VisaIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#1A1F71"/>
    <path d="M19.5 31H16.5L18.5 17H21.5L19.5 31Z" fill="white"/>
    <path d="M30.5 17.5C29.8 17.2 28.7 17 27.4 17C24.1 17 21.8 18.7 21.8 21.1C21.8 22.9 23.4 23.9 24.6 24.5C25.8 25.1 26.2 25.5 26.2 26.1C26.2 26.9 25.2 27.3 24.3 27.3C23 27.3 22.3 27.1 21.2 26.6L20.8 26.4L20.3 29.5C21.1 29.9 22.5 30.2 24 30.2C27.5 30.2 29.8 28.5 29.8 25.9C29.8 24.5 28.9 23.4 27.1 22.5C26 21.9 25.3 21.5 25.3 20.9C25.3 20.3 26 19.7 27.4 19.7C28.5 19.7 29.4 19.9 30 20.2L30.3 20.3L30.8 17.4L30.5 17.5Z" fill="white"/>
    <path d="M35.5 17H33.2C32.4 17 31.8 17.2 31.5 18L26.5 31H30L30.7 29H34.9L35.3 31H38.5L35.5 17ZM31.7 26.3L33.3 21.6L34.2 26.3H31.7Z" fill="white"/>
    <path d="M14.5 17L11.2 26.2L10.8 24.2C10.2 22.2 8.3 20 6.2 19L9.2 31H12.7L18 17H14.5Z" fill="white"/>
    <path d="M8.5 17H3.2L3.1 17.3C7.3 18.3 10.1 20.9 11 24.2L10 18.1C9.8 17.3 9.2 17 8.5 17Z" fill="#F9A533"/>
  </svg>
);

// Mastercard SVG Icon
const MastercardIcon = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="48" height="48" rx="8" fill="#000"/>
    <circle cx="18" cy="24" r="10" fill="#EB001B"/>
    <circle cx="30" cy="24" r="10" fill="#F79E1B"/>
    <path d="M24 17.5C26.3 19.3 27.8 22 27.8 25C27.8 28 26.3 30.7 24 32.5C21.7 30.7 20.2 28 20.2 25C20.2 22 21.7 19.3 24 17.5Z" fill="#FF5F00"/>
  </svg>
);

// Unknown Card Icon
const UnknownCardIcon = ({ className = "" }: { className?: string }) => (
  <div className={`bg-slate-700 rounded-lg flex items-center justify-center ${className}`}>
    <CreditCard size={20} className="text-slate-400" />
  </div>
);
const PI_GCV_PRICE = 314159;
function DepositBanner({ t }: { t: (key: string) => string }) { return ( <section className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-600/15 via-blue-800/10 to-transparent border border-white/5 overflow-hidden"> <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.04]"><Zap size={120} className="text-blue-500" /></div> <div className="flex items-start gap-4 relative z-10"> <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20 shrink-0"><ShieldCheck size={24} /></div> <div><p className="text-[11px] font-black uppercase tracking-widest text-blue-400">{t("deposit.secureDeposit")}</p><p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">{t("deposit.secureBanner")}</p></div> </div> </section> ); }
function SecuritySection({ t }: { t: (key: string) => string }) { return ( <section className="bg-white/[0.03] rounded-3xl border border-white/5 p-6 space-y-5 mb-10"> <div className="flex items-center gap-2"><Shield size={14} className="text-blue-400" /><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Garanties de sécurité</span></div> <div className="grid gap-4"> <div className="flex items-center gap-4"> <div className="p-2 bg-emerald-500/10 rounded-lg"><Lock size={18} className="text-emerald-500" /></div> <div><p className="text-[10px] font-black uppercase text-white">Chiffrement AES-256</p><p className="text-[8px] text-slate-500 uppercase font-bold tracking-tighter">Vos données de paiement ne sont jamais stockées en clair sur PimPay.</p></div> </div> </div> </section> ); }
export default function DepositPage() {
  const router = useRouter(); const { t } = useLanguage(); const [mounted, setMounted] = useState(false); const [isLoading, setIsLoading] = useState(false); const [isMenuOpen, setIsMenuOpen] = useState(false); const [activeTab, setActiveTab] = useState("mobile"); const [amount, setAmount] = useState(""); const [phoneNumber, setPhoneNumber] = useState(""); const [searchQuery, setSearchQuery] = useState(""); const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  
  // Card deposit state
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [cardHolder, setCardHolder] = useState("");
  const [cardType, setCardType] = useState<CardType>("unknown");
  
  // Update card type when card number changes
  useEffect(() => {
    const cleanNumber = cardNumber.replace(/\s/g, "");
    if (cleanNumber.length >= 3) {
      setCardType(detectCardType(cleanNumber));
    } else {
      setCardType("unknown");
    }
  }, [cardNumber]);
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
  
  // Card deposit handler
  const handleCardDeposit = async () => {
    // Validate inputs
    const cleanCardNumber = cardNumber.replace(/\s/g, "");
    if (cleanCardNumber.length !== 16) {
      toast.error("Numero de carte invalide (16 chiffres requis)");
      return;
    }
    if (!cardExpiry || cardExpiry.length !== 5) {
      toast.error("Date d'expiration invalide (MM/AA)");
      return;
    }
    if (!cardCvv || cardCvv.length < 3) {
      toast.error("CVV invalide (3-4 chiffres)");
      return;
    }
    if (!cardHolder.trim()) {
      toast.error("Nom du titulaire requis");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Montant invalide");
      return;
    }
    if (cardType === "unknown") {
      toast.error("Type de carte non supporte (Visa ou Mastercard uniquement)");
      return;
    }
    
    setIsLoading(true);
    try {
      const payload = {
        amount: parseFloat(amount),
        currency: "USD",
        cardNumber: cleanCardNumber,
        cardExpiry: cardExpiry,
        cardCvv: cardCvv,
        cardHolder: cardHolder.trim(),
        cardType: cardType,
        method: "card",
        description: `Depot par carte ${cardType.toUpperCase()}`,
      };
      
      const res = await fetch("/api/transaction/deposit/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      
      if (res.ok && result.success) {
        toast.success("Transaction initiee avec succes");
        router.push(`/deposit/confirm?ref=${result.reference}&amount=${amount}&method=card`);
      } else {
        toast.error(result.message || "Erreur lors du traitement de la carte");
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };
  if (!mounted) return null;
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-transform"><ArrowLeft size={20} /></button>
          <div><h1 className="text-xl font-black tracking-tighter uppercase leading-none">{t("deposit.title")}</h1><div className="flex items-center gap-2 mt-1"><CircleDot size={8} className="text-blue-500 animate-pulse" /><span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Liquidity Inflow</span></div></div>
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
                
                {/* Fee Details */}
                {parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                      <span>Montant saisi</span>
                      <span className="text-white">$ {parseFloat(amount).toLocaleString()} USD</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-rose-500">
                      <span>Frais PimPay (1%)</span>
                      <span>- $ {feesCalculation.fee}</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-black text-emerald-500 uppercase block">Vous recevrez</span>
                        <span className="text-2xl font-black text-white">$ {(parseFloat(amount) - parseFloat(feesCalculation.fee)).toFixed(2)}</span>
                      </div>
                      <span className="text-sm font-black text-slate-400">USD</span>
                    </div>
                  </motion.div>
                )}

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
                <div className="flex justify-between text-[10px] font-bold uppercase text-rose-500"><span>Frais PimPay (1%)</span><span>- {(parseFloat(feesCalculation.piEquivalent) * 0.01).toFixed(7)} Pi</span></div>
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-500"><span>Pi requis</span><span className="text-white">{feesCalculation.piEquivalent} Pi</span></div>
                  <div className="flex justify-between text-[12px] font-black uppercase"><span className="text-emerald-500">Vous recevrez</span><span className="text-emerald-400">{(parseFloat(feesCalculation.piEquivalent) * 0.99).toFixed(7)} Pi</span></div>
                </div>
              </div>
            )}
            <button onClick={handleInitiateDeposit} disabled={isLoading || !amount || parseFloat(amount) <= 0} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all">{isLoading ? <Loader2 className="animate-spin" /> : "VÉRIFIER LE DÉPÔT"}</button>
          </motion.div>
        )}
        {activeTab === "card" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            {/* Card Preview */}
            <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 rounded-[2rem] p-6 border border-white/10 shadow-2xl overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Carte Bancaire</div>
                <div className="w-10 h-8">
                  {cardType === "visa" && <VisaIcon className="w-10 h-8" />}
                  {cardType === "mastercard" && <MastercardIcon className="w-10 h-8" />}
                  {cardType === "unknown" && <UnknownCardIcon className="w-10 h-8" />}
                </div>
              </div>
              
              <div className="space-y-4 relative z-10">
                <div className="text-xl font-black tracking-[0.2em] text-white/90">
                  {cardNumber || "•••• •••• •••• ••••"}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Titulaire</div>
                    <div className="text-xs font-black text-white/80 uppercase tracking-wider">
                      {cardHolder || "NOM DU TITULAIRE"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[8px] font-bold text-slate-600 uppercase mb-1">Expire</div>
                    <div className="text-xs font-black text-white/80">
                      {cardExpiry || "MM/AA"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card Input Form */}
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
              {/* Card Number with detection icon */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Numero de carte</label>
                <div className="relative">
                  {/* Card type icon on the left */}
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-7 flex items-center justify-center transition-all duration-300">
                    {cardType === "visa" && (
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                        <VisaIcon className="w-10 h-7" />
                      </motion.div>
                    )}
                    {cardType === "mastercard" && (
                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                        <MastercardIcon className="w-10 h-7" />
                      </motion.div>
                    )}
                    {cardType === "unknown" && (
                      <CreditCard size={20} className="text-slate-600" />
                    )}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1234 5678 9012 3456"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                    maxLength={19}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 pl-16 pr-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 tracking-widest"
                  />
                </div>
                {cardType !== "unknown" && (
                  <motion.p 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[9px] font-bold text-emerald-500 ml-1 flex items-center gap-1"
                  >
                    <CheckCircle2 size={10} />
                    Carte {cardType === "visa" ? "Visa" : "Mastercard"} detectee
                  </motion.p>
                )}
              </div>

              {/* Card Holder */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nom du titulaire</label>
                <div className="relative">
                  <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                  <input
                    type="text"
                    placeholder="JEAN DUPONT"
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 pl-12 pr-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 uppercase tracking-wider"
                  />
                </div>
              </div>

              {/* Expiry and CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Expiration</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="MM/AA"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(formatExpiryDate(e.target.value))}
                      maxLength={5}
                      className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 pl-11 pr-4 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 tracking-widest"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CVV</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" />
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4}
                      className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 pl-11 pr-4 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700 tracking-widest"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Amount Section */}
            <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Montant USD</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 text-2xl font-black text-blue-500 outline-none placeholder:text-slate-800 focus:border-blue-500/50 transition-colors"
                />
              </div>

              {/* Fee Details */}
              {parseFloat(amount) > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 bg-blue-600/5 border border-blue-500/10 rounded-2xl space-y-3"
                >
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-500">
                    <span>Montant saisi</span>
                    <span className="text-white">$ {parseFloat(amount).toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black uppercase text-rose-500">
                    <span>Frais PimPay (1.5%)</span>
                    <span>- $ {(parseFloat(amount) * 0.015).toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-black text-emerald-500 uppercase block">Vous recevrez</span>
                      <span className="text-2xl font-black text-white">$ {(parseFloat(amount) * 0.985).toFixed(2)}</span>
                    </div>
                    <span className="text-sm font-black text-slate-400">USD</span>
                  </div>
                </motion.div>
              )}

              {/* Security Badge */}
              <div className="flex items-center justify-center gap-2 py-2">
                <Lock size={12} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Paiement securise par chiffrement SSL
                </span>
              </div>

              {/* Deposit Button */}
              <button
                onClick={handleCardDeposit}
                disabled={isLoading || !amount || !cardNumber || !cardExpiry || !cardCvv || !cardHolder || cardType === "unknown"}
                className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    {cardType === "visa" && <VisaIcon className="w-8 h-6" />}
                    {cardType === "mastercard" && <MastercardIcon className="w-8 h-6" />}
                    EFFECTUER LE DEPOT
                  </>
                )}
              </button>
            </div>

            {/* Accepted Cards */}
            <div className="flex items-center justify-center gap-4 py-4">
              <span className="text-[9px] font-bold text-slate-600 uppercase">Cartes acceptees:</span>
              <div className="flex gap-2">
                <VisaIcon className="w-10 h-7 opacity-60 hover:opacity-100 transition-opacity" />
                <MastercardIcon className="w-10 h-7 opacity-60 hover:opacity-100 transition-opacity" />
              </div>
            </div>
          </motion.div>
        )}
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
