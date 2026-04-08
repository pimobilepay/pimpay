'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Wifi,
  Shield,
  CreditCard,
  BarChart2,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Severity = 'critical' | 'high' | 'medium' | 'low';
type TxStatus = 'completed' | 'pending' | 'failed' | 'processing';
type TxType = 'virement' | 'retour' | 'paiement' | 'depot';

interface KPICardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  accent: string;
  severity?: Severity;
  badge?: string;
}

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: TxStatus;
  type: TxType;
  counterparty: string;
  timestamp: Date;
}

interface Alert {
  id: string;
  severity: Severity;
  message: string;
  rule: string;
  timestamp: Date;
  resolved: boolean;
}

// ─── Utility helpers ──────────────────────────────────────────────────────────

const formatXAF = (n: number): string =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    maximumFractionDigits: 0,
  }).format(n);

const formatCompact = (n: number): string => {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} Md`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)} k`;
  return n.toString();
};

const formatDate = (d: Date): string =>
  d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatTime = (d: Date): string =>
  d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const formatShortDate = (d: Date): string =>
  d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

const formatRelative = (d: Date): string => {
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return `il y a ${Math.floor(diff)}s`;
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`;
  return formatShortDate(d);
};

// ─── Mock data generators ─────────────────────────────────────────────────────

const generateAreaData = (days: number) => {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    data.push({
      date: formatShortDate(d),
      volume: Math.floor(Math.random() * 800_000_000 + 200_000_000),
      transactions: Math.floor(Math.random() * 3000 + 500),
    });
  }
  return data;
};

const pieData = [
  { name: 'XAF', value: 58, color: '#6366f1' },
  { name: 'EUR', value: 22, color: '#22d3ee' },
  { name: 'USD', value: 14, color: '#a78bfa' },
  { name: 'XOF', value: 6, color: '#34d399' },
];

const barData = [
  { day: 'Lun', completed: 1200, pending: 230, failed: 45, processing: 180 },
  { day: 'Mar', completed: 1450, pending: 190, failed: 32, processing: 210 },
  { day: 'Mer', completed: 980, pending: 310, failed: 67, processing: 145 },
  { day: 'Jeu', completed: 1680, pending: 175, failed: 28, processing: 290 },
  { day: 'Ven', completed: 1920, pending: 220, failed: 55, processing: 320 },
  { day: 'Sam', completed: 760, pending: 140, failed: 19, processing: 98 },
  { day: 'Dim', completed: 540, pending: 95, failed: 12, processing: 72 },
];

const lineData = [
  { date: '01/06', virements: 420, retours: 85, paiements: 310, depots: 180 },
  { date: '05/06', virements: 580, retours: 62, paiements: 395, depots: 210 },
  { date: '10/06', virements: 490, retours: 94, paiements: 340, depots: 165 },
  { date: '15/06', virements: 720, retours: 71, paiements: 480, depots: 240 },
  { date: '20/06', virements: 650, retours: 88, paiements: 420, depots: 195 },
  { date: '25/06', virements: 810, retours: 55, paiements: 560, depots: 280 },
  { date: '30/06', virements: 940, retours: 102, paiements: 610, depots: 320 },
];

const generateTransactions = (): Transaction[] => {
  const statuses: TxStatus[] = ['completed', 'pending', 'failed', 'processing'];
  const types: TxType[] = ['virement', 'retour', 'paiement', 'depot'];
  const counterparties = [
    'BGFI Bank Gabon',
    'Afriland First Bank',
    'UBA Cameroun',
    'Ecobank CI',
    'Société Générale',
    'BNP Paribas Paris',
    'Standard Chartered',
    'Access Bank Nigeria',
  ];
  return Array.from({ length: 10 }, (_, i) => ({
    id: `TX${String(Date.now() + i).slice(-8)}`,
    reference: `PIM${String(Math.floor(Math.random() * 1_000_000)).padStart(7, '0')}`,
    amount: Math.floor(Math.random() * 50_000_000 + 100_000),
    currency: ['XAF', 'EUR', 'USD', 'XOF'][Math.floor(Math.random() * 4)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    type: types[Math.floor(Math.random() * types.length)],
    counterparty: counterparties[Math.floor(Math.random() * counterparties.length)],
    timestamp: new Date(Date.now() - Math.floor(Math.random() * 3_600_000)),
  }));
};

const generateAlerts = (): Alert[] => [
  {
    id: 'ALT001',
    severity: 'critical',
    message: 'Transaction suspecte > 100M XAF sans justificatif',
    rule: 'AML-001',
    timestamp: new Date(Date.now() - 300_000),
    resolved: false,
  },
  {
    id: 'ALT002',
    severity: 'high',
    message: 'Client sous surveillance OFAC identifié',
    rule: 'SANC-002',
    timestamp: new Date(Date.now() - 900_000),
    resolved: false,
  },
  {
    id: 'ALT003',
    severity: 'medium',
    message: 'Fréquence de transactions anormale détectée',
    rule: 'FRQ-003',
    timestamp: new Date(Date.now() - 1_800_000),
    resolved: false,
  },
  {
    id: 'ALT004',
    severity: 'medium',
    message: 'Seuil de reporting BEAC dépassé',
    rule: 'REP-004',
    timestamp: new Date(Date.now() - 3_600_000),
    resolved: true,
  },
  {
    id: 'ALT005',
    severity: 'low',
    message: 'Délai de traitement STP élevé sur corridor CEMAC',
    rule: 'SLA-005',
    timestamp: new Date(Date.now() - 7_200_000),
    resolved: true,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  accent,
  severity,
  badge,
}) => {
  const isPositive = change !== undefined && change >= 0;
  const sevColors: Record<Severity, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-blue-500',
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5`}
    >
      {/* Accent glow */}
      <div
        className={`absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10 blur-2xl ${accent}`}
      />
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400 truncate">
            {title}
          </p>
          <p className="mt-2 text-2xl font-bold text-white leading-none tracking-tight">
            {value}
          </p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={`text-xs font-semibold ${
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {isPositive ? '+' : ''}{change.toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
          {severity && badge && (
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${sevColors[severity]} animate-pulse`} />
              <span className="text-xs font-medium text-gray-300">{badge}</span>
            </div>
          )}
        </div>
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${accent} bg-opacity-10 backdrop-blur-sm`}
        >
          <div className="text-white opacity-90">{icon}</div>
        </div>
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: TxStatus }> = ({ status }) => {
  const config: Record<TxStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    completed: {
      label: 'Complété',
      cls: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    pending: {
      label: 'En attente',
      cls: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
      icon: <Clock className="h-3 w-3" />,
    },
    failed: {
      label: 'Échoué',
      cls: 'bg-red-500/10 text-red-400 border border-red-500/20',
      icon: <XCircle className="h-3 w-3" />,
    },
    processing: {
      label: 'Traitement',
      cls: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      icon: <Activity className="h-3 w-3" />,
    },
  };
  const { label, cls, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
};

const AmountDisplay: React.FC<{ amount: number; currency: string }> = ({ amount, currency }) => {
  const formatted =
    currency === 'XAF' || currency === 'XOF'
      ? `${formatCompact(amount)} ${currency}`
      : new Intl.NumberFormat('fr-FR', {
          style: 'currency',
          currency,
          maximumFractionDigits: 2,
        }).format(amount);
  return <span className="font-mono text-sm font-semibold text-white">{formatted}</span>;
};

const SeverityBadge: React.FC<{ severity: Severity }> = ({ severity }) => {
  const config: Record<Severity, { label: string; cls: string }> = {
    critical: { label: 'Critique', cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
    high: { label: 'Élevé', cls: 'bg-orange-500/15 text-orange-400 border border-orange-500/30' },
    medium: { label: 'Moyen', cls: 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' },
    low: { label: 'Faible', cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
  };
  const { label, cls } = config[severity];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
      {label}
    </span>
  );
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-gray-900/95 p-3 shadow-2xl backdrop-blur-md">
      {label && <p className="mb-2 text-xs font-semibold text-gray-400">{label}</p>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold text-white">
            {typeof p.value === 'number' && p.value > 10_000
              ? formatCompact(p.value)
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const SectionCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; action?: React.ReactNode }> = ({
  title,
  subtitle,
  children,
  action,
}) => (
  <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl">
    <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function BankDashboardPage() {
  const [now, setNow] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [areaData, setAreaData] = useState(() => generateAreaData(30));
  const [transactions, setTransactions] = useState<Transaction[]>(() => generateTransactions());
  const [alerts] = useState<Alert[]>(() => generateAlerts());
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [liveIndicator, setLiveIndicator] = useState(true);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Live feed blink
  useEffect(() => {
    const t = setInterval(() => setLiveIndicator((v) => !v), 1200);
    return () => clearInterval(t);
  }, []);

  // Auto-refresh transactions
  useEffect(() => {
    const t = setInterval(() => {
      setTransactions(generateTransactions());
    }, 15_000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setAreaData(generateAreaData(period));
      setTransactions(generateTransactions());
      setLastRefresh(new Date());
      setRefreshing(false);
    }, 1200);
  }, [period]);

  useEffect(() => {
    setAreaData(generateAreaData(period));
  }, [period]);

  const typeLabelMap: Record<TxType, string> = {
    virement: 'Virement',
    retour: 'Retour',
    paiement: 'Paiement',
    depot: 'Dépôt',
  };

  const criticalCount = alerts.filter((a) => !a.resolved && a.severity === 'critical').length;
  const unresolvedCount = alerts.filter((a) => !a.resolved).length;

  return (
    <div className="min-h-screen bg-gray-950 px-4 pb-10 pt-6 md:px-8">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600/20 ring-1 ring-indigo-500/30">
              <BarChart2 className="h-5 w-5 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Tableau de Bord
            </h1>
          </div>
          <div className="mt-1.5 flex items-center gap-3">
            <p className="text-sm text-gray-400 capitalize">{formatDate(now)}</p>
            <span className="text-gray-600">·</span>
            <p className="font-mono text-sm text-indigo-300">{formatTime(now)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5">
            <span
              className={`h-2 w-2 rounded-full bg-emerald-400 transition-opacity duration-500 ${
                liveIndicator ? 'opacity-100' : 'opacity-30'
              }`}
            />
            <span className="text-xs font-medium text-emerald-400">En direct</span>
          </div>
          <div className="hidden text-right sm:block">
            <p className="text-xs text-gray-500">
              Dernière actualisation : {formatRelative(lastRefresh)}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-gray-800/80 px-4 py-2 text-sm font-medium text-gray-200 shadow-lg transition hover:border-indigo-500/50 hover:bg-gray-700 hover:text-white disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 transition-transform duration-700 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Volume Transactions"
          value={formatXAF(47_320_000_000)}
          change={12.4}
          changeLabel="vs mois dernier"
          icon={<TrendingUp className="h-5 w-5" />}
          accent="bg-indigo-500"
        />
        <KPICard
          title="Transactions Aujourd'hui"
          value="8 472"
          change={-3.2}
          changeLabel="vs hier"
          icon={<Activity className="h-5 w-5" />}
          accent="bg-cyan-500"
        />
        <KPICard
          title="Taux STP"
          value="94,7 %"
          change={1.8}
          changeLabel="vs semaine dernière"
          icon={<CreditCard className="h-5 w-5" />}
          accent="bg-violet-500"
        />
        <KPICard
          title="Alertes Compliance"
          value={`${unresolvedCount} actives`}
          icon={<Shield className="h-5 w-5" />}
          accent="bg-red-500"
          severity={criticalCount > 0 ? 'critical' : 'medium'}
          badge={criticalCount > 0 ? `${criticalCount} critique(s) en attente` : 'Aucune critique'}
        />
      </div>

      {/* ── Charts Row 1 ────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Area Chart */}
        <div className="lg:col-span-3">
          <SectionCard
            title="Volume par Jour"
            subtitle={`Derniers ${period} jours`}
            action={
              <div className="flex gap-1">
                {([7, 30, 90] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                      period === p
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {p}j
                  </button>
                ))}
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={areaData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.floor(areaData.length / 6)}
                />
                <YAxis
                  tick={{ fill: '#6b7280', fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => formatCompact(v)}
                  width={52}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="volume"
                  name="Volume (XAF)"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#volGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#818cf8' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Pie Chart */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Répartition par Devise"
            subtitle="Part du volume total"
          >
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, '']}
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      fontSize: '12px',
                      color: '#f9fafb',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-1 grid grid-cols-2 gap-x-6 gap-y-2">
                {pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: d.color }}
                    />
                    <span className="text-xs text-gray-400">{d.name}</span>
                    <span className="ml-auto text-xs font-bold text-white">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Charts Row 2 ────────────────────────────────────────────── */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bar Chart */}
        <SectionCard
          title="Transactions par Statut"
          subtitle="7 derniers jours"
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCompact(v)}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
              <Legend
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
              />
              <Bar dataKey="completed" name="Complété" fill="#34d399" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="processing" name="Traitement" fill="#60a5fa" stackId="a" />
              <Bar dataKey="pending" name="En attente" fill="#fbbf24" stackId="a" />
              <Bar dataKey="failed" name="Échoué" fill="#f87171" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        {/* Line Chart */}
        <SectionCard
          title="Volume par Type"
          subtitle="Évolution mensuelle"
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#6b7280', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => formatCompact(v)}
                width={44}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 11 }}>{value}</span>}
              />
              <Line type="monotone" dataKey="virements" name="Virements" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="retours" name="Retours" stroke="#f87171" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="paiements" name="Paiements" stroke="#34d399" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="depots" name="Dépôts" stroke="#fbbf24" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      {/* ── Bottom Row: Activity + Alerts ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Activity Feed */}
        <div className="lg:col-span-3">
          <SectionCard
            title="Flux de Transactions"
            subtitle="10 dernières transactions"
            action={
              <div className="flex items-center gap-1.5">
                <Wifi
                  className={`h-3.5 w-3.5 transition-colors duration-500 ${
                    liveIndicator ? 'text-emerald-400' : 'text-gray-600'
                  }`}
                />
                <span className="text-xs text-gray-500">Mise à jour auto (15s)</span>
              </div>
            }
          >
            <div className="space-y-1">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
                >
                  {/* Type icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700/60">
                    <span className="text-xs font-bold text-indigo-300">
                      {tx.type.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-mono text-gray-300">{tx.reference}</span>
                      <span className="hidden text-xs text-gray-600 sm:inline">·</span>
                      <span className="hidden truncate text-xs text-gray-400 sm:inline">
                        {typeLabelMap[tx.type]}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-gray-500">
                      {tx.counterparty}
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <AmountDisplay amount={tx.amount} currency={tx.currency} />
                    <StatusBadge status={tx.status} />
                  </div>

                  <div className="hidden shrink-0 text-right sm:block">
                    <span className="text-xs text-gray-600">{formatRelative(tx.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* Alerts Panel */}
        <div className="lg:col-span-2">
          <SectionCard
            title="Alertes Compliance"
            subtitle="5 dernières alertes"
            action={
              <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-400 border border-red-500/20">
                {unresolvedCount} non résolues
              </span>
            }
          >
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl border p-3 transition ${
                    alert.resolved
                      ? 'border-white/5 bg-gray-800/30 opacity-60'
                      : alert.severity === 'critical'
                      ? 'border-red-500/20 bg-red-500/5'
                      : alert.severity === 'high'
                      ? 'border-orange-500/20 bg-orange-500/5'
                      : 'border-white/5 bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle
                        className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                          alert.resolved
                            ? 'text-gray-500'
                            : alert.severity === 'critical'
                            ? 'text-red-400'
                            : alert.severity === 'high'
                            ? 'text-orange-400'
                            : 'text-yellow-400'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-medium leading-relaxed text-gray-200">
                          {alert.message}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-gray-500 font-mono">{alert.rule}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-xs text-gray-500">
                            {formatRelative(alert.timestamp)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {alert.resolved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-700/50 px-2 py-0.5 text-xs text-gray-400">
                          <CheckCircle className="h-3 w-3" />
                          Résolu
                        </span>
                      ) : (
                        <SeverityBadge severity={alert.severity} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
