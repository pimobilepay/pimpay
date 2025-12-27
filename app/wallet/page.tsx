"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard, ShieldCheck, Zap, Wallet as WalletIcon,
  ArrowDownToLine, ArrowUpFromLine, Eye, EyeOff,
  TrendingUp, ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Link from "next/link";

interface Transaction {
  id: string;
  type: string;
  amount: number;
  date: string;
  title: string;
}

interface UserData {
  name: string;
  expiry: string;
  cardNumber: string;
  kycStatus: string;
  balance: number;
}

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: "Chargement...",
    expiry: "12/28",
    cardNumber: "**** **** **** ****",
    kycStatus: "VÉRIFICATION",
    balance: 0
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState([]);

  // Taux de conversion Pi -> USD (314,159$ est le consensus GCV souvent cité dans l'écosystème Pi)
  const PI_TO_USD = 31.41;

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        const res = await fetch('/api/user/wallet-info');
        if (res.ok) {
          const data = await res.json();
          
          // Mise à jour des données utilisateur (Récupérées via ton API corrigée)
          setUserData({
            name: data.userData.name,
            expiry: data.userData.expiry,
            cardNumber: data.userData.cardNumber,
            kycStatus: data.userData.kycStatus,
            balance: data.userData.balance
          });

          // Mise à jour de l'historique et du graphique
          setTransactions(data.recentTransactions || []);
          setChartData(data.cashFlow || []);
        }
      } catch (err) {
        console.error("Erreur de liaison API:", err);
      }
    };
    loadData();
  }, []);

  const balanceInUSD = useMemo(() => {
    return (userData.balance * PI_TO_USD).toLocaleString('en-US', {
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

        {/* CARTE VIRTUELLE */}
        <div className="w-full aspect-[1.58/1] bg-gradient-to-tr from-slate-800 to-slate-950 rounded-[28px] p-7 border border-white/10 relative overflow-hidden mb-4 shadow-2xl flex flex-col justify-between">
          
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Zap size={120} />
          </div>

          <div className="flex justify-between items-start relative z-10">
            <div>
               <CreditCard className="text-blue-500 mb-1" size={30} />
               <p className="text-[14px] font-black text-white/90">{userData.balance.toFixed(4)} π</p>
               <p className="text-[10px] font-bold text-slate-400">{balanceInUSD}</p>
            </div>
            <span className="text-[9px] font-mono tracking-[0.2em] text-slate-500 uppercase font-bold bg-black/20 px-2 py-1 rounded">
              Pimpay Business
            </span>
          </div>

          <div className="relative z-10">
            <p className="text-xl md:text-2xl font-mono tracking-[0.2em] text-white drop-shadow-lg">
              {showCardNumber ? userData.cardNumber : `**** **** **** ${userData.cardNumber.slice(-4)}`}
            </p>
          </div>

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

        <div className="flex justify-end mb-6">
          <button
            onClick={() => setShowCardNumber(!showCardNumber)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 border border-white/10 rounded-xl active:scale-95 transition-all"
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
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Status KYC</p>
            <p className="text-[14px] font-black text-emerald-400 uppercase">{userData.kycStatus}</p>
          </div>
          <div className="p-5 bg-slate-900/50 border border-white/10 rounded-[22px]">
            <WalletIcon className="text-blue-500 mb-2" size={22} />
            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Network</p>
            <p className="text-[14px] font-black text-white uppercase tracking-tight">Pi Mainnet</p>
          </div>
        </div>

        {/* GRAPHIQUE */}
        <div className="mb-8 p-6 bg-slate-900/40 border border-white/5 rounded-[30px]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" /> Analyse Cash-Flow
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

        {/* HISTORIQUE RÉEL */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Opérations récentes</h3>
            <Link href="/transactions" className="text-[9px] font-black uppercase text-blue-500">Voir tout</Link>
          </div>
          
          <div className="space-y-3">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <Link href={`/transfer/details/${tx.id}`} key={tx.id} className="block active:scale-[0.98] transition-transform">
                  <div className="p-4 bg-white/5 border border-white/5 rounded-[20px] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === "receive" ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-400"}`}>
                        {tx.type === "receive" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase truncate max-w-[140px]">{tx.title}</p>
                        <p className="text-[9px] text-slate-500 font-bold">{tx.date}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-black ${tx.type === "receive" ? "text-emerald-400" : "text-white"}`}>
                      {tx.type === "receive" ? "+" : "-"} {tx.amount.toFixed(2)} π
                    </p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-10 bg-white/5 rounded-[20px] border border-dashed border-white/10">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aucune transaction</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
