'use client';

import { useState } from 'react';
import {
  ShieldAlert,
  Search,
  FileText,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Plus,
  Eye,
  UserCheck,
  XCircle,
  ChevronDown,
  Filter,
  RefreshCw,
  Bell,
  Globe,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const TABS = [
  { id: 'alerts', label: 'Alertes AML', icon: ShieldAlert },
  { id: 'sanctions', label: 'Sanctions', icon: Globe },
  { id: 'reports', label: 'Rapports Réglementaires', icon: FileText },
  { id: 'rules', label: 'Règles AML', icon: Settings },
];

const ALERT_COLORS: Record<string, string> = {
  LOW: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  MEDIUM: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  HIGH: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  CRITICAL: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-red-400 bg-red-400/10',
  'EN RÉVISION': 'text-yellow-400 bg-yellow-400/10',
  RÉSOLU: 'text-green-400 bg-green-400/10',
};

const mockAlerts = [
  {
    id: 'AML-2024-001',
    severity: 'CRITICAL',
    status: 'ACTIVE',
    transactionRef: 'TXN-9847362',
    amount: '4 750 000 XAF',
    triggerRule: 'Seuil de transaction élevé (>3M XAF)',
    customer: 'NDONGO Jean-Baptiste',
    timestamp: '2024-01-15 14:32:18',
    assignedTo: null,
  },
  {
    id: 'AML-2024-002',
    severity: 'HIGH',
    status: 'EN RÉVISION',
    transactionRef: 'TXN-9847401',
    amount: '2 100 000 XAF',
    triggerRule: 'Transactions structurées multiples',
    customer: 'Société BAKO SARL',
    timestamp: '2024-01-15 11:15:44',
    assignedTo: 'Analyste K. MBARGA',
  },
  {
    id: 'AML-2024-003',
    severity: 'HIGH',
    status: 'ACTIVE',
    transactionRef: 'TXN-9847289',
    amount: '1 890 000 XAF',
    triggerRule: 'Pays à risque élevé (destination)',
    customer: 'FOFANA Aminata',
    timestamp: '2024-01-15 09:08:22',
    assignedTo: null,
  },
  {
    id: 'AML-2024-004',
    severity: 'MEDIUM',
    status: 'EN RÉVISION',
    transactionRef: 'TXN-9847155',
    amount: '875 000 XAF',
    triggerRule: 'Fréquence inhabituelle de transactions',
    customer: 'EKOTTO Pierre',
    timestamp: '2024-01-14 16:45:33',
    assignedTo: 'Analyste R. ONDO',
  },
  {
    id: 'AML-2024-005',
    severity: 'MEDIUM',
    status: 'RÉSOLU',
    transactionRef: 'TXN-9847032',
    amount: '650 000 XAF',
    triggerRule: 'Nouveau client – transaction élevée',
    customer: 'NGUEMA Carine',
    timestamp: '2024-01-14 10:22:11',
    assignedTo: 'Analyste K. MBARGA',
  },
  {
    id: 'AML-2024-006',
    severity: 'LOW',
    status: 'RÉSOLU',
    transactionRef: 'TXN-9846987',
    amount: '320 000 XAF',
    triggerRule: 'Correspondance partielle liste sanctions',
    customer: 'BELLO Moussa',
    timestamp: '2024-01-13 14:05:58',
    assignedTo: 'Analyste R. ONDO',
  },
];

const mockScreenings = [
  {
    id: 'SCR-001',
    name: 'Jean-Pierre MBARGA',
    date: '2024-01-15 14:30',
    lists: ['UN', 'EU', 'US_OFAC', 'CEMAC'],
    result: 'CLEAR',
    matchScore: 0,
  },
  {
    id: 'SCR-002',
    name: 'BAKARY Enterprises Ltd',
    date: '2024-01-15 12:15',
    lists: ['UN', 'EU', 'US_OFAC', 'CEMAC'],
    result: 'HIT',
    matchScore: 87,
  },
  {
    id: 'SCR-003',
    name: 'Aminata DIALLO',
    date: '2024-01-15 10:00',
    lists: ['UN', 'EU', 'US_OFAC', 'CEMAC'],
    result: 'CLEAR',
    matchScore: 0,
  },
  {
    id: 'SCR-004',
    name: 'NKOMO Trading SARL',
    date: '2024-01-14 16:45',
    lists: ['UN', 'EU', 'US_OFAC'],
    result: 'CLEAR',
    matchScore: 12,
  },
  {
    id: 'SCR-005',
    name: 'Ibrahim AL-FARSI',
    date: '2024-01-14 09:30',
    lists: ['UN', 'EU', 'US_OFAC', 'CEMAC'],
    result: 'HIT',
    matchScore: 94,
  },
];

const mockReports = [
  {
    id: 'RPT-2024-012',
    type: 'COBAC Mensuel',
    period: 'Décembre 2023',
    generated: '2024-01-05',
    status: 'SOUMIS',
    size: '2.4 MB',
  },
  {
    id: 'RPT-2024-011',
    type: 'BEAC Réserves',
    period: 'Décembre 2023',
    generated: '2024-01-03',
    status: 'SOUMIS',
    size: '1.8 MB',
  },
  {
    id: 'RPT-2024-010',
    type: 'ANIF STR',
    period: 'Décembre 2023',
    generated: '2024-01-02',
    status: 'EN ATTENTE',
    size: '956 KB',
  },
  {
    id: 'RPT-2023-045',
    type: 'COBAC Mensuel',
    period: 'Novembre 2023',
    generated: '2023-12-05',
    status: 'SOUMIS',
    size: '2.2 MB',
  },
  {
    id: 'RPT-2023-044',
    type: 'BEAC Réserves',
    period: 'Novembre 2023',
    generated: '2023-12-03',
    status: 'SOUMIS',
    size: '1.7 MB',
  },
];

const mockRules = [
  {
    id: 'RGL-001',
    name: 'Seuil transaction élevé',
    conditions: 'Montant > 3 000 000 XAF en une seule transaction',
    action: 'Créer alerte + Bloquer',
    severity: 'CRITICAL',
    active: true,
    triggeredCount: 142,
  },
  {
    id: 'RGL-002',
    name: 'Structuration de transactions',
    conditions: '5+ transactions < 1 000 000 XAF en 24h (même compte)',
    action: 'Créer alerte + Révision manuelle',
    severity: 'HIGH',
    active: true,
    triggeredCount: 67,
  },
  {
    id: 'RGL-003',
    name: 'Pays à risque élevé',
    conditions: 'Transfert vers pays FATF liste noire/grise',
    action: 'Bloquer + Créer alerte CRITICAL',
    severity: 'CRITICAL',
    active: true,
    triggeredCount: 23,
  },
  {
    id: 'RGL-004',
    name: 'Fréquence inhabituelle',
    conditions: '> 20 transactions en 1 heure depuis même IP',
    action: 'Créer alerte + Notifier compliance',
    severity: 'HIGH',
    active: true,
    triggeredCount: 31,
  },
  {
    id: 'RGL-005',
    name: 'Nouveau client – montant élevé',
    conditions: 'Compte < 30 jours + transaction > 500 000 XAF',
    action: 'Créer alerte MEDIUM',
    severity: 'MEDIUM',
    active: true,
    triggeredCount: 89,
  },
  {
    id: 'RGL-006',
    name: 'Correspondance partielle sanctions',
    conditions: 'Score similarité nom > 70% avec liste sanctions',
    action: 'Créer alerte + Révision manuelle',
    severity: 'HIGH',
    active: false,
    triggeredCount: 12,
  },
  {
    id: 'RGL-007',
    name: 'Espèces répétitives',
    conditions: '3+ dépôts espèces consécutifs en 48h',
    action: 'Créer alerte LOW',
    severity: 'LOW',
    active: true,
    triggeredCount: 203,
  },
];

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState('alerts');
  const [searchName, setSearchName] = useState('');
  const [isScreening, setIsScreening] = useState(false);
  const [rules, setRules] = useState(mockRules);
  const [alertFilter, setAlertFilter] = useState('ALL');
  const [reportType, setReportType] = useState('COBAC Mensuel');

  const alertStats = {
    active: mockAlerts.filter((a) => a.status === 'ACTIVE').length,
    review: mockAlerts.filter((a) => a.status === 'EN RÉVISION').length,
    resolved: mockAlerts.filter((a) => a.status === 'RÉSOLU').length,
  };

  const filteredAlerts =
    alertFilter === 'ALL'
      ? mockAlerts
      : mockAlerts.filter((a) => a.status === alertFilter);

  const handleScreening = () => {
    if (!searchName.trim()) return;
    setIsScreening(true);
    setTimeout(() => setIsScreening(false), 1500);
  };

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0E17' }}>
      {/* Header */}
      <div className="border-b border-gray-800" style={{ backgroundColor: '#111827' }}>
        <div className="max-w-screen-2xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: '#C8A961' + '20', border: '1px solid #C8A96140' }}
              >
                <ShieldAlert className="w-6 h-6" style={{ color: '#C8A961' }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Conformité & AML</h1>
                <p className="text-sm text-gray-400 mt-0.5">
                  Surveillance Anti-Blanchiment & Contrôle Réglementaire
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-400 text-sm font-medium">
                  {alertStats.active} alertes actives
                </span>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: '#C8A96120', color: '#C8A961', border: '1px solid #C8A96140' }}
              >
                <RefreshCw className="w-4 h-4" />
                Actualiser
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: isActive ? '#C8A961' + '20' : 'transparent',
                    color: isActive ? '#C8A961' : '#9CA3AF',
                    borderBottom: isActive ? '2px solid #C8A961' : '2px solid transparent',
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.id === 'alerts' && alertStats.active > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-red-500 text-white">
                      {alertStats.active}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-6 py-8">
        {/* TAB 1: Alertes AML */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  label: 'Alertes Actives',
                  value: alertStats.active,
                  color: '#EF4444',
                  bg: '#EF444420',
                  icon: AlertTriangle,
                  filter: 'ACTIVE',
                },
                {
                  label: 'En Révision',
                  value: alertStats.review,
                  color: '#F59E0B',
                  bg: '#F59E0B20',
                  icon: Clock,
                  filter: 'EN RÉVISION',
                },
                {
                  label: 'Résolues',
                  value: alertStats.resolved,
                  color: '#10B981',
                  bg: '#10B98120',
                  icon: CheckCircle,
                  filter: 'RÉSOLU',
                },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <button
                    key={stat.label}
                    onClick={() =>
                      setAlertFilter(
                        alertFilter === stat.filter ? 'ALL' : stat.filter
                      )
                    }
                    className="rounded-xl p-5 text-left transition-all hover:scale-105"
                    style={{
                      backgroundColor:
                        alertFilter === stat.filter
                          ? stat.bg
                          : '#111827',
                      border: `1px solid ${
                        alertFilter === stat.filter
                          ? stat.color + '60'
                          : '#1F2937'
                      }`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-gray-400 text-sm">{stat.label}</p>
                        <p
                          className="text-4xl font-bold mt-1"
                          style={{ color: stat.color }}
                        >
                          {stat.value}
                        </p>
                      </div>
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: stat.bg }}
                      >
                        <Icon className="w-6 h-6" style={{ color: stat.color }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Filter bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">
                  {filteredAlerts.length} alerte(s) affichée(s)
                </span>
              </div>
              {alertFilter !== 'ALL' && (
                <button
                  onClick={() => setAlertFilter('ALL')}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Effacer le filtre ×
                </button>
              )}
            </div>

            {/* Alert Cards */}
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl p-5 transition-all hover:border-gray-600"
                  style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      {/* Severity badge */}
                      <div
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                          ALERT_COLORS[alert.severity]
                        }`}
                      >
                        {alert.severity}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="text-white font-semibold">{alert.id}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              STATUS_COLORS[alert.status]
                            }`}
                          >
                            {alert.status}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm mt-1">
                          <span className="text-gray-500">Client:</span>{' '}
                          {alert.customer}
                        </p>
                        <p className="text-gray-400 text-sm mt-0.5">
                          <span className="text-gray-500">Règle déclenchée:</span>{' '}
                          {alert.triggerRule}
                        </p>
                        {alert.assignedTo && (
                          <p className="text-gray-500 text-xs mt-1">
                            Assigné à: {alert.assignedTo}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-white font-bold">{alert.amount}</p>
                        <p className="text-gray-500 text-xs mt-0.5">
                          Réf: {alert.transactionRef}
                        </p>
                        <p className="text-gray-600 text-xs">{alert.timestamp}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                          style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Assigner
                        </button>
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                          style={{
                            backgroundColor: '#C8A96120',
                            color: '#C8A961',
                            border: '1px solid #C8A96130',
                          }}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Investiguer
                        </button>
                        {alert.status !== 'RÉSOLU' && (
                          <button
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                            style={{
                              backgroundColor: '#EF444420',
                              color: '#EF4444',
                              border: '1px solid #EF444430',
                            }}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Rejeter
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: Sanctions */}
        {activeTab === 'sanctions' && (
          <div className="space-y-6">
            {/* Search */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            >
              <h2 className="text-white font-semibold mb-4">Vérification de Sanctions</h2>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleScreening()}
                    placeholder="Entrer le nom d'une personne ou d'une entité..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-all focus:ring-1"
                    style={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      ['--tw-ring-color' as string]: '#C8A961',
                    }}
                  />
                </div>
                <button
                  onClick={handleScreening}
                  disabled={isScreening}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
                  style={{ backgroundColor: '#C8A961', color: '#0A0E17' }}
                >
                  {isScreening ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  {isScreening ? 'Vérification...' : 'Vérifier'}
                </button>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-gray-500 text-xs">Listes vérifiées:</span>
                {['UN', 'EU', 'US_OFAC', 'CEMAC', 'FATF'].map((list) => (
                  <span
                    key={list}
                    className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{ backgroundColor: '#1F2937', color: '#C8A961' }}
                  >
                    {list}
                  </span>
                ))}
              </div>
            </div>

            {/* Screenings Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            >
              <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between">
                <h3 className="text-white font-semibold">Vérifications Récentes</h3>
                <span className="text-gray-500 text-sm">{mockScreenings.length} entrées</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#0A0E17' }}>
                    {['Nom / Entité', 'Date', 'Listes Vérifiées', 'Résultat', 'Score de Correspondance'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {mockScreenings.map((screening) => (
                    <tr
                      key={screening.id}
                      className="transition-colors hover:bg-gray-800/30"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-white font-medium text-sm">{screening.name}</p>
                          <p className="text-gray-600 text-xs">{screening.id}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{screening.date}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          {screening.lists.map((list) => (
                            <span
                              key={list}
                              className="px-1.5 py-0.5 rounded text-xs font-mono"
                              style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                            >
                              {list}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            screening.result === 'CLEAR'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-red-400 bg-red-400/10'
                          }`}
                        >
                          {screening.result === 'CLEAR' ? '✓ AUCUN RÉSULTAT' : '⚠ CORRESPONDANCE'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 max-w-24 bg-gray-800 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all"
                              style={{
                                width: `${screening.matchScore}%`,
                                backgroundColor:
                                  screening.matchScore > 70
                                    ? '#EF4444'
                                    : screening.matchScore > 30
                                    ? '#F59E0B'
                                    : '#10B981',
                              }}
                            />
                          </div>
                          <span
                            className="text-sm font-mono font-bold"
                            style={{
                              color:
                                screening.matchScore > 70
                                  ? '#EF4444'
                                  : screening.matchScore > 30
                                  ? '#F59E0B'
                                  : '#10B981',
                            }}
                          >
                            {screening.matchScore}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: Rapports */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Report Generator */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            >
              <h2 className="text-white font-semibold mb-4">Générer un Rapport</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    id: 'COBAC Mensuel',
                    label: 'COBAC Mensuel',
                    desc: 'Rapport mensuel réglementaire COBAC',
                    icon: '🏛️',
                  },
                  {
                    id: 'BEAC Réserves',
                    label: 'BEAC Réserves',
                    desc: 'Rapport de réserves obligatoires BEAC',
                    icon: '🏦',
                  },
                  {
                    id: 'ANIF STR',
                    label: 'ANIF STR',
                    desc: 'Déclaration de transaction suspecte',
                    icon: '⚠️',
                  },
                ].map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setReportType(report.id)}
                    className="p-4 rounded-xl text-left transition-all hover:scale-105"
                    style={{
                      backgroundColor:
                        reportType === report.id ? '#C8A96115' : '#1F2937',
                      border: `1px solid ${
                        reportType === report.id ? '#C8A96150' : '#374151'
                      }`,
                    }}
                  >
                    <div className="text-2xl mb-2">{report.icon}</div>
                    <p
                      className="font-semibold text-sm"
                      style={{
                        color: reportType === report.id ? '#C8A961' : '#E5E7EB',
                      }}
                    >
                      {report.label}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">{report.desc}</p>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">Période</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  >
                    <option>Janvier 2024</option>
                    <option>Décembre 2023</option>
                    <option>Novembre 2023</option>
                    <option>Octobre 2023</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">Format</label>
                  <select
                    className="w-full px-3 py-2.5 rounded-lg text-sm text-white outline-none"
                    style={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  >
                    <option>PDF</option>
                    <option>Excel</option>
                    <option>XML</option>
                  </select>
                </div>
                <div className="self-end">
                  <button
                    className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                    style={{ backgroundColor: '#C8A961', color: '#0A0E17' }}
                  >
                    <FileText className="w-4 h-4" />
                    Générer le Rapport
                  </button>
                </div>
              </div>
            </div>

            {/* Reports Table */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: '#111827', border: '1px solid #1F2937' }}
            >
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-white font-semibold">Rapports Récents</h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#0A0E17' }}>
                    {['Réf.', 'Type', 'Période', 'Date de Génération', 'Statut', 'Taille', ''].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {mockReports.map((report) => (
                    <tr
                      key={report.id}
                      className="transition-colors hover:bg-gray-800/30"
                    >
                      <td className="px-6 py-4 text-gray-400 text-sm font-mono">
                        {report.id}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ backgroundColor: '#C8A96115', color: '#C8A961' }}
                        >
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-300 text-sm">{report.period}</td>
                      <td className="px-6 py-4 text-gray-400 text-sm">{report.generated}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            report.status === 'SOUMIS'
                              ? 'text-green-400 bg-green-400/10'
                              : 'text-yellow-400 bg-yellow-400/10'
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">{report.size}</td>
                      <td className="px-6 py-4">
                        <button
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                          style={{
                            backgroundColor: '#C8A96115',
                            color: '#C8A961',
                            border: '1px solid #C8A96130',
                          }}
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: Règles AML */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">
                  {rules.filter((r) => r.active).length} règles actives sur {rules.length} total
                </p>
              </div>
              <button
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                style={{ backgroundColor: '#C8A961', color: '#0A0E17' }}
              >
                <Plus className="w-4 h-4" />
                Ajouter une Règle
              </button>
            </div>

            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="rounded-xl p-5 transition-all"
                  style={{
                    backgroundColor: '#111827',
                    border: `1px solid ${rule.active ? '#1F2937' : '#1F293780'}`,
                    opacity: rule.active ? 1 : 0.6,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border shrink-0 ${
                          ALERT_COLORS[rule.severity]
                        }`}
                      >
                        {rule.severity}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="text-white font-semibold">{rule.name}</p>
                          <span className="text-gray-600 text-xs font-mono">{rule.id}</span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">
                          <span className="text-gray-600">Condition:</span> {rule.conditions}
                        </p>
                        <p className="text-gray-400 text-sm mt-0.5">
                          <span className="text-gray-600">Action:</span>{' '}
                          <span style={{ color: '#C8A961' }}>{rule.action}</span>
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          Déclenchements: {rule.triggeredCount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                        style={{ backgroundColor: '#1F2937', color: '#9CA3AF' }}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button
                        onClick={() => toggleRule(rule.id)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                        style={{
                          backgroundColor: rule.active ? '#10B98120' : '#1F2937',
                          color: rule.active ? '#10B981' : '#6B7280',
                          border: `1px solid ${rule.active ? '#10B98130' : '#374151'}`,
                        }}
                      >
                        {rule.active ? (
                          <>
                            <ToggleRight className="w-4 h-4" />
                            Activée
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="w-4 h-4" />
                            Désactivée
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
