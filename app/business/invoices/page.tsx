'use client';

import React, { useState, useMemo } from 'react';
import useSWR, { mutate } from 'swr';
import {
  FileText, Plus, Search, Download, Send, Eye, Edit3,
  ChevronLeft, ChevronRight, X, Trash2,
  Clock, CheckCircle, AlertTriangle, XCircle, Loader2,
} from 'lucide-react';

// Types
type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'DRAFT';
interface LineItem { id: number; description: string; qty: number; price: number; }
interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  total: number;
  status: InvoiceStatus;
  createdAt: string;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    invoices: Invoice[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    stats: InvoiceStats;
  };
}

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('pimpay_token') : null;
  const res = await fetch(url, {
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
    },
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

const statusConfig: Record<InvoiceStatus, { label: string; bg: string; text: string; icon: React.ElementType }> = {
  PAID: { label: 'Payee', bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle },
  PENDING: { label: 'En attente', bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Clock },
  OVERDUE: { label: 'En retard', bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertTriangle },
  DRAFT: { label: 'Brouillon', bg: 'bg-gray-500/10', text: 'text-gray-400', icon: Edit3 },
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([{ id: 1, description: '', qty: 1, price: 0 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state for new invoice
  const [newInvoice, setNewInvoice] = useState({
    customerName: '',
    email: '',
    dateIssued: '',
    dateDue: '',
  });
  
  const perPage = 8;

  // Fetch invoices from API
  const { data, error, isLoading } = useSWR<ApiResponse>(
    `/api/business/invoices?page=${page}&limit=${perPage}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const invoices = data?.data?.invoices || [];
  const stats = data?.data?.stats || { totalInvoices: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 };
  const pagination = data?.data?.pagination || { page: 1, limit: perPage, total: 0, totalPages: 1 };

  // Filter by search locally
  const filtered = useMemo(() => {
    if (!search) return invoices;
    return invoices.filter(inv =>
      inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [invoices, search]);

  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.price, 0);
  const tax = Math.round(subtotal * 0.1925);
  const grandTotal = subtotal + tax;

  const handleCreateInvoice = async () => {
    if (!newInvoice.customerName || grandTotal <= 0) return;
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('pimpay_token');
      const res = await fetch('/api/business/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          customerName: newInvoice.customerName,
          total: grandTotal,
          status: 'DRAFT',
          items: lineItems,
        }),
      });

      if (res.ok) {
        setShowCreate(false);
        setNewInvoice({ customerName: '', email: '', dateIssued: '', dateDue: '' });
        setLineItems([{ id: 1, description: '', qty: 1, price: 0 }]);
        mutate(`/api/business/invoices?page=${page}&limit=${perPage}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`);
      }
    } catch (err) {
      console.error('Error creating invoice:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer cette facture?')) return;
    
    try {
      const token = localStorage.getItem('pimpay_token');
      const res = await fetch(`/api/business/invoices?id=${invoiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });

      if (res.ok) {
        setShowDetail(null);
        mutate(`/api/business/invoices?page=${page}&limit=${perPage}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`);
      }
    } catch (err) {
      console.error('Error deleting invoice:', err);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const token = localStorage.getItem('pimpay_token');
      const res = await fetch('/api/business/invoices', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          invoiceId,
          status: newStatus,
        }),
      });

      if (res.ok) {
        mutate(`/api/business/invoices?page=${page}&limit=${perPage}${statusFilter !== 'all' ? `&status=${statusFilter}` : ''}`);
      }
    } catch (err) {
      console.error('Error updating invoice:', err);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Chargement des factures...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">Erreur de chargement</h3>
          <p className="text-gray-400 text-sm">Impossible de charger les factures. Verifiez votre connexion.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <FileText className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Factures</h1>
            <p className="text-sm text-gray-400">{stats.totalInvoices} factures au total</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-semibold rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" /> Nouvelle Facture
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Factures', count: stats.totalInvoices, amount: stats.totalAmount, color: 'indigo', icon: FileText },
          { label: 'Payees', count: invoices.filter(i => i.status === 'PAID').length, amount: stats.paidAmount, color: 'emerald', icon: CheckCircle },
          { label: 'En attente', count: invoices.filter(i => i.status === 'PENDING' || i.status === 'DRAFT').length, amount: stats.pendingAmount, color: 'amber', icon: Clock },
          { label: 'En retard', count: invoices.filter(i => i.status === 'OVERDUE').length, amount: stats.totalAmount - stats.paidAmount - stats.pendingAmount, color: 'red', icon: AlertTriangle },
        ].map((s, i) => (
          <div
            key={i}
            className="relative overflow-hidden bg-[#0a0f1c] border border-white/5 rounded-xl p-5 transition-all hover:border-white/10"
          >
            <div className={`absolute top-0 left-0 right-0 h-0.5 bg-${s.color}-500`} />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{s.label}</p>
                <p className="text-2xl font-bold text-white mt-2">{s.count}</p>
                <p className="text-sm text-gray-500 mt-1">{fmt(s.amount)}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-${s.color}-500/20 flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 text-${s.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); }}
            placeholder="Rechercher par N ou client..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-4 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
        >
          <option value="all">Tous les statuts</option>
          <option value="PAID">Payee</option>
          <option value="PENDING">En attente</option>
          <option value="OVERDUE">En retard</option>
          <option value="DRAFT">Brouillon</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
                <th className="px-4 py-3.5 font-semibold">N Facture</th>
                <th className="px-4 py-3.5 font-semibold">Client</th>
                <th className="px-4 py-3.5 font-semibold">Date</th>
                <th className="px-4 py-3.5 font-semibold">Montant</th>
                <th className="px-4 py-3.5 font-semibold">Statut</th>
                <th className="px-4 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Aucune facture trouvee
                  </td>
                </tr>
              ) : (
                filtered.map(inv => {
                  const sc = statusConfig[inv.status] || statusConfig.DRAFT;
                  const StatusIcon = sc.icon;
                  return (
                    <tr
                      key={inv.id}
                      onClick={() => setShowDetail(inv)}
                      className="cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5 text-indigo-400 font-semibold font-mono text-xs">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3.5 text-white font-medium">
                        {inv.customerName}
                      </td>
                      <td className="px-4 py-3.5 text-gray-400">
                        {new Date(inv.createdAt).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-4 py-3.5 text-white font-semibold">
                        {fmt(inv.total)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${sc.bg} ${sc.text}`}>
                          <StatusIcon className="w-3 h-3" /> {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setShowDetail(inv)}
                            title="Voir"
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            title="Envoyer"
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                          <button
                            title="PDF"
                            className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors"
                          >
                            <Download className="w-4 h-4" />
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
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
            <p className="text-xs text-gray-500">
              {pagination.total} resultat(s) - Page {page}/{pagination.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
                className="p-2 hover:bg-white/5 rounded-lg text-gray-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-[#111827] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">Nouvelle Facture</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Client</label>
                <input
                  placeholder="Nom du client"
                  value={newInvoice.customerName}
                  onChange={e => setNewInvoice(prev => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email</label>
                <input
                  placeholder="email@client.com"
                  value={newInvoice.email}
                  onChange={e => setNewInvoice(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Date d&apos;emission</label>
                <input
                  type="date"
                  value={newInvoice.dateIssued}
                  onChange={e => setNewInvoice(prev => ({ ...prev, dateIssued: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Date d&apos;echeance</label>
                <input
                  type="date"
                  value={newInvoice.dateDue}
                  onChange={e => setNewInvoice(prev => ({ ...prev, dateDue: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            
            <h3 className="text-sm font-semibold text-white mb-3">Lignes de facture</h3>
            <div className="space-y-2 mb-4">
              {lineItems.map((li, idx) => (
                <div key={li.id} className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] gap-2">
                  <input
                    placeholder="Description"
                    value={li.description}
                    onChange={e => {
                      const n = [...lineItems];
                      n[idx].description = e.target.value;
                      setLineItems(n);
                    }}
                    className="px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Qte"
                    value={li.qty || ''}
                    onChange={e => {
                      const n = [...lineItems];
                      n[idx].qty = Number(e.target.value);
                      setLineItems(n);
                    }}
                    className="px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="number"
                    placeholder="Prix"
                    value={li.price || ''}
                    onChange={e => {
                      const n = [...lineItems];
                      n[idx].price = Number(e.target.value);
                      setLineItems(n);
                    }}
                    className="px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                  <div className="px-3 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-gray-400 flex items-center">
                    {(li.qty * li.price).toLocaleString('fr-FR')}
                  </div>
                  <button
                    onClick={() => setLineItems(lineItems.filter((_, j) => j !== idx))}
                    className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setLineItems([...lineItems, { id: Date.now(), description: '', qty: 1, price: 0 }])}
                className="flex items-center gap-2 px-4 py-2 bg-[#0d1117] border border-white/10 rounded-lg text-sm text-indigo-400 hover:bg-white/5 transition-colors"
              >
                <Plus className="w-4 h-4" /> Ajouter une ligne
              </button>
            </div>
            
            <div className="border-t border-white/10 pt-4 flex flex-col items-end gap-2">
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-400">Sous-total:</span>
                <span className="text-white font-semibold">{fmt(subtotal)}</span>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <span className="text-gray-400">TVA (19.25%):</span>
                <span className="text-white font-semibold">{fmt(tax)}</span>
              </div>
              <div className="flex items-center gap-6 text-base mt-2">
                <span className="text-white font-bold">Total:</span>
                <span className="text-amber-400 font-bold">{fmt(grandTotal)}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateInvoice}
                disabled={isSubmitting || !newInvoice.customerName || grandTotal <= 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Creer la facture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowDetail(null)} />
          <div className="relative w-full max-w-lg max-h-[80vh] overflow-y-auto bg-[#111827] border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">{showDetail.invoiceNumber}</h2>
              <button onClick={() => setShowDetail(null)} className="p-1 hover:bg-white/5 rounded-lg text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Client</p>
                <p className="text-white font-semibold text-sm mt-1">{showDetail.customerName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Statut</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mt-1 ${statusConfig[showDetail.status]?.bg || 'bg-gray-500/10'} ${statusConfig[showDetail.status]?.text || 'text-gray-400'}`}>
                  {statusConfig[showDetail.status]?.label || showDetail.status}
                </span>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date de creation</p>
                <p className="text-white text-sm mt-1">{new Date(showDetail.createdAt).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Montant</p>
                <p className="text-amber-400 font-bold text-lg mt-1">{fmt(showDetail.total)}</p>
              </div>
            </div>

            {/* Quick Status Update */}
            <div className="border-t border-white/10 pt-4 mb-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Changer le statut</p>
              <div className="flex flex-wrap gap-2">
                {(['DRAFT', 'PENDING', 'PAID', 'OVERDUE'] as InvoiceStatus[]).map(status => {
                  const config = statusConfig[status];
                  const isActive = showDetail.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => handleUpdateStatus(showDetail.id, status)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? `${config.bg} ${config.text} ring-1 ring-current`
                          : 'bg-white/5 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <config.icon className="w-3 h-3" />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">
                <Download className="w-4 h-4" /> Telecharger PDF
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-semibold rounded-lg transition-all">
                <Send className="w-4 h-4" /> Envoyer
              </button>
              <button
                onClick={() => handleDeleteInvoice(showDetail.id)}
                className="p-2.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
