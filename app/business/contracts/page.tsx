'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSignature, Plus, Search, Filter, Download, Eye, Edit3, X,
  CheckCircle, Clock, AlertTriangle, XCircle, Calendar, DollarSign,
  ChevronLeft, ChevronRight, FileText, Users, Copy, Briefcase,
  Handshake, Truck, Building2,
} from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

type ContractStatus = 'actif' | 'en_attente' | 'expire' | 'brouillon' | 'resilie';
type ContractType = 'service' | 'fourniture' | 'emploi' | 'partenariat';

interface Milestone { id: number; title: string; date: string; done: boolean; }
interface Contract {
  id: string; title: string; partner: string; type: ContractType;
  startDate: string; endDate: string; value: number; status: ContractStatus;
  description: string; terms: string; milestones: Milestone[];
}

const STATUS_CFG: Record<ContractStatus, { label: string; color: string; icon: React.ElementType }> = {
  actif: { label: 'Actif', color: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
  en_attente: { label: 'En attente', color: 'bg-amber-500/10 text-amber-400', icon: Clock },
  expire: { label: 'Expiré', color: 'bg-red-500/10 text-red-400', icon: XCircle },
  brouillon: { label: 'Brouillon', color: 'bg-gray-500/10 text-gray-400', icon: FileText },
  resilie: { label: 'Résilié', color: 'bg-rose-500/10 text-rose-400', icon: AlertTriangle },
};

const TYPE_CFG: Record<ContractType, { label: string; icon: React.ElementType; color: string }> = {
  service: { label: 'Service', icon: Briefcase, color: '#6366f1' },
  fourniture: { label: 'Fourniture', icon: Truck, color: '#22d3ee' },
  emploi: { label: 'Emploi', icon: Users, color: '#a78bfa' },
  partenariat: { label: 'Partenariat', icon: Handshake, color: '#34d399' },
};

const CONTRACTS: Contract[] = [
  { id: 'CTR-2024-001', title: 'Conseil stratégique et transformation digitale', partner: 'BGFI Holdings', type: 'service', startDate: '2024-01-01', endDate: '2024-12-31', value: 182400000, status: 'actif', description: 'Mission de conseil stratégique pour la transformation digitale des processus bancaires.', terms: 'Paiement trimestriel. Livrables mensuels obligatoires. Clause de confidentialité stricte.',
    milestones: [{ id: 1, title: 'Audit initial', date: '2024-02-15', done: true },{ id: 2, title: 'Plan de transformation', date: '2024-04-30', done: true },{ id: 3, title: 'Phase 1 - Digitalisation', date: '2024-07-31', done: false },{ id: 4, title: 'Phase 2 - Déploiement', date: '2024-11-30', done: false }] },
  { id: 'CTR-2024-002', title: 'Intégration API bancaire complète', partner: 'Afriland First Bank', type: 'service', startDate: '2024-02-01', endDate: '2024-08-31', value: 113400000, status: 'actif', description: 'Développement et intégration complète des APIs bancaires pour le système de paiement.', terms: 'Paiement sur livrable. SLA 99.9% uptime. Support 24/7 inclus.',
    milestones: [{ id: 1, title: 'Spécifications techniques', date: '2024-02-28', done: true },{ id: 2, title: 'API v1.0', date: '2024-05-15', done: false },{ id: 3, title: 'Tests et validation', date: '2024-07-31', done: false }] },
  { id: 'CTR-2024-003', title: 'Migration plateforme de paiement', partner: 'Ecobank Transnational', type: 'partenariat', startDate: '2024-03-01', endDate: '2025-02-28', value: 271200000, status: 'actif', description: 'Partenariat stratégique pour la migration complète de la plateforme de paiement régionale.', terms: 'Partenariat exclusif Afrique Centrale. Partage des revenus 60/40.',
    milestones: [{ id: 1, title: 'Architecture système', date: '2024-04-30', done: true },{ id: 2, title: 'Migration données', date: '2024-08-31', done: false },{ id: 3, title: 'Go-live', date: '2025-01-15', done: false }] },
  { id: 'CTR-2024-004', title: 'Fourniture équipement informatique 2024', partner: 'TechVision Cameroun', type: 'fourniture', startDate: '2024-01-15', endDate: '2024-12-31', value: 78000000, status: 'actif', description: 'Contrat cadre pour la fourniture de matériel informatique (serveurs, postes, réseau).', terms: 'Livraison sous 15 jours. Garantie 3 ans pièces et main d\'oeuvre.',
    milestones: [{ id: 1, title: 'Livraison Q1', date: '2024-03-31', done: true },{ id: 2, title: 'Livraison Q2', date: '2024-06-30', done: false },{ id: 3, title: 'Livraison Q3', date: '2024-09-30', done: false }] },
  { id: 'CTR-2024-005', title: 'Contrat de travail - Développeur Senior', partner: 'Robert Manga', type: 'emploi', startDate: '2024-04-01', endDate: '2026-03-31', value: 91200000, status: 'en_attente', description: 'CDI pour le poste de Développeur Full-Stack Senior au département IT.', terms: 'Période d\'essai 6 mois. Salaire 3 800 000 XAF/mois. Avantages sociaux inclus.',
    milestones: [{ id: 1, title: 'Signature contrat', date: '2024-04-01', done: false },{ id: 2, title: 'Fin période d\'essai', date: '2024-10-01', done: false }] },
  { id: 'CTR-2024-006', title: 'Partenariat Mobile Money Orange', partner: 'Orange Cameroun', type: 'partenariat', startDate: '2023-06-01', endDate: '2024-05-31', value: 35000000, status: 'actif', description: 'Accord de partenariat pour l\'intégration Orange Money dans la plateforme PimPay.', terms: 'Commission 1.2% par transaction. Volume minimum 10 000 transactions/mois.',
    milestones: [{ id: 1, title: 'Intégration API', date: '2023-08-31', done: true },{ id: 2, title: 'Audit annuel', date: '2024-05-15', done: false }] },
  { id: 'CTR-2024-007', title: 'Fournitures de bureau annuelles', partner: 'Bureau Express SARL', type: 'fourniture', startDate: '2024-01-01', endDate: '2024-12-31', value: 11700000, status: 'actif', description: 'Contrat annuel de fournitures de bureau et consommables.', terms: 'Commande mensuelle. Livraison gratuite à partir de 500 000 XAF.',
    milestones: [{ id: 1, title: 'Livraison mensuelle', date: '2024-12-31', done: false }] },
  { id: 'CTR-2024-008', title: 'Hébergement cloud et infrastructure', partner: 'CloudAfrica Services', type: 'service', startDate: '2023-01-01', endDate: '2024-12-31', value: 94000000, status: 'actif', description: 'Services d\'hébergement cloud, CDN et infrastructure de production.', terms: 'SLA 99.95%. Support premium 24/7. Facturation mensuelle.',
    milestones: [{ id: 1, title: 'Migration Q1', date: '2024-03-31', done: true },{ id: 2, title: 'Optimisation', date: '2024-09-30', done: false }] },
  { id: 'CTR-2023-009', title: 'Audit comptable OHADA 2023', partner: 'Cabinet Deloitte CM', type: 'service', startDate: '2023-10-01', endDate: '2024-01-31', value: 25000000, status: 'expire', description: 'Mission d\'audit comptable annuel selon les normes OHADA/SYSCOHADA.', terms: 'Rapport final avant le 31 janvier. Conformité OHADA obligatoire.',
    milestones: [{ id: 1, title: 'Collecte données', date: '2023-11-30', done: true },{ id: 2, title: 'Rapport final', date: '2024-01-31', done: true }] },
  { id: 'CTR-2024-010', title: 'Contrat maintenance réseau', partner: 'Camtel', type: 'service', startDate: '2024-05-01', endDate: '2025-04-30', value: 16800000, status: 'brouillon', description: 'Maintenance du réseau fibre optique et connectivité internet haut débit.', terms: 'Intervention sous 4h en cas de panne. Débit garanti 100 Mbps.',
    milestones: [{ id: 1, title: 'Installation', date: '2024-05-15', done: false },{ id: 2, title: 'Revue semestrielle', date: '2024-11-15', done: false }] },
  { id: 'CTR-2023-011', title: 'Accord de distribution UBA', partner: 'UBA Cameroun', type: 'partenariat', startDate: '2023-03-01', endDate: '2024-02-28', value: 45000000, status: 'resilie', description: 'Accord de distribution des services PimPay via le réseau UBA.', terms: 'Résiliation anticipée par accord mutuel.',
    milestones: [{ id: 1, title: 'Lancement pilote', date: '2023-05-15', done: true },{ id: 2, title: 'Déploiement national', date: '2023-09-30', done: false }] },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';
type TabFilter = 'all' | 'actif' | 'en_attente' | 'expire' | 'brouillon';

const pieData = [
  { name: 'Service', value: CONTRACTS.filter(c => c.type === 'service').length, color: '#6366f1' },
  { name: 'Fourniture', value: CONTRACTS.filter(c => c.type === 'fourniture').length, color: '#22d3ee' },
  { name: 'Emploi', value: CONTRACTS.filter(c => c.type === 'emploi').length, color: '#a78bfa' },
  { name: 'Partenariat', value: CONTRACTS.filter(c => c.type === 'partenariat').length, color: '#34d399' },
];

export default function ContractsPage() {
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState<TabFilter>('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Contract | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 8;

  const filtered = useMemo(() => {
    let list = CONTRACTS;
    if (tabFilter !== 'all') list = list.filter(c => c.status === tabFilter);
    if (typeFilter !== 'all') list = list.filter(c => c.type === typeFilter);
    if (search) list = list.filter(c => c.title.toLowerCase().includes(search.toLowerCase()) || c.partner.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [search, tabFilter, typeFilter]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);
  const activeCount = CONTRACTS.filter(c => c.status === 'actif').length;
  const pendingCount = CONTRACTS.filter(c => c.status === 'en_attente').length;
  const expiringCount = CONTRACTS.filter(c => c.status === 'actif' && c.endDate <= '2024-05-10').length;
  const totalValue = CONTRACTS.filter(c => c.status === 'actif').reduce((s, c) => s + c.value, 0);

  const tabs: { key: TabFilter; label: string }[] = [
    { key: 'all', label: 'Tous' }, { key: 'actif', label: 'Actifs' }, { key: 'en_attente', label: 'En Attente' },
    { key: 'expire', label: 'Expirés' }, { key: 'brouillon', label: 'Brouillons' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"><FileSignature className="w-5 h-5 text-emerald-400" /></div>
          <div><h1 className="text-xl font-bold text-white">Contrats</h1><p className="text-sm text-gray-400">Gestion des contrats et accords commerciaux</p></div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Copy className="w-4 h-4" />Modèles</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Download className="w-4 h-4" />Exporter</button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all"><Plus className="w-4 h-4" />Nouveau Contrat</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Contrats Actifs', value: activeCount.toString(), icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'En Attente de Signature', value: pendingCount.toString(), icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { label: 'Expirant bientôt', value: expiringCount.toString(), icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20' },
          { label: 'Valeur Totale', value: fmt(totalValue), icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/20' },
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

      {/* Pie Chart */}
      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-4">Répartition par type</h2>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                {pieData.map((entry, index) => (<Cell key={index} fill={entry.color} />))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: '#0d1321', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }} />
              <Legend formatter={(value) => <span style={{ color: '#9ca3af', fontSize: 12 }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {tabs.map(t => (<button key={t.key} onClick={() => { setTabFilter(t.key); setPage(1); }} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tabFilter === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>{t.label}</button>))}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." className="pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 w-56" /></div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
            <option value="all">Tous types</option><option value="service">Service</option><option value="fourniture">Fourniture</option><option value="emploi">Emploi</option><option value="partenariat">Partenariat</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
            <th className="px-4 py-3">Réf.</th><th className="px-4 py-3">Titre</th><th className="px-4 py-3">Partenaire</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Début</th><th className="px-4 py-3">Fin</th><th className="px-4 py-3">Valeur</th><th className="px-4 py-3">Statut</th><th className="px-4 py-3">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-white/5">{paged.map(c => {
            const st = STATUS_CFG[c.status];
            return (
              <tr key={c.id} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3 text-gray-300 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3 text-white max-w-xs truncate">{c.title}</td>
                <td className="px-4 py-3 text-gray-300">{c.partner}</td>
                <td className="px-4 py-3 text-gray-400">{TYPE_CFG[c.type].label}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{c.startDate}</td>
                <td className="px-4 py-3 text-gray-400 text-xs">{c.endDate}</td>
                <td className="px-4 py-3 text-white font-medium text-xs">{fmt(c.value)}</td>
                <td className="px-4 py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.color}`}><st.icon className="w-3 h-3" />{st.label}</span></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setSelected(c)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Eye className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit3 className="w-4 h-4" /></button>
                    <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"><Download className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <span className="text-xs text-gray-400">{filtered.length} contrats</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-xs text-gray-300">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {/* Contract Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2"><span className="text-xs text-gray-500 font-mono">{selected.id}</span><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CFG[selected.status].color}`}>{STATUS_CFG[selected.status].label}</span></div>
                <h2 className="text-lg font-semibold text-white mt-1">{selected.title}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[{ l: 'Partenaire', v: selected.partner },{ l: 'Type', v: TYPE_CFG[selected.type].label },{ l: 'Date de début', v: selected.startDate },{ l: 'Date de fin', v: selected.endDate },{ l: 'Valeur', v: fmt(selected.value) }].map((f, i) => (
                <div key={i}><p className="text-xs text-gray-500">{f.l}</p><p className="text-sm text-white mt-1">{f.v}</p></div>
              ))}
            </div>
            <div><p className="text-xs text-gray-500 mb-1">Description</p><p className="text-sm text-gray-300">{selected.description}</p></div>
            <div><p className="text-xs text-gray-500 mb-1">Termes clés</p><p className="text-sm text-gray-300">{selected.terms}</p></div>
            <div>
              <p className="text-xs text-gray-500 mb-3">Jalons</p>
              <div className="space-y-2">
                {selected.milestones.map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${m.done ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                      {m.done ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Clock className="w-3.5 h-3.5 text-gray-500" />}
                    </div>
                    <div className="flex-1"><p className={`text-sm ${m.done ? 'text-gray-400 line-through' : 'text-white'}`}>{m.title}</p></div>
                    <span className="text-xs text-gray-500">{m.date}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Download className="w-4 h-4" />Télécharger</button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all"><Edit3 className="w-4 h-4" />Modifier</button>
            </div>
          </div>
        </div>
      )}

      {/* New Contract Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <div className="bg-[#0d1321] border border-white/10 rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-6 space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-white">Nouveau Contrat</h2><button onClick={() => setShowNew(false)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400"><X className="w-5 h-5" /></button></div>
            {[{ l: 'Titre', ph: 'Titre du contrat' },{ l: 'Partenaire', ph: 'Nom du partenaire' }].map((f, i) => (
              <div key={i}><label className="block text-xs text-gray-400 mb-1.5">{f.l}</label><input placeholder={f.ph} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" /></div>
            ))}
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-400 mb-1.5">Type</label><select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"><option>Service</option><option>Fourniture</option><option>Emploi</option><option>Partenariat</option></select></div>
              <div><label className="block text-xs text-gray-400 mb-1.5">Valeur (XAF)</label><input placeholder="0" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-400 mb-1.5">Date de début</label><input type="date" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
              <div><label className="block text-xs text-gray-400 mb-1.5">Date de fin</label><input type="date" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500" /></div>
            </div>
            <div><label className="block text-xs text-gray-400 mb-1.5">Description</label><textarea rows={3} placeholder="Description du contrat..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none" /></div>
            <div><label className="block text-xs text-gray-400 mb-1.5">Termes clés</label><textarea rows={2} placeholder="Conditions principales..." className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none" /></div>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">Brouillon</button>
              <button className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all">Soumettre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}