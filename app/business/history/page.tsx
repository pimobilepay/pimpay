'use client';

import React, { useState, useMemo } from 'react';
import {
  History, Search, Download, Filter, Calendar, ArrowUpRight, ArrowDownRight,
  LogIn, FileText, Settings, UserPlus, BarChart3, CreditCard, Eye,
  ChevronLeft, ChevronRight, List, Clock, TrendingUp, Activity,
  DollarSign, Users, Edit3, Shield, CheckCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type EventType = 'payment_sent' | 'payment_received' | 'invoice_created' | 'user_login' | 'settings_changed' | 'employee_added' | 'report_generated';
type ViewMode = 'timeline' | 'table';

interface HistoryEntry {
  id: number; type: EventType; description: string; user: string; userAvatar: string;
  amount: number | null; date: string; time: string; ip: string;
}

const TYPE_CFG: Record<EventType, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  payment_sent: { label: 'Paiement envoyé', icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/20' },
  payment_received: { label: 'Paiement reçu', icon: ArrowDownRight, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  invoice_created: { label: 'Facture créée', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  user_login: { label: 'Connexion', icon: LogIn, color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  settings_changed: { label: 'Paramètre modifié', icon: Settings, color: 'text-amber-400', bg: 'bg-amber-500/20' },
  employee_added: { label: 'Employé ajouté', icon: UserPlus, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  report_generated: { label: 'Rapport généré', icon: BarChart3, color: 'text-indigo-400', bg: 'bg-indigo-500/20' },
};

const HISTORY: HistoryEntry[] = [
  { id: 1, type: 'payment_sent', description: 'Paiement de 45 600 000 XAF envoyé à BGFI Holdings', user: 'Jean-Pierre Mbarga', userAvatar: 'JPM', amount: 45600000, date: '2024-04-10', time: '14:23', ip: '197.159.2.45' },
  { id: 2, type: 'user_login', description: 'Connexion depuis Chrome / macOS', user: 'Marie-Claire Ngo', userAvatar: 'MCN', amount: null, date: '2024-04-10', time: '13:45', ip: '197.159.2.48' },
  { id: 3, type: 'invoice_created', description: 'Facture INV-2024-012 créée pour Orange Cameroun', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 8750000, date: '2024-04-10', time: '11:30', ip: '197.159.2.45' },
  { id: 4, type: 'payment_received', description: 'Paiement de 28 350 000 XAF reçu de Afriland First Group', user: 'Système', userAvatar: 'SY', amount: 28350000, date: '2024-04-10', time: '10:15', ip: '-' },
  { id: 5, type: 'report_generated', description: 'Rapport mensuel Mars 2024 généré avec succès', user: 'Sandrine Ateba', userAvatar: 'SA', amount: null, date: '2024-04-10', time: '09:00', ip: '197.159.2.45' },
  { id: 6, type: 'settings_changed', description: 'Activation de l\'authentification 2FA', user: 'Jean-Pierre Mbarga', userAvatar: 'JPM', amount: null, date: '2024-04-09', time: '17:30', ip: '197.159.2.45' },
  { id: 7, type: 'employee_added', description: 'Nouvel employé: Robert Manga (Département IT)', user: 'Jean-Pierre Mbarga', userAvatar: 'JPM', amount: null, date: '2024-04-09', time: '15:20', ip: '197.159.2.45' },
  { id: 8, type: 'payment_sent', description: 'Paiement de 15 200 000 XAF initié vers UBA Cameroun', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 15200000, date: '2024-04-09', time: '14:00', ip: '197.159.2.45' },
  { id: 9, type: 'user_login', description: 'Connexion depuis Safari / iOS', user: 'Jean-Pierre Mbarga', userAvatar: 'JPM', amount: null, date: '2024-04-09', time: '08:30', ip: '197.159.2.48' },
  { id: 10, type: 'payment_received', description: 'Paiement de 67 800 000 XAF reçu de Ecobank', user: 'Système', userAvatar: 'SY', amount: 67800000, date: '2024-04-08', time: '16:45', ip: '-' },
  { id: 11, type: 'invoice_created', description: 'Facture INV-2024-011 créée pour MTN Cameroun', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 12300000, date: '2024-04-08', time: '14:20', ip: '197.159.2.45' },
  { id: 12, type: 'settings_changed', description: 'Mise à jour du profil entreprise (adresse)', user: 'Jean-Pierre Mbarga', userAvatar: 'JPM', amount: null, date: '2024-04-08', time: '11:00', ip: '197.159.2.45' },
  { id: 13, type: 'payment_sent', description: 'Paiement de 23 400 000 XAF envoyé à TechVision', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 23400000, date: '2024-04-07', time: '15:30', ip: '197.159.2.45' },
  { id: 14, type: 'user_login', description: 'Connexion depuis Firefox / Windows', user: 'Paul Essomba', userAvatar: 'PE', amount: null, date: '2024-04-07', time: '09:15', ip: '41.202.219.73' },
  { id: 15, type: 'report_generated', description: 'Rapport hebdomadaire Semaine 14 généré', user: 'Système', userAvatar: 'SY', amount: null, date: '2024-04-07', time: '06:00', ip: '-' },
  { id: 16, type: 'payment_received', description: 'Paiement de 8 750 000 XAF reçu de Orange Cameroun', user: 'Système', userAvatar: 'SY', amount: 8750000, date: '2024-04-06', time: '13:20', ip: '-' },
  { id: 17, type: 'employee_added', description: 'Nouvel employé: Claire Biya (Département Marketing)', user: 'Jean-Pierre Mbarga', userAvatar: 'JPM', amount: null, date: '2024-04-05', time: '10:45', ip: '197.159.2.45' },
  { id: 18, type: 'payment_sent', description: 'Paiement de 3 200 000 XAF envoyé à Bureau Express', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 3200000, date: '2024-04-05', time: '09:30', ip: '197.159.2.45' },
  { id: 19, type: 'user_login', description: 'Tentative de connexion échouée', user: 'Inconnu', userAvatar: '??', amount: null, date: '2024-04-04', time: '22:15', ip: '102.16.42.8' },
  { id: 20, type: 'invoice_created', description: 'Facture INV-2024-010 créée pour SONATREL', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 4500000, date: '2024-04-04', time: '14:00', ip: '197.159.2.45' },
  { id: 21, type: 'payment_sent', description: 'Paiement de 18 900 000 XAF envoyé à CloudAfrica', user: 'Sandrine Ateba', userAvatar: 'SA', amount: 18900000, date: '2024-04-03', time: '11:45', ip: '197.159.2.45' },
  { id: 22, type: 'settings_changed', description: 'Webhook URL mis à jour', user: 'Paul Essomba', userAvatar: 'PE', amount: null, date: '2024-04-03', time: '10:00', ip: '41.202.219.73' },
];

const activityChart = [
  { day: '1 Avr', paiements: 3, factures: 1, connexions: 4, autres: 1 },
  { day: '2 Avr', paiements: 2, factures: 0, connexions: 3, autres: 0 },
  { day: '3 Avr', paiements: 1, factures: 1, connexions: 2, autres: 1 },
  { day: '4 Avr', paiements: 0, factures: 1, connexions: 2, autres: 0 },
  { day: '5 Avr', paiements: 2, factures: 0, connexions: 1, autres: 1 },
  { day: '6 Avr', paiements: 1, factures: 0, connexions: 3, autres: 0 },
  { day: '7 Avr', paiements: 1, factures: 0, connexions: 2, autres: 1 },
  { day: '8 Avr', paiements: 2, factures: 1, connexions: 1, autres: 1 },
  { day: '9 Avr', paiements: 1, factures: 0, connexions: 2, autres: 1 },
  { day: '10 Avr', paiements: 3, factures: 1, connexions: 2, autres: 1 },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';
type TabFilter = 'all' | 'transactions' | 'activities' | 'logins' | 'changes';
type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom';

export default function HistoryPage() {
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [page, setPage] = useState(1);
  const perPage = 10;

  const filtered = useMemo(() => {
    let list = HISTORY;
    if (tabFilter === 'transactions') list = list.filter(h => h.type === 'payment_sent' || h.type === 'payment_received');
    if (tabFilter === 'activities') list = list.filter(h => h.type === 'invoice_created' || h.type === 'employee_added' || h.type === 'report_generated');
    if (tabFilter === 'logins') list = list.filter(h => h.type === 'user_login');
    if (tabFilter === 'changes') list = list.filter(h => h.type === 'settings_changed');
    if (search) list = list.filter(h => h.description.toLowerCase().includes(search.toLowerCase()) || h.user.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [search, tabFilter]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  const totalVolume = HISTORY.filter(h => h.amount).reduce((s, h) => s + (h.amount || 0), 0);
  const thisMonth = HISTORY.filter(h => h.date.startsWith('2024-04')).length;

  const grouped = useMemo(() => {
    const map: Record<string, HistoryEntry[]> = {};
    paged.forEach(h => { (map[h.date] ??= []).push(h); });
    return Object.entries(map);
  }, [paged]);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Toutes' }, { key: 'transactions', label: 'Transactions' },
    { key: 'activities', label: 'Activités' }, { key: 'logins', label: 'Connexions' }, { key: 'changes', label: 'Modifications' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center"><History className="w-5 h-5 text-amber-400" /></div>
          <div><h1 className="text-xl font-bold text-white">Historique</h1><p className="text-sm text-gray-400">Activité complète de votre compte</p></div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Download className="w-4 h-4" />Exporter CSV</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Download className="w-4 h-4" />Exporter PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: HISTORY.length.toString(), icon: Activity, color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { label: 'Volume Total', value: fmt(totalVolume), icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Ce Mois', value: thisMonth.toString(), icon: Calendar, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Croissance', value: '+12.5%', icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/20' },
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
        <h2 className="text-sm font-semibold text-white mb-4">Distribution des activités</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="paiements" fill="#6366f1" radius={[2, 2, 0, 0]} name="Paiements" />
              <Bar dataKey="factures" fill="#22d3ee" radius={[2, 2, 0, 0]} name="Factures" />
              <Bar dataKey="connexions" fill="#a78bfa" radius={[2, 2, 0, 0]} name="Connexions" />
              <Bar dataKey="autres" fill="#34d399" radius={[2, 2, 0, 0]} name="Autres" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Date Range + Tabs + View Toggle */}
      <div className="space-y-4">
        <div className="flex gap-2">
          {[{ k: 'today', l: "Aujourd'hui" },{ k: '7d', l: '7 jours' },{ k: '30d', l: '30 jours' },{ k: '90d', l: '90 jours' },{ k: 'custom', l: 'Personnalisé' }].map(d => (
            <button key={d.k} onClick={() => setDateRange(d.k as DateRange)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${dateRange === d.k ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{d.l}</button>
          ))}
        </div>
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {tabs.map(t => (<button key={t.key} onClick={() => { setTabFilter(t.key); setPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tabFilter === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>{t.label}</button>))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56" /></div>
            <div className="flex bg-white/5 rounded-lg p-1">
              <button onClick={() => setViewMode('timeline')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'timeline' ? 'bg-white/10 text-white' : 'text-gray-400'}`}><Clock className="w-4 h-4" /></button>
              <button onClick={() => setViewMode('table')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-400'}`}><List className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline View */}
      {viewMode === 'timeline' && (
        <div className="space-y-6">
          {grouped.map(([date, entries]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3"><Calendar className="w-4 h-4 text-gray-500" /><span className="text-sm font-medium text-gray-400">{date}</span><div className="flex-1 h-px bg-white/5" /></div>
              <div className="space-y-2 ml-7">
                {entries.map(h => {
                  const cfg = TYPE_CFG[h.type];
                  return (
                    <div key={h.id} className="flex items-start gap-3 p-3 bg-[#0a0f1c] border border-white/5 rounded-xl hover:bg-white/[0.02] transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center flex-shrink-0`}><cfg.icon className={`w-4 h-4 ${cfg.color}`} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2"><span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span><span className="text-xs text-gray-500">{h.time}</span></div>
                        <p className="text-sm text-gray-300 mt-0.5">{h.description}</p>
                        <div className="flex items-center gap-3 mt-1"><span className="text-xs text-gray-500">{h.user}</span>{h.amount && <span className="text-xs font-medium text-white">{fmt(h.amount)}</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
              <th className="px-4 py-3">Date & Heure</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Utilisateur</th><th className="px-4 py-3">Montant</th><th className="px-4 py-3">IP</th>
            </tr></thead>
            <tbody className="divide-y divide-white/5">{paged.map(h => {
              const cfg = TYPE_CFG[h.type];
              return (
                <tr key={h.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-gray-300 text-xs whitespace-nowrap">{h.date} {h.time}</td>
                  <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg.replace('/20', '/10')} ${cfg.color}`}><cfg.icon className="w-3 h-3" />{cfg.label}</span></td>
                  <td className="px-4 py-3 text-gray-300 max-w-xs truncate">{h.description}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{h.user}</td>
                  <td className="px-4 py-3 text-white font-medium text-xs">{h.amount ? fmt(h.amount) : '—'}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.ip}</td>
                </tr>
              );
            })}</tbody>
          </table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
              <span className="text-xs text-gray-400">{filtered.length} entrées</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-xs text-gray-300">Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}