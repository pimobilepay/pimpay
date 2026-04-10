'use client';

import React, { useState } from 'react';
import {
  UserCog, Plus, Search, Shield, Briefcase, Calculator, X, Eye,
  Edit3, Trash2, Ban, CheckCircle, Clock, AlertTriangle, Mail,
  Lock, Activity, LogIn, FileText, Settings, CreditCard, Users,
  Building2, BarChart3, Truck,
} from 'lucide-react';

type Role = 'admin' | 'manager' | 'accountant';
type UserStatus = 'active' | 'suspended' | 'pending';
interface UserAccount {
  id: number; name: string; email: string; role: Role; department: string;
  lastLogin: string; status: UserStatus; avatar: string;
}
interface ActivityLog { id: number; user: string; action: string; detail: string; timestamp: string; icon: React.ElementType; color: string; }

const USERS: UserAccount[] = [
  { id: 1, name: 'Jean-Pierre Mbarga', email: 'jp.mbarga@pimpay.com', role: 'admin', department: 'Direction', lastLogin: '2024-04-10 14:23', status: 'active', avatar: 'JPM' },
  { id: 2, name: 'Marie-Claire Ngo', email: 'mc.ngo@pimpay.com', role: 'admin', department: 'IT', lastLogin: '2024-04-10 13:45', status: 'active', avatar: 'MCN' },
  { id: 3, name: 'Paul Essomba', email: 'p.essomba@pimpay.com', role: 'manager', department: 'Marketing', lastLogin: '2024-04-09 17:30', status: 'active', avatar: 'PE' },
  { id: 4, name: 'Sandrine Ateba', email: 's.ateba@pimpay.com', role: 'accountant', department: 'Finance', lastLogin: '2024-04-10 09:15', status: 'active', avatar: 'SA' },
  { id: 5, name: 'François Ekotto', email: 'f.ekotto@pimpay.com', role: 'manager', department: 'Operations', lastLogin: '2024-04-08 16:20', status: 'active', avatar: 'FE' },
  { id: 6, name: 'Aïcha Bello', email: 'a.bello@pimpay.com', role: 'manager', department: 'RH', lastLogin: '2024-04-10 11:00', status: 'active', avatar: 'AB' },
  { id: 7, name: 'Hervé Ngono', email: 'h.ngono@pimpay.com', role: 'accountant', department: 'Finance', lastLogin: '2024-04-07 14:50', status: 'suspended', avatar: 'HN' },
  { id: 8, name: 'David Fotso', email: 'd.fotso@pimpay.com', role: 'accountant', department: 'Finance', lastLogin: '', status: 'pending', avatar: 'DF' },
];

const ACTIVITIES: ActivityLog[] = [
  { id: 1, user: 'Jean-Pierre Mbarga', action: 'Connexion', detail: 'Connexion depuis Douala, Cameroun', timestamp: 'Il y a 5 min', icon: LogIn, color: '#6366f1' },
  { id: 2, user: 'Sandrine Ateba', action: 'Facture créée', detail: 'INV-2024-016 — 34 500 000 XAF', timestamp: 'Il y a 12 min', icon: FileText, color: '#34d399' },
  { id: 3, user: 'Paul Essomba', action: 'Paramètres modifiés', detail: 'Notifications email activées', timestamp: 'Il y a 25 min', icon: Settings, color: '#fbbf24' },
  { id: 4, user: 'Marie-Claire Ngo', action: 'Paiement envoyé', detail: 'Virement 12 000 000 XAF à TechVision', timestamp: 'Il y a 1h', icon: CreditCard, color: '#22d3ee' },
  { id: 5, user: 'François Ekotto', action: 'Employé ajouté', detail: 'Olive Tchinda — Operations', timestamp: 'Il y a 2h', icon: Users, color: '#a78bfa' },
  { id: 6, user: 'Aïcha Bello', action: 'Rapport exporté', detail: 'Rapport paie Mars 2024 — PDF', timestamp: 'Il y a 3h', icon: BarChart3, color: '#f59e0b' },
];

const roleConf: Record<Role, { label: string; color: string; bg: string; icon: React.ElementType; desc: string }> = {
  admin: { label: 'Administrateur', color: '#C8A961', bg: 'rgba(200,169,97,0.15)', icon: Shield, desc: 'Accès complet — toutes les fonctionnalités' },
  manager: { label: 'Manager', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', icon: Briefcase, desc: 'Accès opérations — gestion courante' },
  accountant: { label: 'Comptable', color: '#22d3ee', bg: 'rgba(34,211,238,0.15)', icon: Calculator, desc: 'Accès financier — factures et rapports' },
};

const statusConf: Record<UserStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Actif', color: '#34d399', bg: 'rgba(52,211,153,0.15)' },
  suspended: { label: 'Suspendu', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' },
  pending: { label: 'En attente', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)' },
};

const PERMISSIONS = [
  { feature: 'Dashboard', icon: Activity, admin: true, manager: true, accountant: true },
  { feature: 'Factures', icon: FileText, admin: true, manager: true, accountant: true },
  { feature: 'Paiements', icon: CreditCard, admin: true, manager: true, accountant: true },
  { feature: 'Employés', icon: Users, admin: true, manager: true, accountant: false },
  { feature: 'Fournisseurs', icon: Truck, admin: true, manager: true, accountant: false },
  { feature: 'Rapports', icon: BarChart3, admin: true, manager: true, accountant: true },
  { feature: 'Utilisateurs', icon: UserCog, admin: true, manager: false, accountant: false },
  { feature: 'Paramètres', icon: Settings, admin: true, manager: false, accountant: false },
  { feature: 'Banque', icon: Building2, admin: true, manager: false, accountant: true },
];

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [showPerms, setShowPerms] = useState(true);
  const [showDetail, setShowDetail] = useState<UserAccount | null>(null);

  const filtered = USERS.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()));
  const roleCounts = { admin: USERS.filter(u => u.role === 'admin').length, manager: USERS.filter(u => u.role === 'manager').length, accountant: USERS.filter(u => u.role === 'accountant').length };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#F3F4F6', letterSpacing: '-0.5px' }}>Gestion des Utilisateurs</h1>
          <p style={{ color: '#9CA3AF', fontSize: '14px', marginTop: '4px' }}>{USERS.length} utilisateurs · 3 rôles configurés</p>
        </div>
        <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', color: '#0A0E17', padding: '10px 20px', borderRadius: '12px', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer' }}>
          <Plus size={18} /> Inviter Utilisateur
        </button>
      </div>

      {/* Role Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {(Object.entries(roleConf) as [Role, typeof roleConf['admin']][]).map(([key, r]) => (
          <div key={key} className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-5 shadow-xl transition-all duration-300 hover:border-white/10 hover:shadow-2xl hover:-translate-y-0.5" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: r.color }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <r.icon size={22} style={{ color: r.color }} />
              </div>
              <div>
                <p style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '16px' }}>{r.label}</p>
                <p style={{ color: '#6B7280', fontSize: '12px' }}>{roleCounts[key]} utilisateur(s)</p>
              </div>
            </div>
            <p style={{ color: '#9CA3AF', fontSize: '12px' }}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Permissions Matrix */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ marginBottom: '24px', overflow: 'hidden' }}>
        <button onClick={() => setShowPerms(!showPerms)} style={{ width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer' }}>
          <span style={{ color: '#F3F4F6', fontWeight: 700, fontSize: '15px' }}>Matrice des Permissions</span>
          <span style={{ color: '#6B7280', fontSize: '13px' }}>{showPerms ? '▼' : '▶'}</span>
        </button>
        {showPerms && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderTop: '1px solid #1F2937', borderBottom: '1px solid #1F2937' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#9CA3AF' }}>Fonctionnalité</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#C8A961' }}>Admin</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#6366f1' }}>Manager</th>
                <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#22d3ee' }}>Comptable</th>
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(p => (
                <tr key={p.feature} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)' }}>
                  <td style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <p.icon size={16} style={{ color: '#6B7280' }} />
                    <span style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: 500 }}>{p.feature}</span>
                  </td>
                  {[p.admin, p.manager, p.accountant].map((allowed, i) => (
                    <td key={i} style={{ padding: '12px 20px', textAlign: 'center' }}>
                      {allowed ? <CheckCircle size={18} style={{ color: '#34d399', margin: '0 auto' }} /> : <X size={18} style={{ color: '#374151', margin: '0 auto' }} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Filter + Table */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 p-4 shadow-xl" style={{ display: 'flex', gap: '12px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6B7280' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, email..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden', marginBottom: '24px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1F2937' }}>
              {['Utilisateur', 'Email', 'Rôle', 'Département', 'Dernière connexion', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#9CA3AF' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const rc = roleConf[u.role];
              const sc = statusConf[u.status];
              return (
                <tr key={u.id} onClick={() => setShowDetail(u)} style={{ borderBottom: '1px solid rgba(31,41,55,0.5)', cursor: 'pointer' }} className="hover:bg-white/[0.02]">
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: rc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: rc.color, fontWeight: 700, fontSize: '12px' }}>{u.avatar}</div>
                      <span style={{ color: '#F3F4F6', fontWeight: 600, fontSize: '13px' }}>{u.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '13px' }}>{u.email}</td>
                  <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: rc.bg, color: rc.color, fontSize: '11px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><rc.icon size={12} /> {rc.label}</span></td>
                  <td style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: '13px' }}>{u.department}</td>
                  <td style={{ padding: '14px 16px', color: '#6B7280', fontSize: '13px' }}>{u.lastLogin || '—'}</td>
                  <td style={{ padding: '14px 16px' }}><span style={{ padding: '3px 8px', borderRadius: '4px', background: sc.bg, color: sc.color, fontSize: '11px', fontWeight: 600 }}>{sc.label}</span></td>
                  <td style={{ padding: '14px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[{ icon: Edit3, t: 'Modifier' }, { icon: Ban, t: 'Suspendre' }].map((a, j) => (
                        <button key={j} title={a.t} style={{ width: '32px', height: '32px', borderRadius: '6px', background: '#0D1117', border: '1px solid #1F2937', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', cursor: 'pointer' }} className="hover:border-white/20 hover:text-white">
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
      </div>

      {/* Activity Log */}
      <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #1F2937' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#F3F4F6' }}>Journal d&apos;Activité</h3>
        </div>
        <div style={{ padding: '16px 20px' }}>
          {ACTIVITIES.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '12px 0', borderBottom: '1px solid rgba(31,41,55,0.3)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${a.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: 600 }}>{a.user} — {a.action}</p>
                  <span style={{ color: '#6B7280', fontSize: '11px' }}>{a.timestamp}</span>
                </div>
                <p style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '2px' }}>{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowInvite(false)} />
          <div style={{ position: 'relative', width: '500px', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#F3F4F6' }}>Inviter un Utilisateur</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Adresse email</label>
                <input placeholder="utilisateur@entreprise.com" style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Rôle</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(Object.entries(roleConf) as [Role, typeof roleConf['admin']][]).map(([key, r]) => (
                    <button key={key} style={{ flex: 1, padding: '12px', borderRadius: '8px', background: r.bg, border: '2px solid transparent', cursor: 'pointer', textAlign: 'center' }}>
                      <r.icon size={20} style={{ color: r.color, margin: '0 auto 6px' }} />
                      <p style={{ color: r.color, fontSize: '12px', fontWeight: 600 }}>{r.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#9CA3AF', display: 'block', marginBottom: '6px' }}>Département</label>
                <select style={{ width: '100%', padding: '10px', background: '#0D1117', border: '1px solid #1F2937', borderRadius: '8px', color: '#F3F4F6', fontSize: '13px', outline: 'none' }}>
                  <option>Direction</option><option>Finance</option><option>IT</option><option>Marketing</option><option>Operations</option><option>RH</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowInvite(false)} style={{ padding: '10px 20px', borderRadius: '8px', background: '#1F2937', border: 'none', color: '#9CA3AF', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '8px', background: 'linear-gradient(135deg, #C8A961 0%, #8B6914 100%)', border: 'none', color: '#0A0E17', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}><Mail size={14} /> Envoyer l&apos;invitation</button>
            </div>
          </div>
        </div>
      )}

      {/* User Detail */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setShowDetail(null)} />
          <div style={{ position: 'relative', width: '500px', background: '#111827', border: '1px solid #1F2937', borderRadius: '16px', padding: '32px' }}>
            <button onClick={() => setShowDetail(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer' }}><X size={20} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '14px', background: roleConf[showDetail.role].bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: roleConf[showDetail.role].color, fontWeight: 800, fontSize: '18px' }}>{showDetail.avatar}</div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#F3F4F6' }}>{showDetail.name}</h2>
                <p style={{ color: '#6B7280', fontSize: '13px' }}>{showDetail.email}</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '10px', background: '#0D1117', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6B7280' }}>Rôle</p>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 8px', borderRadius: '4px', background: roleConf[showDetail.role].bg, color: roleConf[showDetail.role].color, fontSize: '12px', fontWeight: 600, marginTop: '4px' }}>
                  {React.createElement(roleConf[showDetail.role].icon, { size: 12 })} {roleConf[showDetail.role].label}
                </span>
              </div>
              <div style={{ padding: '10px', background: '#0D1117', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6B7280' }}>Statut</p>
                <span style={{ padding: '3px 8px', borderRadius: '4px', background: statusConf[showDetail.status].bg, color: statusConf[showDetail.status].color, fontSize: '12px', fontWeight: 600, display: 'inline-block', marginTop: '4px' }}>{statusConf[showDetail.status].label}</span>
              </div>
              <div style={{ padding: '10px', background: '#0D1117', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6B7280' }}>Département</p>
                <p style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>{showDetail.department}</p>
              </div>
              <div style={{ padding: '10px', background: '#0D1117', borderRadius: '8px' }}>
                <p style={{ fontSize: '11px', color: '#6B7280' }}>Dernière connexion</p>
                <p style={{ color: '#F3F4F6', fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>{showDetail.lastLogin || '—'}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#0D1117', border: '1px solid #1F2937', color: '#9CA3AF', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Lock size={14} /> Reset mot de passe</button>
              <button style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Ban size={14} /> Suspendre</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
