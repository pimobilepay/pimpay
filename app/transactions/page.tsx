"use client";

import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Filter
} from 'lucide-react';
import { useRouter } from "next/navigation";

interface TransactionData {
  id: string;
  type: 'TRANSFER' | 'WITHDRAW' | 'DEPOSIT' | 'PAYMENT' | 'EXCHANGE' | 'STAKING_REWARD' | 'AIRDROP' | 'CARD_PURCHASE';
  status: 'PENDING' | 'COMPLETED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  currency: string;
  amount: number;
  createdAt: string;
  destCurrency?: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('All');

  // Données de test (On simule les types GCV)
  const transactions: TransactionData[] = [
    {
      id: "tx1",
      type: 'EXCHANGE',
      currency: 'PI',
      amount: 1250.00,
      status: 'SUCCESS',
      createdAt: '2026-01-24T14:30:00',
    },
    {
      id: "tx2",
      type: 'STAKING_REWARD',
      currency: 'PI',
      amount: 15.25,
      status: 'PENDING',
      createdAt: '2026-01-24T09:15:00',
    },
    {
      id: "tx3",
      type: 'DEPOSIT',
      currency: 'SDA',
      amount: 500.00,
      status: 'SUCCESS',
      createdAt: '2026-01-23T18:00:00',
    },
  ];

  const getIcon = (type: TransactionData['type']) => {
    switch (type) {
      case 'TRANSFER': return <ArrowUpRight size={18} className="text-orange-500" />;
      case 'DEPOSIT': return <ArrowDownLeft size={18} className="text-emerald-500" />;
      case 'EXCHANGE': return <RefreshCcw size={18} className="text-blue-500" />;
      case 'STAKING_REWARD': return <Layers size={18} className="text-purple-500" />;
      default: return <CheckCircle2 size={18} className="text-blue-400" />;
    }
  };

  const getStatusDetails = (status: TransactionData['status']) => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED': return { color: 'text-emerald-500 bg-emerald-500/10', icon: <CheckCircle2 size={10} /> };
      case 'PENDING': return { color: 'text-amber-500 bg-amber-500/10', icon: <Clock size={10} /> };
      case 'FAILED': return { color: 'text-red-500 bg-red-500/10', icon: <XCircle size={10} /> };
      default: return { color: 'text-slate-500 bg-slate-500/10', icon: null };
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32">
      
      {/* HEADER FIXE */}
      <div className="px-6 pt-12 pb-6 sticky top-0 bg-[#020617]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black uppercase italic tracking-tighter text-center">
            PimPay<span className="text-blue-500 font-black">History</span>
          </h1>
          <button className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <Filter size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Barre de recherche Sidra Style */}
        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher une transaction..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        {/* Filtres de Coins */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['All', 'PI', 'SDA', 'USDT'].map((coin) => (
            <button
              key={coin}
              onClick={() => setActiveTab(coin)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === coin 
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40' 
                : 'bg-white/5 border-white/5 text-slate-500'
              }`}
            >
              {coin}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE DES TRANSACTIONS */}
      <div className="px-6 mt-8 space-y-4">
        {transactions
          .filter(tx => activeTab === 'All' || tx.currency === activeTab)
          .map((tx) => {
            const statusStyle = getStatusDetails(tx.status);
            return (
              <div 
                key={tx.id} 
                className="bg-slate-900/40 border border-white/5 p-4 rounded-[2rem] flex items-center justify-between active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                    {getIcon(tx.type)}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-white uppercase tracking-tight">
                      {tx.type.replace('_', ' ')}
                    </h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm font-black text-white">
                    {tx.amount.toLocaleString()} {tx.currency}
                  </p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-1.5 ${statusStyle.color}`}>
                    {statusStyle.icon}
                    <span className="text-[8px] font-black uppercase tracking-tighter">{tx.status}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>

    </div>
  );
}
