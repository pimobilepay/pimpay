"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CreditCard, ShieldCheck, Zap, Wallet as WalletIcon,
  Smartphone, Home, ArrowDownToLine, ArrowUpFromLine,
  Menu, Send, Eye, EyeOff, TrendingUp, History,
  ArrowUpRight, ArrowDownLeft, Search
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [filter, setFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [userData, setUserData] = useState({
    name: "CHARGEMENT...",
    expiry: "--/--",
    cardNumber: "0000 0000 0000 0000",
    kycStatus: "EN ATTENTE",
    balance: "0.00"
  });
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);

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
          // LIAISON DES DONNÉES DEPUIS L'API
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

  const stats = useMemo(() => {
    const incoming = transactions.filter(t => t.type === "DEPOSIT").reduce((acc, curr) => acc + curr.amount, 0);
    const outgoing = transactions.filter(t => t.type !== "DEPOSIT").reduce((acc, curr) => acc + curr.amount, 0);
    return { incoming, outgoing };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesFilter = filter === "ALL" || tx.type === filter;
      const matchesSearch = tx.type.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, searchQuery]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <div className="px-6 pt-12">
        {/* TITRE AJUSTÉ */}
        <div className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-white">Mon Portefeuille</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.3em] mt-2 ml-1">Fintech Web3 Ecosystem</p>
        </div>

        {/* CARTE VIRTUELLE (INFORMATIONS DYNAMIQUES) */}
        <div className="w-full aspect-[1.58/1] bg-gradient-to-tr from-slate-800 to-slate-950 rounded-[24px] p-8 border border-white/10 relative overflow-hidden mb-4 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20"><Zap size={100} /></div>
          <div className="flex justify-between items-start mb-12">
            <CreditCard className="text-blue-500" size={32} />
            <span className="text-[10px] font-mono tracking-[0.3em] text-slate-500 uppercase font-bold">Pimpay Virtual Bank</span>
          </div>
          <div className="space-y-8">
            <p className="text-2xl font-mono tracking-[0.2em] text-white">
              {showCardNumber ? userData.cardNumber : `**** **** **** ${userData.cardNumber.slice(-4)}`}
            </p>
            <div className="flex gap-10 items-end pt-2">
              <div className="flex-1">
                <p className="text-[8px] uppercase text-slate-500 font-black tracking-widest mb-1">Titulaire</p>
                <p className="text-[14px] font-black uppercase tracking-wider text-white leading-none">
                  {userData.name}
                </p>
              </div>
              <div className="w-16">
                <p className="text-[8px] uppercase text-slate-500 font-black tracking-widest mb-1">Expire</p>
                <p className="text-[14px] font-mono font-bold text-white leading-none">
                  {userData.expiry}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOUTON VISIBILITÉ */}
        <div className="flex justify-end mb-6">
          <button onClick={() => setShowCardNumber(!showCardNumber)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-white/5 rounded-lg">
            {showCardNumber ? <EyeOff size={14} className="text-slate-400" /> : <Eye size={14} className="text-blue-500" />}
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{showCardNumber ? "Masquer" : "Voir détails"}</span>
          </button>
        </div>

        {/* SECTION STATS : KYC ET PI NETWORK (LISIBLE) */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-6 bg-slate-900/50 border border-white/10 rounded-[24px]">
            <ShieldCheck className="text-emerald-500 mb-2" size={24} />
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">KYC Status</p>
            <p className="text-[15px] font-black text-emerald-400 uppercase tracking-tight">
              {userData.kycStatus}
            </p>
          </div>
          <div className="p-6 bg-slate-900/50 border border-white/10 rounded-[24px]">
            <WalletIcon className="text-blue-500 mb-2" size={24} />
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Network</p>
            <p className="text-[15px] font-black text-white uppercase tracking-tight">Pi Network</p>
          </div>
        </div>

        {/* FLUX DE TRÉSORERIE */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-white/5 border border-white/5 rounded-[20px] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500"><ArrowDownLeft size={16} /></div>
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Entrées</p>
              <p className="text-xs font-black text-white">{stats.incoming.toFixed(2)} π</p>
            </div>
          </div>
          <div className="p-4 bg-white/5 border border-white/5 rounded-[20px] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500"><ArrowUpRight size={16} /></div>
            <div>
              <p className="text-[8px] text-slate-500 uppercase font-bold tracking-wider">Sorties</p>
              <p className="text-xs font-black text-white">{stats.outgoing.toFixed(2)} π</p>
            </div>
          </div>
        </div>

        {/* GRAPHIQUE */}
        <div className="mb-8 p-6 bg-slate-900/40 border border-white/5 rounded-[32px]">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" /> Analyse 7J
          </h3>
          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* HISTORIQUE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Historique des opérations</h3>
            <History size={14} className="text-slate-500" />
          </div>
          <div className="space-y-3">
            {filteredTransactions.map((tx: any) => (
              <div key={tx.id} className="p-5 bg-white/5 border border-white/5 rounded-[24px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === "DEPOSIT" ? "bg-emerald-500/20 text-emerald-500" : "bg-blue-600/20 text-blue-400"}`}>
                    {tx.type === "DEPOSIT" ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                  </div>
                  <div>
                    <p className="text-sm font-bold uppercase tracking-tight">{tx.type}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{tx.date}</p>
                  </div>
                </div>
                <p className={`text-sm font-black ${tx.type === "DEPOSIT" ? "text-emerald-400" : "text-white"}`}>
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
