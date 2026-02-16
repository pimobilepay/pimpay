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
  Shield,
  Sparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const PI_RATE_GCV = 314159;
const CURRENCY_RATES = {
  USD: 1,
  XAF: 600,
  XOF: 600,
  EUR: 0.92,
  CDF: 2800,
};

const CARD_TIERS = [
  {
    id: "CLASSIC",
    tier: "Visa Classic",
    brand: "VISA",
    price: 10,
    limit: "1,000",
    gradient: "from-[#1a1f71] via-[#2d3a8c] to-[#0d1137]",
    border: "border-blue-500/30",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/20",
    features: ["Paiements en ligne", "200+ pays"],
  },
  {
    id: "GOLD",
    tier: "Visa Gold",
    brand: "VISA",
    price: 25,
    limit: "5,000",
    gradient: "from-[#b45309] via-[#78350f] to-[#451a03]",
    border: "border-amber-500/40",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/20",
    features: ["Cashback 2%", "Assurance voyage"],
  },
  {
    id: "BUSINESS",
    tier: "MasterCard Business",
    brand: "MASTERCARD",
    price: 50,
    limit: "25,000",
    gradient: "from-[#eb001b] via-[#c41230] to-[#ff5f00]",
    border: "border-red-400/30",
    accent: "text-red-400",
    accentBg: "bg-red-500/20",
    features: ["Cashback 3%", "Lounge VIP"],
  },
  {
    id: "ULTRA",
    tier: "Visa Ultra",
    brand: "VISA",
    price: 100,
    limit: "Illimite",
    gradient: "from-[#581c87] via-[#2e1065] to-[#000000]",
    border: "border-purple-500/50",
    accent: "text-purple-400",
    accentBg: "bg-purple-500/20",
    features: ["Cashback 5%", "Conciergerie 24/7"],
  },
];

export default function CardOrderPage() {
  const [selectedId, setSelectedId] = useState("GOLD");
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<keyof typeof CURRENCY_RATES>("USD");
  const router = useRouter();

  const selectedCard = CARD_TIERS.find((c) => c.id === selectedId)!;
  const priceInPi = selectedCard.price / PI_RATE_GCV;
  const isBalanceInsufficient = userBalance < priceInPi;

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.wallets) {
          const piWallet = data.wallets.find(
            (w: any) => w.currency === "PI"
          );
          setUserBalance(piWallet ? piWallet.balance : 0);
        }
      })
      .catch(console.error);
  }, []);

  const handleFinalConfirm = async () => {
    setLoading(true);
    const toastId = toast.loading("Minage du Smart Contract...");
    try {
      const response = await fetch("/api/user/card/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedCard.id }),
      });

      const res = await response.json();

      if (res.success) {
        toast.success("Carte activee sur le reseau !", { id: toastId });
        router.push("/cards");
        router.refresh();
      } else {
        toast.error(res.error || "Echec", { id: toastId });
        setShowSummary(false);
      }
    } catch {
      toast.error("Erreur reseau", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white pb-32 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[180px]"></div>
        <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-cyan-500/8 rounded-full blur-[180px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6">
        {!showSummary ? (
          <div className="animate-in fade-in duration-500">
            {/* Header */}
            <header className="pt-8 mb-8">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-6"
              >
                <ArrowLeft size={16} />
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Retour
                </span>
              </button>

              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-black tracking-tight">
                    {"Emettre une "}
                    <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                      Carte
                    </span>
                  </h1>
                  <p className="text-white/40 text-xs mt-2 uppercase tracking-wider font-bold">
                    {"Choisissez votre niveau d'acces"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-white/30 font-bold uppercase tracking-widest">
                    Solde PI
                  </p>
                  <p className="text-sm font-black text-emerald-400">
                    {userBalance.toLocaleString(undefined, {
                      minimumFractionDigits: 4,
                    })}{" "}
                    {"π"}
                  </p>
                </div>
              </div>
            </header>

            {/* Card Preview */}
            <div
              className={`relative w-full aspect-[1.586/1] rounded-[24px] overflow-hidden shadow-2xl border ${selectedCard.border} mb-8 transition-all duration-500`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${selectedCard.gradient}`}
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
              </div>

              <div className="relative z-10 h-full p-7 flex flex-col justify-between">
                {/* Card Header */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={12} className="text-white/60" />
                    <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">
                      Pimpay Virtual
                    </span>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-bold border border-white/10 uppercase tracking-wider">
                    {selectedCard.tier}
                  </div>
                </div>

                {/* Chip and Contactless */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-300 to-amber-500">
                    <div className="w-full h-full grid grid-cols-3 gap-[1px] p-1">
                      {[...Array(6)].map((_, i) => (
                        <div
                          key={i}
                          className="bg-black/20 rounded-[1px]"
                        ></div>
                      ))}
                    </div>
                  </div>
                  <Wifi size={22} className="rotate-90 text-white/50" />
                </div>

                {/* Card Number */}
                <div>
                  <p className="text-xl font-mono tracking-[0.2em] text-white/90">
                    {"•••• •••• •••• 0000"}
                  </p>
                  <div className="flex gap-8 mt-2">
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">
                        Expire
                      </p>
                      <p className="text-xs font-bold tracking-widest text-white/80">
                        --/--
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-white/40 uppercase tracking-wider">
                        CVV
                      </p>
                      <p className="text-xs font-bold tracking-widest text-white/80">
                        {"•••"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex justify-between items-end">
                  <p className="text-xs font-medium tracking-wide uppercase text-white/60">
                    Votre nom ici
                  </p>
                  {selectedCard.brand === "VISA" ? (
                    <span
                      className="text-2xl font-black italic text-white tracking-tight"
                      style={{ fontFamily: "Arial, sans-serif" }}
                    >
                      VISA
                    </span>
                  ) : (
                    <div className="flex items-center">
                      <div className="w-7 h-7 rounded-full bg-[#eb001b] opacity-90"></div>
                      <div className="w-7 h-7 rounded-full bg-[#f79e1b] opacity-90 -ml-3"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Balance Display */}
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 mb-6 flex justify-between items-center">
              <div>
                <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                  Solde Convertible
                </p>
                <p className="text-lg font-black text-white">
                  {(
                    userBalance *
                    PI_RATE_GCV *
                    CURRENCY_RATES[currency]
                  ).toLocaleString(undefined, {
                    maximumFractionDigits: 0,
                  })}{" "}
                  <span className="text-sm text-white/40">{currency}</span>
                </p>
              </div>
              <select
                value={currency}
                onChange={(e) =>
                  setCurrency(
                    e.target.value as keyof typeof CURRENCY_RATES
                  )
                }
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white/70 focus:outline-none focus:border-purple-500/50"
              >
                {Object.keys(CURRENCY_RATES).map((c) => (
                  <option key={c} value={c} className="bg-[#030014]">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Tier Selection Grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              {CARD_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedId(tier.id)}
                  className={`p-5 rounded-[20px] border transition-all text-left ${
                    selectedId === tier.id
                      ? `${tier.border} bg-white/[0.06] shadow-lg`
                      : "border-white/5 bg-white/[0.02] opacity-60 hover:opacity-80"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className={`w-6 h-6 rounded-lg ${tier.accentBg} flex items-center justify-center`}
                    >
                      <CreditCard size={12} className={tier.accent} />
                    </div>
                    <p
                      className={`text-[9px] font-bold ${tier.accent} uppercase tracking-tight`}
                    >
                      {tier.tier}
                    </p>
                  </div>
                  <p className="text-xl font-black">${tier.price}</p>
                  <p className="text-[9px] font-bold text-white/30 mt-1">
                    {(tier.price / PI_RATE_GCV).toFixed(7)} {"π"}
                  </p>
                  <p className="text-[9px] text-white/30 mt-2 font-medium">
                    Limite: ${tier.limit}
                  </p>
                </button>
              ))}
            </div>

            {/* Features for selected tier */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                <Globe size={18} className="text-purple-400 mb-2" />
                <p className="text-[10px] font-bold text-white/70">
                  {selectedCard.features[0]}
                </p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                <Sparkles size={18} className="text-cyan-400 mb-2" />
                <p className="text-[10px] font-bold text-white/70">
                  {selectedCard.features[1]}
                </p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                <Shield size={18} className="text-emerald-400 mb-2" />
                <p className="text-[10px] font-bold text-white/70">
                  Protection totale
                </p>
              </div>
              <div className="p-4 bg-white/[0.02] border border-white/10 rounded-2xl">
                <Zap size={18} className="text-amber-400 mb-2" />
                <p className="text-[10px] font-bold text-white/70">
                  Activation instant.
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setShowSummary(true)}
              disabled={isBalanceInsufficient}
              className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${
                isBalanceInsufficient
                  ? "bg-red-500/10 text-red-500 border border-red-500/20"
                  : "bg-gradient-to-r from-purple-600 to-cyan-500 text-white shadow-xl shadow-purple-500/20 active:scale-95"
              }`}
            >
              {isBalanceInsufficient
                ? "Solde Insuffisant"
                : "Confirmer l'emission"}
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* --- SUMMARY STEP --- */
          <div className="animate-in slide-in-from-right duration-300 pt-8">
            <button
              onClick={() => setShowSummary(false)}
              className="mb-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Modifier le choix
              </span>
            </button>

            <h2 className="text-2xl font-black uppercase tracking-tight mb-6">
              {"Resume du "}
              <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                Minage
              </span>
            </h2>

            <div className="bg-white/[0.03] border border-white/10 rounded-[28px] overflow-hidden">
              <div className="p-6 bg-white/[0.02] flex items-center justify-between border-b border-white/5">
                <div>
                  <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">
                    {"Produit selectionne"}
                  </p>
                  <p className="text-sm font-black uppercase">
                    {selectedCard.tier}
                  </p>
                </div>
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedCard.gradient} border border-white/10`}
                />
              </div>

              <div className="p-6 space-y-5">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase">
                    Solde Actuel
                  </span>
                  <span className="font-black text-emerald-400">
                    {userBalance.toFixed(6)} {"π"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40 font-bold uppercase">
                    {"Cout de la carte"}
                  </span>
                  <span className="font-black text-white">
                    {priceInPi.toFixed(8)} {"π"}
                  </span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/5 pt-4">
                  <span className="text-purple-400 font-bold uppercase">
                    {"Nouveau solde estime"}
                  </span>
                  <span className="font-black text-purple-400">
                    {(userBalance - priceInPi).toFixed(6)} {"π"}
                  </span>
                </div>
              </div>

              <div className="m-4 p-4 bg-purple-500/5 rounded-2xl flex gap-3 border border-purple-500/10">
                <Info size={16} className="text-purple-400 shrink-0 mt-0.5" />
                <p className="text-[9px] text-white/50 font-medium leading-relaxed">
                  {`Ce paiement utilise le taux GCV de $314,159. Votre carte sera creditee de $${selectedCard.price} instantanement apres validation.`}
                </p>
              </div>
            </div>

            <button
              onClick={handleFinalConfirm}
              disabled={loading}
              className="w-full mt-8 bg-gradient-to-r from-purple-600 to-cyan-500 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-purple-500/20 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <span>
                    {"Valider & Payer"} {priceInPi.toFixed(8)} {"π"}
                  </span>
                  <ShieldCheck size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
