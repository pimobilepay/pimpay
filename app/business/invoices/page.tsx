'use client';

import React, { useState, useMemo } from 'react';
import {
  FileText, Plus, Search, Filter, Download, Send, Eye, Edit3,
  ChevronLeft, ChevronRight, X, Trash2, Calendar, DollarSign,
  Clock, CheckCircle, AlertTriangle, XCircle,
} from 'lucide-react';

// ── Types ──
type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft';
interface LineItem { id: number; description: string; qty: number; price: number; }
interface Invoice {
  id: string; client: string; email: string; dateIssued: string; dateDue: string;
  amount: number; status: InvoiceStatus; items: LineItem[];
}

// ── Mock Data ──
const INVOICES: Invoice[] = [
  { id: 'INV-2024-001', client: 'BGFI Holdings', email: 'finance@bgfi.com', dateIssued: '2024-01-15', dateDue: '2024-02-15', amount: 45_600_000, status: 'paid', items: [{ id: 1, description: 'Conseil stratégique Q1', qty: 1, price: 45_600_000 }] },
  { id: 'INV-2024-002', client: 'Afriland First Group', email: 'ap@afriland.com', dateIssued: '2024-01-20', dateDue: '2024-02-20', amount: 28_350_000, status: 'paid', items: [{ id: 1, description: 'Intégration API bancaire', qty: 1, price: 28_350_000 }] },
  { id: 'INV-2024-003', client: 'Ecobank Transnational', email: 'procurement@ecobank.com', dateIssued: '2024-02-01', dateDue: '2024-03-01', amount: 67_800_000, status: 'paid', items: [{ id: 1, description: 'Migration plateforme', qty: 1, price: 67_800_000 }] },
  { id: 'INV-2024-004', client: 'UBA Cameroun', email: 'finance@uba.cm', dateIssued: '2024-02-10', dateDue: '2024-03-10', amount: 18_920_000, status: 'overdue', items: [{ id: 1, description: 'Support technique annuel', qty: 1, price: 18_920_000 }] },
  { id: 'INV-2024-005', client: 'Société Générale Cameroun', email: 'achats@sgc.cm', dateIssued: '2024-02-15', dateDue: '2024-03-15', amount: 92_100_000, status: 'paid', items: [{ id: 1, description: 'Développement sur mesure', qty: 1, price: 92_100_000 }] },
  { id: 'INV-2024-006', client: 'BICEC', email: 'direction@bicec.cm', dateIssued: '2024-03-01', dateDue: '2024-04-01', amount: 34_500_000, status: 'pending', items: [{ id: 1, description: 'Audit sécurité', qty: 1, price: 34_500_000 }] },
  { id: 'INV-2024-007', client: 'Orange Money Cameroun', email: 'b2b@orange.cm', dateIssued: '2024-03-05', dateDue: '2024-04-05', amount: 156_000_000, status: 'paid', items: [{ id: 1, description: 'Intégration mobile money', qty: 1, price: 156_000_000 }] },
  { id: 'INV-2024-008', client: 'MTN MoMo', email: 'enterprise@mtn.cm', dateIssued: '2024-03-10', dateDue: '2024-04-10', amount: 78_400_000, status: 'pending', items: [{ id: 1, description: 'Module de paiement', qty: 1, price: 78_400_000 }] },
  { id: 'INV-2024-009', client: 'SABC', email: 'compta@sabc.cm', dateIssued: '2024-03-12', dateDue: '2024-04-12', amount: 23_100_000, status: 'overdue', items: [{ id: 1, description: 'Logiciel de gestion', qty: 1, price: 23_100_000 }] },
  { id: 'INV-2024-010', client: 'Dangote Cement Cameroun', email: 'finance@dangote.cm', dateIssued: '2024-03-15', dateDue: '2024-04-15', amount: 41_250_000, status: 'paid', items: [{ id: 1, description: 'Formation équipe IT', qty: 3, price: 13_750_000 }] },
  { id: 'INV-2024-011', client: 'Bolloré Transport', email: 'achat@bollore.cm', dateIssued: '2024-03-18', dateDue: '2024-04-18', amount: 55_800_000, status: 'pending', items: [{ id: 1, description: 'Système de tracking', qty: 1, price: 55_800_000 }] },
  { id: 'INV-2024-012', client: 'Camrail', email: 'dg@camrail.cm', dateIssued: '2024-03-20', dateDue: '2024-04-20', amount: 19_600_000, status: 'draft', items: [{ id: 1, description: 'Maintenance préventive', qty: 1, price: 19_600_000 }] },
  { id: 'INV-2024-013', client: 'AES-SONEL', email: 'finance@aes-sonel.cm', dateIssued: '2024-03-22', dateDue: '2024-04-22', amount: 87_300_000, status: 'paid', items: [{ id: 1, description: 'Infrastructure cloud', qty: 1, price: 87_300_000 }] },
  { id: 'INV-2024-014', client: 'Cimencam', email: 'achats@cimencam.cm', dateIssued: '2024-03-25', dateDue: '2024-04-25', amount: 31_450_000, status: 'pending', items: [{ id: 1, description: 'ERP Module Finance', qty: 1, price: 31_450_000 }] },
  { id: 'INV-2024-015', client: 'SCDP', email: 'direction@scdp.cm', dateIssued: '2024-03-28', dateDue: '2024-04-28', amount: 42_900_000, status: 'overdue', items: [{ id: 1, description: 'Digitalisation processus', qty: 1, price: 42_900_000 }] },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';
const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  paid: { label: 'Payée', bg: 'rgba(52,211,153,0.15)', text: '#34d399', icon: CheckCircle },
  pending: { label: 'En attente', bg: 'rgba(251,191,36,0.15)', text: '#fbbf24', icon: Clock },
  overdue: { label: 'En retard', bg: 'rgba(239,68,68,0.15)', text: '#ef4444', icon: AlertTriangle },
  draft: { label: 'Brouillon', bg: 'rgba(148,163,184,0.15)', text: '#94a3b8', icon: Edit3 },
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 1, description: '', qty: 1, price: 0 }]);
  const perPage = 8;

  const filtered = useMemo(() => {
    return INVOICES.filter(inv => {
      const matchSearch = inv.client.toLowerCase().includes(search.toLowerCase()) || inv.id.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const stats = {
    total: { count: INVOICES.length, amount: INVOICES.reduce((s, i) => s + i.amount, 0) },
    paid: { count: INVOICES.filter(i => i.status === 'paid').length, amount: INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0) },
    pending: { count: INVOICES.filter(i => i.status === 'pending').length, amount: INVOICES.filter(i => i.status === 'pending').reduce((s, i) => s + i.amount, 0) },
    overdue: { count: INVOICES.filter(i => i.status === 'overdue').length, amount: INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.amount, 0) },
  };

  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.price, 0);
  const tax = Math.round(subtotal * 0.1925);
  const grandTotal = subtotal + tax;

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Gestion des Factures</h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>{INVOICES.length} factures au total</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', transition: 'all 0.3s' }}>
          <Plus size={18} /> Nouvelle Facture
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Factures', count: stats.total.count, amount: stats.total.amount, color: '#6366f1', icon: FileText },
          { label: 'Payées', count: stats.paid.count, amount: stats.paid.amount, color: '#34d399', icon: CheckCircle },
          { label: 'En attente', count: stats.pending.count, amount: stats.pending.amount, color: '#fbbf24', icon: Clock },
          { label: 'En retard', count: stats.overdue.count, amount: stats.overdue.amount, color: '#ef4444', icon: AlertTriangle },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: s.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}>{s.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', marginTop: '8px' }}>{s.count}</p>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{fmt(s.amount)}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={20} style={{ color: s.color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Rechercher par N° ou client..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: '10px 16px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
          <option value="all">Tous les statuts</option>
          <option value="paid">Payée</option>
          <option value="pending">En attente</option>
          <option value="overdue">En retard</option>
          <option value="draft">Brouillon</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1F2937' }}>
              {['N° Facture', 'Client', 'Date Émission', 'Échéance', 'Montant', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(inv => {
              const sc = statusConfig[inv.status];
              return (
                <tr key={inv.id} onClick={() => setShowDetail(inv)} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)', cursor: 'pointer', transition: 'background 0.2s' }} className="hover:bg-white/[0.02]">
                  <td style={{ padding: '14px 16px', color: '#6366f1', fontWeight: 600, fontSize: '13px' }}>{inv.id}</td>
                  <td style={{ padding: '14px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 500 }}>{inv.client}</td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{inv.dateIssued}</td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{inv.dateDue}</td>
                  <td style={{ padding: '14px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(inv.amount)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: sc.bg, color: sc.text, fontSize: '12px', fontWeight: 600 }}>
                      <sc.icon size={12} /> {sc.label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                      {[{ icon: Eye, title: 'Voir' }, { icon: Send, title: 'Envoyer' }, { icon: Download, title: 'PDF' }].map((a, j) => (
                        <button key={j} title={a.title} style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', cursor: 'pointer', transition: 'all 0.2s' }} className="hover:border-white/20 hover:text-white">
                          <a.icon size={14} />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid #1F2937' }}>
          <p style={{ color: '#6B7280', fontSize: '13px' }}>{filtered.length} résultat(s) — Page {page}/{totalPages || 1}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 12px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', color: page === 1 ? '#374151' : '#9CA3AF', cursor: page === 1 ? 'default' : 'pointer', fontSize: '13px' }}>
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '6px 12px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', color: page === totalPages ? '#374151' : '#9CA3AF', cursor: page === totalPages ? 'default' : 'pointer', fontSize: '13px' }}>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowCreate(false)} />
          <div style={{ position: 'relative', width: '700px', maxHeight: '85vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>Nouvelle Facture</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {[{ label: 'Client', placeholder: 'Nom du client' }, { label: 'Email', placeholder: 'email@client.com' }].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>{f.label}</label>
                  <input placeholder={f.placeholder} style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Date d&apos;émission</label>
                <input type="date" style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Date d&apos;échéance</label>
                <input type="date" style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#F3F4F6', marginBottom: '12px' }}>Lignes de facture</h3>
            <div style={{ marginBottom: '16px' }}>
              {lineItems.map((li, idx) => (
                <div key={li.id} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px' }}>
                  <input placeholder="Description" value={li.description} onChange={e => { const n = [...lineItems]; n[idx].description = e.target.value; setLineItems(n); }} style={{ padding: '8px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
                  <input type="number" placeholder="Qté" value={li.qty || ''} onChange={e => { const n = [...lineItems]; n[idx].qty = Number(e.target.value); setLineItems(n); }} style={{ padding: '8px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#F3F4F6', fontSize: '13px', outline: 'none', textAlign: 'center' }} />
                  <input type="number" placeholder="Prix unit." value={li.price || ''} onChange={e => { const n = [...lineItems]; n[idx].price = Number(e.target.value); setLineItems(n); }} style={{ padding: '8px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
                  <div style={{ padding: '8px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#9CA3AF', fontSize: '13px', display: 'flex', alignItems: 'center' }}>{(li.qty * li.price).toLocaleString('fr-FR')}</div>
                  <button onClick={() => setLineItems(lineItems.filter((_, j) => j !== idx))} style={{ width: '36px', height: '36px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={14} /></button>
                </div>
              ))}
              <button onClick={() => setLineItems([...lineItems, { id: Date.now(), description: '', qty: 1, price: 0 }])} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '6px', color: '#6366f1', fontSize: '13px', cursor: 'pointer', fontWeight: 500 }}>
                <Plus size={14} /> Ajouter une ligne
              </button>
            </div>
            <div style={{ borderTop: '1px solid #1F2937', paddingTop: '16px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}><span style={{ color: '#9CA3AF' }}>Sous-total:</span><span style={{ color: '#F3F4F6', fontWeight: 600 }}>{fmt(subtotal)}</span></div>
              <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}><span style={{ color: '#9CA3AF' }}>TVA (19.25%):</span><span style={{ color: '#F3F4F6', fontWeight: 600 }}>{fmt(tax)}</span></div>
              <div style={{ display: 'flex', gap: '24px', fontSize: '16px', marginTop: '8px' }}><span style={{ color: '#F3F4F6', fontWeight: 700 }}>Total:</span><span style={{ color: '#C8A961', fontWeight: 800 }}>{fmt(grandTotal)}</span></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', borderRadius: '8px', background: '#1F2937', border: 'none', color: '#9CA3AF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Brouillon</button>
              <button style={{ padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', border: 'none', color: '#0A0E17', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Envoyer la facture</button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(null)} />
          <div style={{ position: 'relative', width: '600px', maxHeight: '80vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>{showDetail.id}</h2>
              <button onClick={() => setShowDetail(null)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div><p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Client</p><p style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '14px', marginTop: '4px' }}>{showDetail.client}</p></div>
              <div><p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</p><span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', background: statusConfig[showDetail.status].bg, color: statusConfig[showDetail.status].text, fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>{statusConfig[showDetail.status].label}</span></div>
              <div><p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date d&apos;émission</p><p style={{ color: '#F3F4F6', fontSize: '14px', marginTop: '4px' }}>{showDetail.dateIssued}</p></div>
              <div><p style={{ fontSize: '11px', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Échéance</p><p style={{ color: '#F3F4F6', fontSize: '14px', marginTop: '4px' }}>{showDetail.dateDue}</p></div>
            </div>
            <div style={{ borderTop: '1px solid #1F2937', paddingTop: '16px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#9CA3AF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Détails</h3>
              {showDetail.items.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(31,41,55,0.5)' }}>
                  <span style={{ color: '#F3F4F6', fontSize: '14px' }}>{item.description}</span>
                  <span style={{ color: '#F3F4F6', fontSize: '14px', fontWeight: 600 }}>{item.qty} × {fmt(item.price)}</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#C8A961' }}>{fmt(showDetail.amount)}</div>
            </div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#9CA3AF', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Historique de paiement</h3>
            <div style={{ position: 'relative', paddingLeft: '20px', marginBottom: '24px' }}>
              <div style={{ position: 'absolute', left: '6px', top: 0, bottom: 0, width: '2px', background: '#1F2937' }} />
              {[
                { date: showDetail.dateIssued, text: 'Facture créée et envoyée', color: '#6366f1' },
                ...(showDetail.status === 'paid' ? [{ date: showDetail.dateDue, text: 'Paiement reçu — Facture complétée', color: '#34d399' }] : []),
                ...(showDetail.status === 'overdue' ? [{ date: showDetail.dateDue, text: 'Échéance dépassée — Relance envoyée', color: '#ef4444' }] : []),
              ].map((ev, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px', position: 'relative' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: ev.color, flexShrink: 0, marginTop: '2px', position: 'absolute', left: '-20px' }} />
                  <div style={{ marginLeft: '4px' }}>
                    <p style={{ fontSize: '12px', color: '#6B7280' }}>{ev.date}</p>
                    <p style={{ fontSize: '13px', color: '#F3F4F6', marginTop: '2px' }}>{ev.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', background: '#0D1117', border: '1px solid #1F2937', color: '#9CA3AF', fontSize: '13px', cursor: 'pointer' }}><Download size={14} /> Télécharger PDF</button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', border: 'none', color: '#0A0E17', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}><Send size={14} /> Envoyer un rappel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
