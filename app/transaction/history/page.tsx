"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCcw, 
  Search,
  Filter,
  Loader2,
  Calendar
} from "lucide-react";

export default function TransactionHistoryPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch("/api/transaction/history");
        if (res.ok) {
          const data = await res.json();
          setTransactions(data);
        }
      } catch (err) {
        console.error("Erreur historique:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 border border-white/10 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase italic tracking-tighter">Historique</h1>
        <button className="p-3 bg-white/5 border border-white/10 rounded-full">
          <Filter size={20} className="text-blue-500" />
        </button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Rechercher une transaction..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:border-blue-500/50 transition-all"
        />
      </div>

      {/* LISTE DES TRANSACTIONS */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-blue-500" size={40} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-20 opacity-40">
            <p className="text-sm font-black uppercase">Aucune transaction</p>
          </div>
        ) : (
          transactions.map((tx) => {
            const isOutgoing = tx.fromUserId === "ID_CURRENT_USER"; // À remplacer dynamiquement
            return (
              <div 
                key={tx.id} 
                className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-3xl hover:bg-white/[0.05] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${
                    tx.type === 'EXCHANGE' ? 'bg-blue-500/10 text-blue-500' :
                    isOutgoing ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'
                  }`}>
                    {tx.type === 'EXCHANGE' ? <RefreshCcw size={20} /> :
                     isOutgoing ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                  </div>
                  
                  <div>
                    <p className="text-sm font-black uppercase tracking-tight">
                      {tx.type === 'EXCHANGE' ? "Swap de Devises" :
                       isOutgoing ? `À: ${tx.toUser?.username || 'Inconnu'}` : `De: ${tx.fromUser?.username || 'Système'}`}
                    </p>
                    <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                      <Calendar size={10} /> {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-sm font-black ${isOutgoing ? 'text-white' : 'text-emerald-400'}`}>
                    {isOutgoing ? '-' : '+'}{tx.amount} π
                  </p>
                  <p className="text-[9px] font-mono text-slate-600 uppercase">{tx.reference.slice(0, 10)}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
