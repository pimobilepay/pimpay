"use client";

import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';

interface Transaction {
  id: string;
  userId: string;
  userName: string;
  amount: number;
  currency: string;
  method: string;
  phoneNumber?: string;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
}

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  // RÉCUPÉRATION RÉELLE DES DONNÉES
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/transactions'); // Ton endpoint API Pimpay
      if (!response.ok) throw new Error("Erreur lors de la récupération");
      const data = await response.json();
      
      // On filtre pour ne garder que les transactions "pending" si l'API envoie tout
      const pendingOnes = data.filter((t: Transaction) => t.status === 'pending');
      setTransactions(pendingOnes);
    } catch (error) {
      console.error("Erreur Pimpay:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // ACTION RÉELLE DE VALIDATION/REJET
  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    const confirmMessage = action === 'approve' 
      ? "Confirmer le virement MTN ?" 
      : "Rejeter cette demande ?";

    if (window.confirm(confirmMessage)) {
      try {
        const response = await fetch(`/api/admin/transactions/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: id, action }),
        });

        if (response.ok) {
          // Mise à jour de l'interface : on retire la ligne traitée
          setTransactions(prev => prev.filter(t => t.id !== id));
          alert(`Transaction ${action === 'approve' ? 'validée' : 'rejetée'} avec succès.`);
        } else {
          alert("Erreur serveur lors de la validation.");
        }
      } catch (error) {
        console.error("Erreur lors de l'action:", error);
        alert("Erreur de connexion au serveur.");
      }
    }
  };

  const filteredTransactions = transactions.filter(t =>
    t.userName?.toLowerCase().includes(filter.toLowerCase()) || 
    t.id.includes(filter) ||
    t.phoneNumber?.includes(filter)
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestion des Retraits</h1>
            <p className="text-sm text-gray-500 font-medium">Panel Admin Pimpay</p>
          </div>
          <button
            onClick={fetchTransactions}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border shadow-sm hover:bg-gray-50 transition-all"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            Actualiser
          </button>
        </div>

        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Rechercher un client ou un numéro de transaction..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="p-4 font-semibold text-gray-600 text-sm">TRANSACTION</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">UTILISATEUR</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">MONTANT</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm">MÉTHODE</th>
                  <th className="p-4 font-semibold text-gray-600 text-sm text-center">ACTIONS ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400">Chargement des données en cours...</td></tr>
                ) : filteredTransactions.length === 0 ? (
                  <tr><td colSpan={5} className="p-10 text-center text-gray-400">Aucune demande en attente.</td></tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{tx.id}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider">{tx.createdAt}</div>
                      </td>
                      <td className="p-4 text-sm">
                        <div className="font-semibold text-gray-800">{tx.userName}</div>
                        <div className="text-xs text-gray-500">ID: {tx.userId}</div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-green-700">{tx.amount.toLocaleString()} {tx.currency}</div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold uppercase">
                          {tx.method}
                        </span>
                        <div className="text-xs mt-1 text-gray-600">{tx.phoneNumber}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-4">
                          <button
                            onClick={() => handleAction(tx.id, 'approve')}
                            className="flex flex-col items-center group"
                          >
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg group-hover:bg-green-600 group-hover:text-white transition-all">
                              <CheckCircle size={22} />
                            </div>
                            <span className="text-[10px] font-bold mt-1 text-green-600">VALIDER</span>
                          </button>
                          <button
                            onClick={() => handleAction(tx.id, 'reject')}
                            className="flex flex-col items-center group"
                          >
                            <div className="p-2 bg-red-100 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-all">
                              <XCircle size={22} />
                            </div>
                            <span className="text-[10px] font-bold mt-1 text-red-600">REJETER</span>
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
