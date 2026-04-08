'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  TrendingUp,
  Activity,
  DollarSign,
  BarChart3,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';

const mockTransactions = [
  { id: 'TXN-2024-001', date: '2024-01-15 09:23:14', type: 'Virement', debiteur: 'Orange Money CI', creancier: 'MTN Mobile Money', montant: 5000000, devise: 'XAF', statut: 'Complété', stp: true, ref: 'REF-001-XAF' },
  { id: 'TXN-2024-002', date: '2024-01-15 10:45:32', type: 'Paiement', debiteur: 'Société Générale', creancier: 'BNP Paribas', montant: 12500, devise: 'EUR', statut: 'En cours', stp: false, ref: 'REF-002-EUR' },
  { id: 'TXN-2024-003', date: '2024-01-15 11:12:08', type: 'Remise', debiteur: 'Ecobank Cameroun', creancier: 'UBA Bank', montant: 2750000, devise: 'XAF', statut: 'Complété', stp: true, ref: 'REF-003-XAF' },
  { id: 'TXN-2024-004', date: '2024-01-15 13:05:47', type: 'Prélèvement', debiteur: 'BICEC', creancier: 'Afriland First Bank', montant: 890000, devise: 'XAF', statut: 'Rejeté', stp: false, ref: 'REF-004-XAF' },
  { id: 'TXN-2024-005', date: '2024-01-15 14:30:21', type: 'Virement', debiteur: 'Crédit Lyonnais', creancier: 'Deutsche Bank', montant: 45000, devise: 'EUR', statut: 'Complété', stp: true, ref: 'REF-005-EUR' },
  { id: 'TXN-2024-006', date: '2024-01-15 15:18:55', type: 'Collecte', debiteur: 'Wave Senegal', creancier: 'Free Money', montant: 1200000, devise: 'XAF', statut: 'En attente', stp: false, ref: 'REF-006-XAF' },
  { id: 'TXN-2024-007', date: '2024-01-16 08:42:33', type: 'Paiement', debiteur: 'SGBC', creancier: 'CCA Bank', montant: 3450000, devise: 'XAF', statut: 'Complété', stp: true, ref: 'REF-007-XAF' },
  { id: 'TXN-2024-008', date: '2024-01-16 09:55:19', type: 'Virement', debiteur: 'ING Bank', creancier: 'HSBC France', montant: 78500, devise: 'EUR', statut: 'En cours', stp: false, ref: 'REF-008-EUR' },
  { id: 'TXN-2024-009', date: '2024-01-16 11:23:07', type: 'Remise', debiteur: 'Express Union', creancier: 'CamPost', montant: 675000, devise: 'XAF', statut: 'Complété', stp: true, ref: 'REF-009-XAF' },
  { id: 'TXN-2024-010', date: '2024-01-16 13:44:52', type: 'Prélèvement', debiteur: 'BOA Cameroun', creancier: 'NFC Bank', montant: 4100000, devise: 'XAF', statut: 'Rejeté', stp: false, ref: 'REF-010-XAF' },
  { id: 'TXN-2024-011', date: '2024-01-16 14:12:38', type: 'Collecte', debiteur: 'Boursorama', creancier: 'Fortuneo', montant: 9800, devise: 'EUR', statut: 'Complété', stp: true, ref: 'REF-011-EUR' },
  { id: 'TXN-2024-012', date: '2024-01-16 15:30:44', type: 'Virement', debiteur: 'Rawbank', creancier: 'Trust Merchant Bank', montant: 8900000, devise: 'XAF', statut: 'En attente', stp: false, ref: 'REF-012-XAF' },
  { id: 'TXN-2024-013', date: '2024-01-17 08:05:16', type: 'Paiement', debiteur: 'Société Ivoirienne de Banque', creancier: 'BACI', montant: 560000, devise: 'XAF', statut: 'Complété', stp: true, ref: 'REF-013-XAF' },
  { id: 'TXN-2024-014', date: '2024-01-17 10:22:41', type: 'Remise', debiteur: 'Caisse Épargne', creancier: 'La Banque Postale', montant: 22300, devise: 'EUR', statut: 'En cours', stp: false, ref: 'REF-014-EUR' },
  { id: 'TXN-2024-015', date: '2024-01-17 12:48:09', type: 'Prélèvement', debiteur: 'Banque Atlantique', creancier: 'Diamond Bank', montant: 1850000, devise: 'XAF', statut: 'Complété', stp: true, ref: 'REF-015-XAF' },
];

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  'Complété': { label: 'Complété', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: <CheckCircle className="w-3 h-3" /> },
  'En cours': { label: 'En cours', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: <Clock className="w-3 h-3" /> },
  'En attente': { label: 'En attente', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20', icon: <AlertCircle className="w-3 h-3" /> },
  'Rejeté': { label: 'Rejeté', color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: <XCircle className="w-3 h-3" /> },
};

const typeConfig: Record<string, string> = {
  'Virement': 'text-[#C8A961] bg-[#C8A961]/10 border-[#C8A961]/20',
  'Paiement': 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  'Remise': 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  'Prélèvement': 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  'Collecte': 'text-pink-400 bg-pink-400/10 border-pink-400/20',
};

export default function TransactionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [typeFilter, setTypeFilter] = useState('Tous');
  const [currencyFilter, setCurrencyFilter] = useState('Toutes');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [showActions, setShowActions] = useState<string | null>(null);
  const itemsPerPage = 8;

  const filtered = useMemo(() => {
    let data = [...mockTransactions];
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(t =>
        t.ref.toLowerCase().includes(s) ||
        t.debiteur.toLowerCase().includes(s) ||
        t.creancier.toLowerCase().includes(s) ||
        t.id.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'Tous') data = data.filter(t => t.statut === statusFilter);
    if (typeFilter !== 'Tous') data = data.filter(t => t.type === typeFilter);
    if (currencyFilter !== 'Toutes') data = data.filter(t => t.devise === currencyFilter);
    if (amountMin) data = data.filter(t => t.montant >= Number(amountMin));
    if (amountMax) data = data.filter(t => t.montant <= Number(amountMax));
    if (dateFrom) data = data.filter(t => t.date >= dateFrom);
    if (dateTo) data = data.filter(t => t.date <= dateTo + ' 23:59:59');
    if (sortField) {
      data.sort((a, b) => {
        const av = (a as Record<string, unknown>)[sortField];
        const bv = (b as Record<string, unknown>)[sortField];
        if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
        return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
      });
    }
    return data;
  }, [search, statusFilter, typeFilter, currencyFilter, amountMin, amountMax, dateFrom, dateTo, sortField, sortDir]);

  const xafTransactions = mockTransactions.filter(t => t.devise === 'XAF');
  const totalVolume = xafTransactions.reduce((sum, t) => sum + t.montant, 0);
  const avgAmount = mockTransactions.length ? Math.round(mockTransactions.reduce((s, t) => s + t.montant, 0) / mockTransactions.length) : 0;
  const stpCount = mockTransactions.filter(t => t.stp).length;
  const stpRate = Math.round((stpCount / mockTransactions.length) * 100);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const formatAmount = (amount: number, currency: string) => {
    if (currency === 'XAF') return new Intl.NumberFormat('fr-FR').format(amount) + ' XAF';
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    const [date, time] = dateStr.split(' ');
    return { date, time };
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[#C8A961]/10 border border-[#C8A961]/30 flex items-center justify-center">
              <Activity className="w-4 h-4 text-[#C8A961]" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Transactions</h1>
          </div>
          <p className="text-gray-400 text-sm ml-11">Gérez et suivez toutes vos transactions bancaires</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1F2937] bg-[#111827] text-gray-300 hover:text-white hover:border-[#C8A961]/40 transition-all text-sm font-medium">
            <Upload className="w-4 h-4" />
            <span>Importer</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#1F2937] bg-[#111827] text-gray-300 hover:text-white hover:border-[#C8A961]/40 transition-all text-sm font-medium">
            <Download className="w-4 h-4" />
            <span>Exporter</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C8A961] hover:bg-[#B8944A] text-black transition-all text-sm font-semibold shadow-lg shadow-[#C8A961]/20">
            <Plus className="w-4 h-4" />
            <span>Nouvelle</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 hover:border-[#C8A961]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Total Transactions</span>
            <div className="w-7 h-7 rounded-lg bg-[#C8A961]/10 flex items-center justify-center">
              <BarChart3 className="w-3.5 h-3.5 text-[#C8A961]" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{mockTransactions.length}</p>
          <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% ce mois
          </p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 hover:border-[#C8A961]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Volume XAF</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(totalVolume)}</p>
          <p className="text-xs text-gray-500 mt-1">XAF total cumulé</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 hover:border-[#C8A961]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Montant Moyen</span>
            <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
              <Activity className="w-3.5 h-3.5 text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(avgAmount)}</p>
          <p className="text-xs text-gray-500 mt-1">par transaction</p>
        </div>
        <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 hover:border-[#C8A961]/30 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Taux STP</span>
            <div className="w-7 h-7 rounded-lg bg-purple-400/10 flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{stpRate}%</p>
          <div className="mt-2 w-full bg-[#1F2937] rounded-full h-1.5">
            <div className="bg-purple-400 h-1.5 rounded-full transition-all" style={{ width: `${stpRate}%` }}></div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-[#C8A961]" />
          <span className="text-sm font-medium text-gray-300">Filtres</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher ref, débiteur, créancier..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0A0E17] border border-[#1F2937] rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C8A961]/50 transition-all"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-[#0A0E17] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C8A961]/50 transition-all cursor-pointer"
          >
            <option value="Tous">Tous les statuts</option>
            <option value="Complété">Complété</option>
            <option value="En cours">En cours</option>
            <option value="En attente">En attente</option>
            <option value="Rejeté">Rejeté</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
            className="bg-[#0A0E17] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C8A961]/50 transition-all cursor-pointer"
          >
            <option value="Tous">Tous les types</option>
            <option value="Virement">Virement</option>
            <option value="Paiement">Paiement</option>
            <option value="Remise">Remise</option>
            <option value="Prélèvement">Prélèvement</option>
            <option value="Collecte">Collecte</option>
          </select>
          <select
            value={currencyFilter}
            onChange={e => { setCurrencyFilter(e.target.value); setCurrentPage(1); }}
            className="bg-[#0A0E17] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C8A961]/50 transition-all cursor-pointer"
          >
            <option value="Toutes">Toutes devises</option>
            <option value="XAF">XAF</option>
            <option value="EUR">EUR</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="w-full bg-[#0A0E17] border border-[#1F2937] rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#C8A961]/50 transition-all"
              placeholder="Du"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-3">
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
            className="bg-[#0A0E17] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#C8A961]/50 transition-all"
          />
          <input
            type="number"
            placeholder="Montant min"
            value={amountMin}
            onChange={e => { setAmountMin(e.target.value); setCurrentPage(1); }}
            className="bg-[#0A0E17] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C8A961]/50 transition-all w-36"
          />
          <input
            type="number"
            placeholder="Montant max"
            value={amountMax}
            onChange={e => { setAmountMax(e.target.value); setCurrentPage(1); }}
            className="bg-[#0A0E17] border border-[#1F2937] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#C8A961]/50 transition-all w-36"
          />
          {(search || statusFilter !== 'Tous' || typeFilter !== 'Tous' || currencyFilter !== 'Toutes' || dateFrom || dateTo || amountMin || amountMax) && (
            <button
              onClick={() => { setSearch(''); setStatusFilter('Tous'); setTypeFilter('Tous'); setCurrencyFilter('Toutes'); setDateFrom(''); setDateTo(''); setAmountMin(''); setAmountMax(''); setCurrentPage(1); }}
              className="px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 transition-all"
            >
              Réinitialiser
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-500">{filtered.length} résultat{filtered.length > 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-xl overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1F2937] bg-[#0A0E17]/50">
                {[
                  { label: 'Date', field: 'date' },
                  { label: 'Référence', field: 'ref' },
                  { label: 'Type', field: 'type' },
                  { label: 'Débiteur', field: 'debiteur' },
                  { label: 'Créancier', field: 'creancier' },
                  { label: 'Montant', field: 'montant' },
                  { label: 'Devise', field: 'devise' },
                  { label: 'Statut', field: 'statut' },
                  { label: 'Actions', field: null },
                ].map((col) => (
                  <th
                    key={col.label}
                    onClick={() => col.field && handleSort(col.field)}
                    className={`text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap ${
                      col.field ? 'cursor-pointer hover:text-[#C8A961] transition-colors' : ''
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {col.label}
                      {col.field && (
                        <ArrowUpDown className={`w-3 h-3 ${ sortField === col.field ? 'text-[#C8A961]' : 'text-gray-600' }`} />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1F2937]">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#1F2937] flex items-center justify-center">
                        <Search className="w-5 h-5 text-gray-500" />
                      </div>
                      <p className="text-gray-400 text-sm">Aucune transaction trouvée</p>
                      <p className="text-gray-600 text-xs">Modifiez vos critères de recherche</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((txn) => {
                  const status = statusConfig[txn.statut];
                  const typeColor = typeConfig[txn.type] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
                  const { date, time } = formatDate(txn.date);
                  return (
                    <tr key={txn.id} className="hover:bg-[#0A0E17]/40 transition-colors group relative">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-sm text-white font-medium">{date}</div>
                        <div className="text-xs text-gray-500">{time}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#C8A961] flex-shrink-0"></div>
                          <span className="text-sm text-[#C8A961] font-mono font-medium">{txn.ref}</span>
                        </div>
                        <div className="text-xs text-gray-500 ml-3.5">{txn.id}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-xs font-medium ${typeColor}`}>
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-white max-w-[140px] truncate" title={txn.debiteur}>{txn.debiteur}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm text-white max-w-[140px] truncate" title={txn.creancier}>{txn.creancier}</div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${txn.devise === 'XAF' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {formatAmount(txn.montant, txn.devise)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          txn.devise === 'XAF' ? 'text-emerald-400 bg-emerald-400/10' : 'text-blue-400 bg-blue-400/10'
                        }`}>{txn.devise}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${status.color}`}>
                          {status.icon}
                          {txn.statut}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-1.5 rounded-lg hover:bg-[#1F2937] text-gray-400 hover:text-[#C8A961] transition-all" title="Voir">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-[#1F2937] text-gray-400 hover:text-blue-400 transition-all" title="Modifier">
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button className="p-1.5 rounded-lg hover:bg-[#1F2937] text-gray-400 hover:text-red-400 transition-all" title="Supprimer">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1 opacity-100 group-hover:opacity-0 transition-opacity absolute">
                          <button className="p-1.5 rounded-lg text-gray-600">
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-400">
          Affichage de <span className="text-white font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}</span> à{' '}
          <span className="text-white font-medium">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> sur{' '}
          <span className="text-white font-medium">{filtered.length}</span> transactions
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-sm text-gray-300 hover:text-white hover:border-[#C8A961]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Préc.
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`w-8 h-8 rounded-lg border text-sm font-medium transition-all ${
                currentPage === page
                  ? 'border-[#C8A961] bg-[#C8A961]/10 text-[#C8A961]'
                  : 'border-[#1F2937] bg-[#111827] text-gray-400 hover:text-white hover:border-[#C8A961]/30'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111827] text-sm text-gray-300 hover:text-white hover:border-[#C8A961]/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Suiv.
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
