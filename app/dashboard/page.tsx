"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ShieldCheck, Bell, Loader2, ArrowUpCircle, ArrowDownCircle,
  Eye, EyeOff, Globe, Zap, CreditCard, ChevronDown,
  LogOut, LayoutGrid, Receipt, Smartphone, Share2
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

const RATES = {
  USD: 1,
  XFA: 615,
  CDF: 2800,
  EUR: 0.92
};

type CurrencyKey = keyof typeof RATES;

export default function UserDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);

  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch("/api/user/profile", { cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    toast.success("Déconnexion réussie");
    router.push("/auth/login");
  };

  if (!hasMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">PIMPAY Sync...</p>
      </div>
    );
  }

  const user = data?.user || {};
  const balance = data?.balance || 0;
  const userName = data?.name || "Pioneer";
  const transactions = data?.transactions || [];
  const convertedValue = (balance * PI_CONSENSUS_USD) * RATES[currency];

  const formatCurrency = (val: number) => {
    return val.toLocaleString(currency === 'XFA' || currency === 'CDF' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* HEADER AVEC TITRE ET SOUS-TITRE UNIQUEMENT */}
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg text-white">
            P
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">PIMPAY</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">Pi Mobile Pay</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleLogout} className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-rose-500 transition-colors">
              <LogOut size={20} />
            </button>
            <button className="p-3 rounded-2xl bg-white/5 text-slate-400 relative">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
            </button>
        </div>
      </header>

      <main className="px-6 animate-in fade-in duration-700">
        {/* CARTE VIRTUELLE */}
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[32px] p-7 shadow-2xl border border-white/10 mb-8 mt-4 overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Active Card</span>
                </div>
                <button onClick={() => setShowBalance(!showBalance)} className="text-white/40 p-2">
                  {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            <div>
                <h2 className="text-4xl font-black tracking-tighter mt-1 flex items-center gap-2">
                    <span className="text-blue-200">π</span>
                    {showBalance ? balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : "••••••"}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Card Holder:</p>
                    <p className="text-[10px] text-white font-black uppercase tracking-widest">{userName}</p>
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div className="relative">
                    <button
                        onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                        className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 active:scale-95 transition-all"
                    >
                        <Globe size={12} className="text-blue-400" />
                        <p className="text-[11px] font-mono font-bold">
                        ≈ {showBalance ? `${formatCurrency(convertedValue)} ${currency}` : "Locked"}
                        </p>
                        <ChevronDown size={12} className={`transition-transform ${showCurrencyPicker ? 'rotate-180' : ''}`} />
                    </button>

                    {showCurrencyPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-28 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                            {(['USD', 'XFA', 'CDF', 'EUR'] as CurrencyKey[]).map((curr) => (
                                <button
                                    key={curr}
                                    onClick={() => {
                                        setCurrency(curr);
                                        setShowCurrencyPicker(false);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-[10px] font-bold hover:bg-blue-600 transition-colors ${currency === curr ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                                >
                                    {curr}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="text-right">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Network</p>
                    <p className="text-[10px] font-bold text-white uppercase italic">Pi Mainnet</p>
                </div>
            </div>
          </div>
          <Zap size={240} className="absolute -right-10 -bottom-10 opacity-10" />
        </div>

        {/* ACTIONS PRINCIPALES */}
        <div className="grid grid-cols-4 gap-4 mb-10">
            {[{ icon: <ArrowUpRight />, label: "Envoi", color: "bg-blue-600", link: "/transfer" },
              { icon: <ArrowDownLeft />, label: "Retrait", color: "bg-emerald-600", link: "/withdraw" },
              { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/swap" },
              { icon: <CreditCard />, label: "Card", color: "bg-slate-800", link: "/dashboard/card" }
            ].map((action, i) => (
              <button key={i} onClick={() => router.push(action.link)} className="flex flex-col items-center gap-2">
                <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase">{action.label}</span>
              </button>
            ))}
        </div>

        {/* QUICK ACCESS */}
        <section className="mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6 px-1">Quick Access</h3>
          <div className="grid grid-cols-4 gap-4">
              {[{ icon: <LayoutGrid size={20}/>, label: "Services" },
                { icon: <Receipt size={20}/>, label: "Bill" },
                { icon: <Smartphone size={20}/>, label: "Top-Up" },
                { icon: <Share2 size={20}/>, label: "Network" }
              ].map((item, i) => (
                <button key={i} className="flex flex-col items-center gap-3 group">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 group-active:scale-90 transition-all group-hover:border-blue-500/50 group-hover:text-blue-400">
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{item.label}</span>
                </button>
              ))}
          </div>
        </section>

        {/* TRANSACTIONS RÉELLES */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Transactions Réelles</h3>
            <button className="text-[9px] font-black uppercase text-blue-500 tracking-widest">Voir tout</button>
          </div>
          <div className="space-y-3">
            {transactions.length > 0 ? transactions.map((tx: any) => (
              <div key={tx.id} className="p-4 bg-slate-900/30 border border-white/5 rounded-[24px] flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.type === 'DEPOSIT' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase">{tx.description || tx.type}</p>
                    <p className="text-[10px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={`text-sm font-black ${tx.type === 'DEPOSIT' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'} {tx.amount.toFixed(2)} π
                  </p>
                </div>
              </div>
            )) : (
              <div className="text-center py-10 opacity-30 text-[10px] uppercase font-bold border border-dashed border-white/10 rounded-[32px]">No recent activity</div>
            )}
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
