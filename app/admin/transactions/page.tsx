"use client";

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Search, RefreshCw, 
  ArrowDownLeft, ArrowUpRight, Wallet, 
  Clock, ShieldCheck, Hash, Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  userId: string;
  fromUser?: { firstName: string; lastName: string };
  amount: number;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
  description?: string;
  accountNumber?: string; // Pour les retraits MTN/Orange
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/transactions');
      if (!response.ok) throw new Error("Erreur de connexion");
      const data = await response.json();
      const transactionsArray = Array.isArray(data) ? data : (data.transactions || []);
      
      // On filtre les transactions qui nécessitent une action (PENDING)
      setTransactions(transactionsArray.filter((t: any) => t.status === 'PENDING'));
    } catch (error) {
      toast.error("Erreur PimPay : Impossible de charger les flux");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setIsProcessing(id); // Optionnel : pour un loader sur le bouton
    try {
      const response = await fetch(`/api/admin/transactions/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action }),
      });

      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        toast.success(`Transaction ${action === 'approve' ? 'validée' : 'rejetée'} avec succès`);
      } else {
        toast.error("Échec de l'opération");
      }
    } catch (error) {
      toast.error("Erreur serveur");
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const searchLower = filter.toLowerCase();
    const fullName = `${t.fromUser?.firstName} ${t.fromUser?.lastName}`.toLowerCase();
    return (
      fullName.includes(searchLower) ||
      t.id.toLowerCase().includes(searchLower) ||
      t.accountNumber?.includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER FUTURISTE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">
              PIMPAY<span className="text-blue-500">FLOW</span>
            </h1>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <Clock size={12} className="animate-pulse" /> Validation des Flux de Trésorerie
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync
          </button>
        </div>

        {/* BARRE DE RECHERCHE DESIGN ELARA */}
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Rechercher une transaction, un nom ou un compte..."
            className="w-full bg-white/5 border border-white/10 rounded-[20px] py-4 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 transition-all backdrop-blur-xl font-bold"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* TABLEAU DE CONTRÔLE */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Référence / Date</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Client</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Montant Net</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic">Mode de Paiement</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 tracking-widest italic text-center">Décision Admin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw size={32} className="animate-spin text-blue-500 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Scan des serveurs...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-20 text-center text-slate-600 uppercase font-black text-[10px] tracking-widest">
                      Aucune transaction critique en attente
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="group hover:bg-blue-600/[0.03] transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white/5 rounded-lg">
                            <Hash size={14} className="text-blue-500" />
                          </div>
                          <div>
                            <div className="font-black text-xs text-white uppercase">{tx.id.slice(-8)}</div>
                            <div className="text-[9px] text-slate-500 font-bold uppercase mt-1">
                              {new Date(tx.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                            {tx.fromUser?.firstName?.[0]}{tx.fromUser?.lastName?.[0]}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{tx.fromUser?.firstName} {tx.fromUser?.lastName}</div>
                            <div className="text-[9px] text-slate-600 font-mono">USER-REF: {tx.userId.slice(-5)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                           <div className="font-black text-sm text-blue-400 tracking-tighter">
                            {Number(tx.amount).toLocaleString()}
                          </div>
                          <span className="text-[10px] font-black text-slate-500 italic">{tx.currency}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl">
                          <Phone size={12} className="text-amber-500" />
                          <span className="text-[10px] font-black uppercase text-amber-500 italic">
                            {tx.type} • {tx.accountNumber || 'Mobile'}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-3">
                          <button 
                            onClick={() => handleAction(tx.id, 'reject')}
                            className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl hover:bg-rose-500 hover:text-white transition-all group/btn"
                          >
                            <XCircle size={18} />
                          </button>
                          <button 
                            onClick={() => handleAction(tx.id, 'approve')}
                            className="p-3 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-lg shadow-emerald-500/10"
                          >
                            <CheckCircle size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* FOOTER STATS */}
          <div className="p-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[9px] font-black uppercase text-slate-500 tracking-widest italic">
            <span>Scan de sécurité PimPay : 100% OK</span>
            <span>Total en attente : {filteredTransactions.length} dossiers</span>
          </div>
        </div>
      </div>
    </div>
  );
}
