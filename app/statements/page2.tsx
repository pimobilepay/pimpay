"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";
import {
  ArrowLeft, Search, Filter, ArrowUpRight, ArrowDownLeft,
  ShoppingBag, Zap, Send, Download, Calendar, CircleDot, 
  Wallet, ArrowRightLeft, Smartphone, PlusCircle
} from "lucide-react";
import Link from "next/link";

// --- TYPES ---
type ServiceType = "all" | "deposit" | "withdraw" | "transfer" | "recharge";

type Transaction = {
  id: string;
  title: string;
  type: ServiceType;
  amount: number;
  piAmount: string;
  date: string;
  status: "success" | "pending" | "failed";
};

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeService, setActiveService] = useState<ServiceType>("all");

  const transactions: Transaction[] = [
    { id: "1", title: "Transfert Mpay à Jean", type: "transfer", amount: 45.00, piAmount: "0.000143", date: "Aujourd'hui, 14:20", status: "success" },
    { id: "2", title: "Dépôt Wallet", type: "deposit", amount: 150.00, piAmount: "0.000477", date: "Hier, 09:12", status: "success" },
    { id: "3", title: "Recharge Mobile Orange", type: "recharge", amount: 12.99, piAmount: "0.000041", date: "20 Déc, 18:45", status: "success" },
    { id: "4", title: "Retrait Guichet", type: "withdraw", amount: 89.50, piAmount: "0.000284", date: "18 Déc, 11:30", status: "pending" },
    { id: "5", title: "Transfert Mpay de Paul", type: "transfer", amount: 25.00, piAmount: "0.000079", date: "15 Déc, 22:10", status: "failed" },
  ];

  // Filtrage des transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesService = activeService === "all" || tx.type === activeService;
      const matchesSearch = tx.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesService && matchesSearch;
    });
  }, [activeService, searchQuery]);

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
              <h1 className="text-3xl font-black tracking-tighter text-white">HISTORIQUE</h1>
              <div className="flex items-center gap-2 mt-1">
                <CircleDot size={10} className="text-blue-500 animate-pulse" />
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Ledger Tracking</span>
              </div>
            </div>
          </div>
          <button className="p-3 rounded-2xl bg-blue-600/10 text-blue-500 border border-blue-500/20 hover:bg-blue-600/20 transition-all">
            <Download size={20} />
          </button>
        </div>

        {/* ANALYTICS SUMMARY GRID */}
        <div className="grid grid-cols-2 gap-4">
          <StatMiniCard 
            label="Entrées" 
            value="$ 1,240.00" 
            icon={<ArrowDownLeft size={16} />} 
            color="text-green-400" 
            bg="from-green-600/10"
          />
          <StatMiniCard 
            label="Sorties" 
            value="$ 438.49" 
            icon={<ArrowUpRight size={16} />} 
            color="text-purple-400" 
            bg="from-purple-600/10"
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
            className="w-full h-14 bg-slate-900/50 border border-white/5 rounded-2xl pl-12 pr-4 text-xs font-bold outline-none focus:border-blue-500/30 transition-all"
            placeholder="Search transactions..."
          />
        </div>

        {/* ONGLETS DE SERVICES (SCROLLABLE) */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <ServiceTab active={activeService === "all"} onClick={() => setActiveService("all")} label="All" />
          <ServiceTab active={activeService === "deposit"} onClick={() => setActiveService("deposit")} label="Dépôt" />
          <ServiceTab active={activeService === "withdraw"} onClick={() => setActiveService("withdraw")} label="Retrait" />
          <ServiceTab active={activeService === "transfer"} onClick={() => setActiveService("transfer")} label="Transfert" />
          <ServiceTab active={activeService === "recharge"} onClick={() => setActiveService("recharge")} label="Recharge" />
        </div>

        {/* TIMELINE SECTION */}
        <div className="space-y-6">
          <div className="flex justify-between items-center px-2 pt-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[3px] flex items-center gap-2">
              <Calendar size={12} className="text-blue-500" /> DÉCEMBRE 2025
            </h3>
          </div>

          <div className="space-y-4">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))
            ) : (
              <div className="py-10 text-center border border-dashed border-white/5 rounded-[2rem]">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Aucune donnée trouvée</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

function ServiceTab({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap border ${
        active 
          ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20" 
          : "bg-slate-900/50 border-white/5 text-slate-500 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function StatMiniCard({ label, value, icon, color, bg }: any) {
  return (
    <Card className={`bg-gradient-to-br ${bg} to-transparent border-white/5 p-5 rounded-[2rem] space-y-2`}>
      <div className={`flex items-center gap-2 ${color}`}>
        {icon}
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-xl font-black text-white tracking-tighter">{value}</p>
    </Card>
  );
}

function TransactionItem({ tx }: { tx: Transaction }) {
  const icons = {
    transfer: <ArrowRightLeft size={18} className="text-blue-400" />,
    deposit: <PlusCircle size={18} className="text-green-500" />,
    withdraw: <Wallet size={18} className="text-red-400" />,
    recharge: <Smartphone size={18} className="text-purple-400" />,
    all: <Zap size={18} />
  };

  const statusColors = {
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    pending: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    failed: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  return (
    <div className="group p-5 bg-slate-900/40 border border-white/5 rounded-[2rem] hover:bg-slate-900/60 hover:border-blue-500/20 transition-all cursor-pointer">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-white/5 flex items-center justify-center group-hover:scale-110 transition-transform">
            {icons[tx.type as keyof typeof icons] || <Zap size={18} />}
          </div>
          <div>
            <p className="font-bold text-sm tracking-tight text-white">{tx.title}</p>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{tx.date}</p>
          </div>
        </div>

        <div className="text-right">
          <p className={`text-lg font-black tracking-tighter ${tx.type === 'deposit' ? 'text-green-400' : 'text-white'}`}>
            {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toFixed(2)} $
          </p>
          <div className="flex items-center justify-end gap-1">
             <Zap size={8} className="text-blue-400" />
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{tx.piAmount} π</p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <span className={`text-[8px] px-3 py-1 rounded-full font-black uppercase tracking-[1px] border ${statusColors[tx.status]}`}>
            {tx.status === "success" ? "Completed" : tx.status === "pending" ? "Processing" : "Declined"}
        </span>
        <div className="flex gap-1.5 opacity-30">
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <div className="w-1 h-1 rounded-full bg-blue-500" />
            <div className="w-1 h-1 rounded-full bg-blue-500" />
        </div>
      </div>
    </div>
  );
}
