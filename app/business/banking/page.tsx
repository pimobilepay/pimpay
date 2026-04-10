'use client';

import React, { useState } from 'react';
import {
  Building2, RefreshCw, Plus, ArrowRightLeft, Download, X,
  CheckCircle, Clock, AlertTriangle, Wifi, WifiOff, Eye, EyeOff,
  ArrowUpRight, ArrowDownRight, Send, CreditCard, TrendingUp,
  Calendar, FileText, Zap, Shield,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

interface BankAccount {
  id: number; bank: string; name: string; number: string; balance: number;
  currency: string; status: 'active' | 'syncing' | 'error'; lastSync: string; color: string;
}
interface Statement {
  id: number; date: string; description: string; debit: number; credit: number;
  balance: number; reference: string;
}

const ACCOUNTS: BankAccount[] = [
  { id: 1, bank: 'BGFI Bank Gabon', name: 'Compte Principal', number: 'GA•••••3847', balance: 234_500_000, currency: 'XAF', status: 'active', lastSync: 'Il y a 5 min', color: '#6366f1' },
  { id: 2, bank: 'Afriland First Bank', name: 'Compte Opérations', number: 'CM•••••1290', balance: 89_200_000, currency: 'XAF', status: 'active', lastSync: 'Il y a 12 min', color: '#22d3ee' },
  { id: 3, bank: 'UBA Cameroun', name: 'Compte Épargne', number: 'CM•••••5612', balance: 45_800_000, currency: 'XAF', status: 'active', lastSync: 'Il y a 30 min', color: '#a78bfa' },
];

const STATEMENTS: Statement[] = [
  { id: 1, date: '2024-04-10', description: 'Virement reçu — Orange Money CM', debit: 0, credit: 45_000_000, balance: 234_500_000, reference: 'VIR-2024-4521' },
  { id: 2, date: '2024-04-09', description: 'Paiement salaires Mars 2024', debit: 33_300_000, credit: 0, balance: 189_500_000, reference: 'PAY-2024-0312' },
  { id: 3, date: '2024-04-08', description: 'Facture TechVision Cameroun', debit: 24_500_000, credit: 0, balance: 222_800_000, reference: 'INV-2024-001' },
  { id: 4, date: '2024-04-07', description: 'Virement reçu — Ecobank Transnational', debit: 0, credit: 67_800_000, balance: 247_300_000, reference: 'VIR-2024-4498' },
  { id: 5, date: '2024-04-05', description: 'Frais bancaires mensuels', debit: 150_000, credit: 0, balance: 179_500_000, reference: 'FEE-2024-04' },
  { id: 6, date: '2024-04-04', description: 'Virement reçu — MTN MoMo', debit: 0, credit: 78_400_000, balance: 179_650_000, reference: 'VIR-2024-4456' },
  { id: 7, date: '2024-04-03', description: 'Paiement loyer bureau Douala', debit: 5_500_000, credit: 0, balance: 101_250_000, reference: 'RNT-2024-04' },
  { id: 8, date: '2024-04-02', description: 'Achat matériel informatique', debit: 12_800_000, credit: 0, balance: 106_750_000, reference: 'PUR-2024-0089' },
  { id: 9, date: '2024-04-01', description: 'Virement reçu — SABC', debit: 0, credit: 23_100_000, balance: 119_550_000, reference: 'VIR-2024-4412' },
  { id: 10, date: '2024-03-29', description: 'Assurance entreprise Q2', debit: 8_400_000, credit: 0, balance: 96_450_000, reference: 'INS-2024-Q2' },
];

const cashflowData = [
  { month: 'Oct', balance: 145 }, { month: 'Nov', balance: 178 }, { month: 'Dec', balance: 195 },
  { month: 'Jan', balance: 210 }, { month: 'Fév', balance: 198 }, { month: 'Mar', balance: 245 },
  { month: 'Avr', balance: 369 },
];

const monthlyIO = [
  { month: 'Jan', inflow: 320, outflow: 210 }, { month: 'Fév', inflow: 280, outflow: 195 },
  { month: 'Mar', inflow: 410, outflow: 234 }, { month: 'Avr', inflow: 350, outflow: 180 },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';
const totalBalance = ACCOUNTS.reduce((s, a) => s + a.balance, 0);

export default function BankingPage() {
  const [selectedAccount, setSelectedAccount] = useState(0);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showMask, setShowMask] = useState(false);
  const [activeTab, setActiveTab] = useState<'statements' | 'analytics' | 'connections'>('statements');

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Intégration Bancaire</h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Wifi size={14} style={{ color: '#34d399' }} /> Connecté — {ACCOUNTS.length} comptes actifs
            </span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowTransfer(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '12px', background: '#1F2937', border: '1px solid #374151', color: '#F3F4F6', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <ArrowRightLeft size={16} /> Nouveau Virement
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
            <Plus size={18} /> Connecter un compte
          </button>
        </div>
      </div>

      {/* Total Balance */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-6 shadow-xl" style={{ marginBottom: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}>Solde Total — Tous Comptes</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
              <p style={{ fontSize: '36px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-1px' }}>{showMask ? '••••••••' : fmt(totalBalance)}</p>
              <button onClick={() => setShowMask(!showMask)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}>
                {showMask ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(52,211,153,0.1)' }}>
            <ArrowUpRight size={16} style={{ color: '#34d399' }} />
            <span style={{ color: '#34d399', fontWeight: 700, fontSize: '14px' }}>+18.4%</span>
            <span style={{ color: '#6B7280', fontSize: '12px' }}>vs mois dernier</span>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {ACCOUNTS.map((acc, i) => (
          <div key={acc.id} onClick={() => setSelectedAccount(i)} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5" style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden', borderColor: selectedAccount === i ? `${acc.color}40` : undefined }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: acc.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <p style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '14px' }}>{acc.bank}</p>
                <p style={{ color: '#6B7280', fontSize: '12px', marginTop: '2px' }}>{acc.name} · {acc.number}</p>
              </div>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: acc.status === 'active' ? '#34d399' : acc.status === 'syncing' ? '#fbbf24' : '#ef4444' }} />
            </div>
            <p style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6', marginBottom: '8px' }}>{showMask ? '••••••' : fmt(acc.balance)}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#6B7280' }}>Sync: {acc.lastSync}</span>
              <button style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '4px', background: `${acc.color}15`, border: 'none', color: acc.color, fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}>
                <RefreshCw size={12} /> Sync
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#0D1117', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {([['statements', 'Relevés'], ['analytics', 'Analyses'], ['connections', 'Connexions']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key as any)} style={{ padding: '8px 20px', borderRadius: '8px', background: activeTab === key ? '#1F2937' : 'transparent', color: activeTab === key ? '#F3F4F6' : '#6B7280', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'statements' && (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Relevé — {ACCOUNTS[selectedAccount].bank}</h3>
            <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', color: '#9CA3AF', fontSize: '12px', cursor: 'pointer' }}><Download size={14} /> Exporter</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937' }}>
                {['Date', 'Description', 'Débit', 'Crédit', 'Solde', 'Référence'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STATEMENTS.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }} className="hover:bg-white/[0.02]">
                  <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '13px' }}>{s.date}</td>
                  <td style={{ padding: '12px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 500 }}>{s.description}</td>
                  <td style={{ padding: '12px 16px', color: s.debit > 0 ? '#ef4444' : '#374151', fontSize: '13px', fontWeight: 600 }}>{s.debit > 0 ? '-' + fmt(s.debit) : '—'}</td>
                  <td style={{ padding: '12px 16px', color: s.credit > 0 ? '#34d399' : '#374151', fontSize: '13px', fontWeight: 600 }}>{s.credit > 0 ? '+' + fmt(s.credit) : '—'}</td>
                  <td style={{ padding: '12px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(s.balance)}</td>
                  <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '12px', fontFamily: 'monospace' }}>{s.reference}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '20px' }}>Évolution du Solde (M XAF)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={cashflowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                <Line type="monotone" dataKey="balance" stroke="#C8A961" strokeWidth={2.5} dot={{ fill: '#C8A961', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '20px' }}>Entrées / Sorties (M XAF)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyIO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                <Bar dataKey="inflow" fill="#34d399" radius={[4, 4, 0, 0]} name="Entrées" />
                <Bar dataKey="outflow" fill="#ef4444" radius={[4, 4, 0, 0]} name="Sorties" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === 'connections' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {ACCOUNTS.map(acc => (
            <div key={acc.id} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: `${acc.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Building2 size={22} style={{ color: acc.color }} />
                  </div>
                  <div>
                    <p style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '15px' }}>{acc.bank}</p>
                    <p style={{ color: '#6B7280', fontSize: '12px' }}>API v2.1 · {acc.number} · Dernière sync: {acc.lastSync}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', background: 'rgba(52,211,153,0.1)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34d399' }} />
                    <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 600 }}>Connecté</span>
                  </div>
                  <button style={{ padding: '6px 14px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', color: '#9CA3AF', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Reconnecter</button>
                  <button style={{ padding: '6px 14px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '12px', cursor: 'pointer', fontWeight: 600 }}>Déconnecter</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowTransfer(false)} />
          <div style={{ position: 'relative', width: '500px', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>Nouveau Virement</h2>
              <button onClick={() => setShowTransfer(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { l: 'Compte source', t: 'select', opts: ACCOUNTS.map(a => `${a.bank} — ${a.name}`) },
                { l: 'Bénéficiaire', p: 'Nom ou compte destinataire' },
                { l: 'Montant (XAF)', p: '0', type: 'number' },
                { l: 'Référence', p: 'Description du virement' },
              ].map(f => (
                <div key={f.l}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>{f.l}</label>
                  {f.t === 'select' ? (
                    <select style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }}>
                      {f.opts!.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} placeholder={f.p} style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
                  )}
                </div>
              ))}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Type de virement</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Interne', 'SEPA', 'Swift'].map(t => (
                    <button key={t} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: t === 'Interne' ? 'rgba(99,102,241,0.15)' : '#0D1117', border: `1px solid ${t === 'Interne' ? '#6366f1' : '#1F2937'}`, color: t === 'Interne' ? '#6366f1' : '#9CA3AF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTransfer(false)} style={{ padding: '10px 20px', borderRadius: '8px', background: '#1F2937', border: 'none', color: '#9CA3AF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', border: 'none', color: '#0A0E17', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}><Send size={14} /> Exécuter le virement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
