"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ShieldCheck, TrendingUp, LayoutGrid,
  History, Bell, ChevronRight, Loader2, ArrowUpCircle, ArrowDownCircle,
  Eye, EyeOff, Lock, Globe, Zap, CreditCard
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

export default function UserDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const response = await fetch("/api/user/profile", {
          cache: 'no-store'
        });

        if (response.ok) {
          const result = await response.json();
          // Le résultat de notre API réparée contient balance, role, name à la racine
          setUser(result);
        } else if (response.status === 401) {
          router.push("/auth/login");
        }
      } catch (err) {
        toast.error("Erreur de synchronisation");
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, [router]);

  const balance = user?.balance || 0;
  const userName = user?.name || "Pioneer";
  // On simule une timeline si l'API ne la renvoie pas encore
  const timeline = user?.timeline || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">PIMPAY Ledger Sync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      
      {/* HEADER AMÉLIORÉ */}
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg shadow-blue-500/20 text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-1">
               <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">{userName}</h1>
               {user?.kycStatus === 'VERIFIED' && <ShieldCheck size={14} className="text-blue-400" />}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
              <span className="text-emerald-500">●</span> {user?.role || 'PIONEER'} NETWORK
            </p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={() => router.push('/settings')} className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
              <Lock size={18} />
            </button>
            <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 relative">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
            </button>
        </div>
      </header>

      <main className="px-6">
        {/* CARD PRINCIPALE - GCV VALUE */}
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[32px] p-7 shadow-2xl border border-white/10 mb-8 mt-4 overflow-hidden group">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <p className="text-white/60 text-[10px] uppercase font-black tracking-[0.2em] mb-1">Total Available Balance</p>
                <button onClick={() => setShowBalance(!showBalance)} className="text-white/40 hover:text-white">
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
              
              <h2 className="text-4xl font-black tracking-tighter mt-1 flex items-center gap-2">
                 <span className="text-blue-200">π</span> 
                 {showBalance ? balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 }) : "••••••"}
              </h2>

              <div className="flex items-center gap-2 mt-4">
                <div className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2">
                  <Globe size={12} className="text-blue-400" />
                  <p className="text-[11px] font-mono font-bold text-blue-100">
                    ≈ {showBalance ? `$${(balance * PI_CONSENSUS_USD).toLocaleString()}` : "Locked"} <span className="text-[9px] text-blue-400">GCV</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-end">
              <div>
                <p className="font-mono text-[9px] text-white/40 uppercase tracking-widest">Wallet ID</p>
                <p className="font-mono text-[10px] text-white/80">{user?.id?.substring(0, 12).toUpperCase() || "GUEST"}...</p>
              </div>
              <div className="flex flex-col items-end">
                 <p className="text-[9px] font-black text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md">Mainnet Live</p>
              </div>
            </div>
          </div>

          {/* Effets de design en arrière-plan */}
          <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
            <Zap size={240} />
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <section className="mb-10">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: <ArrowUpRight />, label: "Envoi", color: "bg-blue-600", link: "/send" },
              { icon: <ArrowDownLeft />, label: "Retrait", color: "bg-emerald-600", link: "/withdraw" },
              { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/swap" },
              { icon: <CreditCard />, label: "Card", color: "bg-slate-800", link: "/cards" },
            ].map((action, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <button
                  onClick={() => router.push(action.link)}
                  className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all active:scale-90 hover:brightness-110`}
                >
                  {action.icon}
                </button>
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{action.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* NOUVELLE SECTION : STATISTIQUES WEB3 */}
        <section className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl">
                <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase">Mining Rate</span>
                </div>
                <p className="text-sm font-bold text-white">0.015 π/h</p>
            </div>
            <div className="p-4 bg-slate-900/40 border border-white/5 rounded-3xl">
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={14} className="text-blue-500" />
                    <span className="text-[9px] font-black text-slate-500 uppercase">Node Status</span>
                </div>
                <p className="text-sm font-bold text-emerald-400 uppercase">Synchronized</p>
            </div>
        </section>

        {/* RECENT ACTIVITY */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">On-Chain Transactions</h3>
            <div className="flex items-center gap-1 text-blue-400">
                <span className="text-[10px] font-bold uppercase">View All</span>
                <ChevronRight size={12} />
            </div>
          </div>

          <div className="space-y-3">
            {timeline.length > 0 ? timeline.map((tx: any, i: number) => (
              <div
                key={i}
                onClick={() => router.push(`/transactions/${tx.id}`)}
                className="p-4 bg-slate-900/30 border border-white/5 rounded-[24px] flex justify-between items-center active:scale-[0.98] transition-all cursor-pointer hover:bg-slate-900/60"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.type === 'RECEIVED' ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold leading-tight uppercase tracking-tight">
                      {tx.type === 'RECEIVED' ? 'Inbound Transfer' : 'Outbound Transfer'}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                      {new Date(tx.createdAt).toLocaleDateString()} • {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                   <p className={`text-sm font-black ${tx.type === 'RECEIVED' ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {tx.type === 'RECEIVED' ? '+' : '-'} {tx.amount} π
                  </p>
                  <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">{tx.status}</p>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-12 bg-slate-900/20 border border-dashed border-white/5 rounded-[32px]">
                 <History size={32} className="text-slate-800 mb-2" />
                 <p className="text-[10px] font-bold uppercase text-slate-700 tracking-widest">No transaction history found</p>
              </div>
            )}
          </div>
        </section>

        {/* ECOSYSTEME / STAKING */}
        <section className="space-y-4 pb-10">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">PIMPAY ECOSYSTEM</h2>
          <div className="grid grid-cols-1 gap-3">
            <div className="p-5 bg-gradient-to-r from-indigo-900/40 to-slate-900/40 border border-white/5 rounded-[28px] flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <TrendingUp size={22} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-white uppercase tracking-tight">Liquid Staking</h3>
                  <p className="text-[9px] text-emerald-400 font-black uppercase tracking-tighter">Est. +14.2% APY</p>
                </div>
              </div>
              <div className="bg-white/5 p-2 rounded-full">
                <ChevronRight className="text-slate-500" size={16} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
