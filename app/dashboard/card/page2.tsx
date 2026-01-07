"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  RefreshCcw,
  CreditCard,
  ArrowDownToLine,
  PlusCircle,
  MinusCircle,
  Zap,
  ChevronDown,
  History
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";

const CURRENCY_RATES = {
  USD: 1,
  XAF: 600,
  XOF: 600,
  EUR: 0.92,
  CDF: 2800
};

type CurrencyKey = keyof typeof CURRENCY_RATES;

export default function CardPage() {
  const [data, setData] = useState<any>(null);
  const [cardData, setCardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [showPicker, setShowPicker] = useState(false);

  const router = useRouter();

  const fetchData = async () => {
    try {
      const profileRes = await fetch("/api/user/profile");
      const profileData = await profileRes.json();

      if (profileData.success) {
        setData(profileData);
        
        // CORRECTION ICI : On vérifie si virtualCards existe et n'est pas vide
        if (profileData.virtualCards && profileData.virtualCards.length > 0) {
          // On s'assure de prendre le premier objet du tableau
          setCardData(profileData.virtualCards[0]);
        } else {
          setCardData(null);
        }
      }
    } catch (err) {
      console.error("Fetch error:", err);
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGoToOrder = () => {
    router.push("/dashboard/card/order");
  };

  const getFiatBalance = (curr: string) => {
    const wallet = data?.wallets?.find((w: any) => w.currency === curr);
    return wallet ? wallet.balance : 0;
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
    </div>
  );

  return (
    <main className="min-h-screen bg-[#050505] text-white p-6 pb-32 font-sans">
      <header className="max-w-md mx-auto pt-8 mb-8 flex justify-between items-center">
        <h1 className="text-2xl font-black tracking-tighter uppercase italic">
          PIMPAY<span className="text-blue-600">CARD</span>
        </h1>
        <button onClick={() => fetchData()} className="p-3 bg-white/5 rounded-2xl border border-white/5">
          <RefreshCcw size={18} />
        </button>
      </header>

      <div className="max-w-md mx-auto space-y-6">

        {/* CARTE VIRTUELLE - AFFICHAGE DES CHAMPS PRISMA */}
        <div
          onClick={() => cardData && setShowCardNumber(!showCardNumber)}
          className={`relative w-full aspect-[1.58/1] rounded-[24px] overflow-hidden shadow-2xl transition-all duration-700 cursor-pointer ${!cardData ? 'grayscale opacity-50' : ''}`}
        >
          <div className="absolute inset-0 bg-[#1a2b3c] bg-gradient-to-br from-[#1a2b3c] to-[#0f172a]">
             <svg className="absolute inset-0 opacity-20" viewBox="0 0 400 250">
                <path d="M0 100 Q 200 50 400 150" stroke="white" fill="transparent" strokeWidth="1" />
                <path d="M0 150 Q 200 250 400 100" stroke="white" fill="transparent" strokeWidth="1" />
             </svg>
          </div>

          <div className="relative z-10 h-full p-8 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Balance Disponible</span>
                <span className="text-sm font-bold tracking-tight text-white/90">
                    {getFiatBalance(currency).toLocaleString(undefined, { minimumFractionDigits: 2 })} {currency}
                </span>
              </div>

              <div className="flex flex-col items-end">
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                    className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-bold border border-white/20"
                  >
                    {currency} <ChevronDown size={10} />
                  </button>
                  {showPicker && (
                    <div className="absolute top-full right-0 mt-1 bg-[#1a2b3c] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                      {Object.keys(CURRENCY_RATES).map((curr) => (
                        <button
                          key={curr}
                          className="block w-full px-4 py-2 text-[10px] hover:bg-blue-600 text-left"
                          onClick={(e) => { e.stopPropagation(); setCurrency(curr as CurrencyKey); setShowPicker(false); }}
                        >
                          {curr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex flex-col items-end">
                  <span className="text-[5px] uppercase text-white/50 font-bold">CVV</span>
                  <span className="text-[10px] font-mono font-bold">
                    {cardData?.cvv ? (showCardNumber ? cardData.cvv : "•••") : "•••"}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-11 h-8 bg-gradient-to-br from-slate-200 to-slate-400 rounded-md shadow-inner"></div>

            <div className="flex flex-col gap-1">
               {/* NUMÉRO DE CARTE RÉEL */}
               <p className="text-xl font-mono tracking-[0.2em] text-white">
                {cardData?.number 
                  ? (showCardNumber ? cardData.number : `•••• •••• •••• ${cardData.number.slice(-4)}`) 
                  : "•••• •••• •••• ••••"}
              </p>
              <div className="flex justify-between items-center">
                 {/* NOM DU TITULAIRE */}
                 <p className="text-[10px] font-medium tracking-wide uppercase">
                   {cardData?.holder || data?.name || data?.username || "AWAITING CARD"}
                 </p>
                 <div className="flex flex-col items-end">
                    <span className="text-[5px] uppercase text-white/50 font-bold">Expire fin</span>
                    {/* DATE D'EXPIRATION RÉELLE (champ exp dans ton prisma) */}
                    <span className="text-[9px] font-mono">{cardData?.exp || "--/--"}</span>
                 </div>
              </div>
            </div>

            <div className="absolute bottom-6 right-8 flex">
                <div className="w-8 h-8 bg-[#eb001b] rounded-full"></div>
                <div className="w-8 h-8 bg-[#ff5f00] rounded-full -ml-3 mix-blend-screen"></div>
            </div>
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-3 gap-3">
            <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-[24px] active:scale-95 transition-all">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <PlusCircle size={20} />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400">Recharger</span>
            </button>

            <button
              onClick={handleGoToOrder}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-[24px] active:scale-95 transition-all"
            >
                <div className={`w-10 h-10 ${!cardData ? 'bg-emerald-600' : 'bg-slate-700'} rounded-full flex items-center justify-center`}>
                    <CreditCard size={20} />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400">Commander</span>
            </button>

            <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-[24px] active:scale-95 transition-all">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                    <MinusCircle size={20} />
                </div>
                <span className="text-[8px] font-black uppercase text-slate-400">Retrait</span>
            </button>
        </div>

        {/* LISTE DES SOLDES PAR DEVISE */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-2">Comptes Fiat PimPay</h3>
          {data?.wallets?.filter((w: any) => w.currency !== 'PI').map((wallet: any) => (
            <div
              key={wallet.id}
              onClick={() => setCurrency(wallet.currency as CurrencyKey)}
              className={`p-4 rounded-[22px] border transition-all cursor-pointer flex items-center justify-between ${currency === wallet.currency ? 'bg-blue-600/10 border-blue-600/50' : 'bg-white/[0.02] border-white/5'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-[10px] ${currency === wallet.currency ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  {wallet.currency.slice(0, 2)}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase">{wallet.currency}</p>
                  <p className="text-[8px] text-slate-500 font-bold tracking-widest">DISPONIBLE</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black">{wallet.balance.toLocaleString()} {wallet.currency}</p>
                <p className="text-[8px] text-slate-600 italic">Compte vérifié</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
