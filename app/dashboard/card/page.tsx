"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCcw,
  CreditCard,
  Eye,
  EyeOff,
  ArrowDownToLine,
  PlusCircle,
  MinusCircle,
  Zap,
} from "lucide-react";
import { toast } from "react-hot-toast";
// CHANGEMENT ICI : Utilisation d'un chemin relatif pour forcer la détection par le compilateur
import { purchaseVirtualCard } from "../../actions/card-purchase";
import { useRouter } from "next/navigation";

// CONFIGURATION
const CARD_TIERS = {
  CLASSIC: {
    label: "Visa Classic",
    price: 10,
    daily: 1000,
    recharge: 10000,
    years: 3,
    color: "from-slate-600/20 to-slate-900/40",
    border: "border-slate-400/30",
    img: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
  },
  BUSINESS: {
    label: "Master Business",
    price: 25,
    daily: 2500,
    recharge: 25000,
    years: 5,
    color: "from-blue-600/20 to-blue-900/40",
    border: "border-blue-500/30",
    img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2940&auto=format&fit=crop"
  },
  GOLD: {
    label: "Visa Gold",
    price: 50,
    daily: 5000,
    recharge: 50000,
    years: 10,
    color: "from-yellow-600/30 to-orange-900/40",
    border: "border-yellow-500/50",
    img: "https://images.unsplash.com/photo-1640341719941-47398e27356a?q=80&w=2940&auto=format&fit=crop"
  },
  ULTRA: {
    label: "MCard Ultra",
    price: 100,
    daily: 999999,
    recharge: 999999,
    years: 15,
    color: "from-purple-600/30 to-black",
    border: "border-purple-500/50",
    img: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
  },
};

const PI_RATE_GCV = 314159;

export default function CardPage() {
  const [cardData, setCardData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [selectedTier, setSelectedTier] = useState<keyof typeof CARD_TIERS>("CLASSIC");

  const router = useRouter();

  const fetchData = async () => {
    try {
      const [cardRes, transRes] = await Promise.all([
        fetch("/api/user/card/details"),
        fetch("/api/user/transactions")
      ]);

      const cData = await cardRes.json();
      if (cData && !cData.error && cData.id) {
        setCardData(cData);
      } else {
        setCardData(null);
      }

      const tData = await transRes.json();
      setTransactions(tData.history || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOrderCard = async () => {
    setActionLoading(true);
    const priceInPi = parseFloat((CARD_TIERS[selectedTier].price / PI_RATE_GCV).toFixed(8));
    const toastId = toast.loading(`Initialisation du paiement GCV...`);

    try {
      const res = await purchaseVirtualCard(selectedTier, priceInPi);

      if (res.success) {
        toast.success("Carte minée avec succès !", { id: toastId });
        await fetchData();
        router.refresh();
      } else {
        toast.error(res.error || "Échec de l'achat", { id: toastId });
      }
    } catch (err) {
      toast.error("Erreur de connexion au réseau", { id: toastId });
    } finally {
      setActionLoading(false);
    }
  };

  const calculatedPiPrice = (CARD_TIERS[selectedTier].price / PI_RATE_GCV).toFixed(8);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 pb-32 font-sans">
      <header className="max-w-md mx-auto pt-8 mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            PimPay<span className="text-blue-600">Card</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Hardware Virtual Terminal</p>
        </div>
        <button onClick={() => { setLoading(true); fetchData(); }} className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <RefreshCcw size={18} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-8">
        {cardData ? (
          <>
            <div className={`w-full aspect-[1.58/1] rounded-[2.5rem] p-8 border ${CARD_TIERS[cardData.type as keyof typeof CARD_TIERS]?.border || 'border-white/10'} bg-gradient-to-br ${CARD_TIERS[cardData.type as keyof typeof CARD_TIERS]?.color || 'from-zinc-800 to-black'} relative overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-500`}>
              <div className="absolute inset-0 z-0 opacity-40">
                <img src={CARD_TIERS[cardData.type as keyof typeof CARD_TIERS]?.img || ""} className="w-full h-full object-cover" alt="bg" />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                  <Zap className="text-blue-500 mb-2" size={24} fill="currentColor" />
                  <span className="text-2xl font-black">Virtual Card</span>
                </div>
                <span className="text-[9px] font-black uppercase bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                  {cardData.brand} {cardData.type}
                </span>
              </div>

              <p className="relative z-10 text-xl md:text-2xl font-mono tracking-[0.25em] text-center">
                {showCardNumber ? cardData.number : `•••• •••• •••• ${cardData.number?.slice(-4)}`}
              </p>

              <div className="flex justify-between items-end relative z-10 border-t border-white/10 pt-4">
                <div className="flex-1">
                  <p className="text-[7px] text-blue-400 font-black tracking-widest uppercase">Card Holder</p>
                  <p className="text-[13px] font-black uppercase truncate">{cardData.holder}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[7px] text-blue-400 font-black">EXPIRES</p>
                    <p className="text-xs font-mono font-bold">{cardData.exp}</p>
                  </div>
                  <button onClick={() => setShowCardNumber(!showCardNumber)} className="p-2 bg-white/5 rounded-lg">
                    {showCardNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button className="flex items-center justify-center gap-3 p-5 bg-blue-600 rounded-[22px] font-black uppercase text-[10px] tracking-widest active:scale-95 shadow-lg shadow-blue-600/20">
                <PlusCircle size={20} /> Recharger
              </button>
              <button className="flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/10 rounded-[22px] font-black uppercase text-[10px] tracking-widest active:scale-95">
                <MinusCircle size={20} className="text-slate-500" /> Retrait
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x px-2">
              {Object.entries(CARD_TIERS).map(([key, tier]) => (
                <button
                  key={key}
                  onClick={() => setSelectedTier(key as any)}
                  className={`snap-center min-w-[280px] p-6 rounded-[2.5rem] border transition-all duration-500 ${
                    selectedTier === key
                      ? `${tier.border} bg-white/10 scale-100 shadow-xl`
                      : "border-white/5 bg-white/[0.02] opacity-40 scale-90"
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${tier.color}`}>
                      <CreditCard size={24} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-blue-500">{tier.label}</span>
                  </div>
                  <div className="text-left mb-6">
                    <p className="text-4xl font-black">${tier.price}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[0.2em] italic">Prix Fixe USD</p>
                  </div>
                  <div className="space-y-2 border-t border-white/5 pt-4 text-left">
                    <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span className="text-slate-500">Limite /j</span>
                      <span>{tier.daily === 999999 ? "Illimité" : `$${tier.daily}`}</span>
                    </div>
                    <div className="flex justify-between text-[10px] uppercase font-bold">
                      <span className="text-slate-500">Validité</span>
                      <span>{tier.years} Ans</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-blue-600/10 border border-blue-500/20 p-8 rounded-[3rem] text-center space-y-6">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Montant en Pi (GCV)</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-2xl font-black">{calculatedPiPrice}</span>
                  <span className="text-2xl font-black italic text-blue-500">π</span>
                </div>
              </div>

              <button
                onClick={handleOrderCard}
                disabled={actionLoading}
                className="w-full bg-blue-600 py-5 rounded-[20px] font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/30 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-3"
              >
                {actionLoading ? <Loader2 className="animate-spin" size={18} /> : `Confirmer le Minage`}
              </button>
              <div className="px-4 py-2 bg-black/40 rounded-full inline-block">
                <p className="text-[8px] text-blue-400 font-bold uppercase tracking-widest">1 π = $314,159 (Consensus)</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Flux du Terminal</h3>
          <div className="space-y-3">
            {transactions && transactions.length > 0 ? transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-[22px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    {tx.type === "IN" ? <ArrowDownToLine size={16} className="text-emerald-400" /> : <Zap size={16} className="text-yellow-400" />}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-tight">{tx.label || tx.type}</p>
                    <p className="text-[9px] text-slate-500 font-bold">{tx.date}</p>
                  </div>
                </div>
                <p className={`text-xs font-black ${tx.type === "IN" ? "text-emerald-400" : "text-white"}`}>
                  {tx.type === "IN" ? "+" : "-"} {typeof tx.amount === 'number' ? tx.amount.toFixed(4) : tx.amount} π
                </p>
              </div>
            )) : (
              <div className="text-center py-10 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5 text-[9px] font-black uppercase text-slate-700 tracking-widest italic">Aucun flux détecté</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
