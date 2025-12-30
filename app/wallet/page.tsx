"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard, ShieldCheck, Zap, Wallet as WalletIcon,
  ArrowDownToLine, ArrowUpFromLine, Eye, EyeOff,
  TrendingUp, ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ArrowLeftRight, ShieldAlert, History
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Link from "next/link";
import { toast } from "sonner";

// --- TYPES ---
interface Transaction {
  id: string;
  type: "send" | "receive" | "swap" | "deposit";
  amount: number;
  date: string;
  title: string;
  status: "COMPLETED" | "PENDING" | "FAILED";
}

interface UserData {
  name: string;
  expiry: string;
  cardNumber: string;
  kycStatus: "VERIFIED" | "PENDING" | "NONE";
  balance: number;
}

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [userData, setUserData] = useState<UserData>({
    name: "Pi Pioneer",
    expiry: "--/--",
    cardNumber: "**** **** **** ****",
    kycStatus: "NONE",
    balance: 0
  });
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState([]);

  const PI_TO_USD = 31.41; // Taux interne PimPay

  // --- CHARGEMENT DES DONNÉES DEPUIS TON API ---
  const loadWalletData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/wallet-info');
      
      if (res.ok) {
        const data = await res.json();
        
        // Mise à jour de l'état avec les données réelles de l'API
        setUserData({
          name: data.userData.name,
          balance: data.userData.balance,
          cardNumber: data.userData.cardNumber,
          expiry: data.userData.expiry,
          kycStatus: data.userData.kycStatus
        });
        
        setTransactions(data.recentTransactions || []);
        setChartData(data.cashFlow || []);
      } else {
        const errData = await res.json();
        if (res.status === 401) {
           toast.error("Session expirée. Reconnexion nécessaire.");
        } else {
           toast.error(errData.error || "Erreur lors de la récupération du portefeuille");
        }
      }
    } catch (err) {
      console.error("SYNC_ERROR:", err);
      toast.error("Erreur de synchronisation avec le Mainnet Node");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    loadWalletData();
  }, []);

  const balanceInUSD = useMemo(() => {
    return (userData.balance * PI_TO_USD).toLocaleString('en-US', {
      style: 'currency', currency: 'USD',
    });
  }, [userData.balance]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans selection:bg-blue-500/30">
      <div className="px-6 pt-12 max-w-md mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Pi Mainnet Node v4.0
              </p>
            </div>
          </div>
          <button 
            onClick={loadWalletData} 
            disabled={loading}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:rotate-180 transition-all duration-500 disabled:opacity-50"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* CARTE VIRTUELLE */}
        <div className="group relative w-full aspect-[1.58/1] perspective-1000 mb-4">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 rounded-[32px] p-8 border border-white/20 shadow-2xl relative overflow-hidden transition-all duration-500 group-hover:shadow-blue-500/20 group-hover:scale-[1.01]">
            
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
            
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                 <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                        <WalletIcon size={20} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-blue-100/50 uppercase">Balance</span>
                 </div>
                 <p className="text-3xl font-black text-white tracking-tighter">
                   {userData.balance.toFixed(4)} <span className="text-blue-300 italic">π</span>
                 </p>
                 <p className="text-[11px] font-bold text-blue-200/60">{balanceInUSD} USD</p>
              </div>
              <div className="h-10 w-14 bg-white/10 rounded-lg backdrop-blur-md border border-white/10 flex items-center justify-center italic font-black text-xs text-blue-200">
                PI
              </div>
            </div>

            <div className="mt-8 relative z-10">
              <p className="text-lg font-mono tracking-[0.25em] text-white drop-shadow-md">
                {showCardNumber ? userData.cardNumber : `•••• •••• •••• ${userData.cardNumber.slice(-4)}`}
              </p>
            </div>

            <div className="flex justify-between items-end mt-auto relative z-10 border-t border-white/10 pt-4">
              <div>
                <p className="text-[7px] uppercase text-blue-300/50 font-black tracking-widest mb-1">Card Holder</p>
                <p className="text-xs font-black uppercase tracking-widest text-white">{userData.name}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] uppercase text-blue-300/50 font-black tracking-widest mb-1">Expiry</p>
                <p className="text-xs font-mono font-bold text-white">{userData.expiry}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8 px-2">
            <div className="flex items-center gap-2">
                 <ShieldCheck size={14} className={userData.kycStatus === "VERIFIED" ? "text-emerald-500" : "text-orange-500"} />
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    KYC {userData.kycStatus}
                 </span>
            </div>
            <button
                onClick={() => setShowCardNumber(!showCardNumber)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 transition-all"
            >
                {showCardNumber ? <EyeOff size={12} className="text-slate-400" /> : <Eye size={12} className="text-blue-400" />}
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Security View</span>
            </button>
        </div>

        {/* WEB3 ACTIONS GRID */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { icon: <ArrowUpFromLine />, label: "Send", color: "bg-blue-500", link: "/transfer" },
            { icon: <ArrowDownToLine />, label: "Receive", color: "bg-emerald-500", link: "/receive" },
            { icon: <ArrowLeftRight />, label: "Swap", color: "bg-purple-600", link: "/swap" },
            { icon: <History />, label: "Logs", color: "bg-slate-700", link: "/transactions" },
          ].map((action, i) => (
            <Link key={i} href={action.link} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 ${action.color} rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-black/40 group-active:scale-90 transition-all`}>
                {React.cloneElement(action.icon as React.ReactElement, { size: 20 })}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* ANALYTICS CHART */}
        <div className="mb-10 p-6 bg-slate-900/60 border border-white/5 rounded-[32px] relative overflow-hidden">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <TrendingUp size={14} className="text-blue-500" /> Web3 Cash-Flow
             </h3>
             <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">+12.4%</span>
          </div>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey="amount"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#colorAmount)"
                    animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TRANSACTION FEED */}
        <div className="space-y-5">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Network History</h3>
            <Link href="/transactions" className="p-2 bg-white/5 rounded-xl border border-white/5">
                <ArrowUpRight size={14} className="text-blue-500" />
            </Link>
          </div>

          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        tx.type === "receive" || tx.type === "deposit"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}>
                        {tx.type === "receive" || tx.type === "deposit" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-white tracking-tight">{tx.title}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">{tx.date} • {tx.status || 'COMPLETED'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-xs font-black ${tx.type === "receive" || tx.type === "deposit" ? "text-emerald-400" : "text-white"}`}>
                        {tx.type === "receive" || tx.type === "deposit" ? "+" : "-"} {tx.amount.toFixed(2)} π
                        </p>
                        <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase">Confirmed</p>
                    </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10 opacity-40">
                 <ShieldAlert size={30} className="mb-2" />
                 <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Ledger Entries</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
