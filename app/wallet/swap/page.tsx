"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowDown, ArrowLeft, RefreshCw, ChevronDown, X, Zap, AlertCircle, ArrowRight, Search, Check, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Asset { id: string; name: string; symbol: string; color: string; category: "native" | "major" | "stablecoin"; }
const CRYPTO_ASSETS: Asset[] = [
  { id: "PI", name: "Pi Network", symbol: "PI", color: "#7c3aed", category: "native" },
  { id: "SDA", name: "Sidra Assets", symbol: "SDA", color: "#d97706", category: "native" },
  { id: "BTC", name: "Bitcoin", symbol: "BTC", color: "#f7931a", category: "major" },
  { id: "ETH", name: "Ethereum", symbol: "ETH", color: "#627eea", category: "major" },
  { id: "BNB", name: "BNB", symbol: "BNB", color: "#f3ba2f", category: "major" },
  { id: "SOL", name: "Solana", symbol: "SOL", color: "#9945ff", category: "major" },
  { id: "XRP", name: "Ripple", symbol: "XRP", color: "#23292f", category: "major" },
  { id: "XLM", name: "Stellar", symbol: "XLM", color: "#14b8a6", category: "major" },
  { id: "TRX", name: "Tron", symbol: "TRX", color: "#eb0029", category: "major" },
  { id: "ADA", name: "Cardano", symbol: "ADA", color: "#0033ad", category: "major" },
  { id: "DOGE", name: "Dogecoin", symbol: "DOGE", color: "#c2a633", category: "major" },
  { id: "TON", name: "Toncoin", symbol: "TON", color: "#0098ea", category: "major" },
  { id: "USDT", name: "Tether", symbol: "USDT", color: "#26a17b", category: "stablecoin" },
  { id: "USDC", name: "USD Coin", symbol: "USDC", color: "#2775ca", category: "stablecoin" },
  { id: "DAI", name: "Dai", symbol: "DAI", color: "#f5ac37", category: "stablecoin" },
  { id: "BUSD", name: "Binance USD", symbol: "BUSD", color: "#f0b90b", category: "stablecoin" },
];

const CATEGORY_LABELS: Record<string, string> = { native: "Ecosysteme", major: "Principales", stablecoin: "Stablecoins" };
function CryptoIcon({ asset, size = 40 }: { asset: Asset; size?: number }) { return <div className="rounded-2xl flex items-center justify-center shrink-0 font-black text-white" style={{ width: size, height: size, background: `linear-gradient(135deg, ${asset.color}, ${asset.color}cc)`, fontSize: size * 0.35 }}>{asset.symbol.slice(0, 2)}</div>; }

export default function CryptoSwapPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState<"from" | "to" | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({ PI: 314159, BTC: 95000, SDA: 1.2, USDT: 1, USDC: 1, DAI: 1, BUSD: 1, ETH: 3200, BNB: 600, SOL: 180, XRP: 2.5, XLM: 0.4, TRX: 0.12, ADA: 0.65, DOGE: 0.15, TON: 5.5 });
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [fromAsset, setFromAsset] = useState<Asset>(CRYPTO_ASSETS[12]); // USDT par défaut
  const [toAsset, setToAsset] = useState<Asset>(CRYPTO_ASSETS[0]); // PI par défaut
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState(0);

  const fetchMarketData = useCallback(async () => {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,stellar,tron,cardano,dogecoin,the-open-network,tether,usd-coin,dai&vs_currencies=usd");
      const data = await res.json();
      setMarketPrices(prev => ({ ...prev, BTC: data.bitcoin?.usd || prev.BTC, ETH: data.ethereum?.usd || prev.ETH, BNB: data.binancecoin?.usd || prev.BNB, SOL: data.solana?.usd || prev.SOL, XRP: data.ripple?.usd || prev.XRP, XLM: data.stellar?.usd || prev.XLM, TRX: data.tron?.usd || prev.TRX, ADA: data.cardano?.usd || prev.ADA, DOGE: data.dogecoin?.usd || prev.DOGE, TON: data["the-open-network"]?.usd || prev.TON, USDT: data.tether?.usd || 1, USDC: data["usd-coin"]?.usd || 1, DAI: data.dai?.usd || 1 }));
    } catch { }
  }, []);

  const loadUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile"); // On utilise profile pour avoir tous les wallets
      if (res.ok) {
        const result = await res.json();
        const b: Record<string, string> = {};
        result.user.wallets.forEach((w: any) => { b[w.currency] = w.balance.toString(); });
        setBalances(b);
      }
    } catch { }
  }, []);

  useEffect(() => { setIsMounted(true); fetchMarketData(); loadUserData(); }, [fetchMarketData, loadUserData]);
  useEffect(() => { const amount = parseFloat(fromAmount); if (!isNaN(amount) && amount > 0 && marketPrices[fromAsset.id] && marketPrices[toAsset.id]) { setToAmount((amount * marketPrices[fromAsset.id]) / marketPrices[toAsset.id]); } else { setToAmount(0); } }, [fromAmount, fromAsset, toAsset, marketPrices]);

  const toggleAssets = () => { const prevFrom = fromAsset; setFromAsset(toAsset); setToAsset(prevFrom); setFromAmount(""); };
  const handleRequestConfirm = () => { if (!fromAmount || parseFloat(fromAmount) <= 0) return toast.error("Entrez un montant"); const currentBalance = parseFloat(balances[fromAsset.id] || "0"); if (parseFloat(fromAmount) > currentBalance) return toast.error(`Solde ${fromAsset.symbol} insuffisant`); setShowConfirm(true); };

  const handleSwapExecute = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/wallet/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: parseFloat(fromAmount), fromCurrency: fromAsset.symbol, toCurrency: toAsset.symbol, rate: marketPrices[fromAsset.id] / marketPrices[toAsset.id] }),
      });
      if (response.ok) { toast.success("Swap réussi !"); setFromAmount(""); setShowConfirm(false); loadUserData(); } 
      else { const d = await response.json(); toast.error(d.error || "Erreur"); }
    } catch { toast.error("Erreur réseau"); } finally { setLoading(false); }
  };

  const handleSelectAsset = (asset: Asset) => { if (isSelecting === "from") { if (asset.id === toAsset.id) setToAsset(fromAsset); setFromAsset(asset); } else { if (asset.id === fromAsset.id) setFromAsset(toAsset); setToAsset(asset); } setIsSelecting(null); setFromAmount(""); };
  const filteredAssets = useMemo(() => searchQuery ? CRYPTO_ASSETS.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.symbol.toLowerCase().includes(searchQuery.toLowerCase())) : CRYPTO_ASSETS, [searchQuery]);
  const groupedAssets = useMemo(() => { const groups: Record<string, Asset[]> = {}; filteredAssets.forEach(a => { if (!groups[a.category]) groups[a.category] = []; groups[a.category].push(a); }); return groups; }, [filteredAssets]);

  if (!isMounted) return null;
  return (
    <div className="min-h-screen bg-[#020617] text-white pb-24 font-sans">
      <div className="flex items-center justify-between px-6 pt-10 pb-6 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-4"><button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"><ArrowLeft size={20} /></button><div><h1 className="text-base font-black uppercase tracking-tight">M<span className="text-blue-500">SWAP</span></h1><div className="flex items-center gap-2 mt-1"><TrendingUp size={8} className="text-blue-500" /><span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Exchange</span></div></div></div>
        <button onClick={() => { fetchMarketData(); loadUserData(); }} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
      </div>
      <div className="px-6">
        <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 space-y-4 shadow-2xl relative">
          <div className="space-y-2"><div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2"><span>Depuis</span><span className="text-blue-400">Solde: {parseFloat(balances[fromAsset.id] || "0").toFixed(4)}</span></div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between focus-within:border-blue-500/50"><input type="number" placeholder="0.0" value={fromAmount} onChange={(e) => setFromAmount(e.target.value)} className="bg-transparent text-2xl font-black outline-none w-1/2 placeholder:text-slate-700" /><button onClick={() => setIsSelecting("from")} className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10"><CryptoIcon asset={fromAsset} size={32} /><span className="font-black text-sm">{fromAsset.symbol}</span><ChevronDown size={16} /></button></div>
          </div>
          <div className="flex justify-center -my-7 relative z-10"><button onClick={toggleAssets} className="bg-blue-600 p-3 rounded-full border-8 border-[#020617] shadow-xl active:rotate-180 transition-all duration-500"><ArrowDown size={20} /></button></div>
          <div className="space-y-2 pt-2"><div className="flex justify-between text-[10px] font-black uppercase text-slate-500 px-2"><span>Vers <span className="text-slate-600">(${(marketPrices[toAsset.id] || 0).toLocaleString()})</span></span><span>Solde: {parseFloat(balances[toAsset.id] || "0").toFixed(4)}</span></div>
            <div className="bg-white/5 border border-white/5 rounded-3xl p-4 flex items-center justify-between"><div className="text-2xl font-black truncate w-1/2 text-slate-300">{toAmount.toFixed(toAsset.id === "PI" ? 6 : 4)}</div><button onClick={() => setIsSelecting("to")} className="flex items-center gap-2 bg-white/5 p-2 pr-4 rounded-2xl border border-white/10"><CryptoIcon asset={toAsset} size={32} /><span className="font-black text-sm">{toAsset.symbol}</span><ChevronDown size={16} /></button></div>
          </div>
          <button onClick={handleRequestConfirm} className="w-full bg-blue-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 disabled:opacity-30"><Zap size={18} fill="currentColor" className="text-yellow-400" />Echanger maintenant</button>
        </div>
      </div>
      {isSelecting && (
        <div className="fixed inset-0 z-[100] bg-[#020617] flex flex-col animate-in slide-in-from-bottom"><div className="px-6 pt-10 pb-4"><div className="flex items-center justify-between mb-6"><div><h2 className="text-lg font-black uppercase tracking-tighter">Selectionner</h2></div><button onClick={() => setIsSelecting(null)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"><X size={20} /></button></div><div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" /><input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-11 pr-4 text-sm outline-none" autoFocus /></div></div>
          <div className="flex-1 overflow-y-auto px-6 pb-10">
            {Object.entries(groupedAssets).map(([cat, assets]) => (
              <div key={cat} className="mb-6"><div className="text-[9px] font-black uppercase text-slate-500 mb-3">{CATEGORY_LABELS[cat] || cat}</div>
                <div className="space-y-2">{assets.map(a => (<button key={a.id} onClick={() => handleSelectAsset(a)} className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5"><div className="flex items-center gap-3"><CryptoIcon asset={a} size={44} /><div className="text-left"><p className="font-black text-sm">{a.name}</p><p className="text-[10px] text-slate-500 font-bold">{a.symbol}</p></div></div><div className="text-right"><p className="text-xs font-black">{parseFloat(balances[a.id] || "0").toFixed(4)}</p></div></button>))}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showConfirm && (
        <div className="fixed inset-0 z-[110] bg-[#020617] p-6 flex flex-col animate-in slide-in-from-bottom">
          <div className="flex items-center gap-4 mb-8 pt-4"><button onClick={() => setShowConfirm(false)} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"><ArrowLeft size={20} /></button><h2 className="text-lg font-black uppercase tracking-tighter text-blue-500">Verification PimPay</h2></div>
          <div className="flex-1 flex flex-col justify-center items-center space-y-8">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/20"><RefreshCw size={32} className={`text-blue-500 ${loading ? "animate-spin" : ""}`} /></div>
            <div className="w-full bg-slate-900 border border-white/5 rounded-[2.5rem] p-6 space-y-6">
              <div className="flex justify-between items-center px-4"><div className="text-center"><p className="text-2xl font-black">{fromAmount}</p><p className="text-[10px] text-slate-500 font-bold">{fromAsset.symbol}</p></div><ArrowRight className="text-blue-500" size={24} /><div className="text-center"><p className="text-2xl font-black text-blue-400">{toAmount.toFixed(6)}</p><p className="text-[10px] text-slate-500 font-bold">{toAsset.symbol}</p></div></div>
            </div>
          </div>
          <button onClick={handleSwapExecute} disabled={loading} className="w-full bg-blue-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3">{loading ? <RefreshCw className="animate-spin" /> : "Confirmer le Swap"}</button>
        </div>
      )}
    </div>
  );
}
