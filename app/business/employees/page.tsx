'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Users, Plus, Search, Grid, List, X, Mail, Phone,
  Building2, Calendar, DollarSign, CheckCircle, Clock, XCircle,
  Loader2, RefreshCw, CreditCard, CheckSquare, Square, AlertCircle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';

type EmployeeStatus = 'active' | 'inactive' | 'leave';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  department?: string;
  salary: number | null;
  isActive: boolean;
  createdAt: string;
  avatar: string | null;
  userId: string | null;
}

interface PayrollHistory {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: string;
}

const DEPARTMENTS = ['Tous', 'Finance', 'IT', 'Marketing', 'Operations', 'RH', 'Autre'];
const DEPT_COLORS: Record<string, string> = { 
  Finance: '#6366f1', 
  IT: '#22d3ee', 
  Marketing: '#a78bfa', 
  Operations: '#34d399', 
  RH: '#f59e0b',
  Autre: '#64748b'
};

const statusConf: Record<string, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  inactive: { label: 'Inactif', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  leave: { label: 'En conge', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
};

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' USD';

export default function EmployeesPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('Tous');
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<Employee | null>(null);
  const [tab, setTab] = useState<'employees' | 'payroll'>('employees');
  
  // Real data states
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [payrollHistory, setPayrollHistory] = useState<PayrollHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, active: 0, totalSalary: 0 });
  
  // Group payment states
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Add employee form state
  const [addForm, setAddForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: '',
    department: 'Autre',
    salary: '',
  });
  const [addingEmployee, setAddingEmployee] = useState(false);

  // Fetch employees data
  const fetchEmployees = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      else setRefreshing(true);
      
      const token = localStorage.getItem('pimpay_token');
      const res = await fetch('/api/business/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erreur chargement');
      
      const data = await res.json();
      if (data.success) {
        setEmployees(data.data.employees || []);
        setStats(data.data.stats || { total: 0, active: 0, totalSalary: 0 });
      }
    } catch (error) {
      console.error('Fetch employees error:', error);
      toast.error('Erreur lors du chargement des employes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch payroll history
  const fetchPayrollHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('pimpay_token');
      const res = await fetch('/api/business/payroll', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Erreur chargement');
      
      const data = await res.json();
      if (data.success) {
        setPayrollHistory(data.data.payrollHistory || []);
      }
    } catch (error) {
      console.error('Fetch payroll error:', error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchPayrollHistory();
  }, [fetchEmployees, fetchPayrollHistory]);

  // Filter employees
  const filtered = useMemo(() => employees.filter(e => {
    const name = `${e.firstName} ${e.lastName}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase()) || 
                       (e.email?.toLowerCase().includes(search.toLowerCase()) ?? false);
    const empDept = e.department || 'Autre';
    const matchDept = dept === 'Tous' || empDept === dept;
    return matchSearch && matchDept;
  }), [search, dept, employees]);

  // Active employees for payment
  const activeEmployees = useMemo(() => 
    employees.filter(e => e.isActive), [employees]);

  // Calculate totals for payroll
  const totalPayroll = useMemo(() => 
    activeEmployees.reduce((s, e) => s + (e.salary || 0), 0), [activeEmployees]);

  const averageSalary = useMemo(() => 
    activeEmployees.length > 0 ? Math.round(totalPayroll / activeEmployees.length) : 0, 
    [totalPayroll, activeEmployees.length]);

  // Calculate payroll by department
  const payrollByDept = useMemo(() => {
    const deptTotals: Record<string, number> = {};
    activeEmployees.forEach(emp => {
      const d = emp.department || 'Autre';
      deptTotals[d] = (deptTotals[d] || 0) + (emp.salary || 0);
    });
    return Object.entries(deptTotals).map(([dept, amount]) => ({ 
      dept, 
      amount: amount / 1000000 
    }));
  }, [activeEmployees]);

  // Get employee initials
  const getInitials = (emp: Employee) => {
    if (emp.avatar) return emp.avatar;
    return `${emp.firstName?.[0] || ''}${emp.lastName?.[0] || ''}`.toUpperCase() || 'U';
  };

  // Get employee status
  const getStatus = (emp: Employee): EmployeeStatus => {
    return emp.isActive ? 'active' : 'inactive';
  };

  // Toggle employee selection
  const toggleEmployeeSelection = (empId: string) => {
    setSelectedEmployees(prev => {
      const newSet = new Set(prev);
      if (newSet.has(empId)) {
        newSet.delete(empId);
      } else {
        newSet.add(empId);
      }
      return newSet;
    });
  };

  // Select all active employees
  const selectAllActive = () => {
    const activeIds = activeEmployees.map(e => e.id);
    setSelectedEmployees(new Set(activeIds));
  };

  // Deselect all
  const deselectAll = () => {
    setSelectedEmployees(new Set());
  };

  // Calculate selected total
  const selectedTotal = useMemo(() => {
    return employees
      .filter(e => selectedEmployees.has(e.id))
      .reduce((sum, e) => sum + (e.salary || 0), 0);
  }, [employees, selectedEmployees]);

  // Process group payment
  const processGroupPayment = async () => {
    if (selectedEmployees.size === 0) {
      toast.error('Selectionnez au moins un employe');
      return;
    }

    try {
      setProcessingPayment(true);
      const token = localStorage.getItem('pimpay_token');
      
      const res = await fetch('/api/business/payroll', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          employeeIds: Array.from(selectedEmployees),
          description: `Paiement salaires - ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erreur paiement');
      }

      toast.success(`Paiement effectue: ${data.data.successCount} employe(s) paye(s)`);
      if (data.data.pendingCount > 0) {
        toast.info(`${data.data.pendingCount} paiement(s) en attente (employes non lies)`);
      }
      
      setShowPaymentModal(false);
      setSelectedEmployees(new Set());
      fetchPayrollHistory();
      
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Erreur lors du paiement');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Add new employee
  const handleAddEmployee = async () => {
    if (!addForm.firstName || !addForm.lastName) {
      toast.error('Nom et prenom requis');
      return;
    }

    try {
      setAddingEmployee(true);
      const token = localStorage.getItem('pimpay_token');
      
      const res = await fetch('/api/business/employees', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          firstName: addForm.firstName,
          lastName: addForm.lastName,
          email: addForm.email || null,
          phone: addForm.phone || null,
          position: addForm.position || null,
          salary: addForm.salary ? parseFloat(addForm.salary) : null,
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Erreur ajout');
      }

      toast.success('Employe ajoute avec succes');
      setShowAdd(false);
      setAddForm({ firstName: '', lastName: '', email: '', phone: '', position: '', department: 'Autre', salary: '' });
      fetchEmployees(false);
      
    } catch (error: any) {
      console.error('Add employee error:', error);
      toast.error(error.message || 'Erreur lors de l\'ajout');
    } finally {
      setAddingEmployee(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Gestion des Employes</h1>
          <p style={{ color: '#9CA3AF', fontSize: '13px', marginTop: '4px' }}>
            {stats.total} employes - Masse salariale: {fmt(stats.totalSalary)}/mois
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => fetchEmployees(false)} 
            disabled={refreshing}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#1F2937', color: '#9CA3AF', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '13px', border: '1px solid #374151', cursor: 'pointer' }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} /> Actualiser
          </button>
          <button onClick={() => setShowAdd(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 16px', borderRadius: '10px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
            <Plus size={16} /> Ajouter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#0D1117', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['employees', 'payroll'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 18px', borderRadius: '8px', background: tab === t ? '#1F2937' : 'transparent', color: tab === t ? '#F3F4F6' : '#6B7280', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            {t === 'employees' ? 'Employes' : 'Paie'}
          </button>
        ))}
      </div>

      {tab === 'employees' && (
        <>
          {/* Selection Banner for Group Payment */}
          {selectedEmployees.size > 0 && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle size={20} style={{ color: '#34d399' }} />
                <span style={{ color: '#34d399', fontWeight: 600, fontSize: '14px' }}>
                  {selectedEmployees.size} employe(s) selectionne(s) - Total: {fmt(selectedTotal)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={deselectAll} style={{ padding: '8px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid #374151', color: '#9CA3AF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  Annuler
                </button>
                <button onClick={() => setShowPaymentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', border: 'none', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  <CreditCard size={14} /> Payer la selection
                </button>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl" style={{ display: 'flex', gap: '12px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
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
            <button onClick={selectAllActive} style={{ padding: '8px 14px', borderRadius: '8px', background: '#1F2937', border: '1px solid #374151', color: '#9CA3AF', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
              Tout selectionner
            </button>
          </div>

          {/* Empty State */}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-12 shadow-xl" style={{ textAlign: 'center' }}>
              <Users size={48} style={{ color: '#374151', margin: '0 auto 16px' }} />
              <h3 style={{ color: '#9CA3AF', fontSize: '16px', fontWeight: 600 }}>Aucun employe trouve</h3>
              <p style={{ color: '#6B7280', fontSize: '13px', marginTop: '8px' }}>
                {employees.length === 0 ? 'Ajoutez votre premier employe' : 'Modifiez vos filtres de recherche'}
              </p>
            </div>
          )}

          {/* Grid View */}
          {view === 'grid' && filtered.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
              {filtered.map(emp => {
                const status = getStatus(emp);
                const empDept = emp.department || 'Autre';
                const isSelected = selectedEmployees.has(emp.id);
                
                return (
                  <div 
                    key={emp.id} 
                    className={`rounded-2xl border ${isSelected ? 'border-emerald-500/50' : 'border-white/5'} bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl`}
                    style={{ cursor: 'pointer', position: 'relative' }}
                  >
                    {/* Selection checkbox */}
                    <button 
                      onClick={(e) => { e.stopPropagation(); toggleEmployeeSelection(emp.id); }}
                      style={{ position: 'absolute', top: '12px', right: '12px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                    >
                      {isSelected ? (
                        <CheckSquare size={20} style={{ color: '#34d399' }} />
                      ) : (
                        <Square size={20} style={{ color: '#4B5563' }} />
                      )}
                    </button>

                    <div onClick={() => setShowDetail(emp)} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: DEPT_COLORS[empDept] || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px' }}>
                        {getInitials(emp)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.firstName} {emp.lastName}
                        </p>
                        <p style={{ color: '#9CA3AF', fontSize: '11px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {emp.position || 'Non defini'}
                        </p>
                      </div>
                    </div>
                    
                    <div onClick={() => setShowDetail(emp)} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {emp.email && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6B7280' }}>
                          <Mail size={12} /> 
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.email}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#6B7280' }}>
                        <DollarSign size={12} /> 
                        <span style={{ color: '#F3F4F6', fontWeight: 600 }}>{fmt(emp.salary || 0)}/mois</span>
                      </div>
                      {emp.userId && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '10px', color: '#34d399' }}>
                          <CheckCircle size={10} /> Compte PimPay lie
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid #1F2937' }}>
                      <span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[status].bg, color: statusConf[status].color, fontSize: '10px', fontWeight: 600 }}>
                        {statusConf[status].label}
                      </span>
                      <span style={{ fontSize: '10px', color: '#6B7280' }}>
                        Depuis {new Date(emp.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* List View */}
          {view === 'list' && filtered.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left', width: '40px' }}></th>
                    {['Employe', 'Poste', 'Email', 'Salaire', 'Statut', 'Lie'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(emp => {
                    const status = getStatus(emp);
                    const empDept = emp.department || 'Autre';
                    const isSelected = selectedEmployees.has(emp.id);
                    
                    return (
                      <tr 
                        key={emp.id} 
                        style={{ borderBottom: '1px solid rgba(31,41,55,0.5)', cursor: 'pointer', background: isSelected ? 'rgba(52,211,153,0.05)' : 'transparent' }} 
                        className="hover:bg-white/[0.02]"
                      >
                        <td style={{ padding: '10px 14px' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleEmployeeSelection(emp.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                          >
                            {isSelected ? (
                              <CheckSquare size={18} style={{ color: '#34d399' }} />
                            ) : (
                              <Square size={18} style={{ color: '#4B5563' }} />
                            )}
                          </button>
                        </td>
                        <td style={{ padding: '10px 14px' }} onClick={() => setShowDetail(emp)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: DEPT_COLORS[empDept] || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '11px' }}>
                              {getInitials(emp)}
                            </div>
                            <span style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '13px' }}>
                              {emp.firstName} {emp.lastName}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#9CA3AF', fontSize: '12px' }} onClick={() => setShowDetail(emp)}>
                          {emp.position || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B7280', fontSize: '12px' }} onClick={() => setShowDetail(emp)}>
                          {emp.email || '-'}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#F3F4F6', fontSize: '12px', fontWeight: 600 }} onClick={() => setShowDetail(emp)}>
                          {fmt(emp.salary || 0)}
                        </td>
                        <td style={{ padding: '10px 14px' }} onClick={() => setShowDetail(emp)}>
                          <span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[status].bg, color: statusConf[status].color, fontSize: '10px', fontWeight: 600 }}>
                            {statusConf[status].label}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px' }} onClick={() => setShowDetail(emp)}>
                          {emp.userId ? (
                            <CheckCircle size={16} style={{ color: '#34d399' }} />
                          ) : (
                            <XCircle size={16} style={{ color: '#6B7280' }} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {tab === 'payroll' && (
        <>
          {/* Payroll Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {[
              { label: 'Masse Salariale Mensuelle', value: fmt(totalPayroll), color: '#6366f1' },
              { label: 'Employes Actifs', value: stats.active.toString(), color: '#34d399' },
              { label: 'Salaire Moyen', value: fmt(averageSalary), color: '#22d3ee' },
            ].map((s, i) => (
              <div key={i} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: s.color }} />
                <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', color: '#9CA3AF' }}>{s.label}</p>
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#F3F4F6', marginTop: '8px' }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Quick Pay All Button */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl mb-5">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Paiement Rapide</h3>
                <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '4px' }}>
                  Payer tous les {stats.active} employes actifs pour un total de {fmt(totalPayroll)}
                </p>
              </div>
              <button 
                onClick={() => { selectAllActive(); setShowPaymentModal(true); }}
                disabled={stats.active === 0}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', borderRadius: '10px', background: stats.active > 0 ? 'linear-gradient(135deg, #34d399 0%, #059669 100%)' : '#374151', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: stats.active > 0 ? 'pointer' : 'not-allowed' }}
              >
                <CreditCard size={18} /> Payer Tous les Salaires
              </button>
            </div>
          </div>

          {/* Payroll Chart */}
          {payrollByDept.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6', marginBottom: '16px' }}>Repartition par Departement (M USD)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={payrollByDept}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                  <XAxis dataKey="dept" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#1F2937' }} />
                  <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={{ stroke: '#1F2937' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6' }} />
                  <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payroll History */}
          <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F2937' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#F3F4F6' }}>Historique des Paiements</h3>
            </div>
            {payrollHistory.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Clock size={32} style={{ color: '#374151', margin: '0 auto 12px' }} />
                <p style={{ color: '#6B7280', fontSize: '13px' }}>Aucun paiement effectue</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #1F2937' }}>
                    {['Reference', 'Description', 'Montant', 'Date', 'Statut'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payrollHistory.map((ph) => (
                    <tr key={ph.id} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }} className="hover:bg-white/[0.02]">
                      <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '12px', fontFamily: 'monospace' }}>{ph.reference}</td>
                      <td style={{ padding: '12px 16px', color: '#F3F4F6', fontSize: '12px' }}>{ph.description || 'Paiement salaire'}</td>
                      <td style={{ padding: '12px 16px', color: '#F3F4F6', fontSize: '12px', fontWeight: 600 }}>{fmt(ph.amount)}</td>
                      <td style={{ padding: '12px 16px', color: '#9CA3AF', fontSize: '12px' }}>{new Date(ph.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: '4px', background: ph.status === 'SUCCESS' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: ph.status === 'SUCCESS' ? '#34d399' : '#fbbf24', fontSize: '10px', fontWeight: 600 }}>
                          {ph.status === 'SUCCESS' ? 'Paye' : 'En attente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Add Employee Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowAdd(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6' }}>Nouvel Employe</h2>
              <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Prenom *</label>
                <input 
                  value={addForm.firstName} 
                  onChange={e => setAddForm(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="Jean" 
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Nom *</label>
                <input 
                  value={addForm.lastName} 
                  onChange={e => setAddForm(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Dupont" 
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Email</label>
                <input 
                  type="email"
                  value={addForm.email} 
                  onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="jean@email.com" 
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Telephone</label>
                <input 
                  value={addForm.phone} 
                  onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))}
                  placeholder="+237 6 XX XX XX XX" 
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Poste</label>
                <input 
                  value={addForm.position} 
                  onChange={e => setAddForm(p => ({ ...p, position: e.target.value }))}
                  placeholder="Developpeur" 
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Salaire (USD)</label>
                <input 
                  type="number"
                  value={addForm.salary} 
                  onChange={e => setAddForm(p => ({ ...p, salary: e.target.value }))}
                  placeholder="3000" 
                  style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} 
                />
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '12px' }}>
              <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
              L&apos;employe sera automatiquement lie a son compte PimPay s&apos;il existe (via email ou telephone)
            </p>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAdd(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: '#1F2937', border: 'none', color: '#9CA3AF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button 
                onClick={handleAddEmployee}
                disabled={addingEmployee}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', border: 'none', color: '#0A0E17', fontSize: '13px', fontWeight: 700, cursor: addingEmployee ? 'wait' : 'pointer' }}
              >
                {addingEmployee && <Loader2 size={14} className="animate-spin" />}
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(null)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '24px' }}>
            <button onClick={() => setShowDetail(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: DEPT_COLORS[showDetail.department || 'Autre'] || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '20px' }}>
                {getInitials(showDetail)}
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6' }}>{showDetail.firstName} {showDetail.lastName}</h2>
                <p style={{ color: '#9CA3AF', fontSize: '13px' }}>{showDetail.position || 'Poste non defini'}</p>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[getStatus(showDetail)].bg, color: statusConf[getStatus(showDetail)].color, fontSize: '10px', fontWeight: 600 }}>
                    {statusConf[getStatus(showDetail)].label}
                  </span>
                  {showDetail.userId && (
                    <span style={{ padding: '3px 8px', borderRadius: '4px', background: 'rgba(52,211,153,0.15)', color: '#34d399', fontSize: '10px', fontWeight: 600 }}>
                      Compte lie
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
              {[
                { icon: Mail, label: 'Email', value: showDetail.email || 'Non renseigne' },
                { icon: Phone, label: 'Telephone', value: showDetail.phone || 'Non renseigne' },
                { icon: Calendar, label: 'Date d\'ajout', value: new Date(showDetail.createdAt).toLocaleDateString('fr-FR') },
                { icon: DollarSign, label: 'Salaire', value: fmt(showDetail.salary || 0) + '/mois' },
              ].map(f => (
                <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <f.icon size={14} style={{ color: '#6B7280', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '10px', color: '#6B7280' }}>{f.label}</p>
                    <p style={{ fontSize: '12px', color: '#F3F4F6', fontWeight: 500 }}>{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
            {showDetail.isActive && (
              <button 
                onClick={() => { toggleEmployeeSelection(showDetail.id); setShowDetail(null); setShowPaymentModal(true); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg, #34d399 0%, #059669 100%)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '12px' }}
              >
                <CreditCard size={16} /> Payer cet employe
              </button>
            )}
          </div>
        </div>
      )}

      {/* Group Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowPaymentModal(false)} />
          <div style={{ position: 'relative', width: '100%', maxWidth: '500px', maxHeight: '85vh', overflowY: 'auto', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6' }}>Confirmer le Paiement</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 mb-4">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                <CreditCard size={24} style={{ color: '#34d399' }} />
                <div>
                  <p style={{ fontSize: '12px', color: '#9CA3AF' }}>Montant Total</p>
                  <p style={{ fontSize: '24px', fontWeight: 800, color: '#34d399' }}>{fmt(selectedTotal)}</p>
                </div>
              </div>
              <p style={{ fontSize: '12px', color: '#9CA3AF' }}>
                {selectedEmployees.size} employe(s) selectionne(s)
              </p>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', marginBottom: '8px' }}>Employes a payer:</p>
              <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#0D1117', borderRadius: '10px', padding: '8px' }}>
                {employees.filter(e => selectedEmployees.has(e.id)).map(emp => (
                  <div key={emp.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid #1F2937' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '10px' }}>
                        {getInitials(emp)}
                      </div>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: '#F3F4F6' }}>{emp.firstName} {emp.lastName}</p>
                        <p style={{ fontSize: '10px', color: '#6B7280' }}>{emp.position || 'N/A'}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#F3F4F6' }}>{fmt(emp.salary || 0)}</p>
                      {emp.userId ? (
                        <span style={{ fontSize: '9px', color: '#34d399' }}>Compte lie</span>
                      ) : (
                        <span style={{ fontSize: '9px', color: '#fbbf24' }}>Non lie</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 mb-4">
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <AlertCircle size={16} style={{ color: '#fbbf24', flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '11px', color: '#fbbf24' }}>
                  Les employes non lies a un compte PimPay recevront un paiement en attente. 
                  Le montant sera credite automatiquement lorsqu&apos;ils lieront leur compte.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowPaymentModal(false)} style={{ padding: '10px 18px', borderRadius: '8px', background: '#1F2937', border: 'none', color: '#9CA3AF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                Annuler
              </button>
              <button 
                onClick={processGroupPayment}
                disabled={processingPayment}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', background: processingPayment ? '#374151' : 'linear-gradient(135deg, #34d399 0%, #059669 100%)', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: processingPayment ? 'wait' : 'pointer' }}
              >
                {processingPayment ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircle size={14} /> Confirmer le paiement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
