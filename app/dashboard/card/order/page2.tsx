"use client";

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Cpu,
  Loader2,
  AlertTriangle,
  Wallet,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { purchaseVirtualCard } from "@/app/actions/card-purchase";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// --- CONFIGURATION DYNAMIQUE ---
const CURRENCY_RATES = {
  USD: 1,
  XAF: 600,
  XOF: 600,
  EUR: 0.92,
  CDF: 2800
};

const CARD_TIERS = [
  { 
    id: 'CLASSIC', 
    tier: 'Visa Lite', 
    price: 10, 
    limit: '1,000',
    color: 'from-[#1e293b] to-[#0f172a]', // Bleu nuit / Ardoise
    border: 'border-slate-500/30',
    accent: 'text-slate-400'
  },
  { 
    id: 'GOLD', 
    tier: 'MasterCard Gold', 
    price: 25, 
    limit: '5,000',
    color: 'from-[#b45309] via-[#78350f] to-[#451a03]', // Or ambré sombre
    border: 'border-yellow-500/40',
    accent: 'text-yellow-500'
  },
  { 
    id: 'BUSINESS', 
    tier: 'MasterCard Business', 
    price: 50, 
    limit: '25,000',
    color: 'from-[#1e40af] via-[#1e3a8a] to-[#172554]', // Bleu Royal profond
    border: 'border-blue-400/30',
    accent: 'text-blue-400'
  },
  { 
    id: 'ULTRA', 
    tier: 'MCard Ultra', 
    price: 100, 
    limit: 'Illimité',
    color: 'from-[#581c87] via-[#2e1065] to-[#000000]', // Byzantium / Noir profond
    border: 'border-purple-500/50',
    accent: 'text-purple-400'
  }
];

const PI_RATE_GCV = 314159;

const CardPurchasePage = () => {
  const [selectedId, setSelectedId] = useState('GOLD');
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [currency, setCurrency] = useState<keyof typeof CURRENCY_RATES>("USD");
  const router = useRouter();

  const selectedCard = CARD_TIERS.find(c => c.id === selectedId)!;
  const priceInPi = selectedCard.price / PI_RATE_GCV;
  const isBalanceInsufficient = userBalance !== null && userBalance < priceInPi;

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/balance");
        const data = await res.json();
        if (data.balance !== undefined) setUserBalance(data.balance);
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchBalance();
  }, []);

  const handleConfirmPurchase = async () => {
    if (isBalanceInsufficient || loading) return;
    setLoading(true);
    const toastId = toast.loading("Minage de la carte MasterCard...");

    try {
      const res = await purchaseVirtualCard(selectedCard.id as any, priceInPi);
      if (res.success) {
        toast.success("Carte émise avec succès !", { id: toastId });
        router.push("/dashboard/card");
      } else {
        toast.error(res.error || "Échec", { id: toastId });
      }
    } catch (err) {
      toast.error("Erreur réseau", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white p-4 pb-20 font-sans">
      <div className="max-w-md mx-auto">
        
        {/* HEADER */}
        <header className="pt-8 mb-8">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            PimPay<span className="text-blue-500">Terminal</span>
          </h1>
          <div className="flex justify-between items-center mt-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Émission MasterCard GCV</p>
            {userBalance !== null && (
              <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">
                Solde: {userBalance.toFixed(6)} π
              </span>
            )}
          </div>
        </header>

        {/* ALERTE SOLDE */}
        {isBalanceInsufficient && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-4">
            <AlertTriangle className="text-red-500 shrink-0" size={20} />
            <p className="text-[11px] text-gray-300 font-medium">
              Il vous manque <span className="text-white">{(priceInPi - (userBalance || 0)).toFixed(8)} π</span> pour débloquer ce palier.
            </p>
          </div>
        )}

        {/* APERÇU DE LA CARTE SÉLECTIONNÉE (Le design Mastercard) */}
        <div className="mb-10 transition-all duration-500 ease-out">
          <div className={`relative w-full aspect-[1.58/1] rounded-[24px] overflow-hidden shadow-2xl border ${selectedCard.border}`}>
            {/* Background avec dégradé dynamique selon le palier */}
            <div className={`absolute inset-0 bg-gradient-to-br ${selectedCard.color}`}>
              <svg className="absolute inset-0 opacity-20" viewBox="0 0 400 250">
                <circle cx="200" cy="125" r="100" fill="white" fillOpacity="0.05" />
                <path d="M0 100 Q 200 50 400 150" stroke="white" fill="transparent" strokeWidth="0.5" />
              </svg>
            </div>

            <div className="relative z-10 h-full p-6 flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Credit Balance</span>
                  <span className="text-sm font-bold text-white/90">
                    {(selectedCard.price * CURRENCY_RATES[currency]).toLocaleString()} {currency}
                  </span>
                </div>
                <div className="h-6 px-2 bg-white/10 backdrop-blur-md rounded border border-white/10 flex items-center gap-1">
                  <span className="text-[8px] font-bold uppercase tracking-tighter">Limit: ${selectedCard.limit}</span>
                </div>
              </div>

              {/* Puce MasterCard */}
              <div className="w-10 h-7 bg-gradient-to-br from-slate-200 to-slate-400 rounded-md relative shadow-inner overflow-hidden">
                <div className="absolute inset-0 grid grid-cols-2 gap-px opacity-30">
                  <div className="border-r border-black/20"></div>
                  <div className="border-b border-black/20"></div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-lg font-mono tracking-[0.25em] text-white">•••• •••• •••• 0000</p>
                <div className="flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[6px] uppercase text-white/40">Card Tier</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">{selectedCard.tier}</span>
                  </div>
                  {/* Logo MasterCard */}
                  <div className="flex">
                    <div className="w-7 h-7 bg-[#eb001b] rounded-full"></div>
                    <div className="w-7 h-7 bg-[#ff5f00] rounded-full -ml-3 mix-blend-screen"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SÉLECTEUR DE PALIER */}
        <div className="space-y-3 mb-8">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Choisir votre palier</p>
          <div className="grid grid-cols-2 gap-3">
            {CARD_TIERS.map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedId(tier.id)}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  selectedId === tier.id 
                  ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' 
                  : 'border-white/5 bg-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[8px] font-black uppercase ${tier.accent}`}>{tier.id}</span>
                  {selectedId === tier.id && <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />}
                </div>
                <p className="text-xs font-bold truncate">{tier.tier}</p>
                <p className="text-lg font-black mt-2">${tier.price}</p>
                <p className="text-[8px] font-bold text-gray-500">{(tier.price / PI_RATE_GCV).toFixed(6)} π</p>
              </button>
            ))}
          </div>
        </div>

        {/* RÉCAPITULATIF ET PAIEMENT */}
        <div className={`p-6 rounded-[28px] border transition-all ${
          isBalanceInsufficient ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'
        }`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBalanceInsufficient ? 'bg-gray-800' : 'bg-blue-600'}`}>
                {loading ? <Loader2 className="animate-spin" /> : <ShieldCheck size={20} />}
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-500 uppercase">Coût Final</p>
                <p className="text-sm font-black">{priceInPi.toFixed(8)} π</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">GCV Guaranteed</p>
              <p className="text-[10px] font-mono text-gray-400">1 π = $314,159</p>
            </div>
          </div>

          <button
            onClick={handleConfirmPurchase}
            disabled={loading || isBalanceInsufficient}
            className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-3 ${
              isBalanceInsufficient 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-white text-black hover:scale-[1.02] active:scale-95'
            }`}
          >
            {loading ? "Minage..." : isBalanceInsufficient ? "Solde Insuffisant" : "Confirmer l'émission"}
            {!loading && !isBalanceInsufficient && <ChevronRight size={18} />}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CardPurchasePage;
