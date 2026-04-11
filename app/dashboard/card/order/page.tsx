"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Info,
  Wifi,
  CreditCard,
  Zap,
  Globe,
  Sparkles,
  Lock,
  RefreshCw,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowUpRight,
  Fingerprint,
  X,
  Activity
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const PI_RATE_GCV = 314159;

// Tier IDs must match the API CARD_CONFIG keys: PLATINIUM, PREMIUM, GOLD, ULTRA, VISA_CLASSIC, VISA_GOLD, VISA_PLATINUM, VISA_INFINITE
const CARD_TIERS = [
  // MASTERCARD - Blue theme variations (ePayService style)
  {
    id: "PLATINIUM",
    tier: "Mastercard Blue",
    brand: "MASTERCARD",
    price: 10,
    limit: "1,000",
    monthlyLimit: "5,000",
    gradient: "from-[#0288d1] via-[#0277bd] to-[#01579b]",
    pattern: "mastercard-blue",
    border: "border-cyan-500/30",
    accent: "text-cyan-400",
    accentBg: "bg-cyan-500/20",
    features: ["Paiements Web", "Validite 3 ans", "Support 24/7"],
    maintenance: "$1/mois",
    rechargeRate: "2.5%",
    withdrawRate: "1.5%",
  },
  {
    id: "PREMIUM",
    tier: "Mastercard Teal",
    brand: "MASTERCARD",
    price: 25,
    limit: "2,500",
    monthlyLimit: "50,000",
    gradient: "from-[#00897b] via-[#00796b] to-[#004d40]",
    pattern: "mastercard-teal",
    border: "border-teal-500/40",
    accent: "text-teal-400",
    accentBg: "bg-teal-500/20",
    features: ["Cashback 2%", "3DS Secured", "Assurance voyage"],
    maintenance: "$2/mois",
    rechargeRate: "1.5%",
    withdrawRate: "1%",
  },
  {
    id: "GOLD",
    tier: "Mastercard Navy",
    brand: "MASTERCARD",
    price: 50,
    limit: "5,000",
    monthlyLimit: "200,000",
    gradient: "from-[#1a237e] via-[#283593] to-[#0d1b4c]",
    pattern: "mastercard-navy",
    border: "border-indigo-400/40",
    accent: "text-indigo-300",
    accentBg: "bg-indigo-400/20",
    features: ["Cashback 5%", "Conciergerie", "Lounge aeroport"],
    maintenance: "$5/mois",
    rechargeRate: "1%",
    withdrawRate: "0.5%",
  },
  {
    id: "ULTRA",
    tier: "Mastercard Black",
    brand: "MASTERCARD",
    price: 100,
    limit: "Illimite",
    monthlyLimit: "Illimite",
    gradient: "from-[#212121] via-[#424242] to-[#0a0a0a]",
    pattern: "mastercard-black",
    border: "border-white/20",
    accent: "text-white",
    accentBg: "bg-white/10",
    features: ["Cashback 10%", "Conciergerie VIP", "Lounge illimite"],
    maintenance: "$10/mois",
    rechargeRate: "0.5%",
    withdrawRate: "0%",
  },
  // VISA - Wave pattern style (Platinum Business style)
  {
    id: "VISA_CLASSIC",
    tier: "Visa Purple",
    brand: "VISA",
    price: 15,
    limit: "1,500",
    monthlyLimit: "10,000",
    gradient: "from-[#1a1f4e] via-[#252d6a] to-[#1a1f4e]",
    pattern: "visa-purple",
    border: "border-[#3b5bdb]/30",
    accent: "text-[#3b5bdb]",
    accentBg: "bg-[#3b5bdb]/20",
    features: ["Paiements Web", "Validite 3 ans", "Support 24/7"],
    maintenance: "$1.5/mois",
    rechargeRate: "2%",
    withdrawRate: "1.5%",
  },
  {
    id: "VISA_GOLD",
    tier: "Visa Gold",
    brand: "VISA",
    price: 35,
    limit: "3,000",
    monthlyLimit: "75,000",
    gradient: "from-[#c9a227] via-[#d4af37] to-[#aa8c2c]",
    pattern: "visa-gold",
    border: "border-amber-400/40",
    accent: "text-amber-300",
    accentBg: "bg-amber-400/20",
    features: ["Cashback 2%", "3DS Secured", "Assurance voyage"],
    maintenance: "$3/mois",
    rechargeRate: "1.5%",
    withdrawRate: "1%",
  },
  {
    id: "VISA_PLATINUM",
    tier: "Visa Platinum",
    brand: "VISA",
    price: 75,
    limit: "10,000",
    monthlyLimit: "300,000",
    gradient: "from-[#546e7a] via-[#607d8b] to-[#37474f]",
    pattern: "visa-platinum",
    border: "border-slate-400/40",
    accent: "text-slate-300",
    accentBg: "bg-slate-400/20",
    features: ["Cashback 5%", "Conciergerie", "Lounge aeroport"],
    maintenance: "$7/mois",
    rechargeRate: "1%",
    withdrawRate: "0.5%",
  },
  {
    id: "VISA_INFINITE",
    tier: "Visa Black",
    brand: "VISA",
    price: 150,
    limit: "Illimite",
    monthlyLimit: "Illimite",
    gradient: "from-[#1a1a1a] via-[#2d2d2d] to-[#0a0a0a]",
    pattern: "visa-black",
    border: "border-white/30",
    accent: "text-white",
    accentBg: "bg-white/10",
    features: ["Cashback 10%", "Conciergerie VIP", "Lounge illimite"],
    maintenance: "$15/mois",
    rechargeRate: "0.5%",
    withdrawRate: "0%",
  },
];

export default function CardOrderPage() {
  const [selectedId, setSelectedId] = useState("PREMIUM");
  const [step, setStep] = useState(1); // 1: select, 2: summary, 3: confirm
  const [loading, setLoading] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [userMainBalance, setUserMainBalance] = useState<number>(0);
  const router = useRouter();

  const selectedCard = CARD_TIERS.find((c) => c.id === selectedId)!;
  const priceInPi = selectedCard.price / PI_RATE_GCV;
  const availableUSD = userMainBalance;
  const availableEUR = userMainBalance * 0.92;
  const isBalanceInsufficient = availableUSD < selectedCard.price;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (data.success && data.user) {
          const userWallets = data.user.wallets || [];
          setWallets(userWallets);
          // Sum stablecoin balances as USD equivalent
          let usdTotal = 0;
          for (const w of userWallets) {
            if (["USDT", "USD", "USDC", "DAI", "BUSD"].includes(w.currency)) {
              usdTotal += w.balance;
            }
          }
          setUserMainBalance(usdTotal);
        }
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchBalance();
  }, []);

  const handleFinalConfirm = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/card/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedCard.id }),
      });

      const res = await response.json();
      if (res.success) {
        toast.success("Carte emise avec succes !");
        router.push("/dashboard/card");
      } else {
        toast.error(res.error || "Echec de l'emission");
      }
    } catch {
      toast.error("Erreur reseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">

      {/* HEADER */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else router.back();
          }}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Commander</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">
            {"Etape " + step + " / 3"}
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
        >
          <X size={20} />
        </button>
      </header>

      <main className="px-6 pt-8 pb-32">
        {/* STEP 1: SELECT TIER */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Card Preview */}
            <div className={`relative w-full aspect-[1.586/1] rounded-[1.5rem] overflow-hidden shadow-2xl border ${selectedCard.border} transition-all duration-500`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${selectedCard.gradient}`}>
                {/* VISA Pattern - Deep Navy with blue accents */}
                {selectedCard.brand === "VISA" && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
                    {/* Abstract shape - elephant/shield like left side */}
                    <ellipse cx="70" cy="100" rx="50" ry="45" fill="rgba(59,91,219,0.4)" />
                    <ellipse cx="45" cy="110" rx="30" ry="50" fill="rgba(59,91,219,0.35)" />
                    {/* Contactless waves pattern */}
                    <path d="M 130 80 Q 150 95 130 110" stroke="rgba(59,91,219,0.5)" strokeWidth="3" fill="none" />
                    <path d="M 140 75 Q 165 95 140 115" stroke="rgba(59,91,219,0.4)" strokeWidth="3" fill="none" />
                    <path d="M 150 70 Q 180 95 150 120" stroke="rgba(59,91,219,0.3)" strokeWidth="3" fill="none" />
                    {/* Decorative swirl bottom right */}
                    <ellipse cx="360" cy="180" rx="35" ry="35" fill="rgba(59,91,219,0.3)" />
                    <path d="M 340 180 Q 360 150 380 180 Q 360 210 340 180" stroke="rgba(59,91,219,0.4)" strokeWidth="2" fill="none" />
                  </svg>
                )}
                {/* MasterCard Pattern - "100" watermark and curves */}
                {selectedCard.brand === "MASTERCARD" && (
                  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
                    <text x="-20" y="200" fontSize="180" fontWeight="bold" fill="rgba(255,255,255,0.08)" fontFamily="Arial, sans-serif">100</text>
                    <path d="M 350 0 Q 280 80 350 160 Q 420 240 350 320" stroke="rgba(255,255,255,0.1)" strokeWidth="60" fill="none" />
                    <path d="M 380 -20 Q 310 60 380 140 Q 450 220 380 300" stroke="rgba(255,255,255,0.05)" strokeWidth="40" fill="none" />
                  </svg>
                )}
              </div>

              <div className="relative h-full p-6 flex flex-col justify-between z-10">
                {/* Header - PIMPAY VIRTUAL in gold + Brand logo */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#FFD700]" />
                    <span className="text-[11px] font-black text-[#FFD700] uppercase tracking-widest">PIMPAY VIRTUAL</span>
                  </div>
                  {selectedCard.brand === "VISA" ? (
                    <span className="text-2xl font-black italic text-white tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
                  ) : (
                    <div className="flex items-center">
                      <div className="w-7 h-7 bg-[#eb001b] rounded-full" />
                      <div className="w-7 h-7 bg-[#f79e1b] rounded-full -ml-3" />
                    </div>
                  )}
                </div>

                {/* Middle - Contactless icon on right */}
                <div className="flex-1 flex items-end justify-end py-2">
                  <Wifi size={24} className={`rotate-90 ${selectedCard.brand === "VISA" ? "text-[#3b5bdb]" : "text-[#3b82f6]"}`} />
                </div>

                {/* Card Number */}
                <div className="mb-2">
                  <p className="text-base font-mono tracking-[0.15em] text-white whitespace-nowrap">
                    {"•••• •••• •••• "}
                    <span className={selectedCard.brand === "VISA" ? "text-[#3b5bdb]" : "text-[#3b82f6]"}>••••</span>
                  </p>
                </div>

                {/* Bottom - EXPIRE, CVV, Holder - gold labels for Visa */}
                <div className="space-y-1">
                  <div className="flex gap-6">
                    <div>
                      <p className={`text-[8px] font-bold uppercase tracking-wider ${selectedCard.brand === "VISA" ? "text-[#d4a827]" : "text-gray-400"}`}>EXPIRE</p>
                      <p className="text-xs font-bold tracking-widest text-white">{"••/••"}</p>
                    </div>
                    <div>
                      <p className={`text-[8px] font-bold uppercase tracking-wider ${selectedCard.brand === "VISA" ? "text-[#d4a827]" : "text-gray-400"}`}>CVV</p>
                      <p className="text-xs font-bold tracking-widest text-white">{"•••"}</p>
                    </div>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-white pt-1">{selectedCard.tier}</p>
                </div>
              </div>
            </div>

            {/* Balance */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600/20 to-emerald-600/10 rounded-[2rem] blur-sm opacity-60" />
              <div className="relative bg-slate-900/60 border border-emerald-500/20 rounded-[2rem] p-5 backdrop-blur-md flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/20">
                    <DollarSign size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-emerald-400/80 uppercase tracking-widest">Solde disponible</p>
                    <p className="text-lg font-black">${availableUSD.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-slate-500 font-bold">USD</span></p>
                    <p className="text-[10px] text-slate-600 font-bold">{"\u20AC"}{availableEUR.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR</p>
                  </div>
                </div>
                <ArrowUpRight size={18} className="text-emerald-500" />
              </div>
            </div>

            {/* Tier Selection */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <CreditCard size={14} className="text-blue-500" />
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Choisir votre carte</h2>
              </div>
              <div className="space-y-3">
                {CARD_TIERS.map((tier) => (
                  <button
                    key={tier.id}
                    onClick={() => setSelectedId(tier.id)}
                    className={`w-full p-5 rounded-[2rem] border transition-all text-left flex items-center gap-4 active:scale-[0.98] ${
                      selectedId === tier.id
                        ? `${tier.border} bg-white/[0.06]`
                        : "border-white/5 bg-white/[0.02] opacity-60"
                    }`}
                  >
                    <div className={`w-12 h-12 bg-gradient-to-br ${tier.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                      <CreditCard size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`text-xs font-black uppercase tracking-widest ${tier.accent}`}>{tier.tier}</p>
                      <p className="text-[9px] font-bold text-slate-500 mt-0.5">Limite: ${tier.limit}/jour - ${tier.monthlyLimit}/mois</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black">${tier.price}</p>
                      <p className="text-[8px] font-bold text-slate-600 uppercase">{"\u20AC"}{(tier.price * 0.92).toFixed(0)} EUR</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Features */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">Caracteristiques</h3>
              </div>
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
                {[
                  { icon: ShieldCheck, text: "3D Secure 2.0 - Protection avancee", color: "text-emerald-400" },
                  { icon: RefreshCw, text: "Rechargeable instantanement en Pi ou USD", color: "text-blue-400" },
                  { icon: Clock, text: "Validite de 3 ans avec renouvellement auto", color: "text-indigo-400" },
                  { icon: Globe, text: "Acceptation mondiale - Reseau Mastercard", color: "text-cyan-400" },
                  { icon: Lock, text: "Chiffrement de bout en bout", color: "text-amber-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                      <item.icon size={18} className={item.color} />
                    </div>
                    <span className="text-xs font-bold text-slate-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <button
              onClick={() => {
                if (isBalanceInsufficient) {
                  toast.error("Solde insuffisant pour cette carte");
                  return;
                }
                setStep(2);
              }}
              className={`w-full p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm transition-all flex items-center justify-center gap-3 active:scale-95 ${
                isBalanceInsufficient
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "bg-blue-600 shadow-2xl shadow-blue-600/30"
              }`}
            >
              {isBalanceInsufficient ? "Solde Insuffisant" : "Continuer"}
              <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: SUMMARY */}
        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
            {/* Card Preview Image */}
            <div className="relative">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-cyan-600/20 rounded-[2rem] blur-xl opacity-50" />
              <div className={`relative w-full aspect-[1.586/1] rounded-[1.5rem] overflow-hidden shadow-2xl border ${selectedCard.border} transition-all duration-500`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${selectedCard.gradient}`}>
                  {/* VISA Pattern - Deep Navy with blue accents */}
                  {selectedCard.brand === "VISA" && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
                      <ellipse cx="70" cy="100" rx="50" ry="45" fill="rgba(59,91,219,0.4)" />
                      <ellipse cx="45" cy="110" rx="30" ry="50" fill="rgba(59,91,219,0.35)" />
                      <path d="M 130 80 Q 150 95 130 110" stroke="rgba(59,91,219,0.5)" strokeWidth="3" fill="none" />
                      <path d="M 140 75 Q 165 95 140 115" stroke="rgba(59,91,219,0.4)" strokeWidth="3" fill="none" />
                      <path d="M 150 70 Q 180 95 150 120" stroke="rgba(59,91,219,0.3)" strokeWidth="3" fill="none" />
                      <ellipse cx="360" cy="180" rx="35" ry="35" fill="rgba(59,91,219,0.3)" />
                      <path d="M 340 180 Q 360 150 380 180 Q 360 210 340 180" stroke="rgba(59,91,219,0.4)" strokeWidth="2" fill="none" />
                    </svg>
                  )}
                  {/* MasterCard Pattern */}
                  {selectedCard.brand === "MASTERCARD" && (
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
                      <text x="-20" y="200" fontSize="180" fontWeight="bold" fill="rgba(255,255,255,0.08)" fontFamily="Arial, sans-serif">100</text>
                      <path d="M 350 0 Q 280 80 350 160 Q 420 240 350 320" stroke="rgba(255,255,255,0.1)" strokeWidth="60" fill="none" />
                      <path d="M 380 -20 Q 310 60 380 140 Q 450 220 380 300" stroke="rgba(255,255,255,0.05)" strokeWidth="40" fill="none" />
                    </svg>
                  )}
                </div>

                <div className="relative h-full p-6 flex flex-col justify-between z-10">
                  {/* Header */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-[#FFD700]" />
                      <span className="text-[11px] font-black text-[#FFD700] uppercase tracking-widest">PIMPAY VIRTUAL</span>
                    </div>
                    {selectedCard.brand === "VISA" ? (
                      <span className="text-2xl font-black italic text-white tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
                    ) : (
                      <div className="flex items-center">
                        <div className="w-7 h-7 bg-[#eb001b] rounded-full" />
                        <div className="w-7 h-7 bg-[#f79e1b] rounded-full -ml-3" />
                      </div>
                    )}
                  </div>

                  {/* Middle - Contactless icon */}
                  <div className="flex-1 flex items-end justify-end py-2">
                    <Wifi size={24} className={`rotate-90 ${selectedCard.brand === "VISA" ? "text-[#3b5bdb]" : "text-[#3b82f6]"}`} />
                  </div>

                  {/* Card Number */}
                  <div className="mb-2">
                    <p className="text-base font-mono tracking-[0.15em] text-white whitespace-nowrap">
                      {"•••• •••• •••• "}
                      <span className={selectedCard.brand === "VISA" ? "text-[#3b5bdb]" : "text-[#3b82f6]"}>••••</span>
                    </p>
                  </div>

                  {/* Bottom - EXPIRE, CVV, Holder */}
                  <div className="space-y-1">
                    <div className="flex gap-6">
                      <div>
                        <p className={`text-[8px] font-bold uppercase tracking-wider ${selectedCard.brand === "VISA" ? "text-[#d4a827]" : "text-gray-400"}`}>EXPIRE</p>
                        <p className="text-xs font-bold tracking-widest text-white">{"••/••"}</p>
                      </div>
                      <div>
                        <p className={`text-[8px] font-bold uppercase tracking-wider ${selectedCard.brand === "VISA" ? "text-[#d4a827]" : "text-gray-400"}`}>CVV</p>
                        <p className="text-xs font-bold tracking-widest text-white">{"•••"}</p>
                      </div>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-white pt-1">{selectedCard.tier}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-12 h-12 bg-gradient-to-br ${selectedCard.gradient} rounded-xl flex items-center justify-center shadow-lg`}>
                  <CreditCard size={24} className="text-white" />
                </div>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${selectedCard.accent}`}>{selectedCard.tier}</p>
                  <p className="text-[9px] font-bold text-slate-500">{selectedCard.brand}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Prix de la carte</span>
                  <span className="font-black text-xs text-white">${selectedCard.price}.00</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Maintenance</span>
                  <span className="font-black text-xs text-white">{selectedCard.maintenance}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Frais de recharge</span>
                  <span className="font-black text-xs text-white">{selectedCard.rechargeRate}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Frais de retrait</span>
                  <span className="font-black text-xs text-white">{selectedCard.withdrawRate}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Devises supportees</span>
                  <span className="font-black text-xs text-blue-400">USD / EUR</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Limite quotidienne</span>
                  <span className="font-black text-xs text-emerald-400">${selectedCard.limit}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Limite mensuelle</span>
                  <span className="font-black text-xs text-emerald-400">${selectedCard.monthlyLimit}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Total a payer</p>
                  <p className="text-2xl font-black text-white">${selectedCard.price}.00</p>
                  <p className="text-[10px] text-slate-600 font-bold">{"\u20AC"}{(selectedCard.price * 0.92).toFixed(2)} EUR</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Equivalent Pi</p>
                  <p className="text-lg font-black text-amber-400">{priceInPi.toFixed(7)} Pi</p>
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="flex flex-wrap gap-2">
              {selectedCard.features.map((feature, i) => (
                <span key={i} className="px-3 py-1.5 bg-blue-600/10 border border-blue-500/20 rounded-full text-[9px] font-black text-blue-400 uppercase tracking-widest">
                  {feature}
                </span>
              ))}
            </div>

            {/* Info */}
            <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-5 flex items-start gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl flex-shrink-0 mt-0.5">
                <Info size={16} className="text-blue-400" />
              </div>
              <p className="text-[11px] leading-relaxed text-slate-400 font-bold">
                {"L'emission de votre"} <span className="text-white">{selectedCard.tier}</span> {"sera effectuee au taux GCV de"} <span className="text-amber-400">$314,159/Pi</span> {"si vous utilisez vos Pi."}
              </p>
            </div>

            <button
              onClick={() => setStep(3)}
              className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
            >
              Verifier & Confirmer
            </button>
          </div>
        )}

        {/* STEP 3: CONFIRM */}
        {step === 3 && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <ShieldCheck size={120} />
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-[10px] font-black uppercase tracking-[3px] text-blue-500 mb-1">Paiement</h2>
                  <p className="text-2xl font-black uppercase">Signature</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Total</p>
                  <p className="text-2xl font-black text-white">${selectedCard.price}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Carte</span>
                  <span className="font-black text-xs text-blue-400 uppercase">{selectedCard.tier}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Reseau</span>
                  <span className="font-black text-xs uppercase">{selectedCard.brand}</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Protocole</span>
                  <span className="font-black text-xs uppercase text-emerald-400">PimPay Secure</span>
                </div>
                <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">Equivalent</span>
                  <span className="font-black text-xs uppercase text-amber-400">{priceInPi.toFixed(7)} Pi</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-4 gap-3">
                <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
                  <Fingerprint size={32} />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Signature biometrique requise</p>
              </div>
            </div>

            <button
              onClick={handleFinalConfirm}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
              {loading ? "Emission en cours..." : "Confirmer le paiement"}
            </button>
          </div>
        )}
      </main>

      {/* FOOTER STATUS */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">PimPay Card Issuer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[8px] font-black text-emerald-500 uppercase">Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
