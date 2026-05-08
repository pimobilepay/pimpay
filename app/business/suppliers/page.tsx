'use client';

import React, { useState, useMemo } from 'react';
import {
  Truck, Plus, Search, Eye, Edit3, X, Mail, Phone, MapPin,
  Package, DollarSign, Clock, CheckCircle, AlertTriangle, XCircle,
  ChevronRight, Globe, Star, TrendingUp, ShoppingCart,
} from 'lucide-react';

type PayStatus = 'current' | 'overdue' | 'pending';
type OrderStatus = 'delivered' | 'transit' | 'preparing' | 'cancelled';
interface Supplier {
  id: number; name: string; category: string; contact: string; email: string; phone: string;
  address: string; orders: number; totalPaid: number; payStatus: PayStatus; rating: number;
}
interface Order {
  id: string; supplier: string; items: string; amount: number; status: OrderStatus;
  orderDate: string; deliveryDate: string;
}

const SUPPLIERS: Supplier[] = [
  { id: 1, name: 'TechVision Cameroun', category: 'Technologie', contact: 'Marc Eyinga', email: 'contact@techvision.cm', phone: '+237 233 42 18 90', address: 'Douala, Akwa', orders: 24, totalPaid: 156_000_000, payStatus: 'current', rating: 4.8 },
  { id: 2, name: 'Bureau Express SARL', category: 'Fournitures', contact: 'Pauline Ndam', email: 'ventes@bureau-express.cm', phone: '+237 222 31 45 67', address: 'Yaoundé, Centre', orders: 48, totalPaid: 23_400_000, payStatus: 'current', rating: 4.5 },
  { id: 3, name: 'CloudAfrica Services', category: 'Technologie', contact: 'Samuel Ngah', email: 'enterprise@cloudafrica.io', phone: '+237 699 88 77 66', address: 'Douala, Bonanjo', orders: 12, totalPaid: 234_000_000, payStatus: 'pending', rating: 4.9 },
  { id: 4, name: 'Trans-Cam Logistique', category: 'Logistique', contact: 'Henri Fouda', email: 'ops@transcam.cm', phone: '+237 677 55 44 33', address: 'Douala, Zone Industrielle', orders: 36, totalPaid: 89_600_000, payStatus: 'current', rating: 4.2 },
  { id: 5, name: 'Elite Consulting Group', category: 'Services', contact: 'Dr. Amina Sow', email: 'info@elitecg.cm', phone: '+237 222 20 10 30', address: 'Yaoundé, Bastos', orders: 8, totalPaid: 312_000_000, payStatus: 'overdue', rating: 4.7 },
  { id: 6, name: 'Afri-Print Solutions', category: 'Fournitures', contact: 'Gabriel Tabi', email: 'commandes@afriprint.cm', phone: '+237 233 50 60 70', address: 'Douala, Bali', orders: 52, totalPaid: 18_900_000, payStatus: 'current', rating: 4.0 },
  { id: 7, name: 'SecureNet Cameroun', category: 'Technologie', contact: 'Irene Bella', email: 'sales@securenet.cm', phone: '+237 699 11 22 33', address: 'Douala, Bonapriso', orders: 6, totalPaid: 78_500_000, payStatus: 'pending', rating: 4.6 },
  { id: 8, name: 'Green Energy Solutions', category: 'Services', contact: 'Patrice Mbom', email: 'pro@greenenergy.cm', phone: '+237 677 99 88 77', address: 'Yaoundé, Melen', orders: 4, totalPaid: 45_200_000, payStatus: 'current', rating: 4.3 },
  { id: 9, name: 'Cam-Express Delivery', category: 'Logistique', contact: 'Rose Eyenga', email: 'dispatch@camexpress.cm', phone: '+237 655 44 33 22', address: 'Douala, New Bell', orders: 120, totalPaid: 34_800_000, payStatus: 'current', rating: 3.9 },
  { id: 10, name: 'Digital Academy CM', category: 'Services', contact: 'Prof. Jean Nkolo', email: 'training@dacm.cm', phone: '+237 222 15 25 35', address: 'Yaoundé, Omnisport', orders: 10, totalPaid: 56_000_000, payStatus: 'overdue', rating: 4.4 },
];

const ORDERS: Order[] = [
  { id: 'ORD-2024-001', supplier: 'TechVision Cameroun', items: 'Serveurs Dell PowerEdge x3', amount: 24_500_000, status: 'delivered', orderDate: '2024-03-01', deliveryDate: '2024-03-15' },
  { id: 'ORD-2024-002', supplier: 'CloudAfrica Services', items: 'Licence Azure Enterprise 1 an', amount: 56_000_000, status: 'delivered', orderDate: '2024-03-05', deliveryDate: '2024-03-05' },
  { id: 'ORD-2024-003', supplier: 'Bureau Express SARL', items: 'Mobilier bureau — 20 postes', amount: 8_400_000, status: 'transit', orderDate: '2024-03-18', deliveryDate: '2024-04-02' },
  { id: 'ORD-2024-004', supplier: 'Trans-Cam Logistique', items: 'Transport matériel Douala-Yaoundé', amount: 3_200_000, status: 'transit', orderDate: '2024-03-20', deliveryDate: '2024-03-25' },
  { id: 'ORD-2024-005', supplier: 'SecureNet Cameroun', items: 'Firewall FortiGate + Installation', amount: 18_900_000, status: 'preparing', orderDate: '2024-03-25', deliveryDate: '2024-04-10' },
  { id: 'ORD-2024-006', supplier: 'Elite Consulting Group', items: 'Audit conformité CEMAC', amount: 45_000_000, status: 'preparing', orderDate: '2024-03-28', deliveryDate: '2024-05-15' },
  { id: 'ORD-2024-007', supplier: 'Afri-Print Solutions', items: 'Impression rapports annuels x500', amount: 2_100_000, status: 'delivered', orderDate: '2024-03-10', deliveryDate: '2024-03-14' },
  { id: 'ORD-2024-008', supplier: 'Digital Academy CM', items: 'Formation cybersécurité — 15 pers.', amount: 12_000_000, status: 'cancelled', orderDate: '2024-03-15', deliveryDate: '2024-04-20' },
];

const catColors: Record<string, string> = { Technologie: '#6366f1', Fournitures: '#22d3ee', Services: '#a78bfa', Logistique: '#34d399' };
const payConf: Record<PayStatus, { label: string; color: string; bg: string }> = {
  current: { label: 'À jour', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  overdue: { label: 'En retard', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  pending: { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
};
const orderConf: Record<OrderStatus, { label: string; color: string; bg: string }> = {
  delivered: { label: 'Livrée', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  transit: { label: 'En transit', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  preparing: { label: 'En préparation', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
  cancelled: { label: 'Annulée', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
};

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

export default function SuppliersPage() {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('Tous');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Supplier | null>(null);
  const [activeTab, setActiveTab] = useState<'suppliers' | 'orders'>('suppliers');

  const categories = ['Tous', ...Array.from(new Set(SUPPLIERS.map(s => s.category)))];
  const filtered = useMemo(() => SUPPLIERS.filter(s => {
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.contact.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter === 'Tous' || s.category === catFilter;
    return ms && mc;
  }), [search, catFilter]);

  const totalBudget = 1_200_000_000;
  const consumed = SUPPLIERS.reduce((s, sup) => s + sup.totalPaid, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Truck className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Gestion des Fournisseurs</h1>
            <p className="text-sm text-gray-400">{SUPPLIERS.length} fournisseurs enregistres</p>
          </div>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-sm font-medium rounded-lg transition-all"
        >
          <Plus className="w-4 h-4" /> Ajouter Fournisseur
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Fournisseurs', value: SUPPLIERS.length.toString(), sub: categories.length - 1 + ' categories', color: 'indigo', icon: Truck },
          { label: 'Commandes en cours', value: ORDERS.filter(o => o.status === 'transit' || o.status === 'preparing').length.toString(), sub: fmt(ORDERS.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0)), color: 'blue', icon: Package },
          { label: 'Paiements en attente', value: SUPPLIERS.filter(s => s.payStatus === 'pending' || s.payStatus === 'overdue').length.toString(), sub: fmt(SUPPLIERS.filter(s => s.payStatus !== 'current').reduce((s, sup) => s + Math.round(sup.totalPaid * 0.1), 0)), color: 'amber', icon: Clock },
          { label: 'Budget Consomme', value: Math.round(consumed / totalBudget * 100) + '%', sub: fmt(consumed) + ' / ' + fmt(totalBudget), color: 'emerald', icon: TrendingUp },
        ].map((s, i) => (
          <div key={i} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.color === 'indigo' ? 'bg-indigo-500' : s.color === 'blue' ? 'bg-blue-500' : s.color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wide">{s.label}</span>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.color === 'indigo' ? 'bg-indigo-500/20' : s.color === 'blue' ? 'bg-blue-500/20' : s.color === 'amber' ? 'bg-amber-500/20' : 'bg-emerald-500/20'}`}>
                <s.icon className={`w-4 h-4 ${s.color === 'indigo' ? 'text-indigo-400' : s.color === 'blue' ? 'text-blue-400' : s.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 w-fit">
        {(['suppliers', 'orders'] as const).map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={`px-4 py-2 rounded-md text-xs font-medium transition-all ${activeTab === t ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            {t === 'suppliers' ? 'Fournisseurs' : 'Commandes'}
          </button>
        ))}
      </div>

      {activeTab === 'suppliers' && (
        <>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
              <input 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                placeholder="Rechercher..." 
                className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
              />
            </div>
            <select 
              value={catFilter} 
              onChange={e => setCatFilter(e.target.value)} 
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
                    {['Fournisseur', 'Categorie', 'Contact', 'Commandes', 'Total Paye', 'Statut', 'Note'].map(h => (
                      <th key={h} className="px-4 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filtered.map(s => (
                    <tr key={s.id} onClick={() => setShowDetail(s)} className="hover:bg-white/[0.02] cursor-pointer">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium">{s.name}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{s.address}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: `${catColors[s.category]}20`, color: catColors[s.category] }}>{s.category}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{s.contact}</td>
                      <td className="px-4 py-3 text-white font-medium">{s.orders}</td>
                      <td className="px-4 py-3 text-white font-medium">{fmt(s.totalPaid)}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: payConf[s.payStatus].bg, color: payConf[s.payStatus].color }}>{payConf[s.payStatus].label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                          <span className="text-white font-medium">{s.rating}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div className="bg-[#0a0f1c] border border-white/5 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase bg-white/[0.02]">
                  {['N Commande', 'Fournisseur', 'Articles', 'Montant', 'Date Commande', 'Livraison', 'Statut'].map(h => (
                    <th key={h} className="px-4 py-3 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ORDERS.map(o => (
                  <tr key={o.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-indigo-400 font-mono text-xs">{o.id}</td>
                    <td className="px-4 py-3 text-white font-medium">{o.supplier}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[200px] truncate">{o.items}</td>
                    <td className="px-4 py-3 text-white font-medium">{fmt(o.amount)}</td>
                    <td className="px-4 py-3 text-gray-400">{o.orderDate}</td>
                    <td className="px-4 py-3 text-gray-400">{o.deliveryDate}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: orderConf[o.status].bg, color: orderConf[o.status].color }}>{orderConf[o.status].label}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAdd(false)} />
          <div style={{ position: 'relative', width: '600px', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>Nouveau Fournisseur</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[{ l: 'Nom entreprise', p: 'TechVision Cameroun' }, { l: 'Catégorie', p: '', t: 'select' }, { l: 'Contact', p: 'Nom du contact' }, { l: 'Email', p: 'contact@entreprise.cm' }, { l: 'Téléphone', p: '+237 XXX XX XX XX' }, { l: 'Adresse', p: 'Douala, Cameroun' }].map(f => (
                <div key={f.l}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>{f.l}</label>
                  {f.t === 'select' ? (
                    <select style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }}>
                      <option>Technologie</option><option>Fournitures</option><option>Services</option><option>Logistique</option>
                    </select>
                  ) : (
                    <input placeholder={f.p} style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '10px 20px', borderRadius: '8px', background: '#1F2937', border: 'none', color: '#9CA3AF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button style={{ padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', border: 'none', color: '#0A0E17', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Detail */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(null)} />
          <div style={{ position: 'relative', width: '600px', maxHeight: '80vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <button onClick={() => setShowDetail(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6', marginBottom: '4px' }}>{showDetail.name}</h2>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              <span style={{ padding: '3px 8px', borderRadius: '4px', background: `${catColors[showDetail.category]}20`, color: catColors[showDetail.category], fontSize: '12px', fontWeight: 600 }}>{showDetail.category}</span>
              <span style={{ padding: '3px 8px', borderRadius: '4px', background: payConf[showDetail.payStatus].bg, color: payConf[showDetail.payStatus].color, fontSize: '12px', fontWeight: 600 }}>{payConf[showDetail.payStatus].label}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              {[
                { icon: Globe, label: 'Contact', value: showDetail.contact },
                { icon: Mail, label: 'Email', value: showDetail.email },
                { icon: Phone, label: 'Téléphone', value: showDetail.phone },
                { icon: MapPin, label: 'Adresse', value: showDetail.address },
                { icon: ShoppingCart, label: 'Commandes', value: showDetail.orders.toString() },
                { icon: DollarSign, label: 'Total Payé', value: fmt(showDetail.totalPaid) },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <f.icon size={16} style={{ color: '#6B7280', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '11px', color: '#6B7280' }}>{f.label}</p>
                    <p style={{ fontSize: '13px', color: '#F3F4F6', fontWeight: 500, marginTop: '2px' }}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={18} style={{ color: i <= Math.round(showDetail.rating) ? '#C8A961' : '#374151', fill: i <= Math.round(showDetail.rating) ? '#C8A961' : 'none' }} />
              ))}
              <span style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '14px', marginLeft: '4px' }}>{showDetail.rating}/5</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
