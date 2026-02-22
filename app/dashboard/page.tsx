"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, ArrowDownLeft, RefreshCcw, Bell, Loader2, ArrowUpCircle, ArrowDownCircle,
  Eye, EyeOff, Globe, Zap, CreditCard, ChevronDown, LogOut, Smartphone, History, User,
  Settings, LayoutGrid, Facebook, Twitter, Youtube, ExternalLink, Wallet as WalletIcon
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";

const RATES = { USD: 1, XFA: 615, CDF: 2800, EUR: 0.92 };
type CurrencyKey = keyof typeof RATES;
const PIE_COLORS = ["#3b82f6", "#10b981", "#6366f1", "#f59e0b"];

export default function UserDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);

  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    PI: PI_CONSENSUS_USD, SDA: 1.20, USDT: 1.00, BTC: 0, XRP: 0, XLM: 0,
    USDC: 1.00, DAI: 1.00, BUSD: 1.00, XAF: 1 / 615,
  });

  useEffect(() => {
    setHasMounted(true);
    fetchDashboardData();
    fetchMarketPrices();
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) {
        setShowWalletSelector(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchMarketPrices() {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether,usd-coin,dai,binance-usd,ripple,stellar&vs_currencies=usd');
      if (res.ok) {
        const result = await res.json();
        setMarketPrices(prev => ({
          ...prev,
          BTC: result.bitcoin?.usd || prev.BTC,
          USDT: result.tether?.usd || prev.USDT,
          USDC: result["usd-coin"]?.usd || prev.USDC,
          DAI: result.dai?.usd || prev.DAI,
          BUSD: result["binance-usd"]?.usd || prev.BUSD,
          XRP: result.ripple?.usd || prev.XRP,
          XLM: result.stellar?.usd || prev.XLM,
        }));
      }
    } catch { /* keep defaults */ }
  }

  async function fetchDashboardData() {
    try {
      fetch("/api/wallet/sidra/sync", { method: "POST" }).catch(() => null);

      const [profileRes, historyRes] = await Promise.all([
        fetch("/api/user/profile", { cache: 'no-store' }),
        fetch("/api/wallet/history", { cache: 'no-store' })
      ]);

      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const profileData = profileJson.user; 
        const historyData = historyRes.ok ? await historyRes.json() : { transactions: [] };

        setData({
          ...profileData,
          transactions: historyData.transactions || []
        });
        
        // Mettre PI par défaut si disponible
        const piIdx = profileData.wallets?.findIndex((w: any) => w.currency === "PI");
        if (piIdx !== -1) setActiveWalletIndex(piIdx);

      } else if (profileRes.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("PimPay Sync Error:", err);
      toast.error("Sync error");
    } finally {
      setIsLoading(false);
    }
  }

  const getStats = () => {
    const txs = data?.transactions || [];
    
    // Sent = debit transactions that are not swaps (TRANSFER, WITHDRAW, PAYMENT, CARD_PURCHASE)
    const sent = txs.filter((t: any) => t.isDebit && t.type !== 'EXCHANGE').length;
    // Received = credit transactions that are not swaps (DEPOSIT, TRANSFER received, AIRDROP, STAKING_REWARD)
    const received = txs.filter((t: any) => !t.isDebit && t.type !== 'EXCHANGE').length;
    // Swaps = all EXCHANGE type transactions
    const swaps = txs.filter((t: any) => t.type === 'EXCHANGE').length;
    // Total
    const total = txs.length;

    return [
      { name: "Sortant", value: sent || 0 },
      { name: "Entrant", value: received || 0 },
      { name: "Swaps", value: swaps || 0 },
      { name: "Total", value: total || 0 },
    ];
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      localStorage.removeItem("pimpay_user");
      const cookieNames = ["token", "pimpay_token", "session", "pi_session_token"];
      for (const c of cookieNames) {
        document.cookie = `${c}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        document.cookie = `${c}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure`;
      }
      window.location.href = "/auth/login";
    } catch (err) {
      localStorage.removeItem("pimpay_user");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "pimpay_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "pi_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      window.location.href = "/auth/login";
    }
  };

  const getTxIcon = (tx: any) => {
    if (tx.type === 'EXCHANGE') return { icon: <RefreshCcw size={18} />, color: "bg-orange-500/10 text-orange-500" };
    if (!tx.isDebit) return { icon: <ArrowDownCircle size={18} />, color: "bg-emerald-500/10 text-emerald-500" };
    return { icon: <ArrowUpCircle size={18} />, color: "bg-blue-500/10 text-blue-500" };
  };

  if (!hasMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">PIMPAY Sync...</p>
      </div>
    );
  }

  const wallets = data?.wallets || [];
  const currentWallet = wallets[activeWalletIndex] || { balance: 0, currency: "PI" };
  const balance = currentWallet.balance;
  const currentCurrency = currentWallet.currency;
  const displayName = data?.name || "PIONEER";

  const rateToUse = marketPrices[currentCurrency] ?? 1;
  const convertedValue = balance * rateToUse * RATES[currency];

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-[100] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg text-white text-xl">P</div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">PIMPAY</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">Virtual Bank</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsLoading(true); fetchDashboardData(); }} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all">
            <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          
          <button onClick={() => router.push("/settings/notifications")} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all relative">
            <Bell size={20} />
            {/* Petit point de notification comme sur l'image */}
            <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
          </button>
          
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowProfileMenu(!showProfileMenu)} className="p-3 rounded-2xl bg-white/5 text-slate-400">
              <User size={20} />
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-slate-900 border border-white/10 rounded-[24px] shadow-2xl p-2 z-[110]">
                <div className="p-4 border-b border-white/5 mb-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">PimPay Account</p>
                  <p className="text-sm font-bold truncate">@{data?.username}</p>
                </div>
                <button onClick={() => router.push("/profile")} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left">
                  <Settings size={16} /> Profile
                </button>
                <button
                  onClick={() => setLocale(locale === "fr" ? "en" : "fr")}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left"
                >
                  <div className="flex items-center gap-3">
                    <Globe size={16} className="text-cyan-400" />
                    <span>{locale === "fr" ? "Francais" : "English"}</span>
                  </div>
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
                    {locale === "fr" ? "EN" : "FR"}
                  </span>
                </button>
                <button onClick={() => handleLogout()} className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-500 text-xs font-bold uppercase text-left">
                  <LogOut size={16} /> Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 flex-grow pb-10">
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[32px] p-7 shadow-2xl border border-white/10 mb-6 mt-4 overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black uppercase tracking-wider">PIMPAY CARD</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={() => setShowBalance(!showBalance)} className="text-white/40 p-1">
                  {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                
                {/* SÉLECTEUR DE WALLET DANS LA CARTE */}
                <div className="relative" ref={walletRef}>
                  <button 
                    onClick={() => setShowWalletSelector(!showWalletSelector)}
                    className="bg-white/10 hover:bg-white/20 p-2 rounded-xl border border-white/10 transition-all flex items-center gap-2"
                  >
                    <WalletIcon size={16} />
                    <ChevronDown size={14} className={`transition-transform ${showWalletSelector ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {showWalletSelector && (
                    <div className="absolute right-0 mt-2 w-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1 z-[120]">
                      {wallets.map((w: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveWalletIndex(idx);
                            setShowWalletSelector(false);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeWalletIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-white/5 text-slate-400'}`}
                        >
                          {w.currency}
                          <span className="opacity-60 text-[8px]">{showBalance ? w.balance.toFixed(2) : "••"}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-4xl font-black tracking-tighter flex items-center gap-2">
                <span className="text-blue-200">{currentCurrency === "PI" ? "π" : currentCurrency === "XAF" ? "" : "$"}</span>
                {showBalance ? balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : "••••••"}
              </h2>
              <p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-1">{displayName}</p>
            </div>
            <div className="flex justify-between items-end">
              <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                <Globe size={12} className="text-blue-400" />
                <p className="text-[11px] font-mono font-bold">≈ {showBalance ? `${convertedValue.toLocaleString()} ${currency}` : "Locked"}</p>
              </div>
              <p className="text-[10px] font-bold text-white uppercase italic">{currentCurrency}</p>
            </div>
          </div>
          <Zap size={240} className="absolute -right-10 -bottom-10 opacity-10" />
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[{ icon: <ArrowUpRight />, label: "Send", color: "bg-blue-600", link: "/transfer" },
            { icon: <ArrowDownLeft />, label: "Withdraw", color: "bg-emerald-600", link: "/withdraw" },
            { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/swap" },
            { icon: <CreditCard />, label: "Card", color: "bg-slate-800", link: "/dashboard/card" }
          ].map((action, i) => (
            <button key={i} onClick={() => router.push(action.link)} className="flex flex-col items-center gap-2">
              <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform`}>{action.icon}</div>
              <span className="text-[9px] font-black text-slate-500 uppercase">{action.label}</span>
            </button>
          ))}
        </div>

        {/* FLUX DE TRÉSORERIE */}
        <section className="mb-8 p-6 rounded-[32px] bg-slate-900/40 border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Flux de Trésorerie</h3>
            <LayoutGrid size={16} className="text-slate-600" />
          </div>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={getStats().filter(s => s.value > 0).length > 0 
                      ? getStats().filter(s => s.value > 0) 
                      : [{ name: "Aucune", value: 1 }]} 
                    cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value"
                  >
                    {getStats().filter(s => s.value > 0).length > 0 
                      ? getStats().filter(s => s.value > 0).map((entry, index) => {
                          const colorIndex = getStats().findIndex(s => s.name === entry.name);
                          return <Cell key={index} fill={PIE_COLORS[colorIndex % PIE_COLORS.length]} stroke="none" />;
                        })
                      : [<Cell key={0} fill="#1e293b" stroke="none" />]
                    }
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-blue-400">
                {(data?.transactions?.length || 0) > 0 ? "Live" : "N/A"}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2">
              {getStats().map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FLUX DE TRANSACTIONS AVEC SCROLL INTERNE CORRIGÉ */}
        <section className="mb-12 relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Flux de transactions</h3>
            <div className="absolute top-0 right-0 opacity-[0.03] text-[120px] font-black pointer-events-none select-none italic">
              7
            </div>
            <History size={16} className="text-slate-600" />
          </div>
          
          {/* Scrollable container pour éviter que la page ne devienne trop longue */}
          <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
            {data?.transactions?.length > 0 ? data.transactions.map((tx: any) => {
              const { icon, color } = getTxIcon(tx);
              return (
                <div key={tx.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-[24px] flex justify-between items-center active:bg-slate-800 transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div>
                    <div>
                      <p className="text-[11px] font-bold uppercase text-white">{tx.description || tx.type}</p>
                      <p className="text-[8px] text-slate-500 font-black uppercase mt-1">
                        {tx.isDebit ? `À: ${tx.peerName || 'SYSTÈME PIMPAY'}` : `DE: ${tx.peerName || 'SYSTÈME PIMPAY'}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-black ${!tx.isDebit ? 'text-emerald-400' : 'text-blue-400'}`}>
                      {tx.isDebit ? '-' : '+'}{tx.amount.toLocaleString()} {tx.currency}
                    </p>
                    <p className="text-[8px] text-slate-500 font-black mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-10 opacity-30 text-[10px] uppercase font-bold border border-dashed border-white/10 rounded-[32px]">Aucune transaction</div>
            )}
          </div>
        </section>
      </main>

      
      <footer className="pt-8 pb-32 border-t border-white/5 flex flex-col items-center gap-6 bg-[#020617]">
        <div className="flex items-center gap-6">
          <a href="https://www.facebook.com/profile.php?id=61583243122633" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"><Facebook size={20} /></a>
          <a href="https://x.com/pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"><Twitter size={20} /></a>
          <a href="https://youtube.com/@pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Youtube size={20} /></a>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">© 2026 PimPay Virtual Bank</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-700 mt-1">
            Pi Mobile Payment Solution
          </p>
        </div>
      </footer>

      <BottomNav onOpenMenu={() => setIsSidebarOpen(true)} />
    </div>
  );
}
