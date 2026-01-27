"use client";

import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Filter,
  RefreshCcw
} from 'lucide-react';
import { useRouter } from "next/navigation";

// INTERFACE : Conservée à l'identique avec reference
interface TransactionData {
  id: string;
  reference?: string;
  type: string;
  status: string;
  currency: string;
  destCurrency?: string;
  amount: number;
  createdAt: string;
  blockchainTx?: string;
  fromUserId?: string;
  toUserId?: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Récupérer l'ID de l'utilisateur pour distinguer Entrant/Sortant
      const profileRes = await fetch('/api/user/profile');
      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserId(profile.id);
      }

      // 2. Récupérer l'historique
      const res = await fetch('/api/wallet/history?limit=100');
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch (err) {
      console.error("Erreur chargement historique:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getTxDetails = (tx: TransactionData) => {
    if (tx.type === 'EXCHANGE') {
      return {
        icon: <ArrowLeftRight size={18} className="text-blue-500" />,
        label: `SWAP ${tx.currency} ➔ ${tx.destCurrency}`,
        color: "text-blue-500",
        prefix: ""
      };
    }
    if (tx.type === 'STAKING_REWARD') {
      return {
        icon: <Layers size={18} className="text-purple-500" />,
        label: "RÉCOMPENSE STAKING",
        color: "text-purple-500",
        prefix: "+"
      };
    }

    // LOGIQUE CORRIGÉE : On vérifie si l'utilisateur est le destinataire 
    // ou si c'est un dépôt système pour SDA/PI/USDT
    const isReceived = tx.toUserId === userId || tx.type === 'DEPOSIT' || tx.type === 'AIRDROP';

    if (isReceived) {
      return {
        icon: <ArrowDownLeft size={18} className="text-emerald-500" />,
        label: `REÇU ${tx.currency}`,
        color: "text-emerald-500",
        prefix: "+"
      };
    }

    return {
      icon: <ArrowUpRight size={18} className="text-red-500" />,
      label: `ENVOYÉ ${tx.currency}`,
      color: "text-red-500",
      prefix: "-"
    };
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'SUCCESS':
      case 'COMPLETED': return 'text-emerald-500 bg-emerald-500/10';
      case 'PENDING': return 'text-amber-500 bg-amber-500/10';
      default: return 'text-red-500 bg-red-500/10';
    }
  };

  const openExplorer = (tx: TransactionData) => {
    if (!tx.blockchainTx) return;
    let url = "";
    if (tx.currency === "SDA") url = `https://ledger.sidrachain.com/tx/${tx.blockchainTx}`;
    else if (tx.currency === "USDT") url = `https://tronscan.org/#/transaction/${tx.blockchainTx}`;
    else if (tx.currency === "BTC") url = `https://www.blockchain.com/btc/tx/${tx.blockchainTx}`;

    if (url) window.open(url, '_blank');
  };

  // FILTRAGE : Conservé tel quel
  const filteredTransactions = transactions.filter(tx => {
    const matchesTab = activeTab === 'All' || tx.currency === activeTab;
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (tx.reference?.toLowerCase().includes(searchLower) || false) ||
      (tx.type?.toLowerCase().includes(searchLower) || false);
    return matchesTab && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32">
      {/* HEADER : Design intouché */}
      <div className="px-6 pt-12 pb-6 sticky top-0 bg-[#020617]/80 backdrop-blur-xl z-50 border-b border-white/5">
        <div className="flex justify-between items-center mb-8">
          <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-black uppercase italic tracking-tighter text-center">
            PimPay<span className="text-blue-500">History</span>
          </h1>
          <button onClick={fetchHistory} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
            <RefreshCcw size={20} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une transaction..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['All', 'PI', 'SDA', 'USDT', 'BTC'].map((coin) => (
            <button
              key={coin}
              onClick={() => setActiveTab(coin)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                activeTab === coin
                ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                : 'bg-white/5 border-white/5 text-slate-500'
              }`}
            >
              {coin}
            </button>
          ))}
        </div>
      </div>

      {/* LISTE : Design intouché */}
      <div className="px-6 mt-8 space-y-4">
        {loading ? (
          <div className="text-center py-20 opacity-20 animate-pulse font-black uppercase text-xs">Chargement PimPay Node...</div>
        ) : filteredTransactions.length > 0 ? (
          filteredTransactions.map((tx) => {
            const details = getTxDetails(tx);
            return (
              <div
                key={tx.id}
                onClick={() => openExplorer(tx)}
                className="bg-slate-900/40 border border-white/5 p-4 rounded-[2rem] flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer hover:bg-white/[0.03]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center">
                    {details.icon}
                  </div>
                  <div>
                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight">
                      {details.label}
                    </h4>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                      {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-[13px] font-black ${details.prefix === '+' ? 'text-emerald-500' : 'text-white'}`}>
                    {details.prefix}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: tx.currency === 'BTC' ? 8 : 2 })} {tx.currency}
                  </p>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full mt-1.5 ${getStatusStyle(tx.status)}`}>
                    <span className="text-[8px] font-black uppercase tracking-tighter">{tx.status}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-[3rem] border border-dashed border-white/10">
            <p className="text-[10px] font-black text-slate-600 uppercase">Aucune transaction trouvée</p>
          </div>
        )}
      </div>
    </div>
  );
}
