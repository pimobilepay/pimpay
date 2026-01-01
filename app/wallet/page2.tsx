"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard, ShieldCheck, Zap, Wallet as WalletIcon,
  ArrowDownToLine, ArrowUpFromLine, Eye, EyeOff,
  TrendingUp, ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ArrowLeftRight, ShieldAlert, History, Loader2, Plus
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";

// --- TYPES ---
interface WalletBalance {
  balance: number;
  type: string;
}

interface UserData {
  name: string;
  expiry: string;
  cardNumber: string;
  kycStatus: string;
  balances: Record<string, WalletBalance>;
}

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [loading, setLoading] = useState(true);

  const [data, setData] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Empêcher le rendu côté serveur pour les éléments dynamiques
  useEffect(() => {
    setMounted(true);
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/wallet');
      if (res.ok) {
        const json = await res.json();
        setData({
          name: json.profile?.name || "Pioneer",
          expiry: json.virtualCard?.exp || "12/28",
          cardNumber: json.virtualCard?.number || "0000 0000 0000 0000",
          kycStatus: json.profile?.kycStatus || "NONE",
          balances: json.balances || {}
        });
        setTransactions(json.recentTransactions || []);
        // Données de secours si le graphique est vide
        setChartData(json.cashFlow?.length > 0 ? json.cashFlow : [
          { amount: 100 }, { amount: 400 }, { amount: 300 }, { amount: 800 }
        ]);
      }
    } catch (err) {
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  // Crucial : Si pas monté, on ne rend RIEN pour éviter l'erreur removeChild
  if (!mounted) return null;

  const currencies = ["PI", "USD", "XAF", "CDF"];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      <div className="px-6 pt-12 max-w-md mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex h-2 w-2 relative">
                <div className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75"></div>
                <div className="relative h-2 w-2 rounded-full bg-emerald-500"></div>
              </div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Network Active</p>
            </div>
          </div>
          <button 
            onClick={loadWalletData} 
            className="p-3 bg-white/5 rounded-2xl border border-white/10"
          >
            <RefreshCcw size={18} className={`${loading ? "animate-spin" : ""} text-slate-400`} />
          </button>
        </div>

        {/* SOLDES MULTI-DEVISES */}
        <div className="mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Mes Soldes</p>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
            {currencies.map((cur) => (
              <Card key={`wallet-${cur}`} className="min-w-[120px] bg-slate-900/50 border-white/5 p-4 rounded-3xl">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black mb-3 ${
                  cur === 'PI' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {cur}
                </div>
                <p className="text-sm font-black text-white">
                  {loading ? "..." : (data?.balances?.[cur]?.balance?.toLocaleString() || "0.00")}
                </p>
              </Card>
            ))}
          </div>
        </div>

        {/* CARTE VIRTUELLE */}
        <div className="relative w-full aspect-[1.58/1] mb-6">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 rounded-[32px] p-8 border border-white/20 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/10 rounded-xl"><CreditCard size={18} /></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/50">Virtual Card</span>
              </div>
              <div className="text-[10px] font-black italic">PIMPAY</div>
            </div>

            <p className="text-xl font-mono font-bold tracking-[0.2em]">
              {showCardNumber ? data?.cardNumber : `•••• •••• •••• ${data?.cardNumber?.slice(-4) || "0000"}`}
            </p>

            <div className="flex justify-between items-end border-t border-white/10 pt-4">
              <div>
                <p className="text-[7px] uppercase text-white/40 font-black mb-1">Holder</p>
                <p className="text-[10px] font-black uppercase tracking-widest">{data?.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] uppercase text-white/40 font-black mb-1">Expiry</p>
                <p className="text-[10px] font-mono">{data?.expiry}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { icon: <Plus />, label: "Deposit", color: "bg-blue-600", link: "/deposit" },
            { icon: <ArrowUpRight />, label: "Send", color: "bg-indigo-600", link: "/transfer" },
            { icon: <ArrowLeftRight />, label: "Swap", color: "bg-purple-600", link: "/swap" },
            { icon: <History />, label: "Logs", color: "bg-slate-700", link: "/transactions" },
          ].map((action, i) => (
            <Link key={`action-${i}`} href={action.link} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 ${action.color} rounded-[22px] flex items-center justify-center shadow-lg active:scale-95 transition-transform`}>
                {React.cloneElement(action.icon as React.ReactElement, { size: 20 })}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* CHART - Sécurisé par condition mounted */}
        <div className="mb-10 p-6 bg-slate-900/60 border border-white/5 rounded-[32px]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Activity Graph</h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={0.1} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">Recent Feed</h3>
          {transactions.length > 0 ? (
            transactions.map((tx, idx) => (
              <div key={`tx-${tx.id || idx}`} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    {tx.type === "deposit" ? <ArrowDownLeft size={16} className="text-emerald-500"/> : <ArrowUpRight size={16} className="text-blue-500"/>}
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase">{tx.type}</p>
                    <p className="text-[9px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <p className="text-xs font-black">${tx.amount.toFixed(2)}</p>
              </div>
            ))
          ) : (
             <p className="text-center text-[10px] text-slate-600 py-10 uppercase font-black">No activity yet</p>
          )}
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
