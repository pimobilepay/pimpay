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
      // CORRECTION : Appel à l'API correcte /api/user/card/details
      const [cardRes, transRes] = await Promise.all([
        fetch("/api/user/card/details"),
        fetch("/api/user/transactions")
      ]);
      
      const cData = await cardRes.json();
      setCardData(!cData.error ? cData : null);
      
      const tData = await transRes.json();
      setTransactions(tData.history || []);
    } catch (err) {
      console.error("Erreur chargement CardPage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAction = (type: string) => {
    toast.success(`${type} en cours de préparation...`, {
      style: { background: '#0f172a', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500 animate-pulse">Syncing Network</p>
      </div>
    </div>
  );

  // Déterminer le design selon le type de carte stocké en DB
  const currentTier = (cardData?.type as keyof typeof CARD_TIERS) || selectedTier;
  const design = CARD_TIERS[currentTier] || CARD_TIERS.PLATINIUM;

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 pb-32 font-sans">
      <header className="max-w-md mx-auto pt-8 mb-10 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase italic">
            PimPay<span className="text-blue-600">Card</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Web3 Terminal</p>
        </div>
        <button 
          onClick={() => { setLoading(true); fetchData(); }} 
          className="p-3 bg-white/5 rounded-2xl border border-white/5 active:rotate-180 transition-all duration-500"
        >
          <RefreshCcw size={18} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-8">
        {cardData ? (
          <>
            {/* CARTE VIRTUELLE DYNAMIQUE */}
            <div className={`w-full aspect-[1.58/1] rounded-[2.5rem] p-8 border ${design.border} bg-gradient-to-br ${design.color} to-black relative overflow-hidden shadow-2xl flex flex-col justify-between transition-all duration-500`}>

              {/* Background Layer */}
              <div className="absolute inset-0 z-0 opacity-40">
                <img src={design.img} className="w-full h-full object-cover" alt="card-bg" />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              </div>

              <div className="flex justify-between items-start relative z-10">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-6 bg-yellow-500/20 rounded-md border border-yellow-500/30 flex items-center justify-center">
                       <div className="w-4 h-3 border border-yellow-500/40 rounded-sm"></div>
                    </div>
                    <CreditCard className="text-white/80" size={24} />
                  </div>
                  {/* Utilisation de la balance réelle */}
                  <span className="text-2xl font-black tracking-tight">
                    {parseFloat(cardData.balance || 0).toFixed(2)} <span className="text-blue-500 italic">π</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest bg-blue-600/20 px-3 py-1 rounded-full border border-blue-500/20 backdrop-blur-md text-blue-400">
                    Visa {cardData.type || "Virtual"}
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
                  <p className="text-[13px] font-black uppercase tracking-widest text-white truncate max-w-[150px]">
                    {cardData.holder || "Pi Pioneer"}
                  </p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <p className="text-[7px] uppercase text-blue-400 font-black tracking-[0.2em] mb-1">EXPIRES</p>
                    <p className="text-[13px] font-mono font-bold text-white">{cardData.exp || "12/28"}</p>
                  </div>
                  <button 
                    onClick={() => setShowCardNumber(!showCardNumber)} 
                    className="p-2 bg-white/5 rounded-lg text-white/50 hover:text-white transition-colors"
                  >
                    {showCardNumber ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* ACTIONS RAPIDES */}
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

            {/* STATUS CARTE */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[22px] flex items-center gap-4">
                <div className={`p-2 rounded-lg ${cardData.locked ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  <ShieldCheck size={20}/>
                </div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase font-black">Sécurité</p>
                  <p className="text-[11px] font-bold">{cardData.locked ? "Gelée" : "Active"}</p>
                </div>
              </div>
              <div className="p-5 bg-white/[0.03] border border-white/5 rounded-[22px] flex items-center gap-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><Zap size={20}/></div>
                <div>
                  <p className="text-[8px] text-slate-500 uppercase font-black">Limite /j</p>
                  <p className="text-[11px] font-bold">{cardData.dailyLimit || "1,000"} π</p>
                </div>
              </div>
            </div>

            {/* TRANSACTIONS SPÉCIFIQUES CARTE */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Flux de la carte</h3>
                <span className="text-[8px] font-bold text-blue-500 uppercase bg-blue-500/10 px-2 py-0.5 rounded">Live</span>
              </div>
              <div className="space-y-3">
                {transactions.length > 0 ? transactions.slice(0, 4).map((tx) => (
                  <div key={tx.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-[22px] flex items-center justify-between hover:bg-white/[0.04] transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "DEPOSIT" || tx.type === "receive" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-400"}`}>
                        {tx.type === "DEPOSIT" || tx.type === "receive" ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight">{tx.type}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{new Date(tx.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-black ${tx.type === "receive" ? "text-emerald-400" : "text-white"}`}>
                      {tx.type === "receive" ? "+" : "-"} {tx.amount.toFixed(2)} π
                    </p>
                  </div>
                )) : (
                  <div className="text-center py-12 bg-white/5 rounded-[30px] border border-dashed border-white/10">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Aucune activité carte</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* SECTION COMMANDE DE CARTE */
          <div className="py-20 px-10 text-center bg-gradient-to-b from-white/5 to-transparent rounded-[3rem] border border-dashed border-white/10">
             <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sparkles className="text-blue-500" size={32} />
             </div>
             <h2 className="text-xl font-black uppercase mb-2 italic">Visa Terminal Inactif</h2>
             <p className="text-slate-500 text-[10px] mb-8 uppercase tracking-widest font-bold leading-relaxed">
               Initialisez votre carte virtuelle pour dépenser vos Pi dans le monde entier.
             </p>
             <button 
               onClick={() => handleAction("Commande")} 
               className="w-full bg-blue-600 py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-blue-600/20 active:scale-95 transition-all"
             >
               Commander ma carte
             </button>
          </div>
        )}
      </div>
    </main>
  );
}
