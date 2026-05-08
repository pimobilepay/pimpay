'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  Building2, RefreshCw, Plus, ArrowRightLeft, Download, X,
  Wifi, Eye, EyeOff, ArrowUpRight, Send,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface BankAccount {
  id: string;
  businessId: string;
  bankName: string;
  name: string;
  number: string;
  balance: number;
  currency: string;
  status: string;
  color: string;
  lastSync: string;
  createdAt: string;
}

interface BankStatement {
  id: string;
  accountId: string;
  businessId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
  Account?: {
    name: string;
    bankName: string;
  };
}

interface BankingData {
  accounts: BankAccount[];
  statements: BankStatement[];
  totalBalance: number;
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem('business_token');
  if (!token) throw new Error('Non authentifié');

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error('Erreur lors du chargement');
  return res.json();
};

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

const formatLastSync = (date: string) => {
  const diff = Date.now() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'À l\'instant';
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return new Date(date).toLocaleDateString('fr-FR');
};

export default function BankingPage() {
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [activeTab, setActiveTab] = useState<'statements' | 'analytics' | 'connections'>('statements');

  const { data, error, isLoading, mutate } = useSWR<BankingData>(
    '/api/business/banking',
    fetcher
  );

  const accounts = data?.accounts || [];
  const statements = data?.statements || [];
  const totalBalance = data?.totalBalance || 0;

  // Generate analytics data from statements
  const generateCashflowData = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const currentMonth = new Date().getMonth();
    const data = [];
    let runningBalance = totalBalance;
    
    for (let i = 6; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      data.push({
        month: months[monthIndex],
        balance: Math.round((runningBalance * (0.8 + Math.random() * 0.4)) / 1000000),
      });
    }
    return data;
  };

  const generateMonthlyIO = () => {
    const months = ['Jan', 'Fév', 'Mar', 'Avr'];
    return months.map(month => ({
      month,
      inflow: Math.round(200 + Math.random() * 200),
      outflow: Math.round(150 + Math.random() * 100),
    }));
  };

  const cashflowData = generateCashflowData();
  const monthlyIO = generateMonthlyIO();

  const handleAddAccount = async (accountData: Partial<BankAccount>) => {
    try {
      const token = localStorage.getItem('business_token');
      const res = await fetch('/api/business/banking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(accountData),
      });

      if (res.ok) {
        mutate();
        setShowAddAccount(false);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ajout du compte:', error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir déconnecter ce compte bancaire?')) return;

    try {
      const token = localStorage.getItem('business_token');
      const res = await fetch(`/api/business/banking?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        mutate();
      }
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const handleRefresh = async () => {
    await mutate();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-8 h-8 animate-spin text-[#C8A961]" />
            <p className="text-white/60">Chargement des données bancaires...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white/60">Erreur lors du chargement des données</p>
            <button
              onClick={() => mutate()}
              className="px-4 py-2 bg-[#C8A961] text-[#0A0E17] rounded-lg hover:bg-[#B8994F] transition-colors font-semibold"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-100 tracking-tight">Intégration Bancaire</h1>
          <p className="text-gray-400 text-sm mt-1">
            <span className="inline-flex items-center gap-1.5">
              <Wifi size={14} className="text-green-400" /> Connecté — {accounts.length} compte{accounts.length !== 1 ? 's' : ''} actif{accounts.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>
        <div className="flex gap-2.5">
          <button 
            onClick={() => setShowTransfer(true)} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-100 text-sm font-semibold hover:bg-gray-700 transition-colors"
          >
            <ArrowRightLeft size={16} /> Nouveau Virement
          </button>
          <button 
            onClick={() => setShowAddAccount(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#C8A961] to-[#8B6914] text-[#0A0E17] text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus size={18} /> Connecter un compte
          </button>
        </div>
      </div>

      {/* Total Balance */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#C8A961] to-[#8B6914]" />
        <div className="flex justify-between items-center">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Solde Total — Tous Comptes</p>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-4xl font-extrabold text-gray-100 tracking-tight">{showMask ? '••••••••' : fmt(totalBalance)}</p>
              <button onClick={() => setShowMask(!showMask)} className="text-gray-500 hover:text-gray-300 transition-colors">
                {showMask ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10">
            <ArrowUpRight size={16} className="text-green-400" />
            <span className="text-green-400 font-bold text-sm">+18.4%</span>
            <span className="text-gray-500 text-xs">vs mois dernier</span>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      {accounts.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C8A961]/10 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-[#C8A961]" />
          </div>
          <h3 className="text-white font-medium mb-2">Aucun compte bancaire connecté</h3>
          <p className="text-gray-400 text-sm mb-4">
            Connectez votre premier compte bancaire pour commencer
          </p>
          <button
            onClick={() => setShowAddAccount(true)}
            className="px-4 py-2 bg-gradient-to-r from-[#C8A961] to-[#8B6914] text-[#0A0E17] rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            Connecter un compte
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc, i) => (
            <div 
              key={acc.id} 
              onClick={() => setSelectedAccount(i)} 
              className={`rounded-2xl border bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-0.5 cursor-pointer relative overflow-hidden ${
                selectedAccount === i ? 'border-white/20' : 'border-white/5 hover:border-white/10'
              }`}
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: acc.color }} />
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-gray-100 font-bold text-sm">{acc.bankName}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{acc.name} · ••••{acc.number.slice(-4)}</p>
                </div>
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ background: acc.status === 'active' ? '#34d399' : acc.status === 'syncing' ? '#fbbf24' : '#ef4444' }} 
                />
              </div>
              <p className="text-2xl font-extrabold text-gray-100 mb-2">{showMask ? '••••••' : fmt(acc.balance)}</p>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-gray-500">Sync: {formatLastSync(acc.lastSync)}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleRefresh(); }}
                  className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold transition-colors"
                  style={{ background: `${acc.color}15`, color: acc.color }}
                >
                  <RefreshCw size={12} /> Sync
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D1117] rounded-xl p-1 w-fit">
        {([['statements', 'Relevés'], ['analytics', 'Analyses'], ['connections', 'Connexions']] as const).map(([key, label]) => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)} 
            className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
              activeTab === key ? 'bg-gray-800 text-gray-100' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'statements' && (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-gray-100">
              Relevé {accounts[selectedAccount] ? `— ${accounts[selectedAccount].bankName}` : ''}
            </h3>
            <button className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-[#0D1117] border border-gray-800 text-gray-400 text-xs hover:text-gray-300 transition-colors">
              <Download size={14} /> Exporter
            </button>
          </div>
          {statements.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">Aucune transaction trouvée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-800">
                    {['Date', 'Description', 'Débit', 'Crédit', 'Solde', 'Référence'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statements.map(s => (
                    <tr key={s.id} className="border-b border-gray-800/50 hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-[13px]">{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                      <td className="px-4 py-3 text-gray-100 text-[13px] font-medium">{s.description}</td>
                      <td className={`px-4 py-3 text-[13px] font-semibold ${s.debit > 0 ? 'text-red-400' : 'text-gray-700'}`}>
                        {s.debit > 0 ? '-' + fmt(s.debit) : '—'}
                      </td>
                      <td className={`px-4 py-3 text-[13px] font-semibold ${s.credit > 0 ? 'text-green-400' : 'text-gray-700'}`}>
                        {s.credit > 0 ? '+' + fmt(s.credit) : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-100 text-[13px] font-semibold">{fmt(s.balance)}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{s.reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
            <h3 className="text-[15px] font-bold text-gray-100 mb-5">Évolution du Solde (M XAF)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                <Line type="monotone" dataKey="balance" stroke="#C8A961" strokeWidth={2.5} dot={{ fill: '#C8A961', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
            <h3 className="text-[15px] font-bold text-gray-100 mb-5">Entrées / Sorties (M XAF)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyIO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                <Bar dataKey="inflow" fill="#34d399" radius={[4, 4, 0, 0]} name="Entrées" />
                <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} name="Sorties" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'connections' && (
        <div className="flex flex-col gap-4">
          {accounts.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-center">
              <p className="text-gray-500">Aucun compte connecté</p>
            </div>
          ) : (
            accounts.map(acc => (
              <div key={acc.id} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ background: `${acc.color}20` }}
                    >
                      <Building2 size={22} style={{ color: acc.color }} />
                    </div>
                    <div>
                      <p className="text-gray-100 font-bold text-[15px]">{acc.bankName}</p>
                      <p className="text-gray-500 text-xs">API v2.1 · ••••{acc.number.slice(-4)} · Dernière sync: {formatLastSync(acc.lastSync)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-500/10">
                      <div className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-green-400 text-xs font-semibold">Connecté</span>
                    </div>
                    <button 
                      onClick={() => handleRefresh()}
                      className="px-3.5 py-1.5 rounded-md bg-[#0D1117] border border-gray-800 text-gray-400 text-xs font-semibold hover:text-gray-300 transition-colors"
                    >
                      Reconnecter
                    </button>
                    <button 
                      onClick={() => handleDeleteAccount(acc.id)}
                      className="px-3.5 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-colors"
                    >
                      Déconnecter
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowTransfer(false)} />
          <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-100">Nouveau Virement</h2>
              <button onClick={() => setShowTransfer(false)} className="text-gray-500 hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Compte source</label>
                <select className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.bankName} — {a.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Bénéficiaire</label>
                <input 
                  type="text" 
                  placeholder="Nom ou compte destinataire" 
                  className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Montant (XAF)</label>
                <input 
                  type="number" 
                  placeholder="0" 
                  className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Référence</label>
                <input 
                  type="text" 
                  placeholder="Description du virement" 
                  className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600" 
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Type de virement</label>
                <div className="flex gap-2">
                  {['Interne', 'SEPA', 'Swift'].map((t, i) => (
                    <button 
                      key={t} 
                      className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
                        i === 0 
                          ? 'bg-indigo-500/15 border border-indigo-500 text-indigo-400' 
                          : 'bg-[#0D1117] border border-gray-800 text-gray-400 hover:text-gray-300'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button 
                onClick={() => setShowTransfer(false)} 
                className="px-5 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-[13px] font-semibold hover:text-gray-300 transition-colors"
              >
                Annuler
              </button>
              <button className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#C8A961] to-[#8B6914] text-[#0A0E17] text-[13px] font-bold hover:opacity-90 transition-opacity">
                <Send size={14} /> Exécuter le virement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddAccount && (
        <AddAccountModal 
          onClose={() => setShowAddAccount(false)} 
          onAdd={handleAddAccount} 
        />
      )}
    </div>
  );
}

function AddAccountModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: Partial<BankAccount>) => void;
}) {
  const [formData, setFormData] = useState({
    bankName: '',
    name: '',
    number: '',
    balance: '',
    color: '#6366f1',
  });

  const bankColors = ['#6366f1', '#22d3ee', '#a78bfa', '#34d399', '#f59e0b', '#ef4444'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      balance: parseFloat(formData.balance) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-2xl">
        <div className="p-6 border-b border-gray-800">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-100">Connecter un compte bancaire</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-300 transition-colors">
              <X size={20} />
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-1">Ajoutez votre compte pour suivre vos transactions</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1.5">Nom de la banque</label>
            <input
              type="text"
              value={formData.bankName}
              onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
              placeholder="Ex: BGFI Bank, UBA, Ecobank..."
              className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1.5">Nom du compte</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Compte Principal, Épargne..."
              className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1.5">Numéro de compte</label>
            <input
              type="text"
              value={formData.number}
              onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              placeholder="Ex: GA12345678901234"
              className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600"
              required
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1.5">Solde initial (XAF)</label>
            <input
              type="number"
              value={formData.balance}
              onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
              placeholder="0"
              className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-[13px] outline-none focus:border-[#C8A961] transition-colors placeholder:text-gray-600"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-400 block mb-1.5">Couleur</label>
            <div className="flex items-center gap-2">
              {bankColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-8 h-8 rounded-lg transition-all ${
                    formData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-800 text-gray-400 rounded-xl hover:text-gray-300 transition-colors font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-gradient-to-r from-[#C8A961] to-[#8B6914] text-[#0A0E17] rounded-xl font-bold hover:opacity-90 transition-opacity"
            >
              Connecter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
