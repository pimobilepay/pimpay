"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  ShieldCheck,
  RefreshCcw,
  CheckCircle,
  ArrowRight,
  Sparkles,
  Zap,
  CreditCard,
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
  PlusCircle,
  MinusCircle
} from "lucide-react";
import { toast } from "react-hot-toast";

const CARD_TIERS = {
  PLATINIUM: {
    label: "Platinium",
    usd: 10,
    limit: "50,000",
    color: "from-slate-600/20",
    border: "border-slate-400/30",
    img: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?q=80&w=2832&auto=format&fit=crop"
  },
  PREMIUM: {
    label: "Premium",
    usd: 25,
    limit: "1,000",
    color: "from-blue-600/20",
    border: "border-blue-500/30",
    img: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?q=80&w=2940&auto=format&fit=crop"
  },
  GOLD: {
    label: "Gold",
    usd: 50,
    limit: "10,000",
    color: "from-yellow-600/30",
    border: "border-yellow-500/50",
    img: "https://images.unsplash.com/photo-1640341719941-47398e27356a?q=80&w=2940&auto=format&fit=crop"
  },
};

export default function CardPage() {
  const [cardData, setCardData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [selectedTier, setSelectedTier] = useState<keyof typeof CARD_TIERS>("PLATINIUM");

  const fetchData = async () => {
    try {
      const [cardRes, transRes] = await Promise.all([
        fetch("/api/user/card"),
        fetch("/api/user/transactions")
      ]);
      const cData = await cardRes.json();
      setCardData(!cData.error ? cData : null);
      const tData = await transRes.json();
      setTransactions(tData.history || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Actions rapides
  const handleAction = (type: string) => {
    toast.success(`${type} en cours de préparation...`);
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  const currentTier = (cardData?.type as keyof typeof CARD_TIERS) || selectedTier;
  const design = CARD_TIERS[currentTier];

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 pb-32 font-sans">
      <header className="max-w-md mx-auto pt-8 mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            PimPay<span className="text-blue-600">Card</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Web3 Terminal</p>
        </div>
        <button onClick={fetchData} className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <RefreshCcw size={18} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-8">
        {cardData ? (
          <>
            {/* CARTE : COULEUR ET FOND ANCIENNE VERSION + DESIGN WALLET */}
            <div className={`w-full aspect-[1.58/1] rounded-[2.5rem] p-8 border ${design.border} bg-gradient-to-br ${design.color} to-black relative overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-500`}>
              
              {/* Image d'arrière-plan récupérée */}
              <div className="absolute inset-0 z-0 opacity-40">
                <img src={design.img} className="w-full h-full object-cover" alt="bg" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                  <CreditCard className="text-white mb-2" size={32} />
                  <span className="text-2xl font-black tracking-tight">{cardData.balance || 0} π</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                    Visa {cardData.type}
                  </span>
                </div>
              </div>

              <div className="relative z-10 py-4">
                <p className="text-xl md:text-2xl font-mono tracking-[0.25em] text-white drop-shadow-2xl">
                  {showCardNumber ? cardData.number : `•••• •••• •••• ${cardData.number?.slice(-4)}`}
                </p>
              </div>

              <div className="flex justify-between items-end relative z-10 border-t border-white/10 pt-4">
                <div>
                  <p className="text-[7px] uppercase text-blue-400 font-black tracking-[0.2em] mb-1">CARD HOLDER</p>
                  <p className="text-[13px] font-black uppercase tracking-widest text-white">{cardData.holder}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-[7px] uppercase text-blue-400 font-black tracking-[0.2em] mb-1">EXPIRES</p>
                    <p className="text-[13px] font-mono font-bold text-white">{cardData.exp || "12/28"}</p>
                  </div>
                  <button onClick={() => setShowCardNumber(!showCardNumber)} className="text-white/50 hover:text-white transition-colors">
                    {showCardNumber ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>

            {/* ACTIONS RAPIDES : RECHARGE ET RETRAIT */}
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleAction("Recharge")}
                className="flex items-center justify-center gap-3 p-5 bg-blue-600 rounded-[22px] hover:bg-blue-500 transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                <PlusCircle size={20} />
                <span className="text-xs font-black uppercase tracking-widest">Recharger</span>
              </button>
              <button 
                onClick={() => handleAction("Retrait")}
                className="flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/10 rounded-[22px] hover:bg-white/10 transition-all active:scale-95"
              >
                <MinusCircle size={20} className="text-slate-400" />
                <span className="text-xs font-black uppercase tracking-widest">Retrait</span>
              </button>
            </div>

            {/* STATUS RÉCUPÉRÉ DU WALLET */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[22px] flex items-center gap-4">
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><ShieldCheck size={20}/></div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase font-black">Sécurité</p>
                  <p className="text-[11px] font-bold">Active</p>
                </div>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[22px] flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Zap size={20}/></div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase font-black">Limite /j</p>
                  <p className="text-[11px] font-bold">${cardData.dailyLimit || "1,000"}</p>
                </div>
              </div>
            </div>

            {/* OPÉRATIONS RÉCENTES */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Transactions Carte</h3>
              <div className="space-y-3">
                {transactions.length > 0 ? transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-[22px] flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "DEPOSIT" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-400"}`}>
                        {tx.type === "DEPOSIT" ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{tx.type}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-white">{tx.amount.toFixed(2)} π</p>
                  </div>
                )) : (
                  <div className="text-center py-8 opacity-20 text-[10px] uppercase font-bold tracking-widest">Aucune donnée</div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* SECTION ACHAT SI PAS DE CARTE (CONSERVÉE) */
          <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
             <p className="text-slate-500 text-xs mb-4 uppercase tracking-widest font-bold">Initialiser votre Visa Terminal</p>
             <button onClick={() => fetchData()} className="bg-blue-600 px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest">Commander</button>
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
