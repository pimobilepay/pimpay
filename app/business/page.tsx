'use client';

import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  FileText,
  BarChart2,
  Plus,
  UserPlus,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Bell,
  Settings,
  Search,
  ChevronDown,
  Wallet,
  Receipt,
  Users,
  Percent,
} from 'lucide-react';

const monthlyData = [
  { month: 'Jan', revenue: 620, expenses: 180 },
  { month: 'Fév', revenue: 710, expenses: 195 },
  { month: 'Mar', revenue: 680, expenses: 210 },
  { month: 'Avr', revenue: 750, expenses: 188 },
  { month: 'Mai', revenue: 790, expenses: 220 },
  { month: 'Jun', revenue: 820, expenses: 205 },
  { month: 'Jul', revenue: 760, expenses: 198 },
  { month: 'Aoû', revenue: 800, expenses: 215 },
  { month: 'Sep', revenue: 830, expenses: 225 },
  { month: 'Oct', revenue: 810, expenses: 218 },
  { month: 'Nov', revenue: 847, expenses: 234 },
  { month: 'Déc', revenue: 870, expenses: 240 },
];

const weekData = [
  { month: 'Lun', revenue: 120, expenses: 45 },
  { month: 'Mar', revenue: 145, expenses: 52 },
  { month: 'Mer', revenue: 132, expenses: 48 },
  { month: 'Jeu', revenue: 158, expenses: 55 },
  { month: 'Ven', revenue: 170, expenses: 60 },
  { month: 'Sam', revenue: 95, expenses: 30 },
  { month: 'Dim', revenue: 75, expenses: 25 },
];

const monthData30 = [
  { month: 'S1', revenue: 210, expenses: 65 },
  { month: 'S2', revenue: 225, expenses: 70 },
  { month: 'S3', revenue: 198, expenses: 58 },
  { month: 'S4', revenue: 214, expenses: 72 },
];

const quarterData = [
  { month: 'M1', revenue: 760, expenses: 198 },
  { month: 'M2', revenue: 810, expenses: 218 },
  { month: 'M3', revenue: 847, expenses: 234 },
];

const barData = [
  { name: 'Jan', transactions: 420 },
  { name: 'Fév', transactions: 380 },
  { name: 'Mar', transactions: 510 },
  { name: 'Avr', transactions: 460 },
  { name: 'Mai', transactions: 540 },
  { name: 'Jun', transactions: 490 },
  { name: 'Jul', transactions: 520 },
  { name: 'Aoû', transactions: 480 },
  { name: 'Sep', transactions: 610 },
  { name: 'Oct', transactions: 570 },
  { name: 'Nov', transactions: 630 },
  { name: 'Déc', transactions: 590 },
];

const pieData = [
  { name: 'Services', value: 45, color: '#6366f1' },
  { name: 'Produits', value: 28, color: '#22d3ee' },
  { name: 'Conseil', value: 18, color: '#c084fc' },
  { name: 'Abonnements', value: 9, color: '#34d399' },
];

const transactions = [
  { id: 1, date: '2024-11-28', description: 'Facture Client MTN', amount: 4500000, type: 'Facture', status: 'Complété', positive: true },
  { id: 2, date: '2024-11-27', description: 'Paiement Fournisseur Orange', amount: -1200000, type: 'Paiement', status: 'Complété', positive: false },
  { id: 3, date: '2024-11-26', description: 'Contrat Service SaaS', amount: 2800000, type: 'Contrat', status: 'En attente', positive: true },
  { id: 4, date: '2024-11-25', description: 'Remboursement Client', amount: -350000, type: 'Remboursement', status: 'Complété', positive: false },
  { id: 5, date: '2024-11-24', description: 'Vente Produits Tech', amount: 6700000, type: 'Vente', status: 'Complété', positive: true },
  { id: 6, date: '2024-11-23', description: 'Abonnement Premium', amount: 890000, type: 'Abonnement', status: 'En attente', positive: true },
  { id: 7, date: '2024-11-22', description: 'Paiement Salaires', amount: -8500000, type: 'Salaire', status: 'Complété', positive: false },
  { id: 8, date: '2024-11-21', description: 'Conseil Stratégique', amount: 3200000, type: 'Conseil', status: 'Echoué', positive: true },
  { id: 9, date: '2024-11-20', description: 'Renouvellement Licence', amount: 1500000, type: 'Licence', status: 'Complété', positive: true },
  { id: 10, date: '2024-11-19', description: 'Frais Bancaires', amount: -125000, type: 'Frais', status: 'Complété', positive: false },
];

const sparklineData = [
  [40, 55, 48, 62, 58, 72, 65, 80, 75, 85],
  [70, 65, 72, 68, 60, 55, 58, 52, 50, 48],
  [15, 18, 20, 22, 19, 21, 23, 22, 24, 23],
  [68, 70, 71, 69, 72, 71, 73, 72, 74, 72],
];

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 32;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,20,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px' }}>
        <p style={{ color: '#9ca3af', marginBottom: 6, fontSize: 12 }}>{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color, fontSize: 13, fontWeight: 600, margin: '2px 0' }}>
            {entry.name}: {entry.value}M XAF
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const BarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,20,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px' }}>
        <p style={{ color: '#9ca3af', marginBottom: 6, fontSize: 12 }}>{label}</p>
        <p style={{ color: '#6366f1', fontSize: 13, fontWeight: 600 }}>Transactions: {payload[0]?.value}</p>
      </div>
    );
  }
  return null;
};

const PieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'rgba(15,20,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px' }}>
        <p style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{payload[0]?.name}: {payload[0]?.value}%</p>
      </div>
    );
  }
  return null;
};

export default function BusinessDashboard() {
  const [activePeriod, setActivePeriod] = useState('12m');

  const getChartData = () => {
    switch (activePeriod) {
      case '7j': return weekData;
      case '30j': return monthData30;
      case '90j': return quarterData;
      default: return monthlyData;
    }
  };

  const kpiCards = [
    {
      title: 'Revenus Totaux',
      value: '847M XAF',
      change: '+12.4%',
      positive: true,
      icon: DollarSign,
      color: '#6366f1',
      sparkColor: '#6366f1',
      sparkIdx: 0,
    },
    {
      title: 'Dépenses',
      value: '234M XAF',
      change: '-3.2%',
      positive: false,
      icon: CreditCard,
      color: '#22d3ee',
      sparkColor: '#22d3ee',
      sparkIdx: 1,
    },
    {
      title: 'Factures en Attente',
      value: '23',
      change: '+5',
      positive: true,
      icon: Receipt,
      color: '#c084fc',
      sparkColor: '#c084fc',
      sparkIdx: 2,
    },
    {
      title: 'Marge Nette',
      value: '72.3%',
      change: '+2.1%',
      positive: true,
      icon: Percent,
      color: '#34d399',
      sparkColor: '#34d399',
      sparkIdx: 3,
    },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Complété':
        return { background: 'rgba(52,211,153,0.15)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' };
      case 'En attente':
        return { background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' };
      case 'Echoué':
        return { background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' };
      default:
        return {};
    }
  };

  const getTypeStyle = (type: string) => {
    const colors: Record<string, { bg: string; color: string }> = {
      Facture: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
      Paiement: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
      Contrat: { bg: 'rgba(192,132,252,0.15)', color: '#c084fc' },
      Remboursement: { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24' },
      Vente: { bg: 'rgba(52,211,153,0.15)', color: '#34d399' },
      Abonnement: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
      Salaire: { bg: 'rgba(239,68,68,0.15)', color: '#f87171' },
      Conseil: { bg: 'rgba(192,132,252,0.15)', color: '#c084fc' },
      Licence: { bg: 'rgba(34,211,238,0.15)', color: '#22d3ee' },
      Frais: { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' },
    };
    return colors[type] || { bg: 'rgba(156,163,175,0.15)', color: '#9ca3af' };
  };

  const formatAmount = (amount: number) => {
    const abs = Math.abs(amount);
    if (abs >= 1000000) return `${(abs / 1000000).toFixed(1)}M`;
    if (abs >= 1000) return `${(abs / 1000).toFixed(0)}K`;
    return abs.toString();
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  };

  const goldGradient = 'linear-gradient(135deg, #C8A961, #8B6914)';

  return (
    <div style={{ background: '#02040a', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }} className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div style={{ background: goldGradient, borderRadius: '14px', padding: '10px 14px' }} className="flex items-center gap-2">
            <Wallet size={22} color="#fff" />
            <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: '-0.5px' }}>PimPay</span>
          </div>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.5px' }}>Tableau de Bord Business</h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Novembre 2024 — Toutes les métriques en temps réel</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={15} color="#6b7280" />
            <span style={{ color: '#6b7280', fontSize: 13 }}>Rechercher...</span>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', cursor: 'pointer', position: 'relative' }}>
            <Bell size={18} color="#9ca3af" />
            <span style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, background: '#6366f1', borderRadius: '50%', border: '2px solid #02040a' }}></span>
          </button>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '10px', cursor: 'pointer' }}>
            <Settings size={18} color="#9ca3af" />
          </button>
          <div style={{ background: goldGradient, borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>BA</span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {kpiCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              style={{
                background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '20px',
                padding: '20px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer',
              }}
              className="hover:-translate-y-0.5"
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 24px 48px rgba(0,0,0,0.5)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 20px 40px rgba(0,0,0,0.4)'; }}
            >
              <div className="flex items-start justify-between mb-3">
                <div style={{ background: `${card.color}22`, borderRadius: '12px', padding: '10px', border: `1px solid ${card.color}33` }}>
                  <Icon size={20} color={card.color} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: card.positive ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', borderRadius: '8px', padding: '4px 8px', border: card.positive ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(239,68,68,0.2)' }}>
                  {card.positive ? <TrendingUp size={12} color="#34d399" /> : <TrendingDown size={12} color="#ef4444" />}
                  <span style={{ fontSize: 11, fontWeight: 700, color: card.positive ? '#34d399' : '#ef4444' }}>{card.change}</span>
                </div>
              </div>
              <div className="mb-3">
                <p style={{ color: '#6b7280', fontSize: 12, margin: '0 0 4px 0', fontWeight: 500 }}>{card.title}</p>
                <p style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>{card.value}</p>
              </div>
              <Sparkline data={sparklineData[card.sparkIdx]} color={card.sparkColor} />
            </div>
          );
        })}
      </div>

      {/* Area Chart */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          marginBottom: '24px',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>Revenus & Dépenses</h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Analyse comparative sur la période sélectionnée</p>
          </div>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '4px' }}>
            {['7j', '30j', '90j', '12m'].map(p => (
              <button
                key={p}
                onClick={() => setActivePeriod(p)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  background: activePeriod === p ? goldGradient : 'transparent',
                  color: activePeriod === p ? '#fff' : '#6b7280',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={getChartData()} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ paddingTop: 16 }}
              formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>}
            />
            <Area type="monotone" dataKey="revenue" name="Revenus" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 5, fill: '#6366f1' }} />
            <Area type="monotone" dataKey="expenses" name="Dépenses" stroke="#22d3ee" strokeWidth={2.5} fill="url(#expGrad)" dot={false} activeDot={{ r: 5, fill: '#22d3ee' }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar + Pie Charts */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
        {/* Bar Chart */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div className="mb-5">
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>Volume de Transactions</h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Mensuel — Exercice 2024</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }} barSize={18}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#4338ca" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<BarTooltip />} />
              <Bar dataKey="transactions" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '20px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          <div className="mb-5">
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>Revenus par Catégorie</h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Distribution — Novembre 2024</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <ResponsiveContainer width="50%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {pieData.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: item.color, flexShrink: 0 }}></div>
                    <span style={{ color: '#d1d5db', fontSize: 13 }}>{item.name}</span>
                  </div>
                  <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          marginBottom: '24px',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>Transactions Récentes</h2>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>10 dernières opérations</p>
          </div>
          <button style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', color: '#9ca3af', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            Voir tout <ChevronDown size={14} />
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['Date', 'Description', 'Type', 'Montant', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '0 16px 12px 0', textAlign: 'left', color: '#6b7280', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, i) => {
                const typeStyle = getTypeStyle(tx.type);
                const statusStyle = getStatusStyle(tx.status);
                return (
                  <tr
                    key={tx.id}
                    style={{
                      borderBottom: i < transactions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '14px 16px 14px 0', color: '#6b7280', fontSize: 13, whiteSpace: 'nowrap' }}>{formatDate(tx.date)}</td>
                    <td style={{ padding: '14px 16px 14px 0', color: '#e5e7eb', fontSize: 13, fontWeight: 500 }}>{tx.description}</td>
                    <td style={{ padding: '14px 16px 14px 0' }}>
                      <span style={{ ...typeStyle, background: typeStyle.bg, borderRadius: '8px', padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{tx.type}</span>
                    </td>
                    <td style={{ padding: '14px 16px 14px 0', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {tx.positive ? <ArrowUpRight size={14} color="#34d399" /> : <ArrowDownRight size={14} color="#f87171" />}
                        <span style={{ color: tx.positive ? '#34d399' : '#f87171', fontSize: 14, fontWeight: 700 }}>
                          {tx.positive ? '+' : '-'}{formatAmount(tx.amount)} XAF
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 0' }}>
                      <span style={{ ...statusStyle, borderRadius: '8px', padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>{tx.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(17,24,39,0.95), rgba(31,41,55,0.9))',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="mb-5">
          <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, margin: '0 0 4px 0' }}>Actions Rapides</h2>
          <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Raccourcis vers les opérations fréquentes</p>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {[
            { label: 'Nouvelle Facture', icon: FileText, color: '#6366f1', desc: 'Créer et envoyer' },
            { label: 'Nouveau Paiement', icon: CreditCard, color: '#22d3ee', desc: 'Initier un transfert' },
            { label: 'Ajouter Employé', icon: UserPlus, color: '#c084fc', desc: 'Onboarding RH' },
            { label: 'Exporter Rapport', icon: Download, color: '#34d399', desc: 'PDF & Excel' },
          ].map((action, i) => {
            const ActionIcon = action.icon;
            return (
              <button
                key={i}
                style={{
                  background: `${action.color}11`,
                  border: `1px solid ${action.color}22`,
                  borderRadius: '16px',
                  padding: '18px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = `${action.color}22`;
                  el.style.border = `1px solid ${action.color}44`;
                  el.style.transform = 'translateY(-2px)';
                  el.style.boxShadow = `0 12px 24px ${action.color}22`;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = `${action.color}11`;
                  el.style.border = `1px solid ${action.color}22`;
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                }}
              >
                <div style={{ background: `${action.color}22`, borderRadius: '12px', padding: '10px', width: 'fit-content', border: `1px solid ${action.color}33` }}>
                  <ActionIcon size={20} color={action.color} />
                </div>
                <div>
                  <p style={{ color: '#f3f4f6', fontWeight: 700, fontSize: 14, margin: '0 0 3px 0' }}>{action.label}</p>
                  <p style={{ color: '#6b7280', fontSize: 12, margin: 0 }}>{action.desc}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={12} color={action.color} />
                  <span style={{ color: action.color, fontSize: 12, fontWeight: 600 }}>Commencer</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 32, paddingBottom: 8 }}>
        <p style={{ color: '#374151', fontSize: 12 }}>PimPay Business Dashboard © 2024 — Données synchronisées en temps réel</p>
      </div>
    </div>
  );
}
