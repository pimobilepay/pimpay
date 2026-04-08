'use client';

import { useState } from 'react';
import { CheckIcon, ChevronLeftIcon, ChevronRightIcon, BanknotesIcon, ArrowsRightLeftIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

const PAYS_OPTIONS = [
  { value: 'CG', label: 'Congo (Brazzaville)' },
  { value: 'CM', label: 'Cameroun' },
  { value: 'GA', label: 'Gabon' },
  { value: 'GQ', label: 'Guinée Équatoriale' },
  { value: 'CF', label: 'République Centrafricaine' },
  { value: 'TD', label: 'Tchad' },
];

const CURRENCY_OPTIONS = ['XAF', 'EUR', 'USD', 'GBP', 'CHF'];

const TRANSACTION_TYPES = [
  { value: 'VIREMENT', label: 'Virement', icon: BanknotesIcon, description: 'Virement bancaire standard' },
  { value: 'RETOUR', label: 'Retour', icon: ArrowUturnLeftIcon, description: 'Retour de fonds' },
  { value: 'TRANSFERT_FI', label: 'Transfert FI', icon: ArrowsRightLeftIcon, description: 'Transfert entre institutions financières' },
];

const PRIORITY_OPTIONS = [
  { value: 'HAUTE', label: 'Haute', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/30' },
  { value: 'NORMALE', label: 'Normale', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30' },
  { value: 'BASSE', label: 'Basse', color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/30' },
];

const CHARGE_OPTIONS = [
  { value: 'DEBT', label: 'DEBT', description: 'À la charge du débiteur' },
  { value: 'CRED', label: 'CRED', description: 'À la charge du créditeur' },
  { value: 'SHAR', label: 'SHAR', description: 'Partagées entre les deux parties' },
];

interface FormData {
  type: string;
  priority: string;
  chargeBearer: string;
  debtorNom: string;
  debtorIBAN: string;
  debtorBIC: string;
  debtorPays: string;
  creditorNom: string;
  creditorIBAN: string;
  creditorBIC: string;
  creditorPays: string;
  amount: string;
  currency: string;
  remittanceInfo: string;
}

interface Errors {
  [key: string]: string;
}

const initialFormData: FormData = {
  type: '',
  priority: '',
  chargeBearer: '',
  debtorNom: '',
  debtorIBAN: '',
  debtorBIC: '',
  debtorPays: '',
  creditorNom: '',
  creditorIBAN: '',
  creditorBIC: '',
  creditorPays: '',
  amount: '',
  currency: 'XAF',
  remittanceInfo: '',
};

function InputField({ label, name, value, onChange, error, placeholder, type = 'text' }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void; error?: string; placeholder?: string; type?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`w-full px-4 py-2.5 rounded-lg bg-[#0A0E17] border ${
          error ? 'border-red-500' : 'border-gray-700'
        } text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A961]/60 focus:border-[#C8A961] transition-all duration-200`}
      />
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

function SelectField({ label, name, value, onChange, options, error }: { label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void; options: { value: string; label: string }[]; error?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`w-full px-4 py-2.5 rounded-lg bg-[#0A0E17] border ${
          error ? 'border-red-500' : 'border-gray-700'
        } text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A961]/60 focus:border-[#C8A961] transition-all duration-200 appearance-none cursor-pointer`}
      >
        <option value="" disabled className="text-gray-500">Sélectionner...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value} className="bg-[#111827]">{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
    </div>
  );
}

export default function NewTransactionPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => { const n = { ...prev }; delete n[name]; return n; });
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Errors = {};
    if (!formData.type) newErrors.type = 'Veuillez sélectionner un type de transaction';
    if (!formData.priority) newErrors.priority = 'Veuillez sélectionner une priorité';
    if (!formData.chargeBearer) newErrors.chargeBearer = 'Veuillez sélectionner un porteur de frais';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Errors = {};
    if (!formData.debtorNom.trim()) newErrors.debtorNom = 'Le nom du débiteur est requis';
    if (!formData.debtorIBAN.trim()) newErrors.debtorIBAN = "L'IBAN du débiteur est requis";
    if (!formData.debtorBIC.trim()) newErrors.debtorBIC = 'Le BIC du débiteur est requis';
    if (!formData.debtorPays) newErrors.debtorPays = 'Le pays du débiteur est requis';
    if (!formData.creditorNom.trim()) newErrors.creditorNom = 'Le nom du créditeur est requis';
    if (!formData.creditorIBAN.trim()) newErrors.creditorIBAN = "L'IBAN du créditeur est requis";
    if (!formData.creditorBIC.trim()) newErrors.creditorBIC = 'Le BIC du créditeur est requis';
    if (!formData.creditorPays) newErrors.creditorPays = 'Le pays du créditeur est requis';
    if (!formData.amount.trim()) newErrors.amount = 'Le montant est requis';
    else if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) newErrors.amount = 'Veuillez entrer un montant valide';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) setCurrentStep(2);
    else if (currentStep === 2 && validateStep2()) setCurrentStep(3);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const getPaysByValue = (val: string) => PAYS_OPTIONS.find(p => p.value === val)?.label || val;

  const steps = [
    { number: 1, label: 'Type & Priorité' },
    { number: 2, label: 'Parties & Montant' },
    { number: 3, label: 'Révision' },
  ];

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0A0E17] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-[#C8A961]/10 border-2 border-[#C8A961] flex items-center justify-center mx-auto mb-6">
            <CheckIcon className="w-10 h-10 text-[#C8A961]" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Transaction Soumise</h2>
          <p className="text-gray-400 mb-2">Votre transaction a été soumise avec succès.</p>
          <p className="text-gray-500 text-sm mb-8">Référence: <span className="text-[#C8A961] font-mono">TXN-{Date.now().toString().slice(-8)}</span></p>
          <button
            onClick={() => { setFormData(initialFormData); setCurrentStep(1); setSubmitted(false); }}
            className="px-6 py-3 bg-[#C8A961] hover:bg-[#D4B86E] text-[#0A0E17] font-semibold rounded-lg transition-colors duration-200"
          >
            Nouvelle Transaction
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E17] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[#C8A961] text-xs font-semibold uppercase tracking-widest">PIMPAY</span>
            <span className="text-gray-600 text-xs">/</span>
            <span className="text-gray-400 text-xs">Nouvelle Transaction</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Nouvelle Transaction</h1>
          <p className="text-gray-400 text-sm mt-1">Remplissez les informations pour initier une nouvelle transaction bancaire.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-[#1F2937] z-0">
              <div
                className="h-full bg-gradient-to-r from-[#C8A961] to-[#D4B86E] transition-all duration-500"
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%' }}
              />
            </div>
            {steps.map((step) => (
              <div key={step.number} className="flex flex-col items-center gap-2 z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                    currentStep > step.number
                      ? 'bg-[#C8A961] border-[#C8A961] text-[#0A0E17]'
                      : currentStep === step.number
                      ? 'bg-[#111827] border-[#C8A961] text-[#C8A961]'
                      : 'bg-[#111827] border-gray-700 text-gray-500'
                  }`}
                >
                  {currentStep > step.number ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <span className="text-sm font-bold">{step.number}</span>
                  )}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${
                  currentStep >= step.number ? 'text-[#C8A961]' : 'text-gray-500'
                }`}>{step.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden">
          <div className="p-6 md:p-8">

            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Type de Transaction</h2>
                  <p className="text-gray-500 text-sm">Sélectionnez le type, la priorité et le porteur des frais.</p>
                </div>

                {/* Transaction Type */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Type de Transaction</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {TRANSACTION_TYPES.map(t => {
                      const Icon = t.icon;
                      const selected = formData.type === t.value;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => { setFormData(prev => ({ ...prev, type: t.value })); if (errors.type) setErrors(prev => { const n = { ...prev }; delete n.type; return n; }); }}
                          className={`flex flex-col items-start gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                            selected
                              ? 'border-[#C8A961] bg-[#C8A961]/10'
                              : 'border-gray-700 bg-[#0A0E17] hover:border-gray-600'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            selected ? 'bg-[#C8A961]/20' : 'bg-[#1F2937]'
                          }`}>
                            <Icon className={`w-5 h-5 ${selected ? 'text-[#C8A961]' : 'text-gray-400'}`} />
                          </div>
                          <div>
                            <p className={`text-sm font-semibold ${selected ? 'text-[#C8A961]' : 'text-white'}`}>{t.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
                          </div>
                          {selected && (
                            <div className="absolute top-3 right-3">
                              <CheckIcon className="w-4 h-4 text-[#C8A961]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {errors.type && <p className="text-xs text-red-400 mt-2">{errors.type}</p>}
                </div>

                {/* Priority */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Priorité</label>
                  <div className="flex flex-wrap gap-3">
                    {PRIORITY_OPTIONS.map(p => {
                      const selected = formData.priority === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => { setFormData(prev => ({ ...prev, priority: p.value })); if (errors.priority) setErrors(prev => { const n = { ...prev }; delete n.priority; return n; }); }}
                          className={`px-5 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all duration-200 ${
                            selected ? `${p.bg} ${p.color} border-current` : 'border-gray-700 bg-[#0A0E17] text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                  {errors.priority && <p className="text-xs text-red-400 mt-2">{errors.priority}</p>}
                </div>

                {/* Charge Bearer */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-3 block">Porteur des Frais</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {CHARGE_OPTIONS.map(c => {
                      const selected = formData.chargeBearer === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => { setFormData(prev => ({ ...prev, chargeBearer: c.value })); if (errors.chargeBearer) setErrors(prev => { const n = { ...prev }; delete n.chargeBearer; return n; }); }}
                          className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                            selected
                              ? 'border-[#C8A961] bg-[#C8A961]/10'
                              : 'border-gray-700 bg-[#0A0E17] hover:border-gray-600'
                          }`}
                        >
                          <p className={`text-sm font-bold mb-1 ${selected ? 'text-[#C8A961]' : 'text-white'}`}>{c.label}</p>
                          <p className="text-xs text-gray-500">{c.description}</p>
                        </button>
                      );
                    })}
                  </div>
                  {errors.chargeBearer && <p className="text-xs text-red-400 mt-2">{errors.chargeBearer}</p>}
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Parties & Montant</h2>
                  <p className="text-gray-500 text-sm">Renseignez les informations du débiteur, du créditeur et le montant.</p>
                </div>

                {/* Debtor */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gray-800" />
                    <span className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest px-2">Débiteur</span>
                    <div className="h-px flex-1 bg-gray-800" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Nom" name="debtorNom" value={formData.debtorNom} onChange={handleChange} error={errors.debtorNom} placeholder="Nom du débiteur" />
                    <InputField label="IBAN" name="debtorIBAN" value={formData.debtorIBAN} onChange={handleChange} error={errors.debtorIBAN} placeholder="CG4012345678901234567890" />
                    <InputField label="BIC" name="debtorBIC" value={formData.debtorBIC} onChange={handleChange} error={errors.debtorBIC} placeholder="XXXXXXXX" />
                    <SelectField label="Pays" name="debtorPays" value={formData.debtorPays} onChange={handleChange} options={PAYS_OPTIONS} error={errors.debtorPays} />
                  </div>
                </div>

                {/* Creditor */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gray-800" />
                    <span className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest px-2">Créditeur</span>
                    <div className="h-px flex-1 bg-gray-800" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InputField label="Nom" name="creditorNom" value={formData.creditorNom} onChange={handleChange} error={errors.creditorNom} placeholder="Nom du créditeur" />
                    <InputField label="IBAN" name="creditorIBAN" value={formData.creditorIBAN} onChange={handleChange} error={errors.creditorIBAN} placeholder="CM2110003001000500000605306" />
                    <InputField label="BIC" name="creditorBIC" value={formData.creditorBIC} onChange={handleChange} error={errors.creditorBIC} placeholder="XXXXXXXX" />
                    <SelectField label="Pays" name="creditorPays" value={formData.creditorPays} onChange={handleChange} options={PAYS_OPTIONS} error={errors.creditorPays} />
                  </div>
                </div>

                {/* Amount & Remittance */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-gray-800" />
                    <span className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest px-2">Montant & Informations</span>
                    <div className="h-px flex-1 bg-gray-800" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-medium text-gray-300">Montant</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          name="amount"
                          value={formData.amount}
                          onChange={handleChange}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          className={`flex-1 px-4 py-2.5 rounded-lg bg-[#0A0E17] border ${
                            errors.amount ? 'border-red-500' : 'border-gray-700'
                          } text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A961]/60 focus:border-[#C8A961] transition-all duration-200`}
                        />
                        <select
                          name="currency"
                          value={formData.currency}
                          onChange={handleChange}
                          className="px-3 py-2.5 rounded-lg bg-[#0A0E17] border border-gray-700 text-[#C8A961] text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#C8A961]/60 focus:border-[#C8A961] transition-all duration-200 cursor-pointer"
                        >
                          {CURRENCY_OPTIONS.map(c => (
                            <option key={c} value={c} className="bg-[#111827] text-white">{c}</option>
                          ))}
                        </select>
                      </div>
                      {errors.amount && <p className="text-xs text-red-400 mt-0.5">{errors.amount}</p>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-300">Informations de Remise</label>
                    <textarea
                      name="remittanceInfo"
                      value={formData.remittanceInfo}
                      onChange={handleChange}
                      placeholder="Motif, référence ou informations complémentaires..."
                      rows={3}
                      className="w-full px-4 py-2.5 rounded-lg bg-[#0A0E17] border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#C8A961]/60 focus:border-[#C8A961] transition-all duration-200 resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">Révision & Confirmation</h2>
                  <p className="text-gray-500 text-sm">Vérifiez les informations avant de soumettre la transaction.</p>
                </div>

                <div className="bg-[#0A0E17] border border-gray-800 rounded-xl overflow-hidden">
                  {/* Transaction Info */}
                  <div className="p-5 border-b border-gray-800">
                    <h3 className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest mb-4">Informations de Transaction</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Type</p>
                        <p className="text-sm font-semibold text-white">{TRANSACTION_TYPES.find(t => t.value === formData.type)?.label || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Priorité</p>
                        <span className={`text-sm font-semibold ${
                          formData.priority === 'HAUTE' ? 'text-red-400' : formData.priority === 'NORMALE' ? 'text-yellow-400' : 'text-green-400'
                        }`}>{formData.priority}</span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Frais</p>
                        <p className="text-sm font-semibold text-white">{formData.chargeBearer}</p>
                      </div>
                    </div>
                  </div>

                  {/* Debtor Info */}
                  <div className="p-5 border-b border-gray-800">
                    <h3 className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest mb-4">Débiteur</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nom</p>
                        <p className="text-sm text-white font-medium">{formData.debtorNom || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">IBAN</p>
                        <p className="text-sm text-white font-mono">{formData.debtorIBAN || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">BIC</p>
                        <p className="text-sm text-white font-mono">{formData.debtorBIC || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pays</p>
                        <p className="text-sm text-white">{getPaysByValue(formData.debtorPays) || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Creditor Info */}
                  <div className="p-5 border-b border-gray-800">
                    <h3 className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest mb-4">Créditeur</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Nom</p>
                        <p className="text-sm text-white font-medium">{formData.creditorNom || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">IBAN</p>
                        <p className="text-sm text-white font-mono">{formData.creditorIBAN || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">BIC</p>
                        <p className="text-sm text-white font-mono">{formData.creditorBIC || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Pays</p>
                        <p className="text-sm text-white">{getPaysByValue(formData.creditorPays) || '—'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="p-5 border-b border-gray-800">
                    <h3 className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest mb-4">Montant</h3>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-white">{parseFloat(formData.amount || '0').toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-lg font-semibold text-[#C8A961]">{formData.currency}</span>
                    </div>
                  </div>

                  {/* Remittance */}
                  {formData.remittanceInfo && (
                    <div className="p-5">
                      <h3 className="text-xs font-semibold text-[#C8A961] uppercase tracking-widest mb-3">Informations de Remise</h3>
                      <p className="text-sm text-gray-300 leading-relaxed">{formData.remittanceInfo}</p>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-900/10 border border-yellow-700/30 rounded-xl p-4 flex gap-3">
                  <div className="text-yellow-500 mt-0.5 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-yellow-400">Veuillez vérifier attentivement toutes les informations avant de confirmer. Cette transaction ne pourra pas être annulée une fois soumise.</p>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="px-6 md:px-8 py-5 bg-[#0A0E17] border-t border-gray-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-gray-700 text-gray-300 text-sm font-medium hover:border-gray-600 hover:text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Précédent
            </button>

            <div className="flex items-center gap-2">
              {steps.map(s => (
                <div
                  key={s.number}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentStep === s.number ? 'bg-[#C8A961] w-6' : currentStep > s.number ? 'bg-[#C8A961]/50' : 'bg-gray-700'
                  }`}
                />
              ))}
            </div>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#C8A961] hover:bg-[#D4B86E] text-[#0A0E17] text-sm font-semibold transition-all duration-200"
              >
                Suivant
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#C8A961] hover:bg-[#D4B86E] text-[#0A0E17] text-sm font-semibold transition-all duration-200"
              >
                <CheckIcon className="w-4 h-4" />
                Confirmer & Soumettre
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
