"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ShieldCheck, TrendingUp,
  History, Bell, ChevronRight, Loader2, ArrowUpCircle, ArrowDownCircle,
  Eye, EyeOff, Lock, Globe, Zap, CreditCard
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

export default function UserDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false); // AJOUTÉ POUR L'HYDRATATION
  const [showBalance, setShowBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Éviter l'erreur de removeChild en attendant le montage
  useEffect(() => {
    setHasMounted(true);
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setIsRefreshing(true);
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
      setIsRefreshing(false);
    }
  }

  // Si on n'est pas encore sur le client, on affiche un loader vide pour éviter le mismatch
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

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
               <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">{userName}</h1>
               {user?.kycStatus === 'VERIFIED' && <ShieldCheck size={14} className="text-blue-400" />}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              <span className="text-emerald-500">●</span> {user?.role || 'PIONEER'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => fetchDashboardData()} className={`p-3 rounded-2xl bg-white/5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCcw size={18} />
            </button>
            <button className="p-3 rounded-2xl bg-white/5 text-slate-400 relative">
              <Bell size={20} />
            </button>
        </div>
      </header>

      <main className="px-6 animate-in fade-in duration-700">
        {/* CARTE SOLDE */}
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[32px] p-7 shadow-2xl border border-white/10 mb-8 mt-4 overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <p className="text-white/60 text-[10px] uppercase font-black tracking-[0.2em]">Total Balance</p>
                <button onClick={() => setShowBalance(!showBalance)} className="text-white/40">
                  {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            <h2 className="text-4xl font-black tracking-tighter mt-1 flex items-center gap-2">
                <span className="text-blue-200">π</span>
                {showBalance ? balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : "••••••"}
            </h2>
            <div className="bg-black/30 w-fit px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 mt-4">
                <Globe size={12} className="text-blue-400" />
                <p className="text-[11px] font-mono font-bold">
                ≈ {showBalance ? `$${(balance * PI_CONSENSUS_USD).toLocaleString()}` : "Locked"}
                </p>
            </div>
          </div>
          <Zap size={240} className="absolute -right-10 -bottom-10 opacity-10" />
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-4 gap-4 mb-10">
            {[{ icon: <ArrowUpRight />, label: "Envoi", color: "bg-blue-600", link: "/transfer" },
              { icon: <ArrowDownLeft />, label: "Retrait", color: "bg-emerald-600", link: "/withdraw" },
              { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/swap" },
              { icon: <CreditCard />, label: "Card", color: "bg-slate-800", link: "/wallet" }
            ].map((action, i) => (
              <button key={i} onClick={() => router.push(action.link)} className="flex flex-col items-center gap-2">
                <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase">{action.label}</span>
              </button>
            ))}
        </div>

        {/* TRANSACTIONS RÉELLES */}
        <section className="mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Transactions Réelles</h3>
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
              <div className="text-center py-10 opacity-30 text-[10px] uppercase font-bold border border-dashed rounded-[32px]">No data</div>
            )}
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
