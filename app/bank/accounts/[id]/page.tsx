'use client';

import { use, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeftIcon,
  BanknotesIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  CalendarDaysIcon,
  BuildingLibraryIcon,
  UserIcon,
  CurrencyDollarIcon,
  InformationCircleIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const ACCOUNT = {
  id: 'ACC-2024-001',
  iban: 'CM21 1000 2000 0000 1234 5678 901',
  bic: 'PIMPCMCX',
  owner: 'Entreprise Lumière SARL',
  currency: 'XAF',
  type: 'CACC',
  typeLabel: 'Compte Courant',
  status: 'ACTIVE',
  openedDate: '2019-03-15',
  availableBalance: 4_872_350,
  bookBalance: 5_120_000,
  pendingBalance: 247_650,
  branch: 'Agence Douala Centre',
  accountNumber: '00001234567',
};

function generateTransactions() {
  const transactions = [];
  const descriptions = [
    'Virement reçu - ORANGE MONEY',
    'Paiement fournisseur SABC',
    'Prélèvement loyer bureau',
    'Virement CAMTEL SA',
    'Paiement salaires octobre',
    'Remise chèque n°045821',
    'Virement reçu MTN MOMO',
    'Frais de gestion compte',
    'Paiement prestataire IT',
    'Virement reçu client TOTAL',
    'Retrait agence Douala',
    'Virement interne épargne',
    'Paiement impôts DGI',
    'Virement reçu CAMAIR-CO',
    'Remboursement frais mission',
    'Paiement assurance AXA',
    'Virement reçu CICAM SA',
    'Commission bancaire',
    'Virement reçu GUINNESS CAM',
    'Paiement eau-électricité',
  ];
  let balance = 5_120_000;
  const today = new Date();
  for (let i = 19; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const isCredit = Math.random() > 0.45;
    const amount = Math.floor(Math.random() * 450_000) + 15_000;
    if (isCredit) {
      balance += amount;
    } else {
      balance -= amount;
    }
    transactions.push({
      id: `TXN-${i}`,
      date: date.toISOString().split('T')[0],
      description: descriptions[19 - i],
      debit: isCredit ? null : amount,
      credit: isCredit ? amount : null,
      balance: balance,
    });
  }
  return transactions;
}

function generateBalanceHistory() {
  const data = [];
  let balance = 4_200_000;
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    balance += Math.floor((Math.random() - 0.4) * 200_000);
    if (balance < 1_000_000) balance = 1_000_000;
    data.push({
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      solde: balance,
    });
  }
  return data;
}

const STATEMENTS = [
  { id: 1, period: 'Octobre 2024', type: 'Mensuel', date: '2024-11-01', size: '245 Ko' },
  { id: 2, period: 'Septembre 2024', type: 'Mensuel', date: '2024-10-01', size: '312 Ko' },
  { id: 3, period: 'Août 2024', type: 'Mensuel', date: '2024-09-01', size: '198 Ko' },
  { id: 4, period: 'T3 2024', type: 'Trimestriel', date: '2024-10-01', size: '528 Ko' },
  { id: 5, period: 'Juillet 2024', type: 'Mensuel', date: '2024-08-01', size: '276 Ko' },
];

const TRANSACTIONS = generateTransactions();
const BALANCE_HISTORY = generateBalanceHistory();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatXAF = (amount: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XAF', minimumFractionDigits: 0 }).format(amount);

const formatIBAN = (iban: string) => iban;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        Actif
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
      <ExclamationCircleIcon className="w-3.5 h-3.5" />
      Inactif
    </span>
  );
}

function TypeBadge({ type, label }: { type: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
      <BuildingLibraryIcon className="w-3.5 h-3.5" />
      {type} · {label}
    </span>
  );
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border border-amber-500/20 rounded-xl px-4 py-3 shadow-2xl">
        <p className="text-zinc-400 text-xs mb-1">{label}</p>
        <p className="text-amber-400 font-bold text-sm">{formatXAF(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountDetailPage({ params: paramsPromise }: { params: Promise<{ id: string }> }) {
  const params = use(paramsPromise);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [generatingStatement, setGeneratingStatement] = useState(false);
  const [statementGenerated, setStatementGenerated] = useState(false);

  const handleGenerateStatement = () => {
    if (!dateFrom || !dateTo) return;
    setGeneratingStatement(true);
    setTimeout(() => {
      setGeneratingStatement(false);
      setStatementGenerated(true);
      setTimeout(() => setStatementGenerated(false), 3000);
    }, 1800);
  };

  const minBalance = useMemo(() => Math.min(...BALANCE_HISTORY.map(d => d.solde)), []);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Back Link ── */}
        <Link
          href="/bank/accounts"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-400 transition-colors text-sm font-medium group"
        >
          <ArrowLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Retour aux comptes
        </Link>

        {/* ── Account Header ── */}
        <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-2xl">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 flex-shrink-0">
                <BuildingLibraryIcon className="w-7 h-7 text-white" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-2xl font-bold text-white">{ACCOUNT.owner}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <TypeBadge type={ACCOUNT.type} label={ACCOUNT.typeLabel} />
                  <StatusBadge status={ACCOUNT.status} />
                  <span className="text-xs text-zinc-500 font-mono bg-zinc-800/60 px-2 py-1 rounded-lg">
                    {ACCOUNT.id}
                  </span>
                </div>
                <p className="text-zinc-400 text-sm font-mono tracking-wider">{formatIBAN(ACCOUNT.iban)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-all border border-white/5">
                <PrinterIcon className="w-4 h-4" />
                Imprimer
              </button>
              <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition-all shadow-lg shadow-amber-500/20">
                <BanknotesIcon className="w-4 h-4" />
                Virement
              </button>
            </div>
          </div>
        </div>

        {/* ── Balance Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Solde Disponible */}
          <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-amber-500/20 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Solde Disponible</span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <BanknotesIcon className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-amber-400 mb-1">{formatXAF(ACCOUNT.availableBalance)}</p>
            <p className="text-xs text-zinc-500">Montant utilisable immédiatement</p>
          </div>

          {/* Solde Comptable */}
          <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Solde Comptable</span>
              <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                <CurrencyDollarIcon className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{formatXAF(ACCOUNT.bookBalance)}</p>
            <p className="text-xs text-zinc-500">Solde total en comptabilité</p>
          </div>

          {/* Solde en Attente */}
          <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full -translate-y-8 translate-x-8" />
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Solde en Attente</span>
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <ClockIcon className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <p className="text-3xl font-bold text-orange-400 mb-1">{formatXAF(ACCOUNT.pendingBalance)}</p>
            <p className="text-xs text-zinc-500">Opérations en cours de traitement</p>
          </div>
        </div>

        {/* ── Account Info ── */}
        <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-xl">
          <div className="flex items-center gap-2 mb-5">
            <InformationCircleIcon className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-semibold text-white">Informations du Compte</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { label: 'IBAN', value: ACCOUNT.iban, mono: true, span: true },
              { label: 'BIC / SWIFT', value: ACCOUNT.bic, mono: true },
              { label: 'Titulaire', value: ACCOUNT.owner, mono: false },
              { label: 'Devise', value: `${ACCOUNT.currency} – Franc CFA`, mono: false },
              { label: 'Type de Compte', value: `${ACCOUNT.type} · ${ACCOUNT.typeLabel}`, mono: false },
              { label: 'Date d\'Ouverture', value: new Date(ACCOUNT.openedDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), mono: false },
              { label: 'Agence', value: ACCOUNT.branch, mono: false },
              { label: 'Numéro de Compte', value: ACCOUNT.accountNumber, mono: true },
            ].map((item) => (
              <div
                key={item.label}
                className={`bg-zinc-900/50 rounded-xl p-4 border border-white/5 ${'span' in item && item.span ? 'sm:col-span-2' : ''}`}
              >
                <p className="text-xs text-zinc-500 font-medium mb-1.5 uppercase tracking-wider">{item.label}</p>
                <p className={`text-sm text-white font-medium ${ item.mono ? 'font-mono tracking-wider' : ''}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Balance History Chart ── */}
        <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-semibold text-white">Historique du Solde</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Évolution sur les 30 derniers jours</p>
            </div>
            <span className="text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg">30 jours</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={BALANCE_HISTORY} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis
                tick={{ fill: '#52525b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}M`}
                domain={[minBalance * 0.9, 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="solde"
                stroke="#f59e0b"
                strokeWidth={2.5}
                fill="url(#balanceGradient)"
                dot={false}
                activeDot={{ r: 5, fill: '#f59e0b', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* ── Recent Transactions ── */}
        <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Transactions Récentes</h2>
              <p className="text-xs text-zinc-500 mt-0.5">20 dernières opérations</p>
            </div>
            <Link
              href={`/bank/accounts/${params.id}/transactions`}
              className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Voir tout
              <ChevronRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-900/60">
                  {['Date', 'Description', 'Débit', 'Crédit', 'Solde'].map((h) => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider ${
                        ['Débit', 'Crédit', 'Solde'].includes(h) ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {TRANSACTIONS.map((tx, idx) => (
                  <tr
                    key={tx.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      idx % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.01]'
                    }`}
                  >
                    <td className="px-5 py-3.5 text-zinc-400 text-xs whitespace-nowrap">
                      {new Date(tx.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          tx.credit ? 'bg-emerald-500/15' : 'bg-red-500/15'
                        }`}>
                          {tx.credit
                            ? <ArrowDownIcon className="w-3.5 h-3.5 text-emerald-400" />
                            : <ArrowUpIcon className="w-3.5 h-3.5 text-red-400" />}
                        </div>
                        <span className="text-zinc-200 text-xs font-medium">{tx.description}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {tx.debit ? (
                        <span className="text-red-400 text-xs font-medium">
                          -{formatXAF(tx.debit)}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {tx.credit ? (
                        <span className="text-emerald-400 text-xs font-medium">
                          +{formatXAF(tx.credit)}
                        </span>
                      ) : (
                        <span className="text-zinc-600 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="text-white text-xs font-mono">{formatXAF(tx.balance)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Statements ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Generate Statement */}
          <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <CalendarDaysIcon className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Générer un Relevé</h2>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">Date de début</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">Date de fin</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">Format</label>
                  <select className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all">
                    <option>PDF</option>
                    <option>CSV</option>
                    <option>Excel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 font-medium mb-1.5">Type</label>
                  <select className="w-full bg-zinc-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500/60 transition-all">
                    <option>Détaillé</option>
                    <option>Résumé</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleGenerateStatement}
                disabled={!dateFrom || !dateTo || generatingStatement}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-zinc-700 disabled:text-zinc-500 disabled:cursor-not-allowed text-black font-semibold text-sm transition-all shadow-lg shadow-amber-500/20 disabled:shadow-none"
              >
                {generatingStatement ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Génération en cours…
                  </>
                ) : statementGenerated ? (
                  <>
                    <CheckCircleIcon className="w-4 h-4" />
                    Relevé généré !
                  </>
                ) : (
                  <>
                    <DocumentArrowDownIcon className="w-4 h-4" />
                    Générer le relevé
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Recent Statements List */}
          <div className="bg-gradient-to-br from-[#161b27] to-[#1a1f2e] rounded-2xl border border-white/5 p-6 shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <DocumentArrowDownIcon className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-semibold text-white">Relevés Récents</h2>
            </div>
            <div className="space-y-2.5">
              {STATEMENTS.map((stmt) => (
                <div
                  key={stmt.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/50 border border-white/5 hover:border-amber-500/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                      <DocumentArrowDownIcon className="w-4.5 h-4.5 text-amber-400 w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{stmt.period}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">{stmt.type}</span>
                        <span className="text-zinc-700">·</span>
                        <span className="text-xs text-zinc-600">{stmt.size}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500/20 hover:border-amber-500/30 border border-white/5 text-zinc-400 hover:text-amber-400 text-xs font-medium transition-all">
                      <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                      PDF
                    </button>
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-500/20 hover:border-emerald-500/30 border border-white/5 text-zinc-400 hover:text-emerald-400 text-xs font-medium transition-all">
                      <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                      CSV
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="text-center py-4">
          <p className="text-xs text-zinc-600">PIMPAY Banking Portal · Données mises à jour le {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

      </div>
    </div>
  );
}
