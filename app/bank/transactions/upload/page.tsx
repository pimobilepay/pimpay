'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, FileCode, Download, CheckCircle, XCircle, AlertTriangle, ChevronRight, RefreshCw, Send, X, Info } from 'lucide-react';

type FileFormat = 'csv' | 'xml';
type ValidationStatus = 'valid' | 'error' | 'warning';

interface ValidationRow {
  row: number;
  status: ValidationStatus;
  reference: string;
  amount: string;
  currency: string;
  creditorIban: string;
  details: string;
  suggestion: string;
}

const mockValidationResults: ValidationRow[] = [
  {
    row: 1,
    status: 'valid',
    reference: 'VIR-2024-001',
    amount: '1 500,00',
    currency: 'EUR',
    creditorIban: 'FR76 3000 6000 0112 3456 7890 189',
    details: 'Virement valide',
    suggestion: '—',
  },
  {
    row: 2,
    status: 'valid',
    reference: 'VIR-2024-002',
    amount: '3 200,50',
    currency: 'EUR',
    creditorIban: 'DE89 3704 0044 0532 0130 00',
    details: 'Virement valide',
    suggestion: '—',
  },
  {
    row: 3,
    status: 'error',
    reference: 'VIR-2024-003',
    amount: '—',
    currency: 'EUR',
    creditorIban: 'FR76 1234 XXXX',
    details: 'IBAN créditeur invalide',
    suggestion: 'Vérifiez le format IBAN (ex: FR76 3000 6000 0112 3456 7890 189)',
  },
  {
    row: 4,
    status: 'warning',
    reference: 'VIR-2024-004',
    amount: '50 000,00',
    currency: 'USD',
    creditorIban: 'GB29 NWBK 6016 1331 9268 19',
    details: 'Devise non SEPA (USD)',
    suggestion: 'Confirmez que la devise USD est bien intentionnelle pour ce virement international',
  },
  {
    row: 5,
    status: 'error',
    reference: '',
    amount: '800,00',
    currency: 'EUR',
    creditorIban: 'ES91 2100 0418 4502 0005 1332',
    details: 'Référence manquante',
    suggestion: 'Ajoutez une référence unique pour identifier cette transaction',
  },
  {
    row: 6,
    status: 'valid',
    reference: 'VIR-2024-006',
    amount: '12 750,00',
    currency: 'EUR',
    creditorIban: 'IT60 X054 2811 1010 0000 0123 456',
    details: 'Virement valide',
    suggestion: '—',
  },
  {
    row: 7,
    status: 'warning',
    reference: 'VIR-2024-007',
    amount: '0,01',
    currency: 'EUR',
    creditorIban: 'BE68 5390 0754 7034',
    details: 'Montant inhabituellement faible',
    suggestion: 'Vérifiez si le montant de 0,01 EUR est correct',
  },
  {
    row: 8,
    status: 'valid',
    reference: 'VIR-2024-008',
    amount: '9 999,99',
    currency: 'EUR',
    creditorIban: 'NL91 ABNA 0417 1643 00',
    details: 'Virement valide',
    suggestion: '—',
  },
];

const csvColumns = [
  { name: 'Type', description: 'Type de virement (SEPA, SWIFT)', required: true, example: 'SEPA' },
  { name: 'Debtor IBAN', description: 'IBAN du compte débiteur', required: true, example: 'FR76 3000 6000 01...' },
  { name: 'Debtor BIC', description: 'BIC de la banque débitrice', required: true, example: 'BNPAFRPPXXX' },
  { name: 'Creditor IBAN', description: 'IBAN du bénéficiaire', required: true, example: 'DE89 3704 0044 05...' },
  { name: 'Creditor BIC', description: 'BIC de la banque bénéficiaire', required: false, example: 'DEUTDEDBBER' },
  { name: 'Amount', description: 'Montant (format décimal)', required: true, example: '1500.00' },
  { name: 'Currency', description: 'Devise ISO 4217', required: true, example: 'EUR' },
  { name: 'Reference', description: 'Référence unique de transaction', required: true, example: 'VIR-2024-001' },
];

const xmlSample = `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
  <CstmrCdtTrfInitn>
    <GrpHdr>
      <MsgId>PIMPAY-2024-001</MsgId>
      <CreDtTm>2024-01-15T10:30:00</CreDtTm>
      <NbOfTxs>1</NbOfTxs>
      <CtrlSum>1500.00</CtrlSum>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>PMT-001</PmtInfId>
      <PmtMtd>TRF</PmtMtd>
      <DbtrAcct>
        <Id><IBAN>FR7630006000011234567890189</IBAN></Id>
      </DbtrAcct>
      <CdtTrfTxInf>
        <Amt><InstdAmt Ccy="EUR">1500.00</InstdAmt></Amt>
        <CdtrAcct>
          <Id><IBAN>DE89370400440532013000</IBAN></Id>
        </CdtrAcct>
        <RmtInf><Ustrd>VIR-2024-001</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<FileFormat>('csv');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isValidating, setIsValidating] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ValidationStatus | 'all'>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validCount = mockValidationResults.filter(r => r.status === 'valid').length;
  const errorCount = mockValidationResults.filter(r => r.status === 'error').length;
  const warningCount = mockValidationResults.filter(r => r.status === 'warning').length;
  const totalCount = mockValidationResults.length;

  const filteredResults = filterStatus === 'all'
    ? mockValidationResults
    : mockValidationResults.filter(r => r.status === filterStatus);

  const simulateUpload = useCallback((file: File) => {
    setUploadedFile(file);
    setUploadProgress(0);
    setShowResults(false);
    setIsValidating(true);

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsValidating(false);
          setShowResults(true);
          return 100;
        }
        return prev + 5;
      });
    }, 80);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) simulateUpload(file);
  }, [simulateUpload]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) simulateUpload(file);
  }, [simulateUpload]);

  const handleReset = () => {
    setUploadedFile(null);
    setUploadProgress(0);
    setShowResults(false);
    setIsValidating(false);
    setFilterStatus('all');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const statusConfig = {
    valid: {
      icon: CheckCircle,
      label: 'Valide',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    error: {
      icon: XCircle,
      label: 'Erreur',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      dot: 'bg-red-400',
    },
    warning: {
      icon: AlertTriangle,
      label: 'Avertissement',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      dot: 'bg-amber-400',
    },
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-zinc-500 mb-3">
            <span>Transactions</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#c9a84c]">Import en Masse</span>
          </div>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-[#c9a84c] via-[#e8c97a] to-[#c9a84c] bg-clip-text text-transparent">
                Import en Masse
              </h1>
              <p className="text-zinc-400 mt-1 text-sm">
                Importez vos virements en lot via fichier CSV ou XML ISO 20022 pain.001
              </p>
            </div>
            <div className="flex items-center gap-2 bg-[#c9a84c]/10 border border-[#c9a84c]/20 rounded-lg px-3 py-2">
              <Info className="w-4 h-4 text-[#c9a84c]" />
              <span className="text-xs text-[#c9a84c] font-medium">Max 10 000 lignes / fichier</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* Left Column */}
          <div className="xl:col-span-2 space-y-6">

            {/* Upload Zone */}
            <div className="bg-[#111318] border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#c9a84c]" />
                Zone de Téléchargement
              </h2>

              {!uploadedFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-300 ${
                    isDragging
                      ? 'border-[#c9a84c] bg-[#c9a84c]/5 scale-[1.01]'
                      : 'border-zinc-700 hover:border-[#c9a84c]/50 hover:bg-[#c9a84c]/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xml"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className={`mx-auto mb-4 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isDragging ? 'bg-[#c9a84c]/20' : 'bg-zinc-800'
                  }`}>
                    <Upload className={`w-7 h-7 transition-colors duration-300 ${
                      isDragging ? 'text-[#c9a84c]' : 'text-zinc-400'
                    }`} />
                  </div>
                  <p className="text-white font-medium mb-1">
                    {isDragging ? 'Déposez votre fichier ici' : 'Glissez-déposez votre fichier'}
                  </p>
                  <p className="text-zinc-500 text-sm mb-4">
                    ou <span className="text-[#c9a84c] underline underline-offset-2">parcourir vos fichiers</span>
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-300">
                      <FileText className="w-3 h-3 text-[#c9a84c]" /> .CSV
                    </span>
                    <span className="flex items-center gap-1.5 bg-zinc-800 px-3 py-1.5 rounded-lg text-xs text-zinc-300">
                      <FileCode className="w-3 h-3 text-[#c9a84c]" /> .XML (ISO 20022)
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-center justify-between bg-zinc-800/50 rounded-xl p-4 border border-zinc-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center">
                        {uploadedFile.name.endsWith('.xml') ? (
                          <FileCode className="w-5 h-5 text-[#c9a84c]" />
                        ) : (
                          <FileText className="w-5 h-5 text-[#c9a84c]" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{uploadedFile.name}</p>
                        <p className="text-zinc-500 text-xs">{(uploadedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-400">
                        {isValidating ? 'Validation en cours...' : 'Validation terminée'}
                      </span>
                      <span className="text-xs font-mono text-[#c9a84c]">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-150 ease-out"
                        style={{
                          width: `${uploadProgress}%`,
                          background: 'linear-gradient(90deg, #c9a84c, #e8c97a)',
                          boxShadow: uploadProgress > 0 && uploadProgress < 100 ? '0 0 8px rgba(201,168,76,0.5)' : 'none',
                        }}
                      />
                    </div>
                    {isValidating && (
                      <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1.5">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Analyse des {totalCount} enregistrements...
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Validation Results */}
            {showResults && (
              <div className="bg-[#111318] border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-[#c9a84c]" />
                      Résultats de Validation
                    </h2>
                    <button
                      onClick={handleReset}
                      className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                      <RefreshCw className="w-3 h-3" /> Nouvel import
                    </button>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex items-center gap-2">
                    {(['all', 'valid', 'error', 'warning'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          filterStatus === status
                            ? status === 'all'
                              ? 'bg-[#c9a84c] text-black'
                              : status === 'valid'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : status === 'error'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {status === 'all' && `Tous (${totalCount})`}
                        {status === 'valid' && `Valides (${validCount})`}
                        {status === 'error' && `Erreurs (${errorCount})`}
                        {status === 'warning' && `Avertissements (${warningCount})`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        {['Ligne', 'Statut', 'Référence', 'Montant', 'IBAN Créditeur', 'Détails', 'Suggestion'].map(h => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {filteredResults.map((row) => {
                        const cfg = statusConfig[row.status];
                        const Icon = cfg.icon;
                        return (
                          <tr key={row.row} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <span className="text-zinc-300 font-mono text-sm">#{row.row}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                                <Icon className="w-3 h-3" />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`font-mono text-xs ${
                                row.reference ? 'text-zinc-300' : 'text-zinc-600 italic'
                              }`}>
                                {row.reference || 'Manquant'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-zinc-300 text-sm font-medium">
                                {row.amount !== '—' ? `${row.amount} ${row.currency}` : '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-mono text-xs text-zinc-400">{row.creditorIban}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs ${cfg.text}`}>{row.details}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-zinc-500 max-w-[200px] block">
                                {row.suggestion}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Submit Button */}
                <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">
                    <span className="text-[#c9a84c] font-semibold">{validCount} virements valides</span> prêts à être soumis
                    {errorCount > 0 && (
                      <> · <span className="text-red-400">{errorCount} erreur{errorCount > 1 ? 's' : ''} exclue{errorCount > 1 ? 's' : ''}</span></>
                    )}
                  </p>
                  <button
                    disabled={validCount === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{
                      background: validCount > 0 ? 'linear-gradient(135deg, #c9a84c, #e8c97a)' : undefined,
                      backgroundColor: validCount === 0 ? '#1f2028' : undefined,
                      color: validCount > 0 ? '#0a0b0f' : '#71717a',
                      boxShadow: validCount > 0 ? '0 4px 20px rgba(201,168,76,0.3)' : 'none',
                    }}
                  >
                    <Send className="w-4 h-4" />
                    Soumettre {validCount} virement{validCount > 1 ? 's' : ''} valide{validCount > 1 ? 's' : ''}
                  </button>
                </div>
              </div>
            )}

            {/* Format Documentation */}
            <div className="bg-[#111318] border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#c9a84c]" />
                  Format des Fichiers
                </h2>
              </div>

              {/* Format Tabs */}
              <div className="flex border-b border-zinc-800">
                <button
                  onClick={() => setActiveTab('csv')}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === 'csv'
                      ? 'border-[#c9a84c] text-[#c9a84c]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4" /> Modèle CSV
                </button>
                <button
                  onClick={() => setActiveTab('xml')}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === 'xml'
                      ? 'border-[#c9a84c] text-[#c9a84c]'
                      : 'border-transparent text-zinc-400 hover:text-white'
                  }`}
                >
                  <FileCode className="w-4 h-4" /> Format XML
                </button>
              </div>

              <div className="p-6">
                {activeTab === 'csv' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-zinc-400">Colonnes attendues dans le fichier CSV :</p>
                      <button className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 text-[#c9a84c] text-xs font-medium rounded-lg transition-all">
                        <Download className="w-3.5 h-3.5" /> Télécharger le modèle
                      </button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-zinc-800">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-zinc-800/50">
                            {['Colonne', 'Description', 'Requis', 'Exemple'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                          {csvColumns.map((col) => (
                            <tr key={col.name} className="hover:bg-zinc-800/20 transition-colors">
                              <td className="px-4 py-3">
                                <span className="font-mono text-sm text-[#c9a84c] bg-[#c9a84c]/10 px-2 py-0.5 rounded">{col.name}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-zinc-300">{col.description}</td>
                              <td className="px-4 py-3">
                                {col.required ? (
                                  <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Requis</span>
                                ) : (
                                  <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Optionnel</span>
                                )}
                              </td>
                              <td className="px-4 py-3">
                                <span className="font-mono text-xs text-zinc-400">{col.example}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-zinc-600">Encodage : UTF-8 · Séparateur : virgule (,) · Première ligne : en-têtes</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-zinc-300 font-medium">ISO 20022 — pain.001.001.03</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Standard européen pour les initiation de virements</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-[#c9a84c]/10 hover:bg-[#c9a84c]/20 border border-[#c9a84c]/30 text-[#c9a84c] text-xs font-medium rounded-lg transition-all">
                        <Download className="w-3.5 h-3.5" /> Télécharger le schéma XSD
                      </button>
                    </div>
                    <div className="bg-[#0d0e13] border border-zinc-800 rounded-xl p-4 overflow-x-auto">
                      <pre className="text-xs font-mono text-zinc-300 leading-relaxed whitespace-pre">
                        <code>
                          {xmlSample.split('\n').map((line, i) => (
                            <span key={i}>
                              {line
                                .replace(/(&lt;|<)(\/?)([a-zA-Z0-9:]+)/g, (match, lt, slash, tag) =>
                                  `${lt}${slash}<span style="color:#c9a84c">${tag}</span>`
                                )
                              }
                              {'\n'}
                            </span>
                          ))}
                        </code>
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Summary */}
          <div className="space-y-4">

            {/* Summary Card */}
            <div className="bg-[#111318] border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-5">Résumé de l&apos;Import</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-zinc-800/40 rounded-xl">
                  <span className="text-sm text-zinc-400">Total lignes</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {showResults ? totalCount : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-sm text-zinc-400">Valides</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-400 font-mono">
                    {showResults ? validCount : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400" />
                    <span className="text-sm text-zinc-400">Erreurs</span>
                  </div>
                  <span className="text-lg font-bold text-red-400 font-mono">
                    {showResults ? errorCount : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <span className="text-sm text-zinc-400">Avertissements</span>
                  </div>
                  <span className="text-lg font-bold text-amber-400 font-mono">
                    {showResults ? warningCount : '—'}
                  </span>
                </div>
              </div>

              {showResults && (
                <div className="mt-5">
                  <div className="flex items-center justify-between text-xs text-zinc-500 mb-2">
                    <span>Taux de réussite</span>
                    <span className="text-[#c9a84c] font-medium">{Math.round((validCount / totalCount) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500 rounded-l-full"
                      style={{ width: `${(validCount / totalCount) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${(warningCount / totalCount) * 100}%` }}
                    />
                    <div
                      className="h-full bg-red-500 rounded-r-full"
                      style={{ width: `${(errorCount / totalCount) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Tips Card */}
            <div className="bg-[#111318] border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#c9a84c]" />
                Conseils
              </h3>
              <div className="space-y-3">
                {[
                  { tip: 'Utilisez le modèle CSV téléchargeable pour éviter les erreurs de format.' },
                  { tip: 'Les IBANs doivent être sans espaces pour le traitement automatique.' },
                  { tip: 'Les montants doivent utiliser le point (.) comme séparateur décimal.' },
                  { tip: 'Les virements avec avertissements peuvent être soumis mais seront vérifiés.' },
                  { tip: 'Maximum 10 000 lignes par fichier. Pour plus, contactez votre conseiller.' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#c9a84c] mt-1.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.tip}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Supported Formats */}
            <div className="bg-[#111318] border border-zinc-800 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">Formats Supportés</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-xl">
                  <div className="w-9 h-9 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">CSV</p>
                    <p className="text-xs text-zinc-500">Format tabulaire standard</p>
                  </div>
                  <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Actif</span>
                </div>
                <div className="flex items-center gap-3 p-3 bg-zinc-800/40 rounded-xl">
                  <div className="w-9 h-9 bg-[#c9a84c]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileCode className="w-4 h-4 text-[#c9a84c]" />
                  </div>
                  <div>
                    <p className="text-sm text-white font-medium">XML pain.001</p>
                    <p className="text-xs text-zinc-500">ISO 20022 v1.03</p>
                  </div>
                  <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Actif</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
