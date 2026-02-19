"use client";
                                                                import { useState, useMemo } from "react";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, Search, Download, ArrowUpRight, ArrowDownLeft,
  Calendar, CircleDot, Wallet, ArrowRightLeft, Smartphone, Zap  } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function HistoryClient({ initialTransactions, stats, currentUserId }: any) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeService, setActiveService] = useState("all");

  // Mapping des transactions avec détection automatique du type
  const formattedTransactions = useMemo(() => {                     return initialTransactions.map((tx: any) => {                     const isIncome = tx.toUserId === currentUserId;
                                                                      // Détection du type pour le filtrage et les icônes
      let type = 'transfer';
      const purpose = (tx.purpose || "").toLowerCase();
      const description = (tx.description || "").toLowerCase();

      if (purpose.includes('recharge') || description.includes('recharge')) type = 'recharge';
      else if (purpose.includes('retrait') || purpose.includes('withdraw')) type = 'withdraw';
      else if (purpose.includes('dépôt') || purpose.includes('deposit')) type = 'deposit';

      return {
        id: tx.id,
        title: tx.description || tx.purpose || (isIncome ? "Réception" : "Envoi"),
        type: type,
        amount: tx.amount,
        piAmount: tx.amount.toFixed(6),
        date: format(new Date(tx.createdAt), "d MMM, HH:mm", { locale: fr }),
        status: tx.status.toLowerCase() === 'completed' || tx.status.toLowerCase() === 'success' ? 'success' :
                tx.status.toLowerCase() === 'failed' ? 'failed' : 'pending',
        isIncome
      };
    });
  }, [initialTransactions, currentUserId]);

  const filteredTransactions = useMemo(() => {
    return formattedTransactions.filter((tx: any) => {
      const matchesService = activeService === "all" || tx.type === activeService;
      const matchesSearch = tx.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesService && matchesSearch;
    });
  }, [activeService, searchQuery, formattedTransactions]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">

      {/* HEADER */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
                <ArrowLeft size={20} />
              </div>
            </Link>
            <div>
              <h1 className="text-1xl font-black tracking-tighter text-white uppercase">Statements</h1>
              <div className="flex items-center gap-2 mt-1">
                <CircleDot size={10} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">REAL-TIME LEDGER</span>
              </div>
            </div>
          </div>
          <button className="p-3 rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20">
            <Download size={20} />
          </button>
        </div>

        {/* STATS SANS FOND BLANC */}
        <div className="grid grid-cols-2 gap-4">
          <StatMiniCard
            label="Entrées"
            value={`$${stats.income.toLocaleString()}`}
            icon={<ArrowDownLeft size={16} />}
            color="text-green-400"
            bg="from-green-600/20"
          />
          <StatMiniCard
            label="Sorties"
            value={`$${stats.outcome.toLocaleString()}`}
            icon={<ArrowUpRight size={16} />}
            color="text-purple-400"
            bg="from-purple-600/20"
          />
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* RECHERCHE */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none focus:border-blue-500/30 text-white placeholder:text-slate-600"
            placeholder="Rechercher une transaction..."
          />
        </div>

        {/* FILTRES PAR SERVICE */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {["all", "deposit", "withdraw", "transfer", "recharge"].map((s) => (
            <button
              key={s}
              onClick={() => setActiveService(s)}
              className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border shrink-0 ${
                activeService === s
                  ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20"
                  : "bg-slate-900/50 border-white/5 text-slate-500"
              }`}
            >
              {s === 'all' ? 'Tout' : s === 'deposit' ? 'Dépôts' : s === 'withdraw' ? 'Retraits' : s === 'transfer' ? 'Transferts' : 'Recharges'}
            </button>
          ))}
        </div>

        {/* LISTE DES TRANSACTIONS */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] flex items-center gap-2 px-2">
            <Calendar size={12} className="text-blue-500" /> {format(new Date(), "MMMM yyyy", { locale: fr }).toUpperCase()}
          </h3>

          <div className="space-y-4">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx: any) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))
            ) : (
              <div className="text-center py-10 text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                Aucune transaction trouvée
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

// --- SOUS-COMPOSANTS OPTIMISÉS ---

function StatMiniCard({ label, value, icon, color, bg }: any) {
  return (
    <div className={`relative overflow-hidden bg-slate-900/40 border border-white/5 p-5 rounded-[2rem] h-28 flex flex-col justify-center`}>
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} to-transparent opacity-30`} />
      <div className="relative z-10">
        <div className={`flex items-center gap-2 ${color} mb-1`}>
          {icon}
          <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
        </div>
        <p className="text-xl font-black text-white tracking-tighter truncate leading-none">
          {value}
        </p>
      </div>
    </div>
  );
}

function TransactionItem({ tx }: any) {
  const icons: any = {
    transfer: <ArrowRightLeft size={18} className="text-blue-400" />,
    deposit: <ArrowDownLeft size={18} className="text-green-500" />,
    withdraw: <Wallet size={18} className="text-red-400" />,
    recharge: <Smartphone size={18} className="text-purple-400" />,
  };

  const statusColors: any = {
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="group p-5 bg-slate-900/40 border border-white/5 rounded-[2.5rem] hover:bg-slate-900/60 transition-all">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center relative">
            {icons[tx.type] || <Zap size={18} className="text-blue-500" />}
          </div>
          <div>
            <p className="font-bold text-sm text-white line-clamp-1">{tx.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[8px] font-black text-blue-500 uppercase">{tx.type}</span>
               <span className="w-1 h-1 rounded-full bg-slate-700" />
               <p className="text-[10px] text-slate-500 font-bold uppercase">{tx.date}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-lg font-black tracking-tighter ${tx.isIncome ? 'text-green-400' : 'text-white'}`}>
            {tx.isIncome ? '+' : '-'}{tx.amount.toFixed(2)} $
          </p>
          <div className="flex items-center justify-end gap-1">
             <Zap size={8} className="text-blue-500" />
             <p className="text-[9px] font-black text-slate-400 uppercase">{tx.piAmount} π</p>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-[1px] border ${statusColors[tx.status]}`}>
            {tx.status === "success" ? "Complété" : tx.status === "pending" ? "En attente" : "Échoué"}
        </span>
        <ArrowRightLeft size={12} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
      </div>
    </div>
  );
}
