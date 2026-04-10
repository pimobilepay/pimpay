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
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Gestion des Fournisseurs</h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>{SUPPLIERS.length} fournisseurs enregistrés</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Ajouter Fournisseur
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Fournisseurs', value: SUPPLIERS.length.toString(), sub: categories.length - 1 + ' catégories', color: '#6366f1', icon: Truck },
          { label: 'Commandes en cours', value: ORDERS.filter(o => o.status === 'transit' || o.status === 'preparing').length.toString(), sub: fmt(ORDERS.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').reduce((s, o) => s + o.amount, 0)), color: '#3b82f6', icon: Package },
          { label: 'Paiements en attente', value: SUPPLIERS.filter(s => s.payStatus === 'pending' || s.payStatus === 'overdue').length.toString(), sub: fmt(SUPPLIERS.filter(s => s.payStatus !== 'current').reduce((s, sup) => s + Math.round(sup.totalPaid * 0.1), 0)), color: '#fbbf24', icon: Clock },
          { label: 'Budget Consommé', value: Math.round(consumed / totalBudget * 100) + '%', sub: fmt(consumed) + ' / ' + fmt(totalBudget), color: '#34d399', icon: TrendingUp },
        ].map((s, i) => (
          <div key={i} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: s.color }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}>{s.label}</p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', marginTop: '8px' }}>{s.value}</p>
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>{s.sub}</p>
              </div>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><s.icon size={20} style={{ color: s.color }} /></div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#0D1117', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['suppliers', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ padding: '8px 20px', borderRadius: '8px', background: activeTab === t ? '#1F2937' : 'transparent', color: activeTab === t ? '#F3F4F6' : '#6B7280', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {t === 'suppliers' ? 'Fournisseurs' : 'Commandes'}
          </button>
        ))}
      </div>

      {activeTab === 'suppliers' && (
        <>
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
            </div>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ padding: '10px 16px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1F2937' }}>
                  {['Fournisseur', 'Catégorie', 'Contact', 'Commandes', 'Total Payé', 'Statut', 'Note'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} onClick={() => setShowDetail(s)} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)', cursor: 'pointer' }} className="hover:bg-white/[0.02]">
                    <td style={{ padding: '14px 16px' }}>
                      <p style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '13px' }}>{s.name}</p>
                      <p style={{ color: '#6B7280', fontSize: '11px', marginTop: '2px' }}>{s.address}</p>
                    </td>
                    <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: `${catColors[s.category]}20`, color: catColors[s.category], fontSize: '12px', fontWeight: 600 }}>{s.category}</span></td>
                    <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{s.contact}</td>
                    <td style={{ padding: '14px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{s.orders}</td>
                    <td style={{ padding: '14px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(s.totalPaid)}</td>
                    <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: payConf[s.payStatus].bg, color: payConf[s.payStatus].color, fontSize: '11px', fontWeight: 600 }}>{payConf[s.payStatus].label}</span></td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Star size={14} style={{ color: '#C8A961', fill: '#C8A961' }} />
                        <span style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{s.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'orders' && (
        <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937' }}>
                {['N° Commande', 'Fournisseur', 'Articles', 'Montant', 'Date Commande', 'Livraison', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ORDERS.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }} className="hover:bg-white/[0.02]">
                  <td style={{ padding: '14px 16px', color: '#6366f1', fontWeight: 600, fontSize: '13px' }}>{o.id}</td>
                  <td style={{ padding: '14px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 500 }}>{o.supplier}</td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px', maxWidth: '200px' }}>{o.items}</td>
                  <td style={{ padding: '14px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(o.amount)}</td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{o.orderDate}</td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{o.deliveryDate}</td>
                  <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: orderConf[o.status].bg, color: orderConf[o.status].color, fontSize: '11px', fontWeight: 600 }}>{orderConf[o.status].label}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
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
