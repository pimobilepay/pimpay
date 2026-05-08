'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, FileText, Download, Printer, Mail, Calendar, Eye,
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon,
  ArrowUpRight, Clock, CheckCircle, Trash2, Share2, X,
  FileSpreadsheet, File, Loader2, RefreshCw,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface ReportSummary {
  totalRecettes: number;
  totalDepenses: number;
  totalProfit: number;
  totalTransactions: number;
  recettesChange: number;
  depensesChange: number;
  profitChange: number;
  transactionsChange: number;
}

interface RevenueDataItem {
  month: string;
  recettes: number;
  depenses: number;
  profit: number;
}

interface ExpenseCategory {
  name: string;
  value: number;
  amount: number;
  color: string;
}

interface TopClient {
  rank: number;
  name: string;
  revenue: number;
  transactions: number;
  growth: number;
}

interface Report { id: number; name: string; type: string; period: string; date: string; by: string; size: string; }

const REPORT_TYPES = [
  { key: 'bilan', label: 'Bilan Financier', desc: 'Vue complète de la situation financière', icon: FileText, color: '#6366f1', lastGen: '2024-04-08' },
  { key: 'resultat', label: 'Compte de Résultat', desc: 'Revenus, charges et résultat net', icon: TrendingUp, color: '#34d399', lastGen: '2024-04-05' },
  { key: 'tresorerie', label: 'Flux de Trésorerie', desc: 'Mouvements de trésorerie détaillés', icon: DollarSign, color: '#22d3ee', lastGen: '2024-04-01' },
  { key: 'paie', label: 'Rapport de Paie', desc: 'Masse salariale et détails employés', icon: PieIcon, color: '#a78bfa', lastGen: '2024-03-31' },
];

const REPORTS_HISTORY: Report[] = [
  { id: 1, name: 'Bilan Financier Q1 2024', type: 'Bilan', period: 'Jan-Mar 2024', date: '2024-04-08', by: 'Jean-Pierre Mbarga', size: '2.4 MB' },
  { id: 2, name: 'Compte de Résultat Mars 2024', type: 'Résultat', period: 'Mars 2024', date: '2024-04-05', by: 'Sandrine Ateba', size: '1.8 MB' },
  { id: 3, name: 'Flux de Trésorerie Q1', type: 'Trésorerie', period: 'Jan-Mar 2024', date: '2024-04-01', by: 'Jean-Pierre Mbarga', size: '1.5 MB' },
  { id: 4, name: 'Rapport Paie Mars 2024', type: 'Paie', period: 'Mars 2024', date: '2024-03-31', by: 'Aïcha Bello', size: '890 KB' },
  { id: 5, name: 'Bilan Financier Février', type: 'Bilan', period: 'Fév 2024', date: '2024-03-05', by: 'Sandrine Ateba', size: '2.1 MB' },
  { id: 6, name: 'Analyse Dépenses Q4 2023', type: 'Résultat', period: 'Oct-Déc 2023', date: '2024-01-15', by: 'Jean-Pierre Mbarga', size: '3.2 MB' },
  { id: 7, name: 'Rapport Annuel 2023', type: 'Bilan', period: '2023', date: '2024-01-10', by: 'Jean-Pierre Mbarga', size: '8.5 MB' },
  { id: 8, name: 'Flux Trésorerie Décembre', type: 'Trésorerie', period: 'Déc 2023', date: '2024-01-03', by: 'Sandrine Ateba', size: '1.2 MB' },
];

const agingReport = [
  { range: '0-30 jours', count: 12, amount: 234_500_000, pct: 45 },
  { range: '31-60 jours', count: 8, amount: 156_200_000, pct: 30 },
  { range: '61-90 jours', count: 5, amount: 89_400_000, pct: 17 },
  { range: '90+ jours', count: 3, amount: 42_100_000, pct: 8 },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('bilan');
  const [showPreview, setShowPreview] = useState(false);
  const [period, setPeriod] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Real data states
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataItem[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('pimpay_token') : null;
      const response = await fetch(`/api/business/reports?period=${period}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors du chargement');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        setSummary(result.data.summary);
        setRevenueData(result.data.revenueData || []);
        setExpenseCategories(result.data.expenseCategories || []);
        setTopClients(result.data.topClients || []);
      }
    } catch (err: any) {
      console.error('Error fetching reports:', err);
      setError(err.message || 'Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Use real data or fallback to sample data if empty
  const chartData = revenueData.length > 0 ? revenueData.map(d => ({
    month: d.month,
    revenue: d.recettes,
    expenses: d.depenses,
    profit: d.profit
  })) : [
    { month: 'Jan', revenue: 620, expenses: 180, profit: 440 },
    { month: 'Fév', revenue: 710, expenses: 195, profit: 515 },
    { month: 'Mar', revenue: 680, expenses: 210, profit: 470 },
    { month: 'Avr', revenue: 750, expenses: 188, profit: 562 },
    { month: 'Mai', revenue: 790, expenses: 220, profit: 570 },
    { month: 'Jun', revenue: 820, expenses: 205, profit: 615 },
  ];

  const expenseBreakdown = expenseCategories.length > 0 ? expenseCategories : [
    { name: 'Salaires', value: 40, color: '#6366f1' },
    { name: 'Loyers', value: 15, color: '#22d3ee' },
    { name: 'Technologie', value: 20, color: '#a78bfa' },
    { name: 'Marketing', value: 12, color: '#34d399' },
    { name: 'Opérations', value: 8, color: '#f59e0b' },
    { name: 'Autres', value: 5, color: '#94a3b8' },
  ];

  const clientsList = topClients.length > 0 ? topClients.map(c => ({
    name: c.name,
    revenue: c.revenue,
    share: Math.min(c.growth + 10, 20)
  })) : [
    { name: 'Orange Money Cameroun', revenue: 312_000_000, share: 18.2 },
    { name: 'Ecobank Transnational', revenue: 267_800_000, share: 15.6 },
    { name: 'BGFI Holdings', revenue: 198_400_000, share: 11.6 },
    { name: 'Société Générale Cameroun', revenue: 176_500_000, share: 10.3 },
    { name: 'MTN MoMo', revenue: 156_200_000, share: 9.1 },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-100 tracking-tight">Rapports Financiers</h1>
          <p className="text-gray-400 text-sm mt-1">
            {summary ? `${summary.totalTransactions} transactions analysees` : `${REPORTS_HISTORY.length} rapports generes`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-[#0D1117] border border-white/10 rounded-lg text-gray-300 text-sm outline-none focus:border-indigo-500"
          >
            <option value="1m">1 mois</option>
            <option value="3m">3 mois</option>
            <option value="6m">6 mois</option>
            <option value="1y">1 an</option>
          </select>
          <button 
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-white/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowPreview(true)} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border-none cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17' }}
          >
            <BarChart3 size={18} /> Generer Rapport
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {[
            { label: 'Recettes', value: summary.totalRecettes, change: summary.recettesChange, color: '#10b981', icon: TrendingUp },
            { label: 'Depenses', value: summary.totalDepenses, change: summary.depensesChange, color: '#ef4444', icon: TrendingDown },
            { label: 'Profit', value: summary.totalProfit, change: summary.profitChange, color: '#6366f1', icon: DollarSign },
            { label: 'Transactions', value: summary.totalTransactions, change: summary.transactionsChange, color: '#f59e0b', icon: BarChart3, isCount: true },
          ].map((item, i) => (
            <div key={i} className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs sm:text-sm">{item.label}</span>
                <item.icon size={16} style={{ color: item.color }} />
              </div>
              <p className="text-lg sm:text-xl font-bold text-white">
                {item.isCount ? item.value.toLocaleString('fr-FR') : fmt(item.value)}
              </p>
              <div className="flex items-center gap-1 mt-1">
                {item.change >= 0 ? (
                  <ArrowUpRight size={14} className="text-green-400" />
                ) : (
                  <TrendingDown size={14} className="text-red-400" />
                )}
                <span className={`text-xs ${item.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {item.change >= 0 ? '+' : ''}{item.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Report Type Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {REPORT_TYPES.map(r => (
          <div 
            key={r.key} 
            onClick={() => setSelectedReport(r.key)} 
            className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-lg transition-all duration-300 hover:border-white/10 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer relative overflow-hidden"
            style={{ borderColor: selectedReport === r.key ? `${r.color}40` : undefined }}
          >
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: r.color }} />
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
              style={{ background: `${r.color}20` }}
            >
              <r.icon size={20} style={{ color: r.color }} />
            </div>
            <p className="text-gray-100 font-bold text-sm">{r.label}</p>
            <p className="text-gray-500 text-xs mt-1 line-clamp-2">{r.desc}</p>
            <p className="text-gray-600 text-xs mt-2">Dernier: {r.lastGen}</p>
          </div>
        ))}
      </div>

      {/* Export Bar */}
      <div className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-3 sm:p-4 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar size={16} className="text-gray-500" />
            <input 
              type="date" 
              defaultValue="2024-01-01" 
              className="px-2 py-1.5 bg-[#0D1117] border border-white/10 rounded-md text-gray-100 text-xs outline-none"
            />
            <span className="text-gray-500 text-xs">a</span>
            <input 
              type="date" 
              defaultValue="2024-04-10" 
              className="px-2 py-1.5 bg-[#0D1117] border border-white/10 rounded-md text-gray-100 text-xs outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: File, label: 'PDF', color: '#ef4444' },
              { icon: FileSpreadsheet, label: 'Excel', color: '#34d399' },
              { icon: Printer, label: 'Imprimer', color: '#6B7280' },
              { icon: Mail, label: 'Email', color: '#6366f1' },
            ].map(b => (
              <button 
                key={b.label} 
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1117] border border-white/10 text-gray-400 text-xs cursor-pointer font-semibold transition-all hover:border-white/20 hover:text-white"
              >
                <b.icon size={14} style={{ color: b.color }} /> {b.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-center">
          <p className="text-red-400">{error}</p>
          <button 
            onClick={fetchReportData}
            className="mt-2 px-4 py-2 bg-red-500/20 rounded-lg text-red-400 text-sm hover:bg-red-500/30 transition-colors"
          >
            Reessayer
          </button>
        </div>
      )}

      {/* Financial Overview */}
      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Revenue vs Expenses Chart */}
            <div className="lg:col-span-2 rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-5 shadow-lg">
              <h3 className="text-sm font-bold text-gray-100 mb-4">Revenus vs Depenses (XAF)</h3>
              <div className="h-[250px] sm:h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#ef4444" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                    <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#1F2937' }} />
                    <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#1F2937' }} />
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} name="Revenus" />
                    <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Depenses" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Expense Breakdown Pie */}
            <div className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-5 shadow-lg">
              <h3 className="text-sm font-bold text-gray-100 mb-4">Repartition Depenses</h3>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" stroke="none">
                      {expenseBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {expenseBreakdown.map(e => (
                  <div key={e.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2 h-2 rounded-sm" style={{ background: e.color }} />
                    <span className="text-gray-400">{e.name} {e.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Profit Margin Trend */}
          <div className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 sm:p-5 shadow-lg">
            <h3 className="text-sm font-bold text-gray-100 mb-4">Marge Beneficiaire (XAF)</h3>
            <div className="h-[180px] sm:h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#1F2937' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#1F2937' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                  <Line type="monotone" dataKey="profit" stroke="#C8A961" strokeWidth={2.5} dot={{ fill: '#C8A961', r: 3 }} name="Marge" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Clients + Aging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Clients */}
            <div className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-gray-100">Top Clients par Revenu</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Client', 'Revenu', 'Part'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {clientsList.map((c, i) => (
                      <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-gray-100 text-xs font-medium truncate max-w-[150px]">{c.name}</td>
                        <td className="px-4 py-2.5 text-gray-100 text-xs font-semibold">{fmt(c.revenue)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${c.share * 5}%` }} />
                            </div>
                            <span className="text-gray-400 text-xs font-semibold min-w-[35px]">{c.share.toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aging Report */}
            <div className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-bold text-gray-100">Creances — Rapport d&apos;Anciennete</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Periode', 'Factures', 'Montant', '%'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {agingReport.map((a, i) => {
                      const colors = ['#34d399', '#fbbf24', '#f59e0b', '#ef4444'];
                      return (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-2.5 text-gray-100 text-xs font-medium">{a.range}</td>
                          <td className="px-4 py-2.5 text-gray-400 text-xs">{a.count}</td>
                          <td className="px-4 py-2.5 text-gray-100 text-xs font-semibold">{fmt(a.amount)}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 rounded-full bg-gray-700 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${a.pct}%`, background: colors[i] }} />
                              </div>
                              <span className="text-xs font-semibold min-w-[30px]" style={{ color: colors[i] }}>{a.pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Reports History */}
          <div className="rounded-xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5">
              <h3 className="text-sm font-bold text-gray-100">Historique des Rapports</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Rapport', 'Type', 'Periode', 'Date', 'Genere par', 'Taille', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {REPORTS_HISTORY.map(r => (
                    <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-3 text-gray-100 text-xs font-semibold">{r.name}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded bg-indigo-500/15 text-indigo-400 text-xs font-semibold">{r.type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.period}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.date}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{r.by}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{r.size}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          {[{ icon: Download, t: 'Telecharger' }, { icon: Share2, t: 'Partager' }].map((a, j) => (
                            <button 
                              key={j} 
                              title={a.t} 
                              className="w-7 h-7 rounded-md bg-[#0D1117] border border-white/10 flex items-center justify-center text-gray-400 cursor-pointer hover:border-white/20 hover:text-white transition-colors"
                            >
                              <a.icon size={14} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
