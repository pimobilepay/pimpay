'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

const mockTransaction = {
  id: 'TXN-2024-001847',
  uetr: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  e2eId: 'E2E-PIMPAY-20240115-001847',
  status: 'PENDING_APPROVAL',
  type: 'CREDIT_TRANSFER',
  priority: 'HIGH',
  stp: true,
  createdAt: '2024-01-15T09:23:41Z',
  updatedAt: '2024-01-15T10:15:22Z',
  debtor: {
    name: 'Société Générale Industries SA',
    iban: 'FR76 3000 6000 0112 3456 7890 189',
    bic: 'SOGEFRPP',
    address: '29 Boulevard Haussmann, 75009 Paris',
    country: 'FR',
    accountType: 'BBAN',
  },
  creditor: {
    name: 'Deutsche Manufaktur GmbH',
    iban: 'DE89 3704 0044 0532 0130 00',
    bic: 'COBADEFFXXX',
    address: 'Friedrichstraße 100, 10117 Berlin',
    country: 'DE',
    accountType: 'IBAN',
  },
  amounts: {
    instructed: { value: 485000.0, currency: 'EUR' },
    settled: { value: 484750.0, currency: 'EUR' },
    charges: { value: 250.0, currency: 'EUR' },
    fxRate: null,
    chargeBearer: 'SHAR',
  },
  timeline: [
    { id: 1, status: 'CREATED', label: 'Transaction créée', timestamp: '2024-01-15T09:23:41Z', actor: 'M. Laurent Dupont', color: 'blue' },
    { id: 2, status: 'VALIDATED', label: 'Validation initiale', timestamp: '2024-01-15T09:45:12Z', actor: 'Système PIMPAY', color: 'indigo' },
    { id: 3, status: 'STP_CHECK', label: 'Contrôle STP réussi', timestamp: '2024-01-15T09:45:45Z', actor: 'Moteur STP', color: 'purple' },
    { id: 4, status: 'COMPLIANCE', label: 'Contrôle conformité passé', timestamp: '2024-01-15T10:02:33Z', actor: 'Module AML', color: 'yellow' },
    { id: 5, status: 'PENDING_APPROVAL', label: 'En attente d\'approbation', timestamp: '2024-01-15T10:15:22Z', actor: 'Workflow Maker-Checker', color: 'orange' },
  ],
  makerChecker: {
    maker: { name: 'M. Laurent Dupont', role: 'Opérateur Senior', timestamp: '2024-01-15T09:23:41Z' },
    checker: null,
    requiredApprovers: 2,
    currentApprovers: 0,
  },
  isoXml: `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pacs.008.001.10">
  <FIToFICstmrCdtTrf>
    <GrpHdr>
      <MsgId>PIMPAY-2024011500001847</MsgId>
      <CreDtTm>2024-01-15T09:23:41Z</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <TtlIntrBkSttlmAmt Ccy="EUR">484750.00</TtlIntrBkSttlmAmt>
      <IntrBkSttlmDt>2024-01-15</IntrBkSttlmDt>
      <SttlmInf>
        <SttlmMtd>CLRG</SttlmMtd>
      </SttlmInf>
    </GrpHdr>
    <CdtTrfTxInf>
      <PmtId>
        <EndToEndId>E2E-PIMPAY-20240115-001847</EndToEndId>
        <UETR>a1b2c3d4-e5f6-7890-abcd-ef1234567890</UETR>
      </PmtId>
      <IntrBkSttlmAmt Ccy="EUR">484750.00</IntrBkSttlmAmt>
      <InstdAmt Ccy="EUR">485000.00</InstdAmt>
      <ChrgBr>SHAR</ChrgBr>
      <Dbtr>
        <Nm>Société Générale Industries SA</Nm>
        <PstlAdr>
          <Ctry>FR</Ctry>
          <AdrLine>29 Boulevard Haussmann</AdrLine>
          <AdrLine>75009 Paris</AdrLine>
        </PstlAdr>
      </Dbtr>
      <DbtrAcct>
        <Id>
          <IBAN>FR7630006000011234567890189</IBAN>
        </Id>
      </DbtrAcct>
      <DbtrAgt>
        <FinInstnId>
          <BICFI>SOGEFRPP</BICFI>
        </FinInstnId>
      </DbtrAgt>
      <CdtrAgt>
        <FinInstnId>
          <BICFI>COBADEFFXXX</BICFI>
        </FinInstnId>
      </CdtrAgt>
      <Cdtr>
        <Nm>Deutsche Manufaktur GmbH</Nm>
        <PstlAdr>
          <Ctry>DE</Ctry>
          <AdrLine>Friedrichstraße 100</AdrLine>
          <AdrLine>10117 Berlin</AdrLine>
        </PstlAdr>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>DE89370400440532013000</IBAN>
        </Id>
      </CdtrAcct>
    </CdtTrfTxInf>
  </FIToFICstmrCdtTrf>
</Document>`,
  jsonData: {
    messageId: 'PIMPAY-2024011500001847',
    creationDateTime: '2024-01-15T09:23:41Z',
    numberOfTransactions: 1,
    settlementMethod: 'CLRG',
    transaction: {
      paymentId: {
        endToEndId: 'E2E-PIMPAY-20240115-001847',
        uetr: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      },
      interbankSettlementAmount: { value: 484750.0, currency: 'EUR' },
      instructedAmount: { value: 485000.0, currency: 'EUR' },
      chargeBearer: 'SHAR',
      debtor: {
        name: 'Société Générale Industries SA',
        country: 'FR',
        iban: 'FR7630006000011234567890189',
        bic: 'SOGEFRPP',
      },
      creditor: {
        name: 'Deutsche Manufaktur GmbH',
        country: 'DE',
        iban: 'DE89370400440532013000',
        bic: 'COBADEFFXXX',
      },
    },
  },
};

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  PENDING_APPROVAL: { label: 'En attente', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40' },
  APPROVED: { label: 'Approuvé', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40' },
  REJECTED: { label: 'Rejeté', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/40' },
  SETTLED: { label: 'Réglé', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/40' },
  PROCESSING: { label: 'En cours', bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40' },
};

const timelineColorMap: Record<string, string> = {
  blue: 'bg-blue-500 shadow-blue-500/50',
  indigo: 'bg-indigo-500 shadow-indigo-500/50',
  purple: 'bg-purple-500 shadow-purple-500/50',
  yellow: 'bg-yellow-500 shadow-yellow-500/50',
  orange: 'bg-orange-500 shadow-orange-500/50',
  green: 'bg-emerald-500 shadow-emerald-500/50',
  red: 'bg-red-500 shadow-red-500/50',
};

type ModalType = 'approve' | 'reject' | null;

export default function TransactionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const tx = mockTransaction;

  const [activeTab, setActiveTab] = useState<'xml' | 'json'>('xml');
  const [modal, setModal] = useState<ModalType>(null);
  const [comment, setComment] = useState('');
  const [txStatus, setTxStatus] = useState(tx.status);
  const [loading, setLoading] = useState(false);

  const statusCfg = statusConfig[txStatus] || statusConfig['PENDING_APPROVAL'];

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
  };

  const formatAmount = (value: number, currency: string) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency, minimumFractionDigits: 2 }).format(value);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setTxStatus(modal === 'approve' ? 'APPROVED' : 'REJECTED');
    setModal(null);
    setComment('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0A0E17' }}>
      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div
            className="relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
          >
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                modal === 'approve' ? 'bg-emerald-500/20' : 'bg-red-500/20'
              }`}>
                {modal === 'approve' ? (
                  <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {modal === 'approve' ? 'Confirmer l\'approbation' : 'Confirmer le rejet'}
                </h3>
                <p className="text-sm text-gray-400">Transaction {tx.id}</p>
              </div>
            </div>
            <p className="mb-4 text-sm text-gray-300">
              {modal === 'approve'
                ? 'Vous êtes sur le point d\'approuver cette transaction de '
                : 'Vous êtes sur le point de rejeter cette transaction de '}
              <span style={{ color: '#C8A961' }} className="font-semibold">
                {formatAmount(tx.amounts.instructed.value, tx.amounts.instructed.currency)}
              </span>. Cette action est irréversible.
            </p>
            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Commentaire {modal === 'reject' ? '(obligatoire)' : '(optionnel)'}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder="Saisir un commentaire..."
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1"
                style={{ backgroundColor: '#0A0E17', borderColor: '#374151', caretColor: '#C8A961' }}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setModal(null)}
                className="flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium text-gray-300 transition hover:bg-white/5"
                style={{ borderColor: '#374151' }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading || (modal === 'reject' && !comment.trim())}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${
                  modal === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Traitement...
                  </span>
                ) : modal === 'approve' ? 'Approuver' : 'Rejeter'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back + Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center gap-2 text-sm text-gray-400 transition hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour aux transactions
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{tx.id}</h1>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.text.replace('text-', 'bg-')}`} />
                  {statusConfig[txStatus]?.label || txStatus}
                </span>
              </div>
              <p className="mt-1 text-sm text-gray-400">Créé le {formatDate(tx.createdAt)}</p>
            </div>

            {txStatus === 'PENDING_APPROVAL' && (
              <div className="flex gap-3">
                <button
                  onClick={() => setModal('reject')}
                  className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Rejeter
                </button>
                <button
                  onClick={() => setModal('approve')}
                  className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: '#C8A961' }}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Approuver
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: 'Type', value: tx.type.replace('_', ' ') },
            { label: 'Priorité', value: tx.priority, highlight: tx.priority === 'HIGH' },
            { label: 'STP', value: tx.stp ? 'Activé' : 'Désactivé', green: tx.stp },
            { label: 'UETR', value: tx.uetr.slice(0, 18) + '…', mono: true },
            { label: 'ID E2E', value: tx.e2eId.slice(0, 20) + '…', mono: true },
          ].map((item, i) => (
            <div
              key={i}
              className="rounded-xl border p-3"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <p className="mb-1 text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
              <p
                className={`text-sm font-semibold ${
                  item.highlight ? 'text-amber-400' : item.green ? 'text-emerald-400' : 'text-white'
                } ${item.mono ? 'font-mono' : ''}`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column */}
          <div className="space-y-6 lg:col-span-2">
            {/* Debtor / Creditor */}
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                Parties impliquées
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Debtor */}
                <div
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20">
                      <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Débiteur</span>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-xs text-gray-500">Nom</p>
                      <p className="text-sm font-medium text-white">{tx.debtor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">IBAN</p>
                      <p className="font-mono text-xs text-gray-300">{tx.debtor.iban}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">BIC</p>
                      <p className="font-mono text-xs text-gray-300">{tx.debtor.bic}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Adresse</p>
                      <p className="text-xs text-gray-400">{tx.debtor.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pays</p>
                      <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                        {tx.debtor.country}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Creditor */}
                <div
                  className="rounded-xl border p-4"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                      <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Créditeur</span>
                  </div>
                  <div className="space-y-2.5">
                    <div>
                      <p className="text-xs text-gray-500">Nom</p>
                      <p className="text-sm font-medium text-white">{tx.creditor.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">IBAN</p>
                      <p className="font-mono text-xs text-gray-300">{tx.creditor.iban}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">BIC</p>
                      <p className="font-mono text-xs text-gray-300">{tx.creditor.bic}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Adresse</p>
                      <p className="text-xs text-gray-400">{tx.creditor.address}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pays</p>
                      <span className="inline-flex items-center rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                        {tx.creditor.country}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Amounts */}
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                Montants
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <p className="mb-1 text-xs text-gray-500">Montant instruit</p>
                  <p className="text-lg font-bold text-white">
                    {formatAmount(tx.amounts.instructed.value, tx.amounts.instructed.currency)}
                  </p>
                  <p className="text-xs text-gray-500">{tx.amounts.instructed.currency}</p>
                </div>
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <p className="mb-1 text-xs text-gray-500">Montant réglé</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatAmount(tx.amounts.settled.value, tx.amounts.settled.currency)}
                  </p>
                  <p className="text-xs text-gray-500">{tx.amounts.settled.currency}</p>
                </div>
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <p className="mb-1 text-xs text-gray-500">Frais</p>
                  <p className="text-lg font-bold text-amber-400">
                    {formatAmount(tx.amounts.charges.value, tx.amounts.charges.currency)}
                  </p>
                  <p className="text-xs text-gray-500">{tx.amounts.chargeBearer}</p>
                </div>
                <div
                  className="rounded-xl border p-4 text-center"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <p className="mb-1 text-xs text-gray-500">Taux de change</p>
                  <p className="text-lg font-bold text-gray-400">
                    {tx.amounts.fxRate ?? 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">FX</p>
                </div>
              </div>
            </div>

            {/* Maker-Checker */}
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                Contrôle Maker-Checker
              </h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 rounded-lg border p-3" style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Approbateurs requis</span>
                    <span className="text-sm font-bold" style={{ color: '#C8A961' }}>{tx.makerChecker.requiredApprovers}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-800">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        backgroundColor: '#C8A961',
                        width: `${(tx.makerChecker.currentApprovers / tx.makerChecker.requiredApprovers) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {tx.makerChecker.currentApprovers}/{tx.makerChecker.requiredApprovers} approbations
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-400">M</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Maker</p>
                      <p className="text-xs text-gray-500">{tx.makerChecker.maker.role}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-300">{tx.makerChecker.maker.name}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(tx.makerChecker.maker.timestamp)}</p>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-400">C</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">Checker</p>
                      <p className="text-xs text-gray-500">Approbateur</p>
                    </div>
                  </div>
                  {tx.makerChecker.checker ? (
                    <p className="text-sm text-gray-300">{tx.makerChecker.checker}</p>
                  ) : (
                    <p className="text-sm text-amber-400 italic">En attente...</p>
                  )}
                </div>
              </div>
            </div>

            {/* ISO / JSON Viewer */}
            <div
              className="rounded-2xl border"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <div className="flex items-center justify-between border-b p-4" style={{ borderColor: '#1F2937' }}>
                <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                  Message de paiement
                </h2>
                <div className="flex rounded-lg border p-0.5" style={{ borderColor: '#1F2937' }}>
                  {(['xml', 'json'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase transition ${
                        activeTab === tab
                          ? 'text-black'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      style={activeTab === tab ? { backgroundColor: '#C8A961' } : {}}
                    >
                      {tab === 'xml' ? 'ISO 20022 XML' : 'JSON'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4">
                <div
                  className="relative rounded-xl border p-4 overflow-auto max-h-96"
                  style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                >
                  <button
                    onClick={() => {
                      const text = activeTab === 'xml' ? tx.isoXml : JSON.stringify(tx.jsonData, null, 2);
                      navigator.clipboard.writeText(text);
                    }}
                    className="absolute top-3 right-3 flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-gray-400 transition hover:text-white"
                    style={{ borderColor: '#374151', backgroundColor: '#111827' }}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copier
                  </button>
                  {activeTab === 'xml' ? (
                    <pre className="font-mono text-xs leading-relaxed text-gray-300 whitespace-pre-wrap">
                      {tx.isoXml.split('\n').map((line, i) => {
                        const trimmed = line.trimStart();
                        const indent = line.length - trimmed.length;
                        const isTag = trimmed.startsWith('<');
                        const isClosing = trimmed.startsWith('</');
                        const isSelfClose = trimmed.endsWith('/>') || trimmed.startsWith('<?');
                        return (
                          <span key={i} className="block">
                            <span style={{ marginLeft: indent * 4 + 'px' }}>
                              {isTag ? (
                                <>
                                  <span className="text-blue-400">&lt;</span>
                                  {trimmed.slice(1).replace(/^\/?/, '').split(/[>\s]/)[0].split('<').map((part, j) => (
                                    <span key={j}>
                                      <span className={isClosing ? 'text-blue-300' : 'text-blue-400'}>
                                        {line}
                                      </span>
                                    </span>
                                  ))}
                                </>
                              ) : (
                                <span className="text-gray-300">{line}</span>
                              )}
                            </span>
                          </span>
                        );
                      })}
                    </pre>
                  ) : (
                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                      {JSON.stringify(tx.jsonData, null, 2).split('\n').map((line, i) => {
                        const isKey = /^\s*"[^"]+":/.test(line);
                        const isString = /:\s*"/.test(line);
                        const isNumber = /:\s*[\d.]+/.test(line);
                        const isBool = /:\s*(true|false)/.test(line);
                        return (
                          <span key={i} className="block">
                            {isKey ? (
                              <span>
                                <span className="text-blue-400">
                                  {line.match(/^(\s*)("[^"]+":)/)?.[1]}
                                  {line.match(/^(\s*)("[^"]+":)/)?.[2]}
                                </span>
                                <span className={isString ? 'text-emerald-400' : isNumber ? 'text-amber-400' : isBool ? 'text-purple-400' : 'text-gray-300'}>
                                  {line.replace(/^\s*"[^"]+":/, '')}
                                </span>
                              </span>
                            ) : (
                              <span className="text-gray-400">{line}</span>
                            )}
                          </span>
                        );
                      })}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column — Timeline */}
          <div className="space-y-6">
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                Chronologie
              </h2>
              <div className="relative">
                <div
                  className="absolute left-3.5 top-0 h-full w-px"
                  style={{ backgroundColor: '#1F2937' }}
                />
                <div className="space-y-5">
                  {tx.timeline.map((event, idx) => (
                    <div key={event.id} className="relative flex gap-4">
                      <div className="relative z-10 flex-shrink-0">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center shadow-lg ${timelineColorMap[event.color] || 'bg-gray-500'}`}
                        >
                          <span className="text-xs font-bold text-white">{idx + 1}</span>
                        </div>
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-sm font-semibold text-white">{event.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{event.actor}</p>
                        <p className="text-xs mt-1" style={{ color: '#C8A961' }}>{formatDate(event.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                Informations rapides
              </h2>
              <div className="space-y-3">
                {[
                  { label: 'ID Message', value: `PIMPAY-2024011500001847`, mono: true },
                  { label: 'Méthode règlement', value: 'CLRG - Compensation' },
                  { label: 'Date règlement', value: '15/01/2024' },
                  { label: 'Porteur de frais', value: tx.amounts.chargeBearer },
                  { label: 'Mise à jour', value: formatDate(tx.updatedAt) },
                ].map((item, i) => (
                  <div key={i} className="flex items-start justify-between gap-2">
                    <span className="text-xs text-gray-500 flex-shrink-0">{item.label}</span>
                    <span className={`text-xs text-right text-gray-300 ${item.mono ? 'font-mono' : ''}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Indicator */}
            <div
              className="rounded-2xl border p-5"
              style={{ backgroundColor: '#111827', borderColor: '#1F2937' }}
            >
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider" style={{ color: '#C8A961' }}>
                Score de risque
              </h2>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">Risque global</span>
                <span className="text-xs font-semibold text-emerald-400">FAIBLE</span>
              </div>
              <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" style={{ width: '18%' }} />
              </div>
              <p className="mt-1 text-right text-xs text-gray-500">18 / 100</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { label: 'AML', score: 12, color: 'emerald' },
                  { label: 'Fraude', score: 8, color: 'emerald' },
                  { label: 'Sanctions', score: 5, color: 'emerald' },
                  { label: 'PEP', score: 22, color: 'yellow' },
                ].map((r, i) => (
                  <div
                    key={i}
                    className="rounded-lg border p-2.5"
                    style={{ backgroundColor: '#0A0E17', borderColor: '#1F2937' }}
                  >
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-500">{r.label}</span>
                      <span className={`text-xs font-bold text-${r.color}-400`}>{r.score}</span>
                    </div>
                    <div className="h-1 rounded-full bg-gray-800">
                      <div
                        className={`h-1 rounded-full bg-${r.color}-500`}
                        style={{ width: `${r.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
