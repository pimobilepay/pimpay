"use client";

import React, { useState, useEffect } from 'react';
import {
  CheckCircle, XCircle, Search, RefreshCw,
  Clock, Hash, Phone
} from 'lucide-react';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  userId: string;
  fromUser?: { firstName: string; lastName: string };
  toUser?: { firstName: string; lastName: string };
  amount: number;
  currency: string;
  type: string;
  status: string;
  createdAt: string;
  description?: string;
  accountNumber?: string;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Correction du fetch : pointer vers la bonne API de récupération
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // NOTE : Assure-toi que ton API de récupération est bien sur ce lien
      const response = await fetch('/api/admin/transactions');
      if (!response.ok) throw new Error("Erreur de connexion");
      
      const data = await response.json();
      const transactionsArray = Array.isArray(data) ? data : (data.transactions || []);

      // Filtrage strict sur PENDING pour l'administration
      setTransactions(transactionsArray.filter((t: Transaction) => t.status === 'PENDING'));
    } catch (error) {
      toast.error("PimPay : Impossible de charger les flux");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Correction handleAction : pointer vers l'API /update que nous avons corrigée
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    if (!confirm(`Confirmer la ${action === 'approve' ? 'validation' : 'réjection'} ?`)) return;

    setIsProcessing(id);
    try {
      const response = await fetch(`/api/admin/transactions/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, action }),
      });

      const result = await response.json();

      if (response.ok) {
        setTransactions(prev => prev.filter(t => t.id !== id));
        toast.success(`Flux ${action === 'approve' ? 'validé' : 'rejeté'} avec succès`);
      } else {
        toast.error(result.error || "Échec de l'opération");
      }
    } catch (error) {
      toast.error("Erreur de communication avec le serveur PimPay");
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredTransactions = transactions.filter(t => {
    const searchLower = filter.toLowerCase();
    // On vérifie fromUser ou toUser selon le type de transaction
    const user = t.fromUser || t.toUser;
    const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.toLowerCase();

    return (
      fullName.includes(searchLower) ||
      t.id.toLowerCase().includes(searchLower) ||
      (t.accountNumber && t.accountNumber.includes(searchLower))
    );
  });

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase">
              PIMPAY<span className="text-blue-500">FLOW</span>
            </h1>
            <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] flex items-center gap-2">
              <Clock size={12} className="animate-pulse" /> Validation des Flux de Trésorerie
            </p>
          </div>
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="flex items-center gap-2 bg-white/5 border border-white/10 px-6 py-3 rounded-2xl hover:bg-white/10 transition-all text-[10px] font-black uppercase tracking-widest"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Sync
          </button>
        </div>

        {/* SEARCH */}
        <div className="mb-8 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
          <input
            type="text"
            placeholder="Rechercher un flux critique..."
            className="w-full bg-white/5 border border-white/10 rounded-[20px] py-4 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 transition-all"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        {/* TABLE */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Référence</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Client</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Montant</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500">Type / Compte</th>
                  <th className="p-6 text-[10px] font-black uppercase text-slate-500 text-center">Décision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={5} className="p-20 text-center font-black uppercase text-[10px] text-slate-600">Initialisation du scan...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-20 text-center font-black uppercase text-[10px] text-slate-600">Aucune anomalie détectée</td></tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-600/[0.03] transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <Hash size={14} className="text-blue-500" />
                          <span className="font-black text-xs uppercase">{tx.id.slice(-8)}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="font-bold text-sm">
                          {tx.fromUser?.firstName || tx.toUser?.firstName || 'User'} {tx.fromUser?.lastName || tx.toUser?.lastName || ''}
                        </div>
                        <div className="text-[9px] text-slate-600 font-mono italic">{tx.userId.slice(-10)}</div>
                      </td>
                      <td className="p-6">
                        <span className="font-black text-blue-400">{tx.amount.toLocaleString()}</span>
                        <span className="ml-1 text-[10px] text-slate-500">{tx.currency}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-500">
                          <Phone size={12} /> {tx.type} • {tx.accountNumber || 'PI_WALLET'}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleAction(tx.id, 'reject')}
                            disabled={!!isProcessing}
                            className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <XCircle size={18} />
                          </button>
                          <button
                            onClick={() => handleAction(tx.id, 'approve')}
                            disabled={!!isProcessing}
                            className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-all"
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
        </div>
      </div>
    </div>
  );
}
