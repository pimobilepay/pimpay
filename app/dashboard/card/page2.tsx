"use client";

import { useEffect, useState } from "react";
import { VirtualCard } from "@/components/VirtualCard";
import {
  Loader2,
  ShieldCheck,
  RefreshCcw,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";
import { toast } from "react-hot-toast";

// Configuration avec images thématiques Web3
const CARD_TIERS = {
  PLATINIUM: { 
    label: "Platinium", 
    usd: 10, 
    limit: "50,000", 
    color: "from-slate-600/20", 
    border: "border-slate-400/30",
    img: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop" // Abstract Silver Web3
  },
  PREMIUM: { 
    label: "Premium", 
    usd: 25, 
    limit: "1,000", 
    color: "from-blue-600/20", 
    border: "border-blue-500/30",
    img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2940&auto=format&fit=crop" // Blue Digital Network
  },
  GOLD: { 
    label: "Gold", 
    usd: 50, 
    limit: "10,000", 
    color: "from-yellow-600/30", 
    border: "border-yellow-500/50",
    img: "https://images.unsplash.com/photo-1640341719941-47398e27356a?q=80&w=2940&auto=format&fit=crop" // Golden Liquid Abstract
  },
};

export default function CardPage() {
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedTier, setSelectedTier] = useState<keyof typeof CARD_TIERS>("PLATINIUM");
  const [paymentCurrency, setPaymentCurrency] = useState<"PI" | "USD">("PI");
  const [piPrice, setPiPrice] = useState(314159);

  const fetchCardData = async () => {
    try {
      const res = await fetch("/api/user/card");
      const data = await res.json();
      setCardData(!data.error ? data : null);
      
      const configRes = await fetch("/api/admin/config");
      const configData = await configRes.json();
      if (configData.consensusPrice) setPiPrice(configData.consensusPrice);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCardData(); }, []);

  const handleCreateCard = async () => {
    setIsGenerating(true);
    try {
      // Simulation du token Bearer pour éviter le 401 si nécessaire
      const res = await fetch("/api/cards/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('pi_token') || 'test_token'}`
        },
        body: JSON.stringify({
          type: selectedTier,
          paymentCurrency: paymentCurrency,
          holderName: "Utilisateur PimPay"
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Votre carte ${selectedTier} est prête !`);
        fetchCardData();
      } else {
        toast.error(data.error || "Erreur lors de la création");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  const currentTierInfo = CARD_TIERS[selectedTier];
  const priceInPi = (currentTierInfo.usd / piPrice).toFixed(6);

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 pb-24 font-sans">
      <header className="max-w-md mx-auto pt-8 mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic text-white">
            PimPay<span className="text-blue-600">Card</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Virtual Visa Terminal</p>
        </div>
        <button onClick={fetchCardData} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
          <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </header>

      <div className="max-w-md mx-auto">
        {cardData ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
            <VirtualCard
              holderName={cardData.holder}
              cardNumber={cardData.number}
              expiryDate={cardData.exp || cardData.expiry}
              cvv={cardData.cvv}
              balance={cardData.balance || 0}
              isLocked={cardData.locked || cardData.isLocked}
            />
            <div className="flex justify-center">
                <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${CARD_TIERS[cardData.type as keyof typeof CARD_TIERS]?.border || 'border-white/20'} bg-white/5`}>
                    Status {cardData.type || 'PLATINIUM'}
                </span>
            </div>
            <div className="bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 p-5 rounded-[2.5rem] flex items-start gap-4">
              <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400"><ShieldCheck size={20} /></div>
              <div>
                <h4 className="text-sm font-bold text-blue-100">Protection Active</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Limite journalière : <span className="text-white font-mono">${cardData.dailyLimit || "1,000"}</span>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            {/* Sélecteur de Tiers */}
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(CARD_TIERS) as Array<keyof typeof CARD_TIERS>).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`p-4 rounded-3xl border transition-all flex flex-col items-center gap-2 ${
                    selectedTier === tier 
                    ? `${CARD_TIERS[tier].border} bg-white/10 scale-105 shadow-lg shadow-white/5` 
                    : "border-white/5 bg-white/[0.02] opacity-50"
                  }`}
                >
                  <span className="text-[10px] font-black tracking-widest uppercase">{CARD_TIERS[tier].label}</span>
                  <span className="text-xs font-bold">${CARD_TIERS[tier].usd}</span>
                </button>
              ))}
            </div>

            {/* Preview de la Carte avec Image Background */}
            <div className={`p-8 rounded-[3rem] border ${currentTierInfo.border} bg-gradient-to-br ${currentTierInfo.color} to-black text-center relative overflow-hidden transition-all duration-500`}>
                
                {/* Image de fond avec overlay sombre */}
                <div className="absolute inset-0 z-0 opacity-40">
                    <img src={currentTierInfo.img} alt={currentTierInfo.label} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                {/* Animation Shimmer Spécifique Gold */}
                {selectedTier === "GOLD" && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-[shimmer_2s_infinite] translate-x-[-200%]" />
                    <Sparkles className="absolute top-4 right-8 text-yellow-400 animate-pulse" size={18} />
                  </div>
                )}

                <div className="relative z-20">
                    <h2 className={`text-3xl font-black mb-1 uppercase italic tracking-tighter ${selectedTier === "GOLD" ? "text-yellow-500" : "text-white"}`}>
                      Visa {currentTierInfo.label}
                    </h2>
                    <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mb-6">PimPay Web3 Edition</p>
                    
                    <ul className="text-left space-y-3 mb-8 max-w-[200px] mx-auto">
                        <li className="flex items-center gap-2 text-[11px] font-medium text-slate-100">
                            <CheckCircle size={14} className={selectedTier === "GOLD" ? "text-yellow-500" : "text-blue-500"} /> 
                            Limite ${currentTierInfo.limit}/j
                        </li>
                        <li className="flex items-center gap-2 text-[11px] font-medium text-slate-100">
                            <CheckCircle size={14} className={selectedTier === "GOLD" ? "text-yellow-500" : "text-blue-500"} /> Multi-devises
                        </li>
                    </ul>

                    <div className="bg-black/60 backdrop-blur-xl rounded-2xl p-4 border border-white/10 mb-6">
                        <p className="text-[10px] uppercase text-slate-400 font-bold mb-1">Coût d'activation</p>
                        <div className="flex justify-center items-baseline gap-2">
                            <span className="text-2xl font-black">${currentTierInfo.usd}</span>
                            <span className="text-xs text-slate-500">≈</span>
                            <span className="text-sm font-bold text-blue-500">{priceInPi} PI</span>
                        </div>
                    </div>

                    <div className="flex gap-2 mb-6">
                        <button onClick={() => setPaymentCurrency("PI")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentCurrency === "PI" ? "bg-white text-black" : "bg-white/5 text-white"}`}>Payer en PI</button>
                        <button onClick={() => setPaymentCurrency("USD")} className={`flex-1 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${paymentCurrency === "USD" ? "bg-white text-black" : "bg-white/5 text-white"}`}>Payer en USD</button>
                    </div>

                    <button
                        onClick={handleCreateCard}
                        disabled={isGenerating}
                        className={`w-full h-14 font-black uppercase tracking-[0.2em] rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-xl ${selectedTier === "GOLD" ? "bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20" : "bg-blue-600 text-white hover:bg-blue-500 shadow-blue-600/20"}`}
                    >
                        {isGenerating ? <Loader2 className="animate-spin" /> : <ArrowRight size={20} />}
                        {isGenerating ? "Traitement..." : "Activer maintenant"}
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-200%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
      `}</style>
    </main>
  );
}
