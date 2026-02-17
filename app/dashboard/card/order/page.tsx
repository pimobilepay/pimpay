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
  Lock,
  RefreshCw,
  Clock,
  CheckCircle2,
  DollarSign,
  ArrowUpRight
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
    tier: "Mastercard Blue",
    brand: "MASTERCARD",
    price: 10,
    limit: "1,000",
    gradient: "from-[#1e3a8a] via-[#3b82f6] to-[#1e40af]",
    border: "border-blue-500/30",
    accent: "text-blue-400",
    accentBg: "bg-blue-500/20",
    features: ["Paiements Web", "Validité 3 ans"],
  },
  {
    id: "GOLD",
    tier: "Mastercard Diamond",
    brand: "MASTERCARD",
    price: 25,
    limit: "10,000",
    gradient: "from-[#fbbf24] via-[#b45309] to-[#78350f]",
    border: "border-amber-500/40",
    accent: "text-amber-400",
    accentBg: "bg-amber-500/20",
    features: ["Cashback 2%", "3DS Secured"],
  },
];

export default function CardOrderPage() {
  const [selectedId, setSelectedId] = useState("GOLD");
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [wallets, setWallets] = useState<any[]>([]);
  const [userMainBalance, setUserMainBalance] = useState<number>(0); // En USD
  const [currency, setCurrency] = useState<keyof typeof CURRENCY_RATES>("USD");
  const router = useRouter();

  const selectedCard = CARD_TIERS.find((c) => c.id === selectedId)!;
  const priceInPi = selectedCard.price / PI_RATE_GCV;
  
  // Calcul du solde disponible en USD pour l'achat
  const availableUSD = userMainBalance;
  const isBalanceInsufficient = availableUSD < selectedCard.price;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/profile");
        const data = await res.json();
        if (data.success || data.id) {
          setWallets(data.wallets || []);
          // On cherche le solde USDT ou USD pour payer la carte, ou on convertit le solde total
          const usdWallet = data.wallets?.find((w: any) => w.currency === "USDT" || w.currency === "USD");
          setUserMainBalance(usdWallet ? usdWallet.balance : 0);
        }
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchBalance();
  }, []);

  const handleFinalConfirm = async () => {
    setLoading(true);
    const toastId = toast.loading("Sécurisation du Smart Contract...");
    try {
      const response = await fetch("/api/user/card/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedCard.id }),
      });

      const res = await response.json();
      if (res.success) {
        toast.success("Carte émise avec succès !", { id: toastId });
        router.push("/dashboard/card");
      } else {
        toast.error(res.error || "Échec de l'émission", { id: toastId });
      }
    } catch {
      toast.error("Erreur réseau", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030014] text-white pb-32 font-sans relative overflow-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-600/5 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-lg mx-auto px-6">
        {!showSummary ? (
          <div className="pt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <header className="flex items-center justify-between">
              <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-xl border border-white/10">
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-lg font-bold">Commander une Carte</h1>
              <div className="w-10"></div>
            </header>

            {/* Card Preview avec design dynamique */}
            <div className={`relative w-full aspect-[1.58/1] rounded-[28px] overflow-hidden shadow-2xl border ${selectedCard.border} transition-all duration-500`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${selectedCard.gradient}`}>
                <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              </div>
              
              <div className="relative h-full p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black tracking-[0.2em] opacity-60">VIRTUAL DEBIT</span>
                    <span className="text-xl font-bold tracking-tight">PimPay</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-6 h-6 bg-[#eb001b] rounded-full"></div>
                    <div className="w-6 h-6 bg-[#f79e1b] rounded-full -ml-3"></div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                   <div className="w-12 h-9 bg-gradient-to-br from-amber-200 to-amber-500 rounded-md opacity-80"></div>
                   <Wifi size={20} className="rotate-90 opacity-40" />
                </div>

                <div className="space-y-1">
                  <p className="text-xl font-mono tracking-[0.25em]">•••• •••• •••• ••••</p>
                  <div className="flex justify-between items-end">
                    <p className="text-xs font-medium uppercase opacity-70">NOM DU TITULAIRE</p>
                    <p className="text-xs font-mono opacity-70">••/••</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Solde Disponible (Inspiré de ta capture) */}
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <DollarSign size={20} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-emerald-400/80 uppercase">Solde du compte</p>
                  <p className="text-sm font-black">Vous avez {availableUSD.toLocaleString()} USD</p>
                </div>
              </div>
              <ArrowUpRight size={18} className="text-emerald-500" />
            </div>

            {/* Tier Selection */}
            <div className="grid grid-cols-2 gap-3">
              {CARD_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedId(tier.id)}
                  className={`p-4 rounded-2xl border transition-all text-left ${
                    selectedId === tier.id ? `${tier.border} bg-white/10` : "border-white/5 bg-white/5 opacity-50"
                  }`}
                >
                  <p className={`text-[10px] font-bold ${tier.accent} mb-1 uppercase`}>{tier.tier}</p>
                  <p className="text-xl font-black">${tier.price}</p>
                  <p className="text-[10px] opacity-40">Limite: ${tier.limit}</p>
                </button>
              ))}
            </div>

            {/* Section Card Features (Inspirée capture) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400" /> Caractéristiques
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { icon: ShieldCheck, text: "3DS Secured - Protection avancée", color: "text-emerald-400" },
                  { icon: RefreshCw, text: "Rechargeable instantanément", color: "text-blue-400" },
                  { icon: Clock, text: "Validité de 3 ans - Renouvellement auto", color: "text-purple-400" },
                  { icon: Globe, text: "Acceptation globale - Mastercard network", color: "text-pink-400" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                    <item.icon size={16} className={item.color} />
                    <span className="text-xs font-medium text-white/70">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Section Pricing Details (Inspirée capture) */}
            <div className="p-5 bg-white/[0.02] border border-white/10 rounded-[24px] space-y-4">
                <h3 className="text-xs font-bold uppercase text-white/40 mb-2">Détails des frais</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Maintenance mensuelle</span>
                        <span className="font-bold">$1/mois</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Frais de recharge</span>
                        <span className="font-bold">2.5% (min $1)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                        <span className="text-white/60">Frais de retrait</span>
                        <span className="font-bold">1.5%</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                        <span className="text-sm font-bold">Total à payer</span>
                        <span className="text-lg font-black text-purple-400">${selectedCard.price}</span>
                    </div>
                </div>
            </div>

            {/* Bouton Action */}
            <button
              onClick={() => setShowSummary(true)}
              disabled={isBalanceInsufficient}
              className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                isBalanceInsufficient 
                ? "bg-red-500/10 text-red-500 border border-red-500/20" 
                : "bg-gradient-to-r from-purple-600 to-cyan-500 shadow-lg shadow-purple-500/20"
              }`}
            >
              {isBalanceInsufficient ? "Solde Insuffisant" : "Continuer"}
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* --- SUMMARY STEP --- */
          <div className="pt-8 space-y-8 animate-in slide-in-from-right duration-500">
             <header className="flex items-center gap-4">
                <button onClick={() => setShowSummary(false)} className="p-2 bg-white/5 rounded-xl">
                    <ArrowLeft size={20} />
                </button>
                <h1 className="text-lg font-bold">Confirmation</h1>
             </header>

             <div className="p-6 bg-gradient-to-br from-purple-500/10 to-transparent border border-white/10 rounded-[32px] text-center space-y-4">
                <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Lock size={28} className="text-purple-400" />
                </div>
                <h2 className="text-xl font-black">Paiement Sécurisé</h2>
                <p className="text-xs text-white/50 px-6">
                    L'émission de votre <b>{selectedCard.tier}</b> sera effectuée au taux GCV de $314,159/π si vous utilisez vos Pi.
                </p>
                <div className="py-4 border-y border-white/5 flex justify-around">
                    <div>
                        <p className="text-[10px] text-white/40 uppercase">Montant</p>
                        <p className="text-lg font-bold">${selectedCard.price}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-white/40 uppercase">Equivalent</p>
                        <p className="text-lg font-bold text-amber-400">{priceInPi.toFixed(7)} π</p>
                    </div>
                </div>
             </div>

             <button
                onClick={handleFinalConfirm}
                disabled={loading}
                className="w-full py-5 bg-gradient-to-r from-purple-600 to-cyan-500 rounded-2xl font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 transition-all"
             >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                    <>
                        <span>Confirmer le paiement</span>
                        <CheckCircle2 size={20} />
                    </>
                )}
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
