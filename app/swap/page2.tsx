"use client";

import { useState, useEffect } from "react";
import {
  ArrowDown, Settings2, RefreshCw, Zap, AlertCircle, Loader2, ArrowLeft, Globe, Clock, Bitcoin, Coins
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PI_CONSENSUS_USD } from "@/lib/exchange";

const ASSETS = {
  CRYPTO: [
    { id: "PI", name: "Pi Network", symbol: "π", icon: "π", color: "bg-blue-600" },
    { id: "USDT", name: "Tether USD", symbol: "USDT", icon: <Coins size={16} />, color: "bg-emerald-600" },
    { id: "BTC", name: "Bitcoin", symbol: "BTC", icon: <Bitcoin size={16} />, color: "bg-orange-600" },
    { id: "SDA", name: "Sidra Chain", symbol: "SDA", icon: "S", color: "bg-indigo-600" },
  ],
  FIAT: [
    { id: "USD", name: "US Dollar", symbol: "$", icon: <Globe size={16} /> },
    { id: "XAF", name: "Franc CFA (BEAC)", symbol: "FCFA", icon: <Globe size={16} /> },
    { id: "XOF", name: "Franc CFA (BCEAO)", symbol: "FCFA", icon: <Globe size={16} /> },
    { id: "CDF", name: "Franc Congolais", symbol: "FCFA", icon: <Globe size={16} /> },
    { id: "EUR", name: "Euro", symbol: "€", icon: <Globe size={16} /> },
  ]
};

export default function SwapPage() {
  const router = useRouter();
  const [hasMounted, setHasMounted] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [marketRates, setMarketRates] = useState<Record<string, number>>({ USD: 1 });
  const [fromAsset, setFromAsset] = useState<any>(ASSETS.CRYPTO[1]); // USDT par défaut pour test
  const [toAsset, setToAsset] = useState<any>(ASSETS.FIAT[1]);     // XAF par défaut pour test
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);

  const [quote, setQuote] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    setHasMounted(true);
    fetchUserData();
    fetchMarketRates();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user/profile", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user);
      }
    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchMarketRates = async () => {
    try {
      const fiatRes = await fetch("https://open.er-api.com/v6/latest/USD");
      const fiatData = await fiatRes.json();
      
      const cryptoRes = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd");
      const cryptoData = await cryptoRes.json();

      setMarketRates({
        ...fiatData.rates,
        BTC: cryptoData.bitcoin.usd,
        USDT: cryptoData.tether.usd,
        PI: PI_CONSENSUS_USD, 
        SDA: 0.85, 
      });
    } catch (err) {
      setMarketRates(prev => ({ ...prev, XAF: 615, XOF: 615, EUR: 0.92, CDF: 2800, PI: 314159, BTC: 65000, USDT: 1 }));
    }
  };

  const getAssetBalance = (assetId: string) => {
    if (!userData || !userData.wallets) return 0;
    const wallet = userData.wallets.find((w: any) => w.currency === assetId);
    return wallet ? wallet.balance : 0;
  };

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (quote) {
      setQuote(null);
    }
  }, [timeLeft, quote]);

  // LOGIQUE DE CALCUL CORRIGÉE
  useEffect(() => {
    const amount = parseFloat(fromAmount);
    if (!isNaN(amount) && amount > 0 && marketRates[fromAsset.id] && marketRates[toAsset.id]) {
      let result = 0;
      const isFromCrypto = ["BTC", "USDT", "PI", "SDA"].includes(fromAsset.id);
      const isToCrypto = ["BTC", "USDT", "PI", "SDA"].includes(toAsset.id);

      // Étape 1 : Convertir le montant "FROM" en USD
      const valueInUSD = isFromCrypto 
        ? amount * marketRates[fromAsset.id]  // Crypto vers USD (Ex: 1 BTC * 65000)
        : amount / marketRates[fromAsset.id]; // Fiat vers USD (Ex: 615 XAF / 615)

      // Étape 2 : Convertir l'USD vers le montant "TO"
      result = isToCrypto
        ? valueInUSD / marketRates[toAsset.id] // USD vers Crypto (Ex: 1 / 65000)
        : valueInUSD * marketRates[toAsset.id]; // USD vers Fiat (Ex: 1 * 615)

      setToAmount(result);
    } else {
      setToAmount(0);
    }
  }, [fromAmount, fromAsset, toAsset, marketRates]);

  const toggleDirection = () => {
    const prevFrom = fromAsset;
    setFromAsset(toAsset);
    setToAsset(prevFrom);
    setFromAmount("");
    setQuote(null);
  };

  const getQuote = async () => {
    const amount = parseFloat(fromAmount);
    const balance = getAssetBalance(fromAsset.id);
    if (!amount || amount <= 0) return toast.error("Montant invalide");
    if (amount > balance) return toast.error("Solde insuffisant");

    setIsSwapping(true);
    try {
      const res = await fetch("/api/transaction/swap/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          sourceCurrency: fromAsset.id,
          targetCurrency: toAsset.id,
          estimatedOut: toAmount
        })
      });
      const data = await res.json();
      if (res.ok) {
        setQuote(data);
        setTimeLeft(30);
        toast.success("Taux GCV verrouillé");
      } else {
        toast.error(data.error || "Erreur calcul");
      }
    } catch (e) {
      toast.error("Erreur serveur");
    } finally {
      setIsSwapping(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!quote) return;
    setIsConfirming(true);
    try {
      const response = await fetch("/api/transaction/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.quoteId })
      });
      if (response.ok) {
        toast.success("Swap PimPay réussi !");
        router.push("/dashboard");
      } else {
        const err = await response.json();
        toast.error(err.error || "Échec");
        setIsConfirming(false);
      }
    } catch (error) {
      toast.error("Erreur réseau");
      setIsConfirming(false);
    }
  };

  if (!hasMounted || isLoadingData) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 p-6 font-sans">
      <div className="flex justify-between items-center mb-10 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter italic">PimPay <span className="text-blue-500">Swap</span></h1>
        <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-slate-500 border border-white/10">
          <Settings2 size={18} />
        </div>
      </div>

      <div className="mb-6 p-5 bg-gradient-to-br from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] flex justify-between items-center backdrop-blur-sm">
        <div>
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Disponible</p>
          <p className="text-xl font-black text-white">
            {getAssetBalance(fromAsset.id).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            <span className="text-blue-500 italic ml-1">{fromAsset.id === "PI" ? "π" : fromAsset.id}</span>
          </p>
        </div>
        <div className={`text-[8px] px-2 py-1 rounded-md font-black uppercase tracking-widest ${userData?.kycStatus === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
          KYC: {userData?.kycStatus || "PENDING"}
        </div>
      </div>

      <div className="space-y-2 relative">
        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6">
          <div className="flex justify-between mb-4">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Vendre</span>
            <div className="flex gap-2">
               {ASSETS.CRYPTO.map(crypto => (
                 <button key={crypto.id} onClick={() => setFromAsset(crypto)} className={`text-[8px] px-2 py-1 rounded-lg border ${fromAsset.id === crypto.id ? 'bg-blue-600 border-blue-600' : 'border-white/10 opacity-50'}`}>{crypto.id}</button>
               ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <input
              type="number"
              placeholder="0.00"
              className="bg-transparent text-4xl font-black outline-none w-2/3 placeholder:text-slate-800"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
            />
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs text-white ${fromAsset.color || 'bg-slate-700'}`}>{fromAsset.icon}</div>
              {fromAsset.id}
            </div>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <button onClick={toggleDirection} className="bg-[#020617] p-2 rounded-3xl border-8 border-[#020617] active:scale-90 transition-transform">
            <div className="bg-blue-600 p-3 rounded-2xl text-white">
              <RefreshCw size={20} />
            </div>
          </button>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-[2.5rem] p-6 pt-12">
          <div className="flex justify-between mb-4 flex-wrap gap-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recevoir</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {[...ASSETS.FIAT, ...ASSETS.CRYPTO].filter(a => a.id !== fromAsset.id).slice(0, 5).map((asset) => (
                <button
                  key={asset.id}
                  onClick={() => setToAsset(asset)}
                  className={`text-[8px] font-black px-3 py-1 rounded-full border transition-all ${toAsset.id === asset.id ? 'bg-white text-black border-white' : 'border-white/10 text-slate-500'}`}
                >
                  {asset.id}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className={`text-4xl font-black ${toAmount > 0 ? 'text-white' : 'text-slate-800'}`}>
              {toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: (["BTC", "PI"].includes(toAsset.id) ? 6 : 2) })}
            </div>
            <div className="flex items-center gap-2 bg-slate-800 p-2 pr-4 rounded-2xl font-bold">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs text-white ${toAsset.color || 'bg-slate-700'}`}>{toAsset.icon}</div>
              {toAsset.id}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-white/[0.02] rounded-[2.5rem] border border-white/5 space-y-4">
        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
          <span className="text-slate-500">Taux de change</span>
          <span className="text-slate-300">1 {fromAsset.id} ≈ {(toAmount / (parseFloat(fromAmount) || 1)).toLocaleString(undefined, {maximumFractionDigits: 4})} {toAsset.id}</span>
        </div>
        {quote && (
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <Clock size={12} className="animate-pulse" /> Expire dans
            </span>
            <span className="text-amber-500 font-mono font-bold text-sm">{timeLeft}s</span>
          </div>
        )}
      </div>

      <button
        onClick={quote ? handleConfirmSwap : getQuote}
        disabled={isSwapping || isConfirming || !fromAmount || parseFloat(fromAmount) <= 0}
        className={`w-full mt-8 p-6 rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center justify-center gap-3 ${
          quote ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-blue-600 shadow-blue-600/20'
        } disabled:opacity-50`}
      >
        {isSwapping || isConfirming ? <Loader2 className="animate-spin" /> : quote ? <>Confirmer le Swap <Zap size={18} fill="currentColor" /></> : "Obtenir un devis"}
      </button>

      <div className="mt-6 flex items-center justify-center gap-2 text-slate-600 text-center">
        <AlertCircle size={12} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em]">PimPay GCV Liquidity Protocol</span>
      </div>
    </div>
  );
}
