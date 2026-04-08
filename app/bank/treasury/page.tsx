'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  BanknoteIcon,
  DropletIcon,
  WalletIcon,
  ShieldCheckIcon,
  RefreshCwIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  BuildingIcon,
  ArrowRightLeftIcon,
  FilterIcon,
  DownloadIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from 'lucide-react';

const kpis = [
  {
    label: 'Total Actifs',
    value: '4 872 350 000',
    currency: 'XAF',
    change: '+3.2%',
    positive: true,
    icon: BanknoteIcon,
    color: 'from-yellow-500/20 to-yellow-600/5',
    border: 'border-yellow-500/30',
    iconColor: 'text-yellow-400',
  },
  {
    label: 'Ratio de Liquidité',
    value: '142.8',
    currency: '%',
    change: '+5.1%',
    positive: true,
    icon: DropletIcon,
    color: 'from-emerald-500/20 to-emerald-600/5',
    border: 'border-emerald-500/30',
    iconColor: 'text-emerald-400',
  },
  {
    label: 'Position de Trésorerie',
    value: '987 240 000',
    currency: 'XAF',
    change: '-1.8%',
    positive: false,
    icon: WalletIcon,
    color: 'from-blue-500/20 to-blue-600/5',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    label: 'Réserve BEAC',
    value: '312 500 000',
    currency: 'XAF',
    change: '+0.0%',
    positive: true,
    icon: ShieldCheckIcon,
    color: 'from-purple-500/20 to-purple-600/5',
    border: 'border-purple-500/30',
    iconColor: 'text-purple-400',
  },
];

const nostroVostroData = [
  { bank: 'BNP Paribas', account: 'BNPP-NOSTRO-001', type: 'Nostro', currency: 'EUR', balance: 28_450_000, lastReconciled: '2024-01-15 09:30', status: 'Réconcilié' },
  { bank: 'Société Générale', account: 'SOCGEN-NOSTRO-002', type: 'Nostro', currency: 'USD', balance: 14_320_000, lastReconciled: '2024-01-15 10:15', status: 'Réconcilié' },
  { bank: 'Citibank N.A.', account: 'CITI-NOSTRO-003', type: 'Nostro', currency: 'USD', balance: 9_875_000, lastReconciled: '2024-01-14 16:45', status: 'En attente' },
  { bank: 'Deutsche Bank', account: 'DB-NOSTRO-004', type: 'Nostro', currency: 'EUR', balance: 6_230_000, lastReconciled: '2024-01-15 08:00', status: 'Réconcilié' },
  { bank: 'BDEAC', account: 'BDEAC-VOSTRO-001', type: 'Vostro', currency: 'XAF', balance: 52_600_000, lastReconciled: '2024-01-15 11:00', status: 'Réconcilié' },
  { bank: 'COBAC', account: 'COBAC-VOSTRO-002', type: 'Vostro', currency: 'XAF', balance: 18_900_000, lastReconciled: '2024-01-14 14:30', status: 'Écart détecté' },
  { bank: 'Standard Chartered', account: 'SCB-NOSTRO-005', type: 'Nostro', currency: 'GBP', balance: 3_410_000, lastReconciled: '2024-01-15 09:45', status: 'Réconcilié' },
];

const sweepRules = [
  {
    id: 1,
    name: 'Seuil Principal',
    type: 'Threshold',
    typeLabel: 'Seuil',
    source: 'Compte Opérationnel XAF',
    target: 'Réserve BEAC',
    threshold: '500 000 000 XAF',
    frequency: 'Quotidien',
    active: true,
    lastRun: '2024-01-15 00:00',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10 border-yellow-500/30',
  },
  {
    id: 2,
    name: 'Sweep Pourcentage EUR',
    type: 'Percentage',
    typeLabel: 'Pourcentage',
    source: 'Nostro EUR',
    target: 'Pool EUR Central',
    threshold: '15% du solde',
    frequency: 'Hebdomadaire',
    active: true,
    lastRun: '2024-01-13 06:00',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/30',
  },
  {
    id: 3,
    name: 'Virement Fixe USD',
    type: 'Fixed',
    typeLabel: 'Montant Fixe',
    source: 'Nostro USD',
    target: 'Compte Correspondent',
    threshold: '5 000 000 USD',
    frequency: 'Mensuel',
    active: false,
    lastRun: '2024-01-01 08:00',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/30',
  },
  {
    id: 4,
    name: 'Équilibrage Overnight',
    type: 'Threshold',
    typeLabel: 'Seuil',
    source: 'Compte Courant Principal',
    target: 'Marché Monétaire',
    threshold: '200 000 000 XAF',
    frequency: 'Quotidien',
    active: true,
    lastRun: '2024-01-15 22:00',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/30',
  },
];

const cashFlowData = [
  { day: 'J-3', entrees: 124_000_000, sorties: 98_000_000, net: 26_000_000 },
  { day: 'J-2', entrees: 87_000_000, sorties: 112_000_000, net: -25_000_000 },
  { day: 'J-1', entrees: 156_000_000, sorties: 89_000_000, net: 67_000_000 },
  { day: 'Auj.', entrees: 201_000_000, sorties: 134_000_000, net: 67_000_000 },
  { day: 'J+1', entrees: 178_000_000, sorties: 145_000_000, net: 33_000_000 },
  { day: 'J+2', entrees: 134_000_000, sorties: 167_000_000, net: -33_000_000 },
  { day: 'J+3', entrees: 198_000_000, sorties: 121_000_000, net: 77_000_000 },
];

const beacReserve = {
  required: 300_000_000,
  actual: 312_500_000,
  ratio: 104.2,
  deadline: '2024-01-20',
  status: 'Conforme',
  history: [
    { period: 'Oct 2023', ratio: 102.1, status: 'Conforme' },
    { period: 'Nov 2023', ratio: 98.7, status: 'Non conforme' },
    { period: 'Déc 2023', ratio: 105.3, status: 'Conforme' },
    { period: 'Jan 2024', ratio: 104.2, status: 'Conforme' },
  ],
};

function formatAmount(value: number, currency = 'XAF') {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)} Mrd`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)} K`;
  return value.toLocaleString('fr-FR');
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900 border border-yellow-500/20 rounded-xl p-3 shadow-2xl">
        <p className="text-yellow-400 font-semibold text-xs mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} style={{ color: entry.color }} className="text-xs">
            {entry.name}: {formatAmount(entry.value)} XAF
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function TreasuryPage() {
  const [activeRules, setActiveRules] = useState<Record<number, boolean>>(
    Object.fromEntries(sweepRules.map((r) => [r.id, r.active]))
  );
  const [sortField, setSortField] = useState<string>('bank');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<'all' | 'Nostro' | 'Vostro'>('all');

  const toggleRule = (id: number) => {
    setActiveRules((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const filteredData = nostroVostroData
    .filter((r) => filterType === 'all' || r.type === filterType)
    .sort((a, b) => {
      const valA = (a as any)[sortField];
      const valB = (b as any)[sortField];
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const statusColor = (s: string) => {
    if (s === 'Réconcilié') return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    if (s === 'En attente') return 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30';
    return 'bg-red-500/10 text-red-400 border border-red-500/30';
  };

  const beacProgress = Math.min((beacReserve.actual / beacReserve.required) * 100, 120);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <BanknoteIcon className="w-5 h-5 text-gray-900" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-white">Tré</span>
              <span className="text-yellow-400">sorerie</span>
            </h1>
          </div>
          <p className="text-gray-400 text-sm pl-13 ml-13">
            Gestion des positions, réserves et flux de trésorerie · PIMPAY
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-800 border border-gray-700 hover:border-yellow-500/50 text-gray-300 hover:text-yellow-400 text-sm transition-all">
            <RefreshCwIcon className="w-4 h-4" />
            Actualiser
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold text-sm transition-all shadow-lg shadow-yellow-500/20">
            <DownloadIcon className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className={`relative rounded-2xl bg-gradient-to-br ${kpi.color} border ${kpi.border} p-5 overflow-hidden group hover:scale-[1.02] transition-transform`}
            >
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/3 group-hover:bg-white/5 transition-colors" />
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl bg-gray-900/60 flex items-center justify-center ${kpi.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                  kpi.positive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {kpi.positive ? <TrendingUpIcon className="w-3 h-3" /> : <TrendingDownIcon className="w-3 h-3" />}
                  {kpi.change}
                </span>
              </div>
              <p className="text-gray-400 text-xs mb-1">{kpi.label}</p>
              <p className="text-white font-bold text-lg leading-tight">
                {kpi.value}
                <span className="text-xs text-gray-400 font-normal ml-1">{kpi.currency}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Cash Flow Chart */}
        <div className="xl:col-span-2 rounded-2xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-semibold text-base">Prévision des Flux de Trésorerie</h2>
              <p className="text-gray-500 text-xs mt-0.5">Fenêtre glissante 7 jours · Entrées & Sorties</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-3 h-1.5 rounded-full bg-yellow-400 inline-block" />
                Entrées
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-3 h-1.5 rounded-full bg-red-400 inline-block" />
                Sorties
              </span>
              <span className="flex items-center gap-1.5 text-gray-400">
                <span className="w-3 h-1.5 rounded-full bg-blue-400 inline-block" />
                Net
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={cashFlowData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEntrees" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EAB308" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#EAB308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradSorties" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F87171" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F87171" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatAmount(v)} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="entrees" name="Entrées" stroke="#EAB308" strokeWidth={2} fill="url(#gradEntrees)" dot={false} activeDot={{ r: 4, fill: '#EAB308' }} />
              <Area type="monotone" dataKey="sorties" name="Sorties" stroke="#F87171" strokeWidth={2} fill="url(#gradSorties)" dot={false} activeDot={{ r: 4, fill: '#F87171' }} />
              <Area type="monotone" dataKey="net" name="Net" stroke="#60A5FA" strokeWidth={2} fill="url(#gradNet)" dot={false} activeDot={{ r: 4, fill: '#60A5FA' }} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="mt-4 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>Données historiques (J-3 à J-1) · Prévisions (J+1 à J+3)</span>
            <span className="text-yellow-400/60">Mis à jour: 15 Jan 2024 · 11:42</span>
          </div>
        </div>

        {/* BEAC Reserve Panel */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
              <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-sm">Réserve BEAC</h2>
              <p className="text-gray-500 text-xs">Exigences réglementaires</p>
            </div>
          </div>

          <div className="flex-1 space-y-5">
            {/* Status */}
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-xs">Statut de conformité</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                <CheckCircle2Icon className="w-3.5 h-3.5" />
                {beacReserve.status}
              </span>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400 text-xs">Couverture</span>
                <span className="text-yellow-400 font-bold text-sm">{beacReserve.ratio}%</span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-700 relative"
                  style={{ width: `${Math.min(beacProgress, 100)}%` }}
                >
                  <div className="absolute inset-0 bg-white/10 animate-pulse rounded-full" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-gray-600">
                <span>0%</span>
                <span className="text-gray-500">Min. 100%</span>
                <span>120%</span>
              </div>
            </div>

            {/* Required vs Actual */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/60 rounded-xl p-3 border border-gray-700/50">
                <p className="text-gray-500 text-xs mb-1">Requis</p>
                <p className="text-white font-bold text-sm">{formatAmount(beacReserve.required)}</p>
                <p className="text-gray-600 text-xs">XAF</p>
              </div>
              <div className="bg-emerald-500/5 rounded-xl p-3 border border-emerald-500/20">
                <p className="text-gray-500 text-xs mb-1">Actuel</p>
                <p className="text-emerald-400 font-bold text-sm">{formatAmount(beacReserve.actual)}</p>
                <p className="text-gray-600 text-xs">XAF</p>
              </div>
            </div>

            {/* Surplus */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-xs">Excédent</span>
                <span className="text-yellow-400 font-semibold text-sm">+{formatAmount(beacReserve.actual - beacReserve.required)} XAF</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-gray-400 text-xs">Prochain contrôle</span>
                <span className="text-gray-300 text-xs">{beacReserve.deadline}</span>
              </div>
            </div>

            {/* History */}
            <div>
              <p className="text-gray-500 text-xs mb-2">Historique conformité</p>
              <div className="space-y-1.5">
                {beacReserve.history.map((h) => (
                  <div key={h.period} className="flex items-center justify-between">
                    <span className="text-gray-400 text-xs w-20">{h.period}</span>
                    <div className="flex-1 mx-2 bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-full rounded-full ${
                          h.ratio >= 100 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min((h.ratio / 120) * 100, 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-10 text-right ${
                      h.ratio >= 100 ? 'text-emerald-400' : 'text-red-400'
                    }`}>{h.ratio}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Nostro/Vostro Table */}
      <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
              <ArrowRightLeftIcon className="w-4 h-4 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold">Positions Nostro / Vostro</h2>
              <p className="text-gray-500 text-xs mt-0.5">{filteredData.length} comptes correspondants</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-xl p-1">
              {(['all', 'Nostro', 'Vostro'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === t
                      ? 'bg-yellow-500 text-gray-900'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {t === 'all' ? 'Tous' : t}
                </button>
              ))}
            </div>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-white text-xs transition-all">
              <FilterIcon className="w-3.5 h-3.5" />
              Filtrer
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {[
                  { label: 'Banque', field: 'bank' },
                  { label: 'Compte', field: 'account' },
                  { label: 'Type', field: 'type' },
                  { label: 'Devise', field: 'currency' },
                  { label: 'Solde', field: 'balance' },
                  { label: 'Dernière réconciliation', field: 'lastReconciled' },
                  { label: 'Statut', field: 'status' },
                ].map(({ label, field }) => (
                  <th
                    key={field}
                    onClick={() => handleSort(field)}
                    className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-yellow-400 transition-colors select-none"
                  >
                    <span className="flex items-center gap-1">
                      {label}
                      {sortField === field ? (
                        sortDir === 'asc' ? <ChevronUpIcon className="w-3 h-3 text-yellow-400" /> : <ChevronDownIcon className="w-3 h-3 text-yellow-400" />
                      ) : (
                        <ChevronUpIcon className="w-3 h-3 opacity-0" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {filteredData.map((row, i) => (
                <tr key={i} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center group-hover:border-yellow-500/30 transition-colors">
                        <BuildingIcon className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <span className="text-white text-sm font-medium">{row.bank}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-400 text-xs font-mono bg-gray-800/60 px-2 py-1 rounded">{row.account}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                      row.type === 'Nostro'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                    }`}>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-yellow-400 font-bold text-sm">{row.currency}</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-white font-semibold text-sm">
                      {row.balance.toLocaleString('fr-FR')}
                      <span className="text-gray-500 text-xs font-normal ml-1">{row.currency}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-gray-400 text-xs">{row.lastReconciled}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor(row.status)}`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sweep Rules */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-white font-semibold">Règles de Sweep</h2>
            <p className="text-gray-500 text-xs mt-0.5">Automatisation des transferts entre comptes</p>
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20 text-xs font-medium transition-all">
            + Nouvelle règle
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {sweepRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-2xl bg-gray-900 border ${rule.bg} p-5 flex flex-col gap-4 hover:scale-[1.01] transition-transform`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-semibold ${rule.color} bg-gray-800 px-2 py-0.5 rounded-md`}>
                    {rule.typeLabel}
                  </span>
                  <h3 className="text-white font-semibold text-sm mt-2">{rule.name}</h3>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className="ml-2 flex-shrink-0 transition-colors"
                  title={activeRules[rule.id] ? 'Désactiver' : 'Activer'}
                >
                  {activeRules[rule.id] ? (
                    <ToggleRightIcon className="w-7 h-7 text-emerald-400" />
                  ) : (
                    <ToggleLeftIcon className="w-7 h-7 text-gray-600" />
                  )}
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Source</span>
                  <span className="text-gray-300 text-right max-w-[60%] truncate">{rule.source}</span>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRightLeftIcon className="w-3.5 h-3.5 text-gray-600" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Cible</span>
                  <span className="text-gray-300 text-right max-w-[60%] truncate">{rule.target}</span>
                </div>
              </div>

              <div className="border-t border-gray-800 pt-3 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Condition</span>
                  <span className={`font-medium ${rule.color}`}>{rule.threshold}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Fréquence</span>
                  <span className="text-gray-300">{rule.frequency}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Dernier run</span>
                  <span className="text-gray-400">{rule.lastRun}</span>
                </div>
              </div>

              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-xl ${
                activeRules[rule.id]
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-gray-800 text-gray-500'
              }`}>
                {activeRules[rule.id] ? (
                  <><CheckCircle2Icon className="w-3.5 h-3.5" /> Règle active</>
                ) : (
                  <><AlertTriangleIcon className="w-3.5 h-3.5" /> Règle inactive</>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
