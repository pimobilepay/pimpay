'use client';

import { useState } from 'react';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, TrendingUp, Wallet, CheckCircle, Copy, Search, Filter, Download } from 'lucide-react';

const GOLD = '#C8A961';

const accountTypes = [
  { key: 'ALL', label: 'Tous' },
  { key: 'CACC', label: 'Courants' },
  { key: 'BIZZ', label: 'Business' },
  { key: 'SVGS', label: 'Épargne' },
  { key: 'EWLT', label: 'E-Wallet' },
  { key: 'CWLT', label: 'Crypto' },
  { key: 'PIWT', label: 'Pi' },
  { key: 'NSVR', label: 'Nostro/Vostro' },
];

const statusColors: Record<string, string> = {
  ACTIF: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  INACTIF: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
  SUSPENDU: 'bg-red-500/20 text-red-400 border border-red-500/30',
  EN_ATTENTE: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
};

const typeColors: Record<string, string> = {
  CACC: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  BIZZ: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  SVGS: 'bg-teal-500/20 text-teal-300 border border-teal-500/30',
  EWLT: 'bg-orange-500/20 text-orange-300 border border-orange-500/30',
  CWLT: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30',
  PIWT: 'bg-pink-500/20 text-pink-300 border border-pink-500/30',
  NSVR: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
};

const typeLabels: Record<string, string> = {
  CACC: 'Courant',
  BIZZ: 'Business',
  SVGS: 'Épargne',
  EWLT: 'E-Wallet',
  CWLT: 'Crypto',
  PIWT: 'Pi',
  NSVR: 'Nostro/Vostro',
};

const mockAccounts = [
  {
    id: '1',
    accountNumber: 'PP-001-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0001 012',
    name: 'Jean-Pierre Mbeki',
    type: 'CACC',
    currency: 'XAF',
    availableBalance: 4_850_000,
    accountingBalance: 5_100_000,
    pendingBalance: 250_000,
    status: 'ACTIF',
  },
  {
    id: '2',
    accountNumber: 'PP-002-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0002 034',
    name: 'Société Générale CM',
    type: 'BIZZ',
    currency: 'XAF',
    availableBalance: 125_750_000,
    accountingBalance: 130_000_000,
    pendingBalance: 4_250_000,
    status: 'ACTIF',
  },
  {
    id: '3',
    accountNumber: 'PP-003-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0003 056',
    name: 'Marie Ngo Bassa',
    type: 'SVGS',
    currency: 'XAF',
    availableBalance: 2_300_000,
    accountingBalance: 2_300_000,
    pendingBalance: 0,
    status: 'ACTIF',
  },
  {
    id: '4',
    accountNumber: 'PP-004-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0004 078',
    name: 'Alain Fotso',
    type: 'EWLT',
    currency: 'XAF',
    availableBalance: 150_000,
    accountingBalance: 150_000,
    pendingBalance: 0,
    status: 'ACTIF',
  },
  {
    id: '5',
    accountNumber: 'PP-005-2024-BTC',
    iban: 'N/A',
    name: 'Crypto Holdings CM',
    type: 'CWLT',
    currency: 'BTC',
    availableBalance: 0.45,
    accountingBalance: 0.50,
    pendingBalance: 0.05,
    status: 'ACTIF',
  },
  {
    id: '6',
    accountNumber: 'PP-006-2024-PI',
    iban: 'N/A',
    name: 'Pierre Kamga',
    type: 'PIWT',
    currency: 'PI',
    availableBalance: 12_500,
    accountingBalance: 12_500,
    pendingBalance: 0,
    status: 'EN_ATTENTE',
  },
  {
    id: '7',
    accountNumber: 'PP-007-2024-EUR',
    iban: 'FR76 3000 6000 0112 3456 7890 189',
    name: 'Banque Centrale CA',
    type: 'NSVR',
    currency: 'EUR',
    availableBalance: 500_000,
    accountingBalance: 500_000,
    pendingBalance: 0,
    status: 'ACTIF',
  },
  {
    id: '8',
    accountNumber: 'PP-008-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0008 112',
    name: 'Emmanuel Tchinda',
    type: 'CACC',
    currency: 'XAF',
    availableBalance: 890_000,
    accountingBalance: 900_000,
    pendingBalance: 10_000,
    status: 'SUSPENDU',
  },
  {
    id: '9',
    accountNumber: 'PP-009-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0009 134',
    name: 'Yves Kouam Enterprises',
    type: 'BIZZ',
    currency: 'XAF',
    availableBalance: 45_200_000,
    accountingBalance: 46_000_000,
    pendingBalance: 800_000,
    status: 'ACTIF',
  },
  {
    id: '10',
    accountNumber: 'PP-010-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0010 156',
    name: 'Fatima Aboubakar',
    type: 'SVGS',
    currency: 'XAF',
    availableBalance: 7_500_000,
    accountingBalance: 7_500_000,
    pendingBalance: 0,
    status: 'ACTIF',
  },
  {
    id: '11',
    accountNumber: 'PP-011-2024-XAF',
    iban: 'CM21 1000 2000 0010 0120 0011 178',
    name: 'Georges Essomba',
    type: 'EWLT',
    currency: 'XAF',
    availableBalance: 75_000,
    accountingBalance: 75_000,
    pendingBalance: 0,
    status: 'INACTIF',
  },
  {
    id: '12',
    accountNumber: 'PP-012-2024-ETH',
    iban: 'N/A',
    name: 'DeFi Investments CM',
    type: 'CWLT',
    currency: 'ETH',
    availableBalance: 3.25,
    accountingBalance: 3.50,
    pendingBalance: 0.25,
    status: 'ACTIF',
  },
];

function formatBalance(amount: number, currency: string): string {
  if (['BTC', 'ETH', 'PI'].includes(currency)) {
    return `${amount.toFixed(currency === 'PI' ? 0 : 4)} ${currency}`;
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency === 'XAF' ? 'XAF' : currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatXAF(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'XAF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const filteredAccounts = mockAccounts.filter((acc) => {
    const matchesTab = activeTab === 'ALL' || acc.type === activeTab;
    const matchesSearch =
      searchQuery === '' ||
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.accountNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.iban.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const totalAccounts = mockAccounts.length;
  const activeAccounts = mockAccounts.filter((a) => a.status === 'ACTIF').length;
  const totalXAFBalance = mockAccounts
    .filter((a) => a.currency === 'XAF')
    .reduce((sum, a) => sum + a.accountingBalance, 0);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0D14] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Comptes</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez tous les comptes bancaires de la plateforme</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 transition-colors text-sm"
          >
            <Download size={16} />
            Exporter
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all hover:brightness-110 active:scale-95"
            style={{ backgroundColor: GOLD, color: '#0A0D14' }}
          >
            <Plus size={16} />
            Nouveau Compte
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${GOLD}20` }}>
            <Wallet size={22} style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Total Comptes</p>
            <p className="text-2xl font-bold text-white mt-0.5">{totalAccounts}</p>
            <p className="text-xs text-gray-500 mt-0.5">Tous types confondus</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${GOLD}20` }}>
            <TrendingUp size={22} style={{ color: GOLD }} />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Solde Total XAF</p>
            <p className="text-2xl font-bold text-white mt-0.5">{formatXAF(totalXAFBalance)}</p>
            <p className="text-xs text-gray-500 mt-0.5">Comptes en XAF uniquement</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/20">
            <CheckCircle size={22} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-gray-400 text-xs font-medium uppercase tracking-wider">Comptes Actifs</p>
            <p className="text-2xl font-bold text-white mt-0.5">{activeAccounts}</p>
            <p className="text-xs text-emerald-400 mt-0.5">{Math.round((activeAccounts / totalAccounts) * 100)}% du total</p>
          </div>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center border-b border-gray-800 overflow-x-auto scrollbar-hide">
          {accountTypes.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full"
                  style={{ backgroundColor: GOLD }}
                />
              )}
              {tab.key !== 'ALL' && (
                <span
                  className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-gray-700/60 text-gray-400"
                >
                  {mockAccounts.filter((a) => a.type === tab.key).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Filter Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-800">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, numéro de compte ou IBAN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow-600 transition-colors"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors text-sm">
            <Filter size={15} />
            Filtres
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['N° Compte', 'IBAN', 'Nom', 'Type', 'Devise', 'Solde Disponible', 'Solde Comptable', 'En Attente', 'Statut', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16 text-gray-500">
                    <Wallet size={40} className="mx-auto mb-3 opacity-30" />
                    <p>Aucun compte trouvé</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc, idx) => (
                  <tr
                    key={acc.id}
                    className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-gray-900/20'
                    }`}
                  >
                    {/* Account Number */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-mono text-white">{acc.accountNumber}</span>
                        <button
                          onClick={() => handleCopy(acc.accountNumber, `acc-${acc.id}`)}
                          className="text-gray-600 hover:text-gray-300 transition-colors"
                          title="Copier"
                        >
                          {copiedId === `acc-${acc.id}` ? (
                            <CheckCircle size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* IBAN */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono text-gray-400 truncate max-w-[160px]" title={acc.iban}>
                          {acc.iban}
                        </span>
                        {acc.iban !== 'N/A' && (
                          <button
                            onClick={() => handleCopy(acc.iban, `iban-${acc.id}`)}
                            className="text-gray-600 hover:text-gray-300 transition-colors flex-shrink-0"
                            title="Copier IBAN"
                          >
                            {copiedId === `iban-${acc.id}` ? (
                              <CheckCircle size={13} className="text-emerald-400" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-white whitespace-nowrap">{acc.name}</span>
                    </td>

                    {/* Type Badge */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${typeColors[acc.type]}`}
                      >
                        {typeLabels[acc.type]}
                      </span>
                    </td>

                    {/* Currency */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-mono font-semibold" style={{ color: GOLD }}>
                        {acc.currency}
                      </span>
                    </td>

                    {/* Available Balance */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-emerald-400">
                        {formatBalance(acc.availableBalance, acc.currency)}
                      </span>
                    </td>

                    {/* Accounting Balance */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-medium text-white">
                        {formatBalance(acc.accountingBalance, acc.currency)}
                      </span>
                    </td>

                    {/* Pending Balance */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-sm font-medium ${
                          acc.pendingBalance > 0 ? 'text-yellow-400' : 'text-gray-600'
                        }`}
                      >
                        {formatBalance(acc.pendingBalance, acc.currency)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[acc.status]}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            acc.status === 'ACTIF'
                              ? 'bg-emerald-400'
                              : acc.status === 'SUSPENDU'
                              ? 'bg-red-400'
                              : acc.status === 'EN_ATTENTE'
                              ? 'bg-yellow-400'
                              : 'bg-gray-400'
                          }`}
                        />
                        {acc.status === 'ACTIF'
                          ? 'Actif'
                          : acc.status === 'SUSPENDU'
                          ? 'Suspendu'
                          : acc.status === 'EN_ATTENTE'
                          ? 'En attente'
                          : 'Inactif'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
                          title="Voir"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
                          title="Modifier"
                        >
                          <Edit size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/60 transition-colors"
                          title="Plus"
                        >
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            Affichage de{' '}
            <span className="text-white font-medium">{filteredAccounts.length}</span>{' '}
            sur{' '}
            <span className="text-white font-medium">{mockAccounts.length}</span>{' '}
            comptes
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-800 disabled:opacity-40 cursor-default"
            >
              Précédent
            </button>
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
              style={{ color: GOLD, borderColor: `${GOLD}40`, backgroundColor: `${GOLD}15` }}
            >
              1
            </span>
            <button
              disabled
              className="px-3 py-1.5 rounded-lg text-xs text-gray-500 border border-gray-800 disabled:opacity-40 cursor-default"
            >
              Suivant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
