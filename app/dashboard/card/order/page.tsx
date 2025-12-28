"use client";

import React, { useState, useEffect } from 'react';
import {                                      
  CheckCircle2,                               
  ShieldCheck,                                
  ArrowRight,
  Fingerprint,
  Cpu,                                        
  Loader2,
  AlertTriangle,
  Wallet
} from 'lucide-react';
import { purchaseVirtualCard } from "@/app/actions/card-purchase"; 
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

const CardPurchasePage = () => {
  const [selectedId, setSelectedId] = useState('gold');
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const router = useRouter();

  const PI_RATE_GCV = 314159;

  const cards = [
    { id: 'classic', tier: 'Visa Lite', price: '10.00', color: 'from-blue-600 to-blue-400', tag: 'Starter' },
    { id: 'business', tier: 'MasterCard Business', price: '25.00', color: 'from-blue-600 via-slate-700 to-blue-900', tag: 'Pro' },
    { id: 'gold', tier: 'MasterCard Gold', price: '50.00', color: 'from-amber-500 via-yellow-400 to-yellow-600', tag: 'Best Seller' },
    { id: 'ultra', tier: 'Visa Ultra', price: '100.00', color: 'from-fuchsia-600 via-purple-600 to-indigo-800', tag: 'Next-Gen' }
  ];

  const selectedCard = cards.find(c => c.id === selectedId)!;
  const priceInPi = parseFloat(selectedCard.price) / PI_RATE_GCV;
  const isBalanceInsufficient = userBalance !== null && userBalance < priceInPi;

  // 1. Charger le solde de l'utilisateur
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch("/api/user/balance"); // Assure-toi que cette route existe
        const data = await res.json();
        if (data.balance !== undefined) setUserBalance(data.balance);
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchBalance();
  }, []);

  const handleConfirmPurchase = async () => {
    if (isBalanceInsufficient || loading) {
        toast.error("Solde insuffisant pour ce palier");
        return;
    }

    setLoading(true);
    const toastId = toast.loading("Minage en cours...");

    try {
      const res = await purchaseVirtualCard(
        selectedCard.id.toUpperCase() as any, 
        priceInPi
      );

      if (res.success) {
        toast.success("Carte émise !", { id: toastId });
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
    <div className="min-h-screen bg-[#050508] text-white p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* BANNIÈRE D'ALERTE DYNAMIQUE */}
        {isBalanceInsufficient && (
          <div className="mb-8 animate-in fade-in zoom-in duration-300">
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center text-red-500">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-red-500 uppercase tracking-wider">Solde Insuffisant</h4>
                  <p className="text-xs text-gray-400">
                    Il vous manque <span className="text-white font-mono">{(priceInPi - (userBalance || 0)).toFixed(8)} π</span> pour débloquer le palier {selectedCard.tier}.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => router.push('/dashboard/deposit')}
                className="bg-red-500 text-white text-[10px] font-black px-4 py-2 rounded-xl uppercase hover:bg-red-600 transition-colors"
              >
                Recharger Pi
              </button>
            </div>
          </div>
        )}

        <header className="mb-12 flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black italic">PimPay<span className="text-blue-500">Terminal</span></h1>
            <p className="text-gray-400 mt-2 text-sm uppercase tracking-widest font-bold opacity-50">Sélection du module d'émission</p>
          </div>
          {userBalance !== null && (
            <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl hidden md:block">
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Votre Balance</p>
                <p className="text-sm font-black text-blue-400">{userBalance.toFixed(6)} π</p>
            </div>
          )}
        </header>

        {/* ... (Le reste de la grille des cartes reste identique) ... */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Garde ton code cards.map ici */}
        </div>

        {/* SECTION DE CONFIRMATION MISE À JOUR */}
        {selectedCard && (
          <div className={`mt-12 p-8 rounded-[32px] border flex flex-col md:flex-row items-center justify-between transition-all duration-500 ${
            isBalanceInsufficient 
            ? 'bg-red-500/5 border-red-500/20 opacity-80' 
            : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center gap-6 mb-6 md:mb-0">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${
                isBalanceInsufficient ? 'bg-gray-800 text-gray-500' : 'bg-gradient-to-br from-blue-500 to-fuchsia-600 text-white'
              }`}>
                {isBalanceInsufficient ? <Wallet size={28} /> : <ShieldCheck size={28} />}
              </div>
              <div>
                <h4 className="text-xl font-bold">
                  {isBalanceInsufficient ? "Paiement Bloqué" : "Confirmer l'émission ?"}
                </h4>
                <p className="text-gray-400 text-sm max-w-sm">
                  {isBalanceInsufficient 
                    ? "Veuillez approvisionner votre compte pour continuer." 
                    : "Émission instantanée via le réseau sécurisé PimPay."}
                </p>
              </div>
            </div>

            <button
              onClick={handleConfirmPurchase}
              disabled={loading || isBalanceInsufficient}
              className={`group flex items-center gap-3 px-10 py-5 rounded-2xl font-black transition-all ${
                isBalanceInsufficient 
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                : 'bg-white text-black hover:scale-105 shadow-xl shadow-white/5'
              }`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                <>
                  {isBalanceInsufficient ? "Solde Insuffisant" : `Payer ${priceInPi.toFixed(8)} π`}
                  {!isBalanceInsufficient && <ArrowRight size={20} />}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardPurchasePage;
