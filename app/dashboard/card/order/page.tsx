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

// Tier IDs must match the API CARD_CONFIG keys: PLATINIUM, PREMIUM, GOLD, ULTRA
const CARD_TIERS = [
  {
    id: "PLATINIUM",
    tier: "Mastercard Blue",
    brand: "MASTERCARD",
    price: 10,
    limit: "1,000",
    monthlyLimit: "5,000",
    gradient: "from-[#1e3a8a] via-[#3b82f6] to-[#1e40af]",
    border: "border-blue-500/30",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/20",
    features: ["Paiements Web", "Validite 3 ans", "Support 24/7"],
    maintenance: "$1/mois",
    rechargeRate: "2.5%",
    withdrawRate: "1.5%",
  },
  {
    id: "PREMIUM",
    tier: "Mastercard Diamond",
    brand: "MASTERCARD",
    price: 25,
    limit: "2,500",
    monthlyLimit: "50,000",
    gradient: "from-[#fbbf24] via-[#b45309] to-[#78350f]",
    border: "border-amber-500/40",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/20",
    features: ["Cashback 2%", "3DS Secured", "Assurance voyage"],
    maintenance: "$2/mois",
    rechargeRate: "1.5%",
    withdrawRate: "1%",
  },
  {
    id: "GOLD",
    tier: "Mastercard Gold",
    brand: "MASTERCARD",
    price: 50,
    limit: "5,000",
    monthlyLimit: "200,000",
    gradient: "from-[#334155] via-[#475569] to-[#1e293b]",
    border: "border-slate-400/40",
    accent: "text-slate-300",
    accentBg: "bg-slate-400/20",
    features: ["Cashback 5%", "Conciergerie", "Lounge aeroport"],
    maintenance: "$5/mois",
    rechargeRate: "1%",
    withdrawRate: "0.5%",
  },
  {
    id: "ULTRA",
    tier: "Mastercard Platinum",
    brand: "MASTERCARD",
    price: 100,
    limit: "Illimite",
    monthlyLimit: "Illimite",
    gradient: "from-[#0f172a] via-[#1e293b] to-[#0c0a09]",
    border: "border-white/20",
    accent: "text-white",
    accentBg: "bg-white/10",
    features: ["Cashback 10%", "Conciergerie VIP", "Lounge illimite"],
    maintenance: "$10/mois",
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
                <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full -ml-20 -mb-20 blur-3xl" />
              </div>

              <div className="relative h-full p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black tracking-[0.2em] text-white/50 uppercase">Virtual Debit</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Zap size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-lg font-black italic tracking-tighter">PimPay</span>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-7 h-7 bg-[#eb001b] rounded-full" />
                    <div className="w-7 h-7 bg-[#f79e1b] rounded-full -ml-3" />
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-9 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md">
                    <div className="w-full h-full grid grid-cols-3 gap-[1px] p-1">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="bg-black/20 rounded-[1px]" />
                      ))}
                    </div>
                  </div>
                  <Wifi size={20} className="rotate-90 text-white/40" />
                </div>

                <div className="space-y-1">
                  <p className="text-xl font-mono tracking-[0.25em] text-white/70">{"•••• •••• •••• ••••"}</p>
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-black uppercase text-white/50">Nom du titulaire</p>
                    <p className="text-xs font-mono text-white/50">{"••/••"}</p>
                  </div>
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
            {/* Pricing Breakdown */}
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md space-y-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg">
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
