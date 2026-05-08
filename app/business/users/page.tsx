'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  UserCog, Plus, Search, Shield, Briefcase, Calculator, X,
  Edit3, Trash2, Ban, CheckCircle, Clock, AlertTriangle, Mail,
  Lock, Activity, LogIn, FileText, Settings, CreditCard, Users,
  Building2, BarChart3, Truck, Loader2,
} from 'lucide-react';

type Role = 'admin' | 'manager' | 'accountant' | 'employee';
type UserStatus = 'active' | 'suspended' | 'pending';

interface UserAccount {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: Role;
  department: string;
  lastLogin: string;
  status: UserStatus;
  avatar: string;
  salary?: number;
}

interface ActivityLog {
  id: number;
  user: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: React.ElementType;
  color: string;
}

// Default activities for display when no real data
const DEFAULT_ACTIVITIES: ActivityLog[] = [
  { id: 1, user: 'Systeme', action: 'Page chargee', detail: 'Gestion des utilisateurs', timestamp: 'Maintenant', icon: LogIn, color: '#6366f1' },
];

const roleConf: Record<Role, { label: string; color: string; bg: string; icon: React.ElementType; desc: string }> = {
  admin: { label: 'Administrateur', color: '#C8A961', bg: 'rgba(200,169,97,0.15)', icon: Shield, desc: 'Acces complet — toutes les fonctionnalites' },
  manager: { label: 'Manager', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: Briefcase, desc: 'Acces operations — gestion courante' },
  accountant: { label: 'Comptable', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', icon: Calculator, desc: 'Acces financier — factures et rapports' },
  employee: { label: 'Employe', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)', icon: Users, desc: 'Acces basique — fonctions limitees' },
};

const statusConf: Record<UserStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  suspended: { label: 'Suspendu', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  pending: { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
};

const PERMISSIONS = [
  { feature: 'Dashboard', icon: Activity, admin: true, manager: true, accountant: true, employee: true },
  { feature: 'Factures', icon: FileText, admin: true, manager: true, accountant: true, employee: false },
  { feature: 'Paiements', icon: CreditCard, admin: true, manager: true, accountant: true, employee: false },
  { feature: 'Employes', icon: Users, admin: true, manager: true, accountant: false, employee: false },
  { feature: 'Fournisseurs', icon: Truck, admin: true, manager: true, accountant: false, employee: false },
  { feature: 'Rapports', icon: BarChart3, admin: true, manager: true, accountant: true, employee: false },
  { feature: 'Utilisateurs', icon: UserCog, admin: true, manager: false, accountant: false, employee: false },
  { feature: 'Parametres', icon: Settings, admin: true, manager: false, accountant: false, employee: false },
  { feature: 'Banque', icon: Building2, admin: true, manager: false, accountant: true, employee: false },
];

const fetcher = async (url: string) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error('Erreur de chargement');
  return res.json();
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showPerms, setShowPerms] = useState(true);
  const [showDetail, setShowDetail] = useState<UserAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state for invite modal
  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: 'employee',
    department: 'Operations',
  });

  // Fetch users from API
  const { data, error, isLoading, mutate } = useSWR('/api/business/users', fetcher);

  const users: UserAccount[] = data?.data?.users || [];
  const stats = data?.data?.stats || { totalUsers: 0, roleCounts: { admin: 0, manager: 0, accountant: 0 }, statusCounts: { active: 0, suspended: 0 } };

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const roleCounts = {
    admin: stats.roleCounts?.admin || 0,
    manager: stats.roleCounts?.manager || 0,
    accountant: stats.roleCounts?.accountant || 0,
  };

  // Handle invite new user
  const handleInviteUser = async () => {
    if (!inviteForm.firstName || !inviteForm.lastName) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/business/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          firstName: inviteForm.firstName,
          lastName: inviteForm.lastName,
          email: inviteForm.email,
          phone: inviteForm.phone,
          position: inviteForm.position,
        }),
      });

      const result = await res.json();
      
      if (res.ok) {
        setShowInvite(false);
        setInviteForm({ firstName: '', lastName: '', email: '', phone: '', position: 'employee', department: 'Operations' });
        mutate();
      } else {
        setErrorMessage(result.error || 'Erreur lors de la creation');
      }
    } catch (err) {
      console.error('Error creating user:', err);
      setErrorMessage('Erreur de connexion au serveur');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle suspend/activate user
  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      await fetch('/api/business/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          userId,
          status: currentStatus === 'active' ? 'suspended' : 'active',
        }),
      });
      mutate();
      setShowDetail(null);
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  // Handle delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Etes-vous sur de vouloir supprimer cet utilisateur ?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      await fetch(`/api/business/users?id=${userId}`, {
        method: 'DELETE',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      mutate();
    } catch (err) {
      console.error('Error deleting user:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-[#C8A961]" />
          <p className="text-gray-400">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <p className="text-gray-400">Erreur lors du chargement des utilisateurs</p>
          <button 
            onClick={() => mutate()} 
            className="px-4 py-2 rounded-lg bg-[#C8A961] text-[#0A0E17] font-semibold text-sm"
          >
            Reessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-100 tracking-tight">Gestion des Utilisateurs</h1>
          <p className="text-gray-400 text-sm mt-1">{stats.totalUsers} utilisateurs · 4 roles configures</p>
        </div>
        <button 
          onClick={() => setShowInvite(true)} 
          className="flex items-center gap-2 bg-gradient-to-r from-[#C8A961] to-[#8B6914] text-[#0A0E17] px-5 py-2.5 rounded-xl font-bold text-sm"
        >
          <Plus size={18} /> Inviter Utilisateur
        </button>
      </div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['admin', 'manager', 'accountant'] as const).map((key) => {
          const r = roleConf[key];
          return (
            <div 
              key={key} 
              className="relative rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: r.color }} />
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-11 h-11 rounded-lg flex items-center justify-center"
                  style={{ background: r.bg }}
                >
                  <r.icon size={22} style={{ color: r.color }} />
                </div>
                <div>
                  <p className="text-gray-100 font-bold text-base">{r.label}</p>
                  <p className="text-gray-500 text-xs">{roleCounts[key]} utilisateur(s)</p>
                </div>
              </div>
              <p className="text-gray-400 text-xs">{r.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Permissions Matrix */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl overflow-hidden">
        <button 
          onClick={() => setShowPerms(!showPerms)} 
          className="w-full px-5 py-4 flex justify-between items-center bg-transparent border-0 cursor-pointer"
        >
          <span className="text-gray-100 font-bold text-sm">Matrice des Permissions</span>
          <span className="text-gray-500 text-sm">{showPerms ? '▼' : '▶'}</span>
        </button>
        {showPerms && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-t border-b border-gray-800">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase text-gray-400">Fonctionnalite</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-[#C8A961]">Admin</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-[#6366f1]">Manager</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase text-[#22d3ee]">Comptable</th>
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map(p => (
                  <tr key={p.feature} className="border-b border-gray-800/50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <p.icon size={16} className="text-gray-500" />
                        <span className="text-gray-100 text-sm font-medium">{p.feature}</span>
                      </div>
                    </td>
                    {[p.admin, p.manager, p.accountant].map((allowed, i) => (
                      <td key={i} className="px-5 py-3 text-center">
                        {allowed ? (
                          <CheckCircle size={18} className="text-emerald-400 mx-auto" />
                        ) : (
                          <X size={18} className="text-gray-700 mx-auto" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Filter */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            placeholder="Rechercher par nom, email..." 
            className="w-full py-2.5 pl-10 pr-4 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-sm outline-none focus:border-[#C8A961]/50 transition-colors"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-800">
                {['Utilisateur', 'Email', 'Role', 'Departement', 'Derniere connexion', 'Statut', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    {search ? 'Aucun utilisateur trouve' : 'Aucun utilisateur enregistre'}
                  </td>
                </tr>
              ) : (
                filtered.map(u => {
                  const rc = roleConf[u.role] || roleConf.employee;
                  const sc = statusConf[u.status] || statusConf.active;
                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => setShowDetail(u)} 
                      className="border-b border-gray-800/50 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs"
                            style={{ background: rc.bg, color: rc.color }}
                          >
                            {u.avatar}
                          </div>
                          <span className="text-gray-100 font-semibold text-sm">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-sm">{u.email || '—'}</td>
                      <td className="px-4 py-3.5">
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: rc.bg, color: rc.color }}
                        >
                          <rc.icon size={12} /> {rc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-400 text-sm">{u.department}</td>
                      <td className="px-4 py-3.5 text-gray-500 text-sm">
                        {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3.5">
                        <span 
                          className="px-2 py-0.5 rounded text-xs font-semibold"
                          style={{ background: sc.bg, color: sc.color }}
                        >
                          {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="flex gap-1.5">
                          <button 
                            title="Modifier" 
                            onClick={() => setShowDetail(u)}
                            className="w-8 h-8 rounded-md bg-[#0D1117] border border-gray-800 flex items-center justify-center text-gray-400 hover:border-white/20 hover:text-white transition-colors"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button 
                            title={u.status === 'active' ? 'Suspendre' : 'Activer'}
                            onClick={() => handleToggleStatus(u.id, u.status)}
                            className="w-8 h-8 rounded-md bg-[#0D1117] border border-gray-800 flex items-center justify-center text-gray-400 hover:border-white/20 hover:text-white transition-colors"
                          >
                            <Ban size={14} />
                          </button>
                          <button 
                            title="Supprimer"
                            onClick={() => handleDeleteUser(u.id)}
                            className="w-8 h-8 rounded-md bg-[#0D1117] border border-gray-800 flex items-center justify-center text-gray-400 hover:border-red-500/50 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={14} />
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
      </div>

      {/* Activity Log */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h3 className="text-sm font-bold text-gray-100">Journal d&apos;Activite</h3>
        </div>
        <div className="p-4">
          {DEFAULT_ACTIVITIES.map(a => (
            <div key={a.id} className="flex items-start gap-3.5 py-3 border-b border-gray-800/30 last:border-0">
              <div 
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: `${a.color}15` }}
              >
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                  <p className="text-gray-100 text-sm font-semibold truncate">{a.user} — {a.action}</p>
                  <span className="text-gray-500 text-xs flex-shrink-0">{a.timestamp}</span>
                </div>
                <p className="text-gray-400 text-xs mt-0.5">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setShowInvite(false)} 
          />
          <div className="relative w-full max-w-md mx-4 bg-[#111827] border border-gray-800 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-100">Inviter un Utilisateur</h2>
              <button 
                onClick={() => { setShowInvite(false); setErrorMessage(null); }} 
                className="bg-transparent border-0 text-gray-500 hover:text-white cursor-pointer transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {errorMessage}
                </p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Prenom</label>
                  <input 
                    value={inviteForm.firstName}
                    onChange={e => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                    placeholder="Jean"
                    className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-sm outline-none focus:border-[#C8A961]/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 block mb-1.5">Nom</label>
                  <input 
                    value={inviteForm.lastName}
                    onChange={e => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                    placeholder="Dupont"
                    className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-sm outline-none focus:border-[#C8A961]/50"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Adresse email</label>
                <input 
                  value={inviteForm.email}
                  onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                  placeholder="utilisateur@entreprise.com"
                  className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-sm outline-none focus:border-[#C8A961]/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Telephone</label>
                <input 
                  value={inviteForm.phone}
                  onChange={e => setInviteForm({ ...inviteForm, phone: e.target.value })}
                  placeholder="+242 00 000 0000"
                  className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-sm outline-none focus:border-[#C8A961]/50"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['admin', 'manager', 'accountant'] as const).map((key) => {
                    const r = roleConf[key];
                    const isSelected = inviteForm.position === key;
                    return (
                      <button 
                        key={key} 
                        type="button"
                        onClick={() => setInviteForm({ ...inviteForm, position: key })}
                        className="p-3 rounded-lg text-center cursor-pointer transition-all border-2"
                        style={{ 
                          background: r.bg, 
                          borderColor: isSelected ? r.color : 'transparent'
                        }}
                      >
                        <r.icon size={20} style={{ color: r.color }} className="mx-auto mb-1.5" />
                        <p style={{ color: r.color }} className="text-xs font-semibold">{r.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1.5">Departement</label>
                <select 
                  value={inviteForm.department}
                  onChange={e => setInviteForm({ ...inviteForm, department: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#0D1117] border border-gray-800 rounded-lg text-gray-100 text-sm outline-none focus:border-[#C8A961]/50"
                >
                  <option>Direction</option>
                  <option>Finance</option>
                  <option>IT</option>
                  <option>Marketing</option>
                  <option>Operations</option>
                  <option>RH</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button 
                onClick={() => setShowInvite(false)} 
                className="px-5 py-2.5 rounded-lg bg-gray-800 text-gray-400 text-sm font-semibold hover:bg-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={handleInviteUser}
                disabled={isSubmitting || !inviteForm.firstName || !inviteForm.lastName}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#C8A961] to-[#8B6914] text-[#0A0E17] text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Envoyer l&apos;invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setShowDetail(null)} 
          />
          <div className="relative w-full max-w-md mx-4 bg-[#111827] border border-gray-800 rounded-2xl p-8">
            <button 
              onClick={() => setShowDetail(null)} 
              className="absolute top-4 right-4 bg-transparent border-0 text-gray-500 hover:text-white cursor-pointer transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4 mb-5">
              <div 
                className="w-14 h-14 rounded-xl flex items-center justify-center font-extrabold text-lg"
                style={{ 
                  background: roleConf[showDetail.role]?.bg || roleConf.employee.bg, 
                  color: roleConf[showDetail.role]?.color || roleConf.employee.color 
                }}
              >
                {showDetail.avatar}
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-100">{showDetail.name}</h2>
                <p className="text-gray-500 text-sm">{showDetail.email || 'Pas d\'email'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-2.5 bg-[#0D1117] rounded-lg">
                <p className="text-xs text-gray-500">Role</p>
                <span 
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold mt-1"
                  style={{ 
                    background: roleConf[showDetail.role]?.bg || roleConf.employee.bg, 
                    color: roleConf[showDetail.role]?.color || roleConf.employee.color 
                  }}
                >
                  {React.createElement(roleConf[showDetail.role]?.icon || Users, { size: 12 })} 
                  {roleConf[showDetail.role]?.label || 'Employe'}
                </span>
              </div>
              <div className="p-2.5 bg-[#0D1117] rounded-lg">
                <p className="text-xs text-gray-500">Statut</p>
                <span 
                  className="inline-block px-2 py-0.5 rounded text-xs font-semibold mt-1"
                  style={{ 
                    background: statusConf[showDetail.status]?.bg || statusConf.active.bg, 
                    color: statusConf[showDetail.status]?.color || statusConf.active.color 
                  }}
                >
                  {statusConf[showDetail.status]?.label || 'Actif'}
                </span>
              </div>
              <div className="p-2.5 bg-[#0D1117] rounded-lg">
                <p className="text-xs text-gray-500">Departement</p>
                <p className="text-gray-100 text-sm font-medium mt-1">{showDetail.department}</p>
              </div>
              <div className="p-2.5 bg-[#0D1117] rounded-lg">
                <p className="text-xs text-gray-500">Derniere connexion</p>
                <p className="text-gray-100 text-sm font-medium mt-1">
                  {showDetail.lastLogin ? new Date(showDetail.lastLogin).toLocaleDateString('fr-FR') : '—'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button className="flex-1 px-3 py-2.5 rounded-lg bg-[#0D1117] border border-gray-800 text-gray-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:border-white/20 hover:text-white transition-colors">
                <Lock size={14} /> Reset mot de passe
              </button>
              <button 
                onClick={() => handleToggleStatus(showDetail.id, showDetail.status)}
                className="flex-1 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-red-500/20 transition-colors"
              >
                <Ban size={14} /> {showDetail.status === 'active' ? 'Suspendre' : 'Activer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
