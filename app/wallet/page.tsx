"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard, ShieldCheck, Zap, Wallet as WalletIcon,
  ArrowDownToLine, ArrowUpFromLine, Eye, EyeOff, 
  TrendingUp, History, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  status: string;
}

interface UserData {
  name: string;
  expiry: string;
  cardNumber: string;
  kycStatus: string;
  balance: string;
}

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: "",
    expiry: "",
    cardNumber: "",
    kycStatus: "",
    balance: "0.00"
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState([]);

  // Taux de conversion fictif Pi -> USD (ex: 1 Pi = 31.41 $)
  const PI_TO_USD = 31.41;

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        const [userRes, transRes] = await Promise.all([
          fetch('/api/user/wallet-info'),
          fetch('/api/user/transactions')
        ]);

        if (userRes.ok) {
          const data = await userRes.json();
          setUserData({
            name: data.name || "Pioneer User",
            expiry: data.expiry || "12/28",
            cardNumber: data.cardNumber || "4492 5582 9901 3342",
            kycStatus: data.kycStatus || "VÉRIFIÉ",
            balance: data.balance || "0.00"
          });
        }
        if (transRes.ok) {
          const data = await transRes.json();
          setTransactions(data.history || []);
          setChartData(data.chart || []);
        }
      } catch (err) {
        console.error("Erreur de liaison:", err);
      }
    };
    loadData();
  }, []);

  const balanceInUSD = useMemo(() => {
    return (parseFloat(userData.balance) * PI_TO_USD).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
  }, [userData.balance]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <div className="px-6 pt-12">
        
        <div className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-white">
            Mon Portefeuille
          </h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] mt-2 ml-1">
            Fintech Web3 Ecosystem
          </p>
        </div>

        {/* CARTE VIRTUELLE - STRUCTURE CORRIGÉE */}
        <div className="w-full aspect-[1.58/1] bg-gradient-to-tr from-slate-800 to-slate-950 rounded-[28px] p-7 border border-white/10 relative overflow-hidden mb-4 shadow-2xl flex flex-col justify-between">
          
          {/* Background Decor */}
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={120} />
          </div>
          
          {/* Top: Logo & Network */}
          <div className="flex justify-between items-start relative z-10">
            <div>
               <CreditCard className="text-blue-500 mb-1" size={30} />
               <p className="text-[14px] font-black text-white/90">{userData.balance} π</p>
               <p className="text-[10px] font-bold text-slate-400">{balanceInUSD}</p>
            </div>
            <span className="text-[9px] font-mono tracking-[0.2em] text-slate-500 uppercase font-bold bg-black/20 px-2 py-1 rounded">
              Pimpay Business
            </span>
          </div>

          {/* Middle: Card Number */}
          <div className="relative z-10">
            <p className="text-xl md:text-2xl font-mono tracking-[0.2em] text-white drop-shadow-lg">
              {showCardNumber ? userData.cardNumber : `**** **** **** ${userData.cardNumber.slice(-4)}`}
            </p>
          </div>

          {/* Bottom: Name & Expiry (FORCÉ EN BAS AVEC MARGE) */}
          <div className="flex justify-between items-end relative z-10 border-t border-white/5 pt-4">
            <div className="flex-1">
              <p className="text-[7px] uppercase text-blue-500 font-black tracking-[0.2em] mb-1">
                CARD HOLDER
              </p>
              <p className="text-[13px] font-black uppercase tracking-widest text-white truncate max-w-[180px]">
                {userData.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[7px] uppercase text-blue-500 font-black tracking-[0.2em] mb-1">
                EXPIRES
              </p>
              <p className="text-[13px] font-mono font-bold text-white">
                {userData.expiry}
              </p>
            </div>
          </div>
        </div>

        {/* BOUTON VISIBILITÉ */}
        <div className="flex justify-end mb-6">
          <button 
            onClick={() => setShowCardNumber(!showCardNumber)} 
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl"
          >
            {showCardNumber ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-blue-400" />}
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {showCardNumber ? "Masquer" : "Détails carte"}
            </span>
          </button>
        </div>

        {/* SECTION STATS */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-5 bg-slate-900/50 border border-white/10 rounded-[22px]">
            <ShieldCheck className="text-emerald-500 mb-2" size={22} />
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Status</p>
            <p className="text-[14px] font-black text-emerald-400 uppercase">{userData.kycStatus}</p>
          </div>
          <div className="p-5 bg-slate-900/50 border border-white/10 rounded-[22px]">
            <WalletIcon className="text-blue-500 mb-2" size={22} />
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Compte</p>
            <p className="text-[14px] font-black text-white uppercase tracking-tight">Pi Mainnet</p>
          </div>
        </div>

        {/* GRAPHIQUE ANALYSE */}
        <div className="mb-8 p-6 bg-slate-900/40 border border-white/5 rounded-[30px]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" /> Flux de trésorerie
          </h3>
          <div className="h-28 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2">Opérations récentes</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => (
              <div key={tx.id} className="p-4 bg-white/5 border border-white/5 rounded-[20px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === "DEPOSIT" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-400"}`}>
                    {tx.type === "DEPOSIT" ? <ArrowDownToLine size={16} /> : <ArrowUpFromLine size={16} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase">{tx.type}</p>
                    <p className="text-[9px] text-slate-500 font-bold">{tx.date}</p>
                  </div>
                </div>
                <p className={`text-xs font-black ${tx.type === "DEPOSIT" ? "text-emerald-400" : "text-white"}`}>
                  {tx.type === "DEPOSIT" ? "+" : "-"} {tx.amount.toFixed(2)} π
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
