"use client";

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Info,
  ChevronDown
} from 'lucide-react';
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// CONFIGURATION ORIGINALE CONSERVÉE
const PI_RATE_GCV = 314159;
const CURRENCY_RATES = {
  USD: 1,
  XAF: 600,
  XOF: 600,
  EUR: 0.92,
  CDF: 2800
};

const CARD_TIERS = [
  { id: 'PLATINIUM', tier: 'Visa Lite', price: 10, limit: '1,000', color: 'from-[#1a2b3c] to-[#0f172a]', border: 'border-slate-500/30' },
  { id: 'PREMIUM', tier: 'MasterCard Gold', price: 25, limit: '5,000', color: 'from-[#b45309] via-[#78350f] to-[#451a03]', border: 'border-yellow-500/40' },
  { id: 'GOLD', tier: 'MasterCard Business', price: 50, limit: '25,000', color: 'from-[#1e40af] via-[#1e3a8a] to-[#172554]', border: 'border-blue-400/30' },
  { id: 'ULTRA', tier: 'MCard Ultra', price: 100, limit: 'Illimité', color: 'from-[#581c87] via-[#2e1065] to-[#000000]', border: 'border-purple-500/50' }
];

export default function CardOrderPage() {
  const [selectedId, setSelectedId] = useState('GOLD');
  const [loading, setLoading] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<keyof typeof CURRENCY_RATES>("USD");
  const router = useRouter();

  const selectedCard = CARD_TIERS.find(c => c.id === selectedId)!;
  const priceInPi = selectedCard.price / PI_RATE_GCV;
  const isBalanceInsufficient = userBalance < priceInPi;

  // Récupération du solde PI réel depuis le profil
  useEffect(() => {
    fetch("/api/user/profile")
      .then(res => res.json())
      .then(data => {
        if (data.success && data.wallets) {
          // On cherche le wallet PI spécifiquement
          const piWallet = data.wallets.find((w: any) => w.currency === "PI");
          setUserBalance(piWallet ? piWallet.balance : 0);
        }
      })
      .catch(console.error);
  }, []);

  const handleFinalConfirm = async () => {
    setLoading(true);
    const toastId = toast.loading("Minage du Smart Contract...");
    try {
      // Appel à ton API de commande
      const response = await fetch("/api/user/card/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: selectedCard.id })
      });

      const res = await response.json();

      if (res.success) {
        toast.success("Carte activée sur le réseau !", { id: toastId });
        router.push("/dashboard/card");
        router.refresh();
      } else {
        toast.error(res.error || "Échec", { id: toastId });
        setShowSummary(false);
      }
    } catch (err) {
      toast.error("Erreur réseau", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-white p-6 pb-32 font-sans">
      <div className="max-w-md mx-auto">

        {!showSummary ? (
          /* --- ÉTAPE 1 : SELECTION --- */
          <div className="animate-in fade-in duration-500">
            <header className="pt-4 mb-8 flex justify-between items-center">
              <h1 className="text-2xl font-black italic tracking-tighter">PIMPAY<span className="text-blue-500">CARD</span></h1>
              <div className="text-right">
                <p className="text-[8px] text-gray-500 font-black uppercase tracking-widest">Solde Réel</p>
                <p className="text-sm font-black text-emerald-400">{userBalance.toLocaleString(undefined, { minimumFractionDigits: 4 })} π</p>
              </div>
            </header>

            <div className={`relative w-full aspect-[1.58/1] rounded-[24px] overflow-hidden shadow-2xl border ${selectedCard.border} mb-8 transition-all duration-500`}>
              <div className={`absolute inset-0 bg-gradient-to-br ${selectedCard.color}`}>
                <svg className="absolute inset-0 opacity-20" viewBox="0 0 400 250">
                    <path d="M0 100 Q 200 50 400 150" stroke="white" fill="transparent" strokeWidth="1" />
                    <path d="M0 150 Q 200 250 400 100" stroke="white" fill="transparent" strokeWidth="1" />
                </svg>
              </div>

              <div className="relative z-10 h-full p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Solde Convertible</span>
                    <span className="text-sm font-bold text-white/90">
                        {(userBalance * PI_RATE_GCV * CURRENCY_RATES[currency]).toLocaleString(undefined, { maximumFractionDigits: 0 })} {currency}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <div className="bg-white/10 backdrop-blur-md px-2 py-1 rounded text-[9px] font-bold border border-white/10 uppercase">
                      {selectedCard.tier}
                    </div>
                  </div>
                </div>

                <div className="w-11 h-8 bg-gradient-to-br from-slate-200 to-slate-400 rounded-md shadow-inner"></div>

                <div className="flex flex-col gap-1">
                  <p className="text-xl font-mono tracking-[0.2em] text-white/90">•••• •••• •••• 0000</p>
                  <div className="flex justify-between items-end">
                    <p className="text-[10px] font-medium tracking-wide uppercase opacity-60">Pioneer User</p>
                    <div className="flex">
                      <div className="w-8 h-8 bg-[#eb001b] rounded-full"></div>
                      <div className="w-8 h-8 bg-[#ff5f00] rounded-full -ml-3 mix-blend-screen"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {CARD_TIERS.map((tier) => (
                <button
                  key={tier.id}
                  onClick={() => setSelectedId(tier.id)}
                  className={`p-4 rounded-[20px] border transition-all ${
                    selectedId === tier.id ? 'border-blue-500 bg-blue-500/10 shadow-lg' : 'border-white/5 bg-white/5 opacity-50'
                  }`}
                >
                  <p className="text-[8px] font-black text-blue-400 mb-1 uppercase tracking-tighter">{tier.tier}</p>
                  <p className="text-lg font-black">${tier.price}</p>
                  <p className="text-[8px] font-bold text-gray-500">{(tier.price / PI_RATE_GCV).toFixed(7)} π</p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSummary(true)}
              disabled={isBalanceInsufficient}
              className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 transition-all ${
                isBalanceInsufficient ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 active:scale-95'
              }`}
            >
              {isBalanceInsufficient ? "Solde Insuffisant" : "Confirmer l'émission"}
              <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          /* --- ÉTAPE 2 : RÉSUMÉ (SUMMARY) --- */
          <div className="animate-in slide-in-from-right duration-300 pt-4">
            <button onClick={() => setShowSummary(false)} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-white transition-colors">
              <ArrowLeft size={16} /> <span className="text-[10px] font-black uppercase tracking-widest">Modifier le choix</span>
            </button>

            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6 text-blue-500">Résumé du Minage</h2>

            <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden">
              <div className="p-6 bg-white/5 flex items-center justify-between border-b border-white/5">
                <div>
                  <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Produit sélectionné</p>
                  <p className="text-sm font-black uppercase">{selectedCard.tier}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedCard.color} border border-white/10`} />
              </div>

              <div className="p-6 space-y-5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">Solde Actuel</span>
                  <span className="font-black text-emerald-400">{userBalance.toFixed(6)} π</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold uppercase">Coût de la carte</span>
                  <span className="font-black text-white">{priceInPi.toFixed(8)} π</span>
                </div>
                <div className="flex justify-between text-xs border-t border-white/5 pt-4">
                  <span className="text-gray-500 font-bold uppercase italic text-blue-500">Nouveau solde estimé</span>
                  <span className="font-black text-blue-500">{(userBalance - priceInPi).toFixed(6)} π</span>
                </div>
              </div>

              <div className="m-4 p-4 bg-blue-500/5 rounded-2xl flex gap-3">
                <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                <p className="text-[9px] text-gray-400 font-medium leading-relaxed uppercase">
                   Ce paiement utilise le taux GCV de $314,159. Votre carte sera créditée de ${selectedCard.price} instantanément après validation.
                </p>
              </div>
            </div>

            <button
              onClick={handleFinalConfirm}
              disabled={loading}
              className="w-full mt-8 bg-blue-600 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/30 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <span>Valider & Payer {priceInPi.toFixed(8)} π</span>
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
