'use client';

import { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Edit2,
  Trash2,
  Search,
  ChevronDown,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Building2,
  LayoutGrid,
  List,
  Crown,
  ShieldCheck,
  Activity,
  Plus,
  Minus,
  Info,
} from 'lucide-react';

type Role =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'COMPLIANCE_OFFICER'
  | 'TREASURER'
  | 'OPERATOR'
  | 'AUDITOR'
  | 'VIEWER';

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string;
  lastActivity: string;
  twoFA: boolean;
  avatar: string;
  status: 'active' | 'inactive' | 'suspended';
}

const ROLE_CONFIG: Record<
  Role,
  { label: string; color: string; bg: string; border: string; textColor: string; icon: string }
> = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
    border: 'border-yellow-400/30',
    textColor: '#FBBF24',
    icon: '👑',
  },
  ADMIN: {
    label: 'Admin',
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30',
    textColor: '#A78BFA',
    icon: '🛡️',
  },
  COMPLIANCE_OFFICER: {
    label: 'Compliance',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30',
    textColor: '#60A5FA',
    icon: '⚖️',
  },
  TREASURER: {
    label: 'Trésorier',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/30',
    textColor: '#34D399',
    icon: '💰',
  },
  OPERATOR: {
    label: 'Opérateur',
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30',
    textColor: '#22D3EE',
    icon: '⚙️',
  },
  AUDITOR: {
    label: 'Auditeur',
    color: 'text-orange-400',
    bg: 'bg-orange-400/10',
    border: 'border-orange-400/30',
    textColor: '#FB923C',
    icon: '🔍',
  },
  VIEWER: {
    label: 'Lecteur',
    color: 'text-slate-400',
    bg: 'bg-slate-400/10',
    border: 'border-slate-400/30',
    textColor: '#94A3B8',
    icon: '👁️',
  },
};

const PERMISSIONS: Record<string, Role[]> = {
  'Voir le tableau de bord': ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'TREASURER', 'OPERATOR', 'AUDITOR', 'VIEWER'],
  'Gérer les utilisateurs': ['SUPER_ADMIN', 'ADMIN'],
  'Approuver les transactions': ['SUPER_ADMIN', 'ADMIN', 'TREASURER'],
  'Voir les transactions': ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'TREASURER', 'OPERATOR', 'AUDITOR', 'VIEWER'],
  'Créer des transactions': ['SUPER_ADMIN', 'ADMIN', 'TREASURER', 'OPERATOR'],
  'Accès aux rapports': ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'TREASURER', 'AUDITOR'],
  'Configurer le système': ['SUPER_ADMIN'],
  'Gérer la conformité': ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER'],
  'Exporter les données': ['SUPER_ADMIN', 'ADMIN', 'COMPLIANCE_OFFICER', 'AUDITOR'],
  'Gérer les comptes': ['SUPER_ADMIN', 'ADMIN', 'TREASURER'],
  'Voir les logs': ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'],
  'Gérer les API': ['SUPER_ADMIN'],
};

const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Alexandre Dubois',
    email: 'a.dubois@pimpay.fr',
    role: 'SUPER_ADMIN',
    department: 'Direction Générale',
    lastActivity: 'Il y a 2 minutes',
    twoFA: true,
    avatar: 'AD',
    status: 'active',
  },
  {
    id: '2',
    name: 'Marie-Claire Fontaine',
    email: 'm.fontaine@pimpay.fr',
    role: 'ADMIN',
    department: 'Systèmes d\'Information',
    lastActivity: 'Il y a 1 heure',
    twoFA: true,
    avatar: 'MF',
    status: 'active',
  },
  {
    id: '3',
    name: 'Jean-Pierre Moreau',
    email: 'jp.moreau@pimpay.fr',
    role: 'COMPLIANCE_OFFICER',
    department: 'Conformité & Risques',
    lastActivity: 'Il y a 3 heures',
    twoFA: true,
    avatar: 'JM',
    status: 'active',
  },
  {
    id: '4',
    name: 'Sophie Leblanc',
    email: 's.leblanc@pimpay.fr',
    role: 'TREASURER',
    department: 'Finance & Trésorerie',
    lastActivity: 'Il y a 30 minutes',
    twoFA: true,
    avatar: 'SL',
    status: 'active',
  },
  {
    id: '5',
    name: 'Thomas Bernard',
    email: 't.bernard@pimpay.fr',
    role: 'OPERATOR',
    department: 'Opérations Bancaires',
    lastActivity: 'Il y a 5 heures',
    twoFA: false,
    avatar: 'TB',
    status: 'active',
  },
  {
    id: '6',
    name: 'Isabelle Martin',
    email: 'i.martin@pimpay.fr',
    role: 'AUDITOR',
    department: 'Audit Interne',
    lastActivity: 'Hier à 14h30',
    twoFA: true,
    avatar: 'IM',
    status: 'active',
  },
  {
    id: '7',
    name: 'François Petit',
    email: 'f.petit@pimpay.fr',
    role: 'VIEWER',
    department: 'Ressources Humaines',
    lastActivity: 'Il y a 2 jours',
    twoFA: false,
    avatar: 'FP',
    status: 'inactive',
  },
  {
    id: '8',
    name: 'Nathalie Rousseau',
    email: 'n.rousseau@pimpay.fr',
    role: 'COMPLIANCE_OFFICER',
    department: 'Conformité & Risques',
    lastActivity: 'Il y a 4 heures',
    twoFA: true,
    avatar: 'NR',
    status: 'active',
  },
];

const DEPARTMENTS = [
  'Direction Générale',
  'Systèmes d\'Information',
  'Conformité & Risques',
  'Finance & Trésorerie',
  'Opérations Bancaires',
  'Audit Interne',
  'Ressources Humaines',
  'Service Client',
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'matrix'>('table');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [matrixSubView, setMatrixSubView] = useState<'permissions' | 'users'>('permissions');

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'VIEWER' as Role,
    department: DEPARTMENTS[0],
    require2FA: false,
  });

  const [editRole, setEditRole] = useState<Role>('VIEWER');

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.department.toLowerCase().includes(search.toLowerCase());
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      return matchSearch && matchRole;
    });
  }, [users, search, roleFilter]);

  const handleAddUser = () => {
    const user: User = {
      id: String(Date.now()),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      department: newUser.department,
      lastActivity: 'Jamais',
      twoFA: newUser.require2FA,
      avatar: newUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      status: 'active',
    };
    setUsers((prev) => [...prev, user]);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: 'VIEWER', department: DEPARTMENTS[0], require2FA: false });
  };

  const handleEditRole = () => {
    if (!selectedUser) return;
    setUsers((prev) => prev.map((u) => (u.id === selectedUser.id ? { ...u, role: editRole } : u)));
    setShowEditModal(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setShowDeleteConfirm(null);
  };

  const getPermissionsForRole = (role: Role) =>
    Object.entries(PERMISSIONS)
      .filter(([, roles]) => roles.includes(role))
      .map(([perm]) => perm);

  const getGainedPermissions = (oldRole: Role, newRole: Role) => {
    const oldPerms = getPermissionsForRole(oldRole);
    const newPerms = getPermissionsForRole(newRole);
    return newPerms.filter((p) => !oldPerms.includes(p));
  };

  const getLostPermissions = (oldRole: Role, newRole: Role) => {
    const oldPerms = getPermissionsForRole(oldRole);
    const newPerms = getPermissionsForRole(newRole);
    return oldPerms.filter((p) => !newPerms.includes(p));
  };

  const roleCounts = useMemo(() => {
    const counts: Partial<Record<Role, number>> = {};
    users.forEach((u) => {
      counts[u.role] = (counts[u.role] || 0) + 1;
    });
    return counts;
  }, [users]);

  return (
    <div className="min-h-screen bg-[#0A0C10] text-slate-100 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Gestion des Utilisateurs</h1>
          </div>
          <p className="text-slate-400 text-sm ml-13 pl-13">
            <span className="ml-13">{users.length} utilisateurs •</span>
            <span className="text-yellow-400 font-medium"> PIMPAY Banking Portal</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-black font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40"
        >
          <UserPlus className="w-4 h-4" />
          Inviter Utilisateur
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
          const cfg = ROLE_CONFIG[role];
          return (
            <button
              key={role}
              onClick={() => setRoleFilter(roleFilter === role ? 'ALL' : role)}
              className={`p-3 rounded-xl border transition-all duration-200 text-left ${
                roleFilter === role
                  ? `${cfg.bg} ${cfg.border} border`
                  : 'bg-[#111318] border-slate-800/60 hover:border-slate-700'
              }`}
            >
              <div className="text-lg mb-1">{cfg.icon}</div>
              <div className={`text-lg font-bold ${cfg.color}`}>{roleCounts[role] || 0}</div>
              <div className="text-xs text-slate-400 truncate">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, département..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#111318] border border-slate-800 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 p-1 bg-[#111318] border border-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'table'
                ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <List className="w-4 h-4" />
            Tableau
          </button>
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              viewMode === 'matrix'
                ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Matrice
          </button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-[#111318] border border-slate-800/60 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800/60">
                  {['Utilisateur', 'Rôle', 'Département', 'Dernière Activité', '2FA', 'Statut', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, idx) => {
                  const cfg = ROLE_CONFIG[user.role];
                  return (
                    <tr
                      key={user.id}
                      className={`border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-slate-900/20'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                            style={{
                              background: `${cfg.textColor}15`,
                              border: `1px solid ${cfg.textColor}30`,
                              color: cfg.textColor,
                            }}
                          >
                            {user.avatar}
                          </div>
                          <div>
                            <div className="font-medium text-slate-100 text-sm">{user.name}</div>
                            <div className="text-slate-500 text-xs">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                            cfg.bg
                          } ${cfg.border} ${cfg.color}`}
                        >
                          <span>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-slate-300 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          {user.department}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                          <Activity className="w-3.5 h-3.5" />
                          {user.lastActivity}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {user.twoFA ? (
                          <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Activé
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-red-400 text-xs font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Désactivé
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.status === 'active'
                              ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                              : user.status === 'inactive'
                              ? 'bg-slate-400/10 text-slate-400 border border-slate-400/20'
                              : 'bg-red-400/10 text-red-400 border border-red-400/20'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.status === 'active'
                                ? 'bg-emerald-400'
                                : user.status === 'inactive'
                                ? 'bg-slate-400'
                                : 'bg-red-400'
                            }`}
                          />
                          {user.status === 'active'
                            ? 'Actif'
                            : user.status === 'inactive'
                            ? 'Inactif'
                            : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setEditRole(user.role);
                              setShowEditModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-yellow-400/10 hover:text-yellow-400 text-slate-400 transition-all border border-transparent hover:border-yellow-400/20"
                            title="Modifier le rôle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(user.id)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-400/10 hover:text-red-400 text-slate-400 transition-all border border-transparent hover:border-red-400/20"
                            title="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredUsers.length === 0 && (
            <div className="py-16 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Aucun utilisateur trouvé</p>
            </div>
          )}
        </div>
      )}

      {/* Matrix View */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-1 bg-[#111318] border border-slate-800 rounded-xl w-fit">
            <button
              onClick={() => setMatrixSubView('permissions')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                matrixSubView === 'permissions'
                  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matrice des Permissions
            </button>
            <button
              onClick={() => setMatrixSubView('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                matrixSubView === 'users'
                  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Liste par Rôle
            </button>
          </div>

          {matrixSubView === 'permissions' && (
            <div className="bg-[#111318] border border-slate-800/60 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-5 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[220px]">
                        Permission
                      </th>
                      {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
                        const cfg = ROLE_CONFIG[role];
                        return (
                          <th key={role} className="px-3 py-4 text-center min-w-[100px]">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-base">{cfg.icon}</span>
                              <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(PERMISSIONS).map(([perm, roles], idx) => (
                      <tr
                        key={perm}
                        className={`border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors ${
                          idx % 2 === 0 ? '' : 'bg-slate-900/20'
                        }`}
                      >
                        <td className="px-5 py-3">
                          <span className="text-sm text-slate-200">{perm}</span>
                        </td>
                        {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
                          const hasPermission = roles.includes(role);
                          return (
                            <td key={role} className="px-3 py-3 text-center">
                              {hasPermission ? (
                                <div className="flex justify-center">
                                  <div className="w-6 h-6 rounded-full bg-emerald-400/10 border border-emerald-400/30 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center">
                                  <div className="w-6 h-6 rounded-full bg-slate-800/50 border border-slate-700/30 flex items-center justify-center">
                                    <X className="w-3 h-3 text-slate-600" />
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {matrixSubView === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
                const cfg = ROLE_CONFIG[role];
                const roleUsers = users.filter((u) => u.role === role);
                const perms = getPermissionsForRole(role);
                return (
                  <div
                    key={role}
                    className="bg-[#111318] border border-slate-800/60 rounded-2xl overflow-hidden"
                  >
                    <div
                      className={`px-4 py-3 border-b ${cfg.bg} ${cfg.border} border-b flex items-center justify-between`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cfg.icon}</span>
                        <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.border} border ${cfg.color} font-medium`}
                      >
                        {roleUsers.length} utilisateur{roleUsers.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="p-4">
                      {roleUsers.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-2">Aucun utilisateur</p>
                      ) : (
                        <div className="space-y-2 mb-4">
                          {roleUsers.map((u) => (
                            <div key={u.id} className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                                style={{
                                  background: `${cfg.textColor}15`,
                                  color: cfg.textColor,
                                }}
                              >
                                {u.avatar}
                              </div>
                              <div className="min-w-0">
                                <div className="text-xs font-medium text-slate-200 truncate">{u.name}</div>
                                <div className="text-xs text-slate-500 truncate">{u.email}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="border-t border-slate-800/60 pt-3">
                        <p className="text-xs text-slate-500 mb-2 font-medium">{perms.length} permissions</p>
                        <div className="flex flex-wrap gap-1">
                          {perms.slice(0, 4).map((p) => (
                            <span
                              key={p}
                              className="text-xs px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded border border-slate-700/50"
                            >
                              {p.split(' ').slice(0, 2).join(' ')}
                            </span>
                          ))}
                          {perms.length > 4 && (
                            <span className="text-xs px-1.5 py-0.5 bg-slate-800 text-slate-500 rounded border border-slate-700/50">
                              +{perms.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111318] border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-yellow-400" />
                </div>
                <h2 className="text-lg font-bold text-white">Inviter un Utilisateur</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Nom Complet
                  </label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Jean Dupont"
                    className="w-full px-3 py-2.5 bg-[#0A0C10] border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
                    placeholder="j.dupont@pimpay.fr"
                    className="w-full px-3 py-2.5 bg-[#0A0C10] border border-slate-700 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Rôle</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
                    const cfg = ROLE_CONFIG[role];
                    const isSelected = newUser.role === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setNewUser((p) => ({ ...p, role }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
                          isSelected ? `${cfg.bg} ${cfg.border} border` : 'bg-[#0A0C10] border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span className={`text-sm font-medium ${isSelected ? cfg.color : 'text-slate-300'}`}>
                          {cfg.label}
                        </span>
                        {isSelected && <Check className={`w-3.5 h-3.5 ml-auto ${cfg.color}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Permission Preview */}
              <div className="bg-[#0A0C10] border border-slate-800 rounded-xl p-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Permissions incluses
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getPermissionsForRole(newUser.role).map((p) => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Département
                </label>
                <div className="relative">
                  <select
                    value={newUser.department}
                    onChange={(e) => setNewUser((p) => ({ ...p, department: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-[#0A0C10] border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-yellow-400/50 focus:ring-1 focus:ring-yellow-400/20 transition-all text-sm appearance-none"
                  >
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>
              <label className="flex items-center gap-3 p-3 bg-[#0A0C10] border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-all">
                <div
                  onClick={() => setNewUser((p) => ({ ...p, require2FA: !p.require2FA }))}
                  className={`w-10 h-5 rounded-full transition-all relative ${
                    newUser.require2FA ? 'bg-yellow-400' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                      newUser.require2FA ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-200">Exiger l'authentification 2FA</div>
                  <div className="text-xs text-slate-500">L'utilisateur devra configurer le 2FA à la connexion</div>
                </div>
              </label>
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.email}
                className="flex items-center gap-2 px-5 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/30 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-all text-sm"
              >
                <UserPlus className="w-4 h-4" />
                Envoyer l'invitation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111318] border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Modifier le Rôle</h2>
                  <p className="text-xs text-slate-400">{selectedUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Current Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Rôle Actuel
                </label>
                <div
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${
                    ROLE_CONFIG[selectedUser.role].bg
                  } ${ROLE_CONFIG[selectedUser.role].border}`}
                >
                  <span className="text-lg">{ROLE_CONFIG[selectedUser.role].icon}</span>
                  <span className={`font-semibold ${ROLE_CONFIG[selectedUser.role].color}`}>
                    {ROLE_CONFIG[selectedUser.role].label}
                  </span>
                </div>
              </div>
              {/* New Role Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Nouveau Rôle
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(ROLE_CONFIG) as Role[]).map((role) => {
                    const cfg = ROLE_CONFIG[role];
                    const isSelected = editRole === role;
                    return (
                      <button
                        key={role}
                        onClick={() => setEditRole(role)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left ${
                          isSelected ? `${cfg.bg} ${cfg.border} border` : 'bg-[#0A0C10] border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-base">{cfg.icon}</span>
                        <span className={`text-sm font-medium ${isSelected ? cfg.color : 'text-slate-300'}`}>
                          {cfg.label}
                        </span>
                        {isSelected && <Check className={`w-3.5 h-3.5 ml-auto ${cfg.color}`} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Permissions Comparison */}
              {editRole !== selectedUser.role && (
                <div className="space-y-2">
                  {getGainedPermissions(selectedUser.role, editRole).length > 0 && (
                    <div className="bg-emerald-400/5 border border-emerald-400/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5" /> Permissions acquises
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {getGainedPermissions(selectedUser.role, editRole).map((p) => (
                          <span key={p} className="text-xs px-2 py-0.5 bg-emerald-400/10 text-emerald-400 rounded-lg border border-emerald-400/20">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {getLostPermissions(selectedUser.role, editRole).length > 0 && (
                    <div className="bg-red-400/5 border border-red-400/20 rounded-xl p-3">
                      <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <Minus className="w-3.5 h-3.5" /> Permissions retirées
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {getLostPermissions(selectedUser.role, editRole).map((p) => (
                          <span key={p} className="text-xs px-2 py-0.5 bg-red-400/10 text-red-400 rounded-lg border border-red-400/20">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {getGainedPermissions(selectedUser.role, editRole).length === 0 &&
                    getLostPermissions(selectedUser.role, editRole).length === 0 && (
                      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-center">
                        <p className="text-slate-400 text-sm">Permissions identiques</p>
                      </div>
                    )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-800">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleEditRole}
                disabled={editRole === selectedUser.role}
                className="flex items-center gap-2 px-5 py-2 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-400/30 disabled:cursor-not-allowed text-black font-semibold rounded-xl transition-all text-sm"
              >
                <Shield className="w-4 h-4" />
                Appliquer le rôle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111318] border border-red-500/20 rounded-2xl w-full max-w-sm shadow-2xl">
            <div className="p-6">
              <div className="w-12 h-12 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">Supprimer l'utilisateur</h3>
              <p className="text-slate-400 text-sm text-center mb-6">
                Cette action est irréversible. L'utilisateur perdra tous ses accès immédiatement.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition-all text-sm"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteUser(showDeleteConfirm)}
                  className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-400 text-white font-semibold rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
