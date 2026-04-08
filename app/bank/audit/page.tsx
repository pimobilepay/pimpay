'use client';

import { useState, useMemo } from 'react';
import { CheckCircle, ChevronDown, ChevronRight, Download, Search, Shield, Users, Activity, Hash, Clock, Filter, RefreshCw } from 'lucide-react';

type EventType = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'APPROVE' | 'REJECT';
type EntityType = 'COMPTE' | 'TRANSACTION' | 'UTILISATEUR' | 'VIREMENT' | 'CARTE' | 'SESSION';

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: EventType;
  entityType: EntityType;
  entityId: string;
  action: string;
  actor: string;
  actorRole: string;
  ip: string;
  hash: string;
  prevHash: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

const mockAuditEntries: AuditEntry[] = [
  {
    id: '1',
    timestamp: '2024-01-15T08:02:11Z',
    eventType: 'LOGIN',
    entityType: 'SESSION',
    entityId: 'SES-9921',
    action: 'Connexion administrateur',
    actor: 'admin.martin',
    actorRole: 'Administrateur',
    ip: '192.168.1.42',
    hash: 'a3f8c2d1e9b4',
    prevHash: '000000000000',
    previousState: undefined,
    newState: { session: 'SES-9921', role: 'Administrateur', mfa: true },
  },
  {
    id: '2',
    timestamp: '2024-01-15T08:14:33Z',
    eventType: 'CREATE',
    entityType: 'COMPTE',
    entityId: 'ACC-7734',
    action: 'Création compte courant',
    actor: 'conseiller.dupont',
    actorRole: 'Conseiller',
    ip: '10.0.0.15',
    hash: 'b7e1a4f2c8d5',
    prevHash: 'a3f8c2d1e9b4',
    previousState: undefined,
    newState: { iban: 'FR76 3000 6000 0112 3456 7890 189', solde: 0, statut: 'ACTIF', devise: 'EUR' },
  },
  {
    id: '3',
    timestamp: '2024-01-15T09:05:47Z',
    eventType: 'UPDATE',
    entityType: 'UTILISATEUR',
    entityId: 'USR-1182',
    action: 'Modification profil client',
    actor: 'conseiller.dupont',
    actorRole: 'Conseiller',
    ip: '10.0.0.15',
    hash: 'c2d9b6e3f7a1',
    prevHash: 'b7e1a4f2c8d5',
    previousState: { telephone: '+33 6 12 34 56 78', adresse: '12 Rue de la Paix, Paris' },
    newState: { telephone: '+33 6 98 76 54 32', adresse: '45 Avenue Montaigne, Paris' },
  },
  {
    id: '4',
    timestamp: '2024-01-15T09:22:15Z',
    eventType: 'APPROVE',
    entityType: 'VIREMENT',
    entityId: 'VIR-5521',
    action: 'Approbation virement international',
    actor: 'directeur.bernard',
    actorRole: 'Directeur',
    ip: '172.16.0.8',
    hash: 'd5f3a8c1e6b2',
    prevHash: 'c2d9b6e3f7a1',
    previousState: { statut: 'EN_ATTENTE', montant: 15000, devise: 'USD' },
    newState: { statut: 'APPROUVE', montant: 15000, devise: 'USD', approuvePar: 'directeur.bernard' },
  },
  {
    id: '5',
    timestamp: '2024-01-15T09:45:02Z',
    eventType: 'CREATE',
    entityType: 'TRANSACTION',
    entityId: 'TXN-8843',
    action: 'Virement émis vers compte tiers',
    actor: 'système.automatique',
    actorRole: 'Système',
    ip: '127.0.0.1',
    hash: 'e8b2d4f9c3a7',
    prevHash: 'd5f3a8c1e6b2',
    previousState: undefined,
    newState: { montant: 15000, devise: 'USD', destinataire: 'HSBC London', reference: 'VIR-5521' },
  },
  {
    id: '6',
    timestamp: '2024-01-15T10:11:29Z',
    eventType: 'REJECT',
    entityType: 'CARTE',
    entityId: 'CRT-3309',
    action: 'Rejet demande carte premium',
    actor: 'analyste.moreau',
    actorRole: 'Analyste',
    ip: '10.0.0.22',
    hash: 'f1c6e9a4d2b8',
    prevHash: 'e8b2d4f9c3a7',
    previousState: { statut: 'EN_REVUE', type: 'VISA_INFINITE', score: 620 },
    newState: { statut: 'REJETE', motif: 'Score crédit insuffisant', type: 'VISA_INFINITE' },
  },
  {
    id: '7',
    timestamp: '2024-01-15T10:33:54Z',
    eventType: 'LOGIN',
    entityType: 'SESSION',
    entityId: 'SES-9945',
    action: 'Connexion conseiller',
    actor: 'conseiller.leroy',
    actorRole: 'Conseiller',
    ip: '10.0.0.31',
    hash: 'a9d3f7b5e1c4',
    prevHash: 'f1c6e9a4d2b8',
    previousState: undefined,
    newState: { session: 'SES-9945', role: 'Conseiller', mfa: false },
  },
  {
    id: '8',
    timestamp: '2024-01-15T11:02:18Z',
    eventType: 'UPDATE',
    entityType: 'COMPTE',
    entityId: 'ACC-4421',
    action: 'Mise à jour plafond virement',
    actor: 'admin.martin',
    actorRole: 'Administrateur',
    ip: '192.168.1.42',
    hash: 'b4e8c2d6f9a3',
    prevHash: 'a9d3f7b5e1c4',
    previousState: { plafondJournalier: 5000, plafondMensuel: 20000 },
    newState: { plafondJournalier: 10000, plafondMensuel: 50000 },
  },
  {
    id: '9',
    timestamp: '2024-01-15T11:45:07Z',
    eventType: 'DELETE',
    entityType: 'CARTE',
    entityId: 'CRT-1187',
    action: 'Suppression carte expirée',
    actor: 'système.nettoyage',
    actorRole: 'Système',
    ip: '127.0.0.1',
    hash: 'c7a1f4b9d3e6',
    prevHash: 'b4e8c2d6f9a3',
    previousState: { numero: '**** **** **** 7731', expiration: '12/2023', statut: 'EXPIREE' },
    newState: undefined,
  },
  {
    id: '10',
    timestamp: '2024-01-15T12:15:33Z',
    eventType: 'CREATE',
    entityType: 'VIREMENT',
    entityId: 'VIR-6634',
    action: 'Création virement programmé',
    actor: 'conseiller.leroy',
    actorRole: 'Conseiller',
    ip: '10.0.0.31',
    hash: 'd2f6a9c4e8b1',
    prevHash: 'c7a1f4b9d3e6',
    previousState: undefined,
    newState: { montant: 850, frequence: 'MENSUEL', dateDebut: '2024-02-01', beneficiaire: 'EDF' },
  },
  {
    id: '11',
    timestamp: '2024-01-15T12:58:49Z',
    eventType: 'APPROVE',
    entityType: 'UTILISATEUR',
    entityId: 'USR-2295',
    action: 'Approbation nouveau client',
    actor: 'directeur.bernard',
    actorRole: 'Directeur',
    ip: '172.16.0.8',
    hash: 'e5b3d7f1c9a4',
    prevHash: 'd2f6a9c4e8b1',
    previousState: { statut: 'EN_ATTENTE', kycScore: 87 },
    newState: { statut: 'APPROUVE', kycScore: 87, approuvePar: 'directeur.bernard', dateActivation: '2024-01-15' },
  },
  {
    id: '12',
    timestamp: '2024-01-15T13:30:22Z',
    eventType: 'UPDATE',
    entityType: 'TRANSACTION',
    entityId: 'TXN-9977',
    action: 'Correction montant transaction',
    actor: 'admin.martin',
    actorRole: 'Administrateur',
    ip: '192.168.1.42',
    hash: 'f8c4a2e6b7d3',
    prevHash: 'e5b3d7f1c9a4',
    previousState: { montant: 2340.50, statut: 'EN_COURS' },
    newState: { montant: 2340.50, statut: 'COMPLETE', dateCompletion: '2024-01-15T13:30:00Z' },
  },
  {
    id: '13',
    timestamp: '2024-01-15T14:05:11Z',
    eventType: 'REJECT',
    entityType: 'VIREMENT',
    entityId: 'VIR-7712',
    action: 'Rejet virement suspect',
    actor: 'analyste.moreau',
    actorRole: 'Analyste',
    ip: '10.0.0.22',
    hash: 'a1d5f8b2c6e9',
    prevHash: 'f8c4a2e6b7d3',
    previousState: { statut: 'EN_ANALYSE', montant: 98500, riskScore: 0.87 },
    newState: { statut: 'REJETE', motif: 'Activité suspecte détectée', flaggedBy: 'IA_DETECTION' },
  },
  {
    id: '14',
    timestamp: '2024-01-15T14:44:38Z',
    eventType: 'CREATE',
    entityType: 'COMPTE',
    entityId: 'ACC-8856',
    action: 'Ouverture compte épargne',
    actor: 'conseiller.dupont',
    actorRole: 'Conseiller',
    ip: '10.0.0.15',
    hash: 'b6e9c3d1f4a7',
    prevHash: 'a1d5f8b2c6e9',
    previousState: undefined,
    newState: { type: 'LIVRET_A', tauxInteret: 3.0, plafond: 22950, solde: 5000 },
  },
  {
    id: '15',
    timestamp: '2024-01-15T15:20:55Z',
    eventType: 'DELETE',
    entityType: 'UTILISATEUR',
    entityId: 'USR-0089',
    action: 'Clôture compte client',
    actor: 'directeur.bernard',
    actorRole: 'Directeur',
    ip: '172.16.0.8',
    hash: 'c9f2a6d4e8b5',
    prevHash: 'b6e9c3d1f4a7',
    previousState: { nom: 'Rousseau Jean', statut: 'ACTIF', comptes: 2 },
    newState: { statut: 'CLOTURE', dateCloture: '2024-01-15', motif: 'Demande client' },
  },
];

const eventTypeConfig: Record<EventType, { label: string; color: string; bg: string; border: string }> = {
  CREATE: { label: 'CRÉATION', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
  UPDATE: { label: 'MISE À JOUR', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
  DELETE: { label: 'SUPPRESSION', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
  LOGIN: { label: 'CONNEXION', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/30' },
  APPROVE: { label: 'APPROBATION', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/30' },
  REJECT: { label: 'REJET', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/30' },
};

const entityTypeLabels: Record<EntityType, string> = {
  COMPTE: 'Compte',
  TRANSACTION: 'Transaction',
  UTILISATEUR: 'Utilisateur',
  VIREMENT: 'Virement',
  CARTE: 'Carte',
  SESSION: 'Session',
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StateDiff({ previous, next }: { previous?: Record<string, unknown>; next?: Record<string, unknown> }) {
  const keys = Array.from(new Set([...Object.keys(previous || {}), ...Object.keys(next || {})]));
  if (keys.length === 0) return <p className="text-gray-500 text-xs italic">Aucune donnée d&apos;état disponible</p>;
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <p className="text-xs font-semibold text-red-400 mb-2 uppercase tracking-wider">État Précédent</p>
        {previous ? (
          <div className="space-y-1">
            {keys.filter(k => k in previous).map(k => (
              <div key={k} className="flex items-start gap-2 text-xs">
                <span className="text-gray-400 min-w-[100px] shrink-0">{k}:</span>
                <span className="text-red-300 font-mono bg-red-400/5 px-1 rounded break-all">{String(previous[k])}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-600 text-xs italic">Aucun état précédent</p>}
      </div>
      <div>
        <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Nouvel État</p>
        {next ? (
          <div className="space-y-1">
            {keys.filter(k => k in next).map(k => (
              <div key={k} className="flex items-start gap-2 text-xs">
                <span className="text-gray-400 min-w-[100px] shrink-0">{k}:</span>
                <span className="text-emerald-300 font-mono bg-emerald-400/5 px-1 rounded break-all">{String(next[k])}</span>
              </div>
            ))}
          </div>
        ) : <p className="text-gray-600 text-xs italic">Aucun nouvel état</p>}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('ALL');
  const [selectedActor, setSelectedActor] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const actors = useMemo(() => Array.from(new Set(mockAuditEntries.map(e => e.actor))), []);

  const filteredEntries = useMemo(() => {
    return mockAuditEntries.filter(entry => {
      if (selectedEventType !== 'ALL' && entry.eventType !== selectedEventType) return false;
      if (selectedEntityType !== 'ALL' && entry.entityType !== selectedEntityType) return false;
      if (selectedActor !== 'ALL' && entry.actor !== selectedActor) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!entry.action.toLowerCase().includes(q) && !entry.entityId.toLowerCase().includes(q) && !entry.actor.toLowerCase().includes(q) && !entry.ip.includes(q)) return false;
      }
      return true;
    });
  }, [selectedEventType, selectedEntityType, selectedActor, searchQuery]);

  const todayEvents = mockAuditEntries.length;
  const uniqueActors = new Set(mockAuditEntries.map(e => e.actor)).size;
  const entityCounts = mockAuditEntries.reduce((acc, e) => { acc[e.entityType] = (acc[e.entityType] || 0) + 1; return acc; }, {} as Record<string, number>);
  const mostActiveEntity = Object.entries(entityCounts).sort((a, b) => b[1] - a[1])[0];

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleExport = () => {
    const csv = [
      ['Horodatage', 'Type Événement', 'Entité', 'Action', 'Acteur', 'IP', 'Hash'].join(','),
      ...filteredEntries.map(e => [formatTimestamp(e.timestamp), e.eventType, `${e.entityType}:${e.entityId}`, `"${e.action}"`, e.actor, e.ip, e.hash].join(','))
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit_pimpay.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0a0d14] text-gray-100 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/10 border border-yellow-400/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">Journal d&apos;Audit</h1>
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-semibold">Intégrité Chaîne Vérifiée</span>
              </div>
            </div>
            <p className="text-gray-400 text-sm mt-0.5">Traçabilité complète des opérations · PIMPAY Banking</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 text-sm shadow-lg shadow-yellow-400/20"
        >
          <Download className="w-4 h-4" />
          Exporter CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{todayEvents}</p>
            <p className="text-gray-400 text-xs">Événements aujourd&apos;hui</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{uniqueActors}</p>
            <p className="text-gray-400 text-xs">Acteurs uniques</p>
          </div>
        </div>
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
            <Hash className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{mostActiveEntity ? entityTypeLabels[mostActiveEntity[0] as EntityType] : '—'}</p>
            <p className="text-gray-400 text-xs">Entité la plus active ({mostActiveEntity?.[1]} événements)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-yellow-400" />
          <span className="text-sm font-semibold text-gray-300">Filtres</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0a0d14] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-400/50 transition-colors"
            />
          </div>
          <select
            value={selectedEventType}
            onChange={e => setSelectedEventType(e.target.value)}
            className="bg-[#0a0d14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-400/50 transition-colors cursor-pointer"
          >
            <option value="ALL">Tous les types</option>
            {Object.entries(eventTypeConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={selectedEntityType}
            onChange={e => setSelectedEntityType(e.target.value)}
            className="bg-[#0a0d14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-400/50 transition-colors cursor-pointer"
          >
            <option value="ALL">Toutes les entités</option>
            {Object.entries(entityTypeLabels).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            value={selectedActor}
            onChange={e => setSelectedActor(e.target.value)}
            className="bg-[#0a0d14] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-400/50 transition-colors cursor-pointer"
          >
            <option value="ALL">Tous les acteurs</option>
            {actors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 bg-[#0a0d14] border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-400/50 transition-colors"
            />
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 bg-[#0a0d14] border border-gray-700 rounded-lg px-2 py-2 text-sm text-gray-200 focus:outline-none focus:border-yellow-400/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-gray-300">{filteredEntries.length} entrées</span>
          </div>
          <button className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-yellow-400 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Actualiser
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="w-8 px-3 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Horodatage</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type Événement</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Entité</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Acteur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry, idx) => {
                const cfg = eventTypeConfig[entry.eventType];
                const isExpanded = expandedRows.has(entry.id);
                return (
                  <>
                    <tr
                      key={entry.id}
                      className={`border-b border-gray-800/50 hover:bg-white/[0.02] cursor-pointer transition-colors group ${
                        isExpanded ? 'bg-yellow-400/[0.03]' : ''
                      }`}
                      onClick={() => toggleRow(entry.id)}
                    >
                      <td className="px-3 py-3.5">
                        <div className="text-gray-500 group-hover:text-yellow-400 transition-colors">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-300 font-mono whitespace-nowrap">{formatTimestamp(entry.timestamp)}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-xs text-gray-200 font-medium">{entityTypeLabels[entry.entityType]}</p>
                          <p className="text-[11px] text-gray-500 font-mono">{entry.entityId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs text-gray-200 max-w-[200px]">{entry.action}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="text-xs text-gray-200 font-medium">{entry.actor}</p>
                          <p className="text-[11px] text-gray-500">{entry.actorRole}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-gray-400 font-mono">{entry.ip}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 shrink-0"></div>
                            <span className="text-[11px] text-yellow-400 font-mono">{entry.hash}</span>
                          </div>
                          {idx > 0 && (
                            <div className="flex items-center gap-1.5 ml-0.5">
                              <div className="w-px h-3 bg-gray-600 ml-0.5"></div>
                              <span className="text-[10px] text-gray-600 font-mono">{entry.prevHash}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${entry.id}-detail`} className="border-b border-gray-800/50 bg-[#0d1117]">
                        <td colSpan={8} className="px-6 py-5">
                          <div className="space-y-4">
                            {/* Hash Chain Visualization */}
                            <div className="bg-[#111827] border border-gray-700/50 rounded-lg p-4">
                              <p className="text-xs font-semibold text-yellow-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                <Hash className="w-3.5 h-3.5" />
                                Chaîne de Hachage
                              </p>
                              <div className="flex items-center gap-2 flex-wrap">
                                {idx > 0 && (
                                  <>
                                    <div className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5">
                                      <p className="text-[10px] text-gray-500 mb-0.5">Bloc précédent</p>
                                      <span className="text-[11px] text-gray-400 font-mono">{entry.prevHash}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-yellow-400/60">
                                      <div className="w-4 h-px bg-yellow-400/40"></div>
                                      <span className="text-[10px]">→</span>
                                      <div className="w-4 h-px bg-yellow-400/40"></div>
                                    </div>
                                  </>
                                )}
                                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded px-3 py-1.5">
                                  <p className="text-[10px] text-yellow-400/70 mb-0.5">Bloc actuel #{entry.id}</p>
                                  <span className="text-[11px] text-yellow-400 font-mono font-bold">{entry.hash}</span>
                                </div>
                                <div className="flex items-center gap-1 text-emerald-400/60">
                                  <div className="w-4 h-px bg-emerald-400/40"></div>
                                  <span className="text-[10px]">→</span>
                                  <div className="w-4 h-px bg-emerald-400/40"></div>
                                </div>
                                <div className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5">
                                  <p className="text-[10px] text-gray-500 mb-0.5">Prochain bloc</p>
                                  <span className="text-[11px] text-gray-500 font-mono">En attente...</span>
                                </div>
                                <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-1">
                                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                                  <span className="text-[11px] text-emerald-400 font-semibold">Intégrité OK</span>
                                </div>
                              </div>
                            </div>
                            {/* State Diff */}
                            <div className="bg-[#111827] border border-gray-700/50 rounded-lg p-4">
                              <p className="text-xs font-semibold text-blue-400 mb-3 uppercase tracking-wider">Différentiel d&apos;État</p>
                              <StateDiff previous={entry.previousState} next={entry.newState} />
                            </div>
                            {/* Metadata */}
                            <div className="grid grid-cols-4 gap-3">
                              {[
                                { label: 'ID Événement', value: entry.id },
                                { label: 'Rôle Acteur', value: entry.actorRole },
                                { label: 'Adresse IP', value: entry.ip },
                                { label: 'ID Entité', value: entry.entityId },
                              ].map(item => (
                                <div key={item.label} className="bg-[#111827] border border-gray-700/50 rounded-lg p-3">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">{item.label}</p>
                                  <p className="text-xs text-gray-200 font-mono">{item.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredEntries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="w-12 h-12 text-gray-700 mb-3" />
            <p className="text-gray-400 font-medium">Aucun événement trouvé</p>
            <p className="text-gray-600 text-sm mt-1">Modifiez vos filtres pour afficher les entrées d&apos;audit</p>
          </div>
        )}
      </div>
    </div>
  );
}
