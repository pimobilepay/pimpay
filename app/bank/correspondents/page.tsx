'use client';

import { useState } from 'react';
import { LayoutGrid, List, Search, Filter, ArrowUpDown, TrendingUp, Globe, Building2, ChevronDown } from 'lucide-react';

const CORRESPONDANTS = [
  {
    id: 1,
    nom: 'BEAC – Banque des États de l\'Afrique Centrale',
    nomCourt: 'BEAC',
    bic: 'BEACCMCX',
    pays: 'Cameroun',
    flag: '🇨🇲',
    type: 'Direct',
    nostro: 'CM21 0001 0000 9901 2345 6789 001',
    vostro: 'CM21 0001 0000 9901 9876 5432 002',
    limiteJour: 500_000_000,
    utilise: 312_450_000,
    statut: 'Actif',
    devise: 'XAF',
    ville: 'Yaoundé',
  },
  {
    id: 2,
    nom: 'BGFI Bank Gabon',
    nomCourt: 'BGFI',
    bic: 'BGFIGAGL',
    pays: 'Gabon',
    flag: '🇬🇦',
    type: 'Direct',
    nostro: 'GA21 4000 1000 0120 0101 2345 001',
    vostro: 'GA21 4000 1000 0120 0101 9876 002',
    limiteJour: 350_000_000,
    utilise: 89_750_000,
    statut: 'Actif',
    devise: 'XAF',
    ville: 'Libreville',
  },
  {
    id: 3,
    nom: 'Ecobank Cameroun',
    nomCourt: 'Ecobank',
    bic: 'ECOCMCX',
    pays: 'Cameroun',
    flag: '🇨🇲',
    type: 'Indirect',
    nostro: 'CM21 5002 0000 4401 2345 6789 003',
    vostro: 'CM21 5002 0000 4401 9876 5432 004',
    limiteJour: 200_000_000,
    utilise: 178_000_000,
    statut: 'Actif',
    devise: 'XAF',
    ville: 'Douala',
  },
  {
    id: 4,
    nom: 'UBA Congo',
    nomCourt: 'UBA Congo',
    bic: 'UBAFCGCG',
    pays: 'Congo',
    flag: '🇨🇬',
    type: 'Indirect',
    nostro: 'CG52 0600 6620 0011 2200 0015 001',
    vostro: 'CG52 0600 6620 0011 2200 0016 002',
    limiteJour: 150_000_000,
    utilise: 42_300_000,
    statut: 'Actif',
    devise: 'XAF',
    ville: 'Brazzaville',
  },
  {
    id: 5,
    nom: 'Société Générale Tchad',
    nomCourt: 'SG Tchad',
    bic: 'SOGETDTD',
    pays: 'Tchad',
    flag: '🇹🇩',
    type: 'Nested',
    nostro: 'TD89 6000 2000 0600 0985 5555 001',
    vostro: 'TD89 6000 2000 0600 0985 6666 002',
    limiteJour: 100_000_000,
    utilise: 95_500_000,
    statut: 'Surveillé',
    devise: 'XAF',
    ville: "N'Djamena",
  },
  {
    id: 6,
    nom: 'Afriland First Bank',
    nomCourt: 'Afriland',
    bic: 'CCEICMCX',
    pays: 'Cameroun',
    flag: '🇨🇲',
    type: 'Direct',
    nostro: 'CM21 1003 2000 9901 1122 3344 005',
    vostro: 'CM21 1003 2000 9901 5566 7788 006',
    limiteJour: 400_000_000,
    utilise: 210_000_000,
    statut: 'Actif',
    devise: 'XAF',
    ville: 'Yaoundé',
  },
  {
    id: 7,
    nom: 'CBCA – Crédit du Congo',
    nomCourt: 'CBCA',
    bic: 'CBCACGCG',
    pays: 'Congo',
    flag: '🇨🇬',
    type: 'Nested',
    nostro: 'CG52 0700 7720 0022 3300 0027 001',
    vostro: 'CG52 0700 7720 0022 3300 0028 002',
    limiteJour: 80_000_000,
    utilise: 12_000_000,
    statut: 'Inactif',
    devise: 'XAF',
    ville: 'Pointe-Noire',
  },
  {
    id: 8,
    nom: 'BSIC Centrafrique',
    nomCourt: 'BSIC RCA',
    bic: 'BSICCFBG',
    pays: 'Centrafrique',
    flag: '🇨🇫',
    type: 'Indirect',
    nostro: 'CF4220001000010891234567890',
    vostro: 'CF4220001000010899876543210',
    limiteJour: 60_000_000,
    utilise: 8_400_000,
    statut: 'Actif',
    devise: 'XAF',
    ville: 'Bangui',
  },
];

function formatMontant(val: number): string {
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + ' M';
  if (val >= 1_000) return (val / 1_000).toFixed(0) + ' K';
  return val.toString();
}

function pct(utilise: number, limite: number): number {
  return Math.min(100, Math.round((utilise / limite) * 100));
}

function typeBadge(type: string) {
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide';
  if (type === 'Direct') return `${base} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`;
  if (type === 'Indirect') return `${base} bg-blue-500/20 text-blue-400 border border-blue-500/30`;
  return `${base} bg-purple-500/20 text-purple-400 border border-purple-500/30`;
}

function statutDot(statut: string) {
  if (statut === 'Actif') return 'bg-emerald-400';
  if (statut === 'Surveillé') return 'bg-amber-400';
  return 'bg-red-400';
}

function usageBarColor(p: number) {
  if (p >= 90) return 'bg-red-500';
  if (p >= 70) return 'bg-amber-400';
  return 'bg-yellow-500';
}

export default function CorrespondantsPage() {
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('Tous');
  const [filterStatut, setFilterStatut] = useState('Tous');
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = CORRESPONDANTS.filter((b) => {
    const matchSearch =
      b.nom.toLowerCase().includes(search.toLowerCase()) ||
      b.bic.toLowerCase().includes(search.toLowerCase()) ||
      b.pays.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'Tous' || b.type === filterType;
    const matchStatut = filterStatut === 'Tous' || b.statut === filterStatut;
    return matchSearch && matchType && matchStatut;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (!sortField) return 0;
    let va: number | string = '';
    let vb: number | string = '';
    if (sortField === 'nom') { va = a.nom; vb = b.nom; }
    if (sortField === 'limite') { va = a.limiteJour; vb = b.limiteJour; }
    if (sortField === 'utilise') { va = pct(a.utilise, a.limiteJour); vb = pct(b.utilise, b.limiteJour); }
    if (sortField === 'pays') { va = a.pays; vb = b.pays; }
    if (typeof va === 'string') return sortAsc ? va.localeCompare(vb as string) : (vb as string).localeCompare(va);
    return sortAsc ? (va as number) - (vb as number) : (vb as number) - (va as number);
  });

  const totalActifs = CORRESPONDANTS.filter(b => b.statut === 'Actif').length;
  const totalLimite = CORRESPONDANTS.reduce((s, b) => s + b.limiteJour, 0);
  const totalUtilise = CORRESPONDANTS.reduce((s, b) => s + b.utilise, 0);

  function handleSort(field: string) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  }

  return (
    <div className="min-h-screen bg-[#0a0c10] text-gray-100 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Correspondants Bancaires</h1>
            <p className="text-xs text-gray-500 mt-0.5">Zone CEMAC · Réseau interbancaire · Comptes Nostro / Vostro</p>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Correspondants', value: CORRESPONDANTS.length.toString(), sub: 'Zone CEMAC', icon: <Building2 className="w-4 h-4" /> },
          { label: 'Banques Actives', value: totalActifs.toString(), sub: `${CORRESPONDANTS.length - totalActifs} inactives`, icon: <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> },
          { label: 'Limite Globale / Jour', value: formatMontant(totalLimite) + ' XAF', sub: 'Toutes devises', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Exposé Aujourd\'hui', value: formatMontant(totalUtilise) + ' XAF', sub: `${pct(totalUtilise, totalLimite)}% utilisé`, icon: <TrendingUp className="w-4 h-4" /> },
        ].map((k, i) => (
          <div key={i} className="bg-[#13151c] border border-[#1e2130] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{k.label}</span>
              <span className="text-yellow-400 opacity-80">{k.icon}</span>
            </div>
            <p className="text-xl font-bold text-white">{k.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, BIC, pays…"
            className="w-full bg-[#13151c] border border-[#1e2130] rounded-lg pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="appearance-none bg-[#13151c] border border-[#1e2130] rounded-lg pl-3 pr-8 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500/50 cursor-pointer"
            >
              {['Tous', 'Direct', 'Indirect', 'Nested'].map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterStatut}
              onChange={e => setFilterStatut(e.target.value)}
              className="appearance-none bg-[#13151c] border border-[#1e2130] rounded-lg pl-3 pr-8 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-yellow-500/50 cursor-pointer"
            >
              {['Tous', 'Actif', 'Surveillé', 'Inactif'].map(t => <option key={t}>{t}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
          <div className="flex bg-[#13151c] border border-[#1e2130] rounded-lg overflow-hidden">
            <button
              onClick={() => setView('cards')}
              className={`px-3 py-2.5 flex items-center gap-1.5 text-sm transition-colors ${
                view === 'cards' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Cartes</span>
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-2.5 flex items-center gap-1.5 text-sm transition-colors ${
                view === 'table' ? 'bg-yellow-500/20 text-yellow-400' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Tableau</span>
            </button>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-gray-500 mb-4">{sorted.length} correspondant{sorted.length > 1 ? 's' : ''} affiché{sorted.length > 1 ? 's' : ''}</p>

      {/* Cards View */}
      {view === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sorted.map((bank) => {
            const p = pct(bank.utilise, bank.limiteJour);
            return (
              <div
                key={bank.id}
                className="bg-[#13151c] border border-[#1e2130] rounded-2xl p-5 hover:border-yellow-500/30 hover:shadow-[0_0_24px_rgba(234,179,8,0.06)] transition-all duration-300 group cursor-pointer flex flex-col gap-4"
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#1a1d27] border border-[#252836] flex items-center justify-center text-2xl">
                      {bank.flag}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight group-hover:text-yellow-400 transition-colors">{bank.nomCourt}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{bank.bic}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${statutDot(bank.statut)}`} />
                    <span className="text-xs text-gray-500">{bank.statut}</span>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <p className="text-xs text-gray-400 leading-snug">{bank.nom}</p>
                  <p className="text-xs text-gray-600 mt-1">{bank.ville}, {bank.pays}</p>
                </div>

                {/* Type badge */}
                <div>
                  <span className={typeBadge(bank.type)}>{bank.type}</span>
                </div>

                {/* Usage bar */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-xs text-gray-500">Limite journalière</span>
                    <span className={`text-xs font-semibold ${p >= 90 ? 'text-red-400' : p >= 70 ? 'text-amber-400' : 'text-yellow-400'}`}>{p}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${usageBarColor(p)}`}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs text-gray-600">{formatMontant(bank.utilise)} utilisé</span>
                    <span className="text-xs text-gray-600">{formatMontant(bank.limiteJour)} {bank.devise}</span>
                  </div>
                </div>

                {/* Accounts */}
                <div className="pt-3 border-t border-[#1e2130] grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Nostro</p>
                    <p className="text-xs font-mono text-gray-400 truncate">{bank.nostro.slice(-10)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-0.5">Vostro</p>
                    <p className="text-xs font-mono text-gray-400 truncate">{bank.vostro.slice(-10)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {view === 'table' && (
        <div className="bg-[#13151c] border border-[#1e2130] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1e2130]">
                  {[
                    { label: 'Nom', field: 'nom' },
                    { label: 'BIC/SWIFT', field: null },
                    { label: 'Pays', field: 'pays' },
                    { label: 'Type', field: null },
                    { label: 'Compte Nostro', field: null },
                    { label: 'Compte Vostro', field: null },
                    { label: 'Limite / Jour', field: 'limite' },
                    { label: 'Utilisé %', field: 'utilise' },
                    { label: 'Statut', field: null },
                  ].map((col, i) => (
                    <th
                      key={i}
                      onClick={() => col.field && handleSort(col.field)}
                      className={`px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                        col.field ? 'cursor-pointer hover:text-yellow-400 select-none' : ''
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {col.label}
                        {col.field && <ArrowUpDown className="w-3 h-3 opacity-50" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e2130]">
                {sorted.map((bank) => {
                  const p = pct(bank.utilise, bank.limiteJour);
                  return (
                    <tr key={bank.id} className="hover:bg-[#1a1d27] transition-colors group">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#1e2130] flex items-center justify-center text-lg flex-shrink-0">
                            {bank.flag}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white group-hover:text-yellow-400 transition-colors whitespace-nowrap">{bank.nomCourt}</p>
                            <p className="text-xs text-gray-600 truncate max-w-[180px]">{bank.nom}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-md">{bank.bic}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm text-gray-300 whitespace-nowrap">{bank.pays}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={typeBadge(bank.type)}>{bank.type}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-gray-500 bg-[#1e2130] px-2 py-1 rounded">
                          ···{bank.nostro.slice(-8)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-xs text-gray-500 bg-[#1e2130] px-2 py-1 rounded">
                          ···{bank.vostro.slice(-8)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-semibold text-white whitespace-nowrap">
                          {formatMontant(bank.limiteJour)} <span className="text-xs text-gray-600 font-normal">{bank.devise}</span>
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <div className="flex-1 h-1.5 bg-[#1e2130] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${usageBarColor(p)}`}
                              style={{ width: `${p}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-8 text-right ${p >= 90 ? 'text-red-400' : p >= 70 ? 'text-amber-400' : 'text-yellow-400'}`}>{p}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statutDot(bank.statut)}`} />
                          <span className={`text-xs font-medium ${
                            bank.statut === 'Actif' ? 'text-emerald-400' :
                            bank.statut === 'Surveillé' ? 'text-amber-400' : 'text-red-400'
                          }`}>{bank.statut}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sorted.length === 0 && (
            <div className="py-16 text-center text-gray-600">
              <Globe className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Aucun correspondant trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Footer note */}
      <div className="mt-8 flex items-center gap-2 text-xs text-gray-600">
        <Filter className="w-3.5 h-3.5" />
        <span>Données mises à jour en temps réel · Banque Centrale CEMAC · Conformité AML/CFT</span>
      </div>
    </div>
  );
}
