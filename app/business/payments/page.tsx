'use client';

import React, { useState, useMemo } from 'react';
import {
  CreditCard, Plus, Search, Filter, Download, Eye, X, Send,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, AlertTriangle,
  XCircle, ChevronLeft, ChevronRight, Calendar, DollarSign,
  ArrowRightLeft, RefreshCw, Smartphone, Building2,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type PayStatus = 'completed' | 'pending' | 'failed' | 'processing';
type PayMethod = 'virement' | 'mobile_money' | 'cheque' | 'carte';
type PayDirection = 'sent' | 'received';
interface Payment {
  id: string; beneficiary: string; email: string; amount: number;
  method: PayMethod; date: string; status: PayStatus; direction: PayDirection;
  description: string;
}

const STATUS_CFG: Record<PayStatus, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: 'Complété', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-amber-500/10 text-amber-400', icon: Clock },
  failed: { label: 'Échoué', color: 'bg-red-500/10 text-red-400', icon: XCircle },
  processing: { label: 'En cours', color: 'bg-blue-500/10 text-blue-400', icon: RefreshCw },
};

const METHOD_LABELS: Record<PayMethod, string> = {
  virement: 'Virement', mobile_money: 'Mobile Money', cheque: 'Chèque', carte: 'Carte',
};

const PAYMENTS: Payment[] = [
  { id: 'PAY-2024-001', beneficiary: 'BGFI Holdings', email: 'finance@bgfi.com', amount: 45600000, method: 'virement', date: '2024-04-10', status: 'completed', direction: 'sent', description: 'Paiement consultation Q1' },
  { id: 'PAY-2024-002', beneficiary: 'Afriland First Group', email: 'ap@afriland.com', amount: 28350000, method: 'virement', date: '2024-04-09', status: 'completed', direction: 'received', description: 'Règlement facture INV-2024-002' },
  { id: 'PAY-2024-003', beneficiary: 'Ecobank Transnational', email: 'procurement@ecobank.com', amount: 67800000, method: 'virement', date: '2024-04-08', status: 'completed', direction: 'sent', description: 'Migration plateforme' },
  { id: 'PAY-2024-004', beneficiary: 'UBA Cameroun', email: 'finance@uba.cm', amount: 15200000, method: 'mobile_money', date: '2024-04-07', status: 'pending', direction: 'sent', description: 'Services mensuels' },
  { id: 'PAY-2024-005', beneficiary: 'Orange Cameroun', email: 'b2b@orange.cm', amount: 8750000, method: 'mobile_money', date: '2024-04-06', status: 'completed', direction: 'received', description: 'Commission API Mobile Money' },
  { id: 'PAY-2024-006', beneficiary: 'MTN Cameroun', email: 'enterprise@mtn.cm', amount: 12300000, method: 'mobile_money', date: '2024-04-05', status: 'processing', direction: 'sent', description: 'Licence MoMo API' },
  { id: 'PAY-2024-007', beneficiary: 'TechVision Cameroun', email: 'contact@techvision.cm', amount: 23400000, method: 'virement', date: '2024-04-04', status: 'completed', direction: 'sent', description: 'Matériel informatique' },
  { id: 'PAY-2024-008', beneficiary: 'Bureau Express SARL', email: 'ventes@bureau-express.cm', amount: 3200000, method: 'cheque', date: '2024-04-03', status: 'completed', direction: 'sent', description: 'Fournitures de bureau' },
  { id: 'PAY-2024-009', beneficiary: 'CloudAfrica Services', email: 'enterprise@cloudafrica.io', amount: 18900000, method: 'carte', date: '2024-04-02', status: 'failed', direction: 'sent', description: 'Hébergement cloud annuel' },
  { id: 'PAY-2024-010', beneficiary: 'SONATREL', email: 'facturation@sonatrel.cm', amount: 4500000, method: 'virement', date: '2024-04-01', status: 'completed', direction: 'sent', description: 'Facture électricité' },
  { id: 'PAY-2024-011', beneficiary: 'Société Générale CM', email: 'corporate@sgcm.com', amount: 56200000, method: 'virement', date: '2024-03-30', status: 'completed', direction: 'received', description: 'Frais de gestion bancaire' },
  { id: 'PAY-2024-012', beneficiary: 'Camtel', email: 'entreprise@camtel.cm', amount: 2800000, method: 'mobile_money', date: '2024-03-29', status: 'completed', direction: 'sent', description: 'Abonnement internet' },
];

const chartData = [
  { month: 'Jan', sent: 420, received: 280 }, { month: 'Fév', sent: 510, received: 320 },
  { month: 'Mar', sent: 480, received: 390 }, { month: 'Avr', sent: 550, received: 410 },
  { month: 'Mai', sent: 590, received: 350 }, { month: 'Jun', sent: 620, received: 480 },
  { month: 'Jul', sent: 560, received: 420 }, { month: 'Aoû', sent: 600, received: 450 },
  { month: 'Sep', sent: 630, received: 390 }, { month: 'Oct', sent: 610, received: 470 },
  { month: 'Nov', sent: 647, received: 510 }, { month: 'Déc', sent: 670, received: 530 },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';
type TabFilter = 'all' | 'sent' | 'received' | 'pending' | 'failed';

export default function PaymentsPage() {
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [selected, setSelected] = useState<Payment | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    let list = PAYMENTS;
    if (tabFilter === 'sent') list = list.filter(p => p.direction === 'sent');
    if (tabFilter === 'received') list = list.filter(p => p.direction === 'received');
    if (tabFilter === 'pending') list = list.filter(p => p.status === 'pending' || p.status === 'processing');
    if (tabFilter === 'failed') list = list.filter(p => p.status === 'failed');
    if (methodFilter !== 'all') list = list.filter(p => p.method === methodFilter);
    if (search) list = list.filter(p => p.beneficiary.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [search, tabFilter, methodFilter]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  const totalSent = PAYMENTS.filter(p => p.direction === 'sent' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalReceived = PAYMENTS.filter(p => p.direction === 'received' && p.status === 'completed').reduce((s, p) => s + p.amount, 0);
  const totalPending = PAYMENTS.filter(p => p.status === 'pending' || p.status === 'processing').reduce((s, p) => s + p.amount, 0);
  const totalFailed = PAYMENTS.filter(p => p.status === 'failed').reduce((s, p) => s + p.amount, 0);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Tous' }, { key: 'sent', label: 'Envoyés' }, { key: 'received', label: 'Reçus' },
    { key: 'pending', label: 'En Attente' }, { key: 'failed', label: 'Échoués' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center"><CreditCard className="w-5 h-5 text-cyan-400" /></div>
          <div><h1 className="text-xl font-bold text-white">Paiements</h1><p className="text-sm text-gray-400">Gérez vos paiements envoyés et reçus</p></div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Download className="w-4 h-4" />Exporter</button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all"><Plus className="w-4 h-4" />Nouveau Paiement</button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Envoyé', value: fmt(totalSent), icon: ArrowUpRight, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Total Reçu', value: fmt(totalReceived), icon: ArrowDownRight, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'En Attente', value: fmt(totalPending), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Échoué', value: fmt(totalFailed), icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
        ].map((c, i) => (
          <div key={i} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium">{c.label}</span>
              <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
            </div>
            <p className="text-lg font-bold text-white">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Volume des paiements (millions XAF)</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                <linearGradient id="recvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3} /><stop offset="95%" stopColor="#22d3ee" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Area type="monotone" dataKey="sent" stroke="#6366f1" fill="url(#sentGrad)" name="Envoyé" />
              <Area type="monotone" dataKey="received" stroke="#22d3ee" fill="url(#recvGrad)" name="Reçu" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTabFilter(t.key); setPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tabFilter === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>{t.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56" /></div>
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
            <option value="all">Toutes méthodes</option><option value="virement">Virement</option><option value="mobile_money">Mobile Money</option><option value="cheque">Chèque</option><option value="carte">Carte</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
              <th className="px-4 py-3">Référence</th><th className="px-4 py-3">Bénéficiaire</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">Méthode</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">
              {paged.map(p => {
                const st = STATUS_CFG[p.status];
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-gray-300 font-mono text-xs">{p.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${p.direction === 'sent' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                        <span className="text-white">{p.beneficiary}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{fmt(p.amount)}</td>
                    <td className="px-4 py-3 text-gray-400">{METHOD_LABELS[p.method]}</td>
                    <td className="px-4 py-3 text-gray-400">{p.date}</td>
                    <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}><st.icon className="w-3 h-3" />{st.label}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelected(p)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Eye className="w-4 h-4" /></button>
                        <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-400">{filtered.length} résultats</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-gray-300">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Détail du paiement</h2><button onClick={() => setSelected(null)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-4">
              {[{ l: 'Référence', v: selected.id },{ l: 'Bénéficiaire', v: selected.beneficiary },{ l: 'Montant', v: fmt(selected.amount) },{ l: 'Méthode', v: METHOD_LABELS[selected.method] },{ l: 'Date', v: selected.date },{ l: 'Description', v: selected.description }].map((f, i) => (
                <div key={i}><p className="text-xs text-gray-500">{f.l}</p><p className="text-sm text-white mt-1">{f.v}</p></div>
              ))}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-3">Progression</p>
              <div className="flex items-center gap-2">
                {['Initié', 'Vérifié', 'Envoyé', 'Reçu'].map((step, i) => {
                  const done = selected.status === 'completed' ? true : i < 2;
                  return (
                    <React.Fragment key={i}>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${done ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-500'}`}>
                        {done && <CheckCircle className="w-3 h-3" />}{step}
                      </div>
                      {i < 3 && <div className={`flex-1 h-px ${done ? 'bg-emerald-500/30' : 'bg-white/10'}`} />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Download className="w-4 h-4" />Télécharger le reçu</button>
          </div>
        </div>
      )}

      {/* New Payment Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-lg p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Nouveau Paiement</h2><button onClick={() => setShowNew(false)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
            {[{ l: 'Bénéficiaire', ph: 'Nom du bénéficiaire' },{ l: 'Montant (XAF)', ph: '0' },{ l: 'Référence', ph: 'REF-...' },{ l: 'Description', ph: 'Description du paiement' }].map((f, i) => (
              <div key={i}><label className="block text-xs text-gray-400 mb-1.5">{f.l}</label><input placeholder={f.ph} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" /></div>
            ))}
            <div><label className="block text-xs text-gray-400 mb-1.5">Méthode de paiement</label>
              <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"><option>Virement bancaire</option><option>Mobile Money</option><option>Chèque</option><option>Carte</option></select>
            </div>
            <button className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2"><Send className="w-4 h-4" />Envoyer le paiement</button>
          </div>
        </div>
      )}
    </div>
  );
}