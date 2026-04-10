'use client';

import React, { useState, useMemo } from 'react';
import {
  Users, Plus, Search, Grid, List, Edit3, Eye, X, Mail, Phone,
  Building2, Calendar, DollarSign, MoreVertical, MapPin,
  CheckCircle, Clock, XCircle, Briefcase, ChevronDown,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

type EmployeeStatus = 'active' | 'inactive' | 'leave';
interface Employee {
  id: number; name: string; email: string; phone: string; position: string;
  department: string; salary: number; status: EmployeeStatus; hireDate: string;
  avatar: string;
}

const DEPARTMENTS = ['Tous', 'Finance', 'IT', 'Marketing', 'Operations', 'RH'];
const DEPT_COLORS: Record<string, string> = { Finance: '#6366f1', IT: '#22d3ee', Marketing: '#a78bfa', Operations: '#34d399', RH: '#f59e0b' };

const EMPLOYEES: Employee[] = [
  { id: 1, name: 'Jean-Pierre Mbarga', email: 'jp.mbarga@pimpay.com', phone: '+237 6 91 23 45 67', position: 'Directeur Financier', department: 'Finance', salary: 4_500_000, status: 'active', hireDate: '2021-03-15', avatar: 'JPM' },
  { id: 2, name: 'Marie-Claire Ngo', email: 'mc.ngo@pimpay.com', phone: '+237 6 92 34 56 78', position: 'Développeuse Senior', department: 'IT', salary: 3_800_000, status: 'active', hireDate: '2021-06-01', avatar: 'MCN' },
  { id: 3, name: 'Paul Essomba', email: 'p.essomba@pimpay.com', phone: '+237 6 93 45 67 89', position: 'Chef Marketing', department: 'Marketing', salary: 3_200_000, status: 'active', hireDate: '2022-01-10', avatar: 'PE' },
  { id: 4, name: 'Aïcha Bello', email: 'a.bello@pimpay.com', phone: '+237 6 94 56 78 90', position: 'Responsable RH', department: 'RH', salary: 3_000_000, status: 'active', hireDate: '2021-09-20', avatar: 'AB' },
  { id: 5, name: 'François Ekotto', email: 'f.ekotto@pimpay.com', phone: '+237 6 95 67 89 01', position: 'Chef des Opérations', department: 'Operations', salary: 3_500_000, status: 'active', hireDate: '2022-04-05', avatar: 'FE' },
  { id: 6, name: 'Sandrine Ateba', email: 's.ateba@pimpay.com', phone: '+237 6 96 78 90 12', position: 'Comptable', department: 'Finance', salary: 2_200_000, status: 'active', hireDate: '2022-07-15', avatar: 'SA' },
  { id: 7, name: 'Hervé Ngono', email: 'h.ngono@pimpay.com', phone: '+237 6 97 89 01 23', position: 'Développeur Backend', department: 'IT', salary: 2_800_000, status: 'leave', hireDate: '2022-10-01', avatar: 'HN' },
  { id: 8, name: 'Carine Tamba', email: 'c.tamba@pimpay.com', phone: '+237 6 98 90 12 34', position: 'Designer UI/UX', department: 'IT', salary: 2_600_000, status: 'active', hireDate: '2023-01-15', avatar: 'CT' },
  { id: 9, name: 'David Fotso', email: 'd.fotso@pimpay.com', phone: '+237 6 99 01 23 45', position: 'Chargé de communication', department: 'Marketing', salary: 1_800_000, status: 'active', hireDate: '2023-03-10', avatar: 'DF' },
  { id: 10, name: 'Estelle Manga', email: 'e.manga@pimpay.com', phone: '+237 6 80 12 34 56', position: 'Assistante Administrative', department: 'RH', salary: 1_500_000, status: 'inactive', hireDate: '2023-05-20', avatar: 'EM' },
  { id: 11, name: 'Bruno Nkwain', email: 'b.nkwain@pimpay.com', phone: '+237 6 81 23 45 67', position: 'Analyste Données', department: 'IT', salary: 2_400_000, status: 'active', hireDate: '2023-07-01', avatar: 'BN' },
  { id: 12, name: 'Olive Tchinda', email: 'o.tchinda@pimpay.com', phone: '+237 6 82 34 56 78', position: 'Responsable Logistique', department: 'Operations', salary: 2_000_000, status: 'active', hireDate: '2023-09-15', avatar: 'OT' },
];

const statusConf: Record<EmployeeStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  inactive: { label: 'Inactif', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  leave: { label: 'En congé', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
};

const payrollByDept = [
  { dept: 'Finance', amount: 6.7 },
  { dept: 'IT', amount: 11.6 },
  { dept: 'Marketing', amount: 5.0 },
  { dept: 'Operations', amount: 5.5 },
  { dept: 'RH', amount: 4.5 },
];

const payrollHistory = [
  { month: 'Janvier 2024', count: 12, total: 33_300_000, status: 'paid' },
  { month: 'Février 2024', count: 12, total: 33_300_000, status: 'paid' },
  { month: 'Mars 2024', count: 12, total: 33_300_000, status: 'paid' },
  { month: 'Avril 2024', count: 11, total: 31_800_000, status: 'pending' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

export default function EmployeesPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('Tous');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Employee | null>(null);
  const [tab, setTab] = useState<'employees' | 'payroll'>('employees');

  const filtered = useMemo(() => EMPLOYEES.filter(e => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = dept === 'Tous' || e.department === dept;
    return matchSearch && matchDept;
  }), [search, dept]);

  const totalPayroll = EMPLOYEES.filter(e => e.status === 'active').reduce((s, e) => s + e.salary, 0);

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Gestion des Employés</h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>{EMPLOYEES.length} employés · Masse salariale: {fmt(totalPayroll)}/mois</p>
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Ajouter Employé
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: '#0D1117', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['employees', 'payroll'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', borderRadius: '8px', background: tab === t ? '#1F2937' : 'transparent', color: tab === t ? '#F3F4F6' : '#6B7280', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            {t === 'employees' ? 'Employés' : 'Paie'}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <>
          {/* Filters */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, email..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
            </div>
            <select value={dept} onChange={e => setDept(e.target.value)} style={{ padding: '10px 16px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none', cursor: 'pointer' }}>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <div style={{ display: 'flex', gap: '4px', background: '#0D1117', borderRadius: '8px', padding: '4px', border: '1px solid #1F2937' }}>
              <button onClick={() => setView('grid')} style={{ padding: '6px 10px', borderRadius: '6px', background: view === 'grid' ? '#1F2937' : 'transparent', border: 'none', color: view === 'grid' ? '#F3F4F6' : '#6B7280', cursor: 'pointer' }}><Grid size={16} /></button>
              <button onClick={() => setView('list')} style={{ padding: '6px 10px', borderRadius: '6px', background: view === 'list' ? '#1F2937' : 'transparent', border: 'none', color: view === 'list' ? '#F3F4F6' : '#6B7280', cursor: 'pointer' }}><List size={16} /></button>
            </div>
          </div>

          {/* Grid View */}
          {view === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {filtered.map(emp => (
                <div key={emp.id} onClick={() => setShowDetail(emp)} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5" style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: DEPT_COLORS[emp.department] || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px' }}>{emp.avatar}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '15px' }}>{emp.name}</p>
                      <p style={{ color: '#9CA3AF', fontSize: '12px' }}>{emp.position}</p>
                    </div>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusConf[emp.status].color }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}><Building2 size={14} /> <span style={{ color: DEPT_COLORS[emp.department], fontWeight: 600 }}>{emp.department}</span></div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}><Mail size={14} /> {emp.email}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#6B7280' }}><DollarSign size={14} /> <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{fmt(emp.salary)}/mois</span></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #1F2937' }}>
                    <span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[emp.status].bg, color: statusConf[emp.status].color, fontSize: '11px', fontWeight: 600 }}>{statusConf[emp.status].label}</span>
                    <span style={{ fontSize: '11px', color: '#6B7280' }}>Depuis {emp.hireDate}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Employé', 'Poste', 'Département', 'Email', 'Salaire', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => (
                    <tr key={emp.id} onClick={() => setShowDetail(emp)} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)', cursor: 'pointer' }} className="hover:bg-white/[0.02]">
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: DEPT_COLORS[emp.department] || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '12px' }}>{emp.avatar}</div>
                          <span style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '13px' }}>{emp.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '13px' }}>{emp.position}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: `${DEPT_COLORS[emp.department]}20`, color: DEPT_COLORS[emp.department], fontSize: '12px', fontWeight: 600 }}>{emp.department}</span></td>
                      <td style={{ padding: '12px 16px', color: '#6B7280', fontSize: '13px' }}>{emp.email}</td>
                      <td style={{ padding: '12px 16px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(emp.salary)}</td>
                      <td style={{ padding: '12px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[emp.status].bg, color: statusConf[emp.status].color, fontSize: '11px', fontWeight: 600 }}>{statusConf[emp.status].label}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'payroll' && (
        <>
          {/* Payroll Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Masse Salariale Mensuelle', value: fmt(totalPayroll), color: '#6366f1' },
              { label: 'Employés Actifs', value: EMPLOYEES.filter(e => e.status === 'active').length.toString(), color: '#34d399' },
              { label: 'Salaire Moyen', value: fmt(Math.round(totalPayroll / EMPLOYEES.filter(e => e.status === 'active').length)), color: '#22d3ee' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: s.color }} />
                <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}>{s.label}</p>
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6', marginTop: '8px' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Payroll Chart */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl" style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6', marginBottom: '20px' }}>Répartition par Département (M XAF)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={payrollByDept}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                <XAxis dataKey="dept" tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <YAxis tick={{ fill: '#9CA3AF', fontSize: 12 }} axisLine={{ stroke: '#1F2937' }} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payroll History */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '20px', borderBottom: '1px solid #1F2937' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Historique de Paie</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1F2937' }}>
                  {['Mois', 'Employés', 'Montant Total', 'Statut'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollHistory.map((ph, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }} className="hover:bg-white/[0.02]">
                    <td style={{ padding: '14px 20px', color: '#F3F4F6', fontWeight: 600, fontSize: '13px' }}>{ph.month}</td>
                    <td style={{ padding: '14px 20px', color: '#9CA3AF', fontSize: '13px' }}>{ph.count} employés</td>
                    <td style={{ padding: '14px 20px', color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{fmt(ph.total)}</td>
                    <td style={{ padding: '14px 20px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: ph.status === 'paid' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: ph.status === 'paid' ? '#34d399' : '#fbbf24', fontSize: '11px', fontWeight: 600 }}>{ph.status === 'paid' ? 'Payé' : 'En attente'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Employee Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAdd(false)} />
          <div style={{ position: 'relative', width: '600px', maxHeight: '85vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>Nouvel Employé</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { l: 'Nom complet', p: 'Jean-Pierre Mbarga' }, { l: 'Email', p: 'jp@pimpay.com' },
                { l: 'Téléphone', p: '+237 6 XX XX XX XX' }, { l: 'Poste', p: 'Développeur Senior' },
                { l: 'Département', p: 'IT', type: 'select' }, { l: 'Date d\'embauche', p: '', type: 'date' },
                { l: 'Salaire (XAF)', p: '3 000 000' }, { l: 'Banque', p: 'BGFI Bank' },
              ].map(f => (
                <div key={f.l}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>{f.l}</label>
                  {f.type === 'select' ? (
                    <select style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }}>
                      {DEPARTMENTS.filter(d => d !== 'Tous').map(d => <option key={d}>{d}</option>)}
                    </select>
                  ) : (
                    <input type={f.type || 'text'} placeholder={f.p} style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
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

      {/* Employee Detail Modal */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(null)} />
          <div style={{ position: 'relative', width: '550px', maxHeight: '80vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <button onClick={() => setShowDetail(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: DEPT_COLORS[showDetail.department] || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '22px' }}>{showDetail.avatar}</div>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>{showDetail.name}</h2>
                <p style={{ color: '#9CA3AF', fontSize: '14px' }}>{showDetail.position}</p>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[showDetail.status].bg, color: statusConf[showDetail.status].color, fontSize: '11px', fontWeight: 600 }}>{statusConf[showDetail.status].label}</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {[
                { icon: Mail, label: 'Email', value: showDetail.email },
                { icon: Phone, label: 'Téléphone', value: showDetail.phone },
                { icon: Building2, label: 'Département', value: showDetail.department },
                { icon: Calendar, label: 'Date d\'embauche', value: showDetail.hireDate },
                { icon: DollarSign, label: 'Salaire', value: fmt(showDetail.salary) + '/mois' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <f.icon size={16} style={{ color: '#6B7280', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '11px', color: '#6B7280' }}>{f.label}</p>
                    <p style={{ fontSize: '13px', color: '#F3F4F6', fontWeight: 500 }}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
