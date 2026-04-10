'use client';

import React, { useState } from 'react';
import {
  BarChart3, FileText, Download, Printer, Mail, Calendar, Eye,
  TrendingUp, TrendingDown, DollarSign, PieChart as PieIcon,
  ArrowUpRight, Clock, CheckCircle, Trash2, Share2, X,
  FileSpreadsheet, File,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

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

const revenueExpenseData = [
  { month: 'Jan', revenue: 620, expenses: 180, profit: 440 },
  { month: 'Fév', revenue: 710, expenses: 195, profit: 515 },
  { month: 'Mar', revenue: 680, expenses: 210, profit: 470 },
  { month: 'Avr', revenue: 750, expenses: 188, profit: 562 },
  { month: 'Mai', revenue: 790, expenses: 220, profit: 570 },
  { month: 'Jun', revenue: 820, expenses: 205, profit: 615 },
  { month: 'Jul', revenue: 760, expenses: 198, profit: 562 },
  { month: 'Aoû', revenue: 800, expenses: 215, profit: 585 },
  { month: 'Sep', revenue: 830, expenses: 225, profit: 605 },
  { month: 'Oct', revenue: 810, expenses: 218, profit: 592 },
  { month: 'Nov', revenue: 847, expenses: 234, profit: 613 },
  { month: 'Déc', revenue: 870, expenses: 240, profit: 630 },
];

const expenseBreakdown = [
  { name: 'Salaires', value: 40, color: '#6366f1' },
  { name: 'Loyers', value: 15, color: '#22d3ee' },
  { name: 'Technologie', value: 20, color: '#a78bfa' },
  { name: 'Marketing', value: 12, color: '#34d399' },
  { name: 'Opérations', value: 8, color: '#f59e0b' },
  { name: 'Autres', value: 5, color: '#94a3b8' },
];

const topClients = [
  { name: 'Orange Money Cameroun', revenue: 312_000_000, share: 18.2 },
  { name: 'Ecobank Transnational', revenue: 267_800_000, share: 15.6 },
  { name: 'BGFI Holdings', revenue: 198_400_000, share: 11.6 },
  { name: 'Société Générale Cameroun', revenue: 176_500_000, share: 10.3 },
  { name: 'MTN MoMo', revenue: 156_200_000, share: 9.1 },
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

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Rapports Financiers</h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>{REPORTS_HISTORY.length} rapports générés</p>
        </div>
        <button onClick={() => setShowPreview(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          <BarChart3 size={18} /> Générer Rapport
        </button>
      </div>

      {/* Report Type Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {REPORT_TYPES.map(r => (
          <div key={r.key} onClick={() => setSelectedReport(r.key)} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', borderColor: selectedReport === r.key ? `${r.color}40` : undefined }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: r.color }} />
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: `${r.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
              <r.icon size={22} style={{ color: r.color }} />
            </div>
            <p style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '15px' }}>{r.label}</p>
            <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '4px' }}>{r.desc}</p>
            <p style={{ color: '#4B5563', fontSize: '11px', marginTop: '8px' }}>Dernier: {r.lastGen}</p>
          </div>
        ))}
      </div>

      {/* Export Bar */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Calendar size={16} style={{ color: '#6B7280' }} />
          <input type="date" defaultValue="2024-01-01" style={{ padding: '8px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#F3F4F6', fontSize: '12px', outline: 'none' }} />
          <span style={{ color: '#6B7280', fontSize: '12px' }}>à</span>
          <input type="date" defaultValue="2024-04-10" style={{ padding: '8px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#F3F4F6', fontSize: '12px', outline: 'none' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { icon: File, label: 'PDF', color: '#ef4444' },
            { icon: FileSpreadsheet, label: 'Excel', color: '#34d399' },
            { icon: Printer, label: 'Imprimer', color: '#6B7280' },
            { icon: Mail, label: 'Email', color: '#6366f1' },
          ].map(b => (
            <button key={b.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '8px', background: '#0D1117', border: '1px solid #1F2937', color: '#9CA3AF', fontSize: '12px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} className="hover:border-white/20 hover:text-white">
              <b.icon size={14} style={{ color: b.color }} /> {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* Financial Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Revenue vs Expenses Chart */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '20px' }}>Revenus vs Dépenses (M XAF)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueExpenseData}>
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
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revGrad)" strokeWidth={2} name="Revenus" />
              <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} name="Dépenses" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Pie */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '20px' }}>Répartition Dépenses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" stroke="none">
                {expenseBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
            {expenseBreakdown.map(e => (
              <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: e.color }} />
                <span style={{ color: '#9CA3AF' }}>{e.name} {e.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profit Margin Trend */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl" style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '20px' }}>Marge Bénéficiaire (M XAF)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueExpenseData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
            <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
            <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
            <Line type="monotone" dataKey="profit" stroke="#C8A961" strokeWidth={2.5} dot={{ fill: '#C8A961', r: 3 }} name="Marge" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Top Clients + Aging */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        {/* Top Clients */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Top Clients par Revenu</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937' }}>
                {['Client', 'Revenu', 'Part'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topClients.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }}>
                  <td style={{ padding: '10px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: '10px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(c.revenue)}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#1F2937', overflow: 'hidden' }}>
                        <div style={{ width: `${c.share * 5}%`, height: '100%', background: '#6366f1', borderRadius: '3px' }} />
                      </div>
                      <span style={{ color: '#9CA3AF', fontSize: '12px', fontWeight: 600, minWidth: '40px' }}>{c.share}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Aging Report */}
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Créances — Rapport d&apos;Ancienneté</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937' }}>
                {['Période', 'Factures', 'Montant', '%'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {agingReport.map((a, i) => {
                const colors = ['#34d399', '#fbbf24', '#f59e0b', '#ef4444'];
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }}>
                    <td style={{ padding: '10px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 500 }}>{a.range}</td>
                    <td style={{ padding: '10px 16px', color: '#9CA3AF', fontSize: '13px' }}>{a.count}</td>
                    <td style={{ padding: '10px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(a.amount)}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#1F2937', overflow: 'hidden' }}>
                          <div style={{ width: `${a.pct}%`, height: '100%', background: colors[i], borderRadius: '3px' }} />
                        </div>
                        <span style={{ color: colors[i], fontSize: '12px', fontWeight: 600, minWidth: '30px' }}>{a.pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reports History */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Historique des Rapports</h3>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1F2937' }}>
              {['Rapport', 'Type', 'Période', 'Date', 'Généré par', 'Taille', 'Actions'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REPORTS_HISTORY.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }} className="hover:bg-white/[0.02]">
                <td style={{ padding: '12px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(99,102,241,0.15)', color: '#6366f1', fontSize: '11px', fontWeight: 600 }}>{r.type}</span></td>
                <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '13px' }}>{r.period}</td>
                <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '13px' }}>{r.date}</td>
                <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '13px' }}>{r.by}</td>
                <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '13px' }}>{r.size}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {[{ icon: Download, t: 'Télécharger' }, { icon: Share2, t: 'Partager' }].map((a, j) => (
                      <button key={j} title={a.t} style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', cursor: 'pointer' }} className="hover:border-white/20 hover:text-white">
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
  );
}
