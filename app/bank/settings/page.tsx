'use client';

import { useState } from 'react';
import {
  User,
  Shield,
  Bell,
  Code2,
  Settings,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Trash2,
  Plus,
  Play,
  QrCode,
  LogOut,
  Monitor,
  Smartphone,
  Globe,
  Key,
  Database,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Lock,
  Wifi,
  Server,
} from 'lucide-react';

const mockUser = {
  name: 'Alexandre Dubois',
  email: 'a.dubois@pimpay.fr',
  role: 'Administrateur Système',
  department: 'Technologie & Innovation',
  avatar: 'AD',
  lastLogin: '2024-01-15 09:42:33',
};

const mockSessions = [
  { id: '1', device: 'Chrome / Windows 11', location: 'Paris, France', ip: '192.168.1.45', lastActive: 'Actif maintenant', current: true },
  { id: '2', device: 'Safari / iPhone 15', location: 'Lyon, France', ip: '10.0.0.22', lastActive: 'Il y a 2h', current: false },
  { id: '3', device: 'Firefox / macOS', location: 'Marseille, France', ip: '172.16.0.8', lastActive: 'Il y a 1j', current: false },
];

const mockIPs = [
  { id: '1', ip: '192.168.1.0/24', label: 'Bureau Principal', status: 'active' },
  { id: '2', ip: '10.0.0.0/16', label: 'VPN Corporate', status: 'active' },
  { id: '3', ip: '172.16.0.0/12', label: 'Datacenter Lyon', status: 'inactive' },
];

const mockApiKeys = [
  { id: '1', name: 'Clé Production', key: 'pk_live_••••••••••••••••••••••3f8a', created: '2024-01-01', lastUsed: 'Aujourd\'hui', status: 'active' },
  { id: '2', name: 'Clé Staging', key: 'pk_test_••••••••••••••••••••••9c2d', created: '2023-12-15', lastUsed: 'Il y a 3j', status: 'active' },
  { id: '3', name: 'Clé Développement', key: 'pk_dev_•••••••••••••••••••••••1b7e', created: '2023-11-20', lastUsed: 'Il y a 2sem', status: 'inactive' },
];

const mockWebhooks = [
  { id: '1', url: 'https://api.partner1.fr/webhooks/pimpay', events: ['transaction.created', 'transaction.failed'], status: 'active', lastDelivery: 'Succès' },
  { id: '2', url: 'https://compliance.internal/hooks', events: ['compliance.alert', 'kyc.updated'], status: 'active', lastDelivery: 'Succès' },
  { id: '3', url: 'https://monitoring.pimpay.fr/alerts', events: ['system.error', 'maintenance.start'], status: 'inactive', lastDelivery: 'Échec' },
];

const notificationEvents = [
  { id: 'tx_created', label: 'Transaction créée', category: 'transactions' },
  { id: 'tx_failed', label: 'Transaction échouée', category: 'transactions' },
  { id: 'tx_suspicious', label: 'Transaction suspecte', category: 'transactions' },
  { id: 'compliance_alert', label: 'Alerte conformité', category: 'compliance' },
  { id: 'kyc_update', label: 'Mise à jour KYC', category: 'compliance' },
  { id: 'aml_flag', label: 'Signalement AML', category: 'compliance' },
  { id: 'system_error', label: 'Erreur système', category: 'system' },
  { id: 'maintenance', label: 'Maintenance', category: 'system' },
  { id: 'backup_complete', label: 'Sauvegarde terminée', category: 'system' },
];

type NotifChannel = 'email' | 'push' | 'sms';

interface ToggleSwitchProps {
  enabled: boolean;
  onChange: () => void;
  small?: boolean;
}

function ToggleSwitch({ enabled, onChange, small = false }: ToggleSwitchProps) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex items-center rounded-full transition-all duration-300 focus:outline-none ${
        small ? 'w-10 h-5' : 'w-12 h-6'
      } ${
        enabled
          ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.4)]'
          : 'bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block rounded-full bg-white shadow-md transform transition-transform duration-300 ${
          small ? 'w-3.5 h-3.5' : 'w-4 h-4'
        } ${
          enabled
            ? small ? 'translate-x-5' : 'translate-x-7'
            : 'translate-x-1'
        }`}
      />
    </button>
  );
}

function SectionCard({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
        <div className="w-9 h-9 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-yellow-400" size={18} />
        </div>
        <h2 className="text-white font-semibold text-base tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const [twoFAEnabled, setTwoFAEnabled] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [logLevel, setLogLevel] = useState('INFO');
  const [dataRetention, setDataRetention] = useState('90');
  const [backupSchedule, setBackupSchedule] = useState('daily');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newIP, setNewIP] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testedWebhook, setTestedWebhook] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const [notifications, setNotifications] = useState<Record<string, Record<NotifChannel, boolean>>>(() => {
    const init: Record<string, Record<NotifChannel, boolean>> = {};
    notificationEvents.forEach((e) => {
      init[e.id] = { email: true, push: e.category !== 'system', sms: e.category === 'compliance' };
    });
    return init;
  });

  const [apiKeys, setApiKeys] = useState(mockApiKeys);
  const [webhooks, setWebhooks] = useState(mockWebhooks);
  const [ipList, setIpList] = useState(mockIPs);
  const [sessions, setSessions] = useState(mockSessions);

  const toggleNotif = (eventId: string, channel: NotifChannel) => {
    setNotifications((prev) => ({
      ...prev,
      [eventId]: { ...prev[eventId], [channel]: !prev[eventId][channel] },
    }));
  };

  const handleCopyKey = (id: string) => {
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestWebhook = (id: string) => {
    setTestedWebhook(id);
    setTimeout(() => setTestedWebhook(null), 2500);
  };

  const handleRevokeSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDeleteWebhook = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  const handleDeleteIP = (id: string) => {
    setIpList((prev) => prev.filter((ip) => ip.id !== id));
  };

  const handleAddIP = () => {
    if (newIP.trim()) {
      setIpList((prev) => [...prev, { id: Date.now().toString(), ip: newIP.trim(), label: 'Nouvelle IP', status: 'active' }]);
      setNewIP('');
    }
  };

  const handleAddWebhook = () => {
    if (newWebhookUrl.trim()) {
      setWebhooks((prev) => [...prev, { id: Date.now().toString(), url: newWebhookUrl.trim(), events: [], status: 'active', lastDelivery: 'Jamais' }]);
      setNewWebhookUrl('');
    }
  };

  const groupedEvents = {
    transactions: notificationEvents.filter((e) => e.category === 'transactions'),
    compliance: notificationEvents.filter((e) => e.category === 'compliance'),
    system: notificationEvents.filter((e) => e.category === 'system'),
  };

  const categoryLabels: Record<string, string> = {
    transactions: 'Transactions',
    compliance: 'Conformité',
    system: 'Système',
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-yellow-600 rounded-full" />
            <h1 className="text-3xl font-bold text-white tracking-tight">Paramètres</h1>
          </div>
          <p className="text-zinc-500 text-sm ml-4">Gérez votre compte, la sécurité et les préférences système</p>
        </div>

        <div className="space-y-6">
          {/* ─── 1. PROFIL UTILISATEUR ─── */}
          <SectionCard icon={User} title="Profil Utilisateur">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center text-3xl font-bold text-zinc-900 shadow-lg shadow-yellow-900/30">
                    {mockUser.avatar}
                  </div>
                  <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors">
                    <RefreshCw size={13} className="text-yellow-400" />
                  </button>
                </div>
                <span className="text-xs text-zinc-500">Changer l'avatar</span>
              </div>

              {/* Info */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Nom complet</label>
                  <input
                    defaultValue={mockUser.name}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Email</label>
                  <input
                    defaultValue={mockUser.email}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Rôle</label>
                  <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                    <span className="text-sm text-yellow-300 font-medium">{mockUser.role}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Département</label>
                  <input
                    defaultValue={mockUser.department}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-zinc-800">
              <div className="text-xs text-zinc-500">
                Dernière connexion : <span className="text-zinc-400">{mockUser.lastLogin}</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPasswordModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
                >
                  <Lock size={14} />
                  Changer le mot de passe
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-sm font-semibold text-zinc-900 transition-colors shadow-lg shadow-yellow-900/20">
                  Enregistrer
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ─── 2. SÉCURITÉ ─── */}
          <SectionCard icon={Shield} title="Sécurité">
            {/* 2FA */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <QrCode size={15} className="text-yellow-400" />
                Authentification à Deux Facteurs (2FA)
              </h3>
              <div className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-sm text-white font-medium">Authenticator TOTP</div>
                    <div className="text-xs text-zinc-500 mt-0.5">Google Authenticator / Authy</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {twoFAEnabled && (
                      <span className="text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <CheckCircle2 size={11} /> Activé
                      </span>
                    )}
                    <ToggleSwitch enabled={twoFAEnabled} onChange={() => { setTwoFAEnabled(!twoFAEnabled); if (!twoFAEnabled) setShowQR(true); }} />
                  </div>
                </div>
                {twoFAEnabled && (
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="flex items-center gap-2 text-xs text-yellow-400 hover:text-yellow-300 transition-colors mt-1"
                  >
                    <QrCode size={13} />
                    {showQR ? 'Masquer le QR code' : 'Afficher le QR code de configuration'}
                    <ChevronRight size={12} className={`transition-transform ${showQR ? 'rotate-90' : ''}`} />
                  </button>
                )}
                {showQR && twoFAEnabled && (
                  <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-white rounded-xl w-fit mx-auto">
                    <div className="grid grid-cols-7 gap-0.5">
                      {Array.from({ length: 49 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-5 h-5 rounded-sm ${
                            [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,48,8,15,16,17,22,23,24,29,30,31,36,37,38].includes(i)
                              ? 'bg-zinc-900'
                              : 'bg-white'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-zinc-700 font-mono">OTPAUTH://TOTP/PIMPAY:a.dubois</p>
                  </div>
                )}
              </div>
            </div>

            {/* Sessions */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <Monitor size={15} className="text-yellow-400" />
                Sessions Actives
              </h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-zinc-700 flex items-center justify-center">
                        {session.device.includes('iPhone') ? <Smartphone size={15} className="text-zinc-400" /> : <Monitor size={15} className="text-zinc-400" />}
                      </div>
                      <div>
                        <div className="text-sm text-white font-medium flex items-center gap-2">
                          {session.device}
                          {session.current && (
                            <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full">Actuelle</span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-500">{session.location} · {session.ip} · {session.lastActive}</div>
                      </div>
                    </div>
                    {!session.current && (
                      <button
                        onClick={() => handleRevokeSession(session.id)}
                        className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 bg-red-400/5 hover:bg-red-400/10 border border-red-400/20 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <LogOut size={12} />
                        Révoquer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* IP Whitelist */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <Wifi size={15} className="text-yellow-400" />
                Liste Blanche IP
              </h3>
              <div className="space-y-2 mb-3">
                {ipList.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <Globe size={14} className="text-zinc-500" />
                      <span className="text-sm font-mono text-white">{item.ip}</span>
                      <span className="text-xs text-zinc-500">{item.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-green-400' : 'bg-zinc-600'}`} />
                      <button onClick={() => handleDeleteIP(item.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newIP}
                  onChange={(e) => setNewIP(e.target.value)}
                  placeholder="Ex: 192.168.1.0/24"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all font-mono"
                />
                <button
                  onClick={handleAddIP}
                  className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-sm font-semibold text-zinc-900 transition-colors flex items-center gap-2"
                >
                  <Plus size={15} /> Ajouter
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ─── 3. NOTIFICATIONS ─── */}
          <SectionCard icon={Bell} title="Notifications">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-800">
                    <th className="text-left text-xs text-zinc-500 uppercase tracking-wider pb-3 font-medium">Événement</th>
                    <th className="text-center text-xs text-zinc-500 uppercase tracking-wider pb-3 font-medium px-4">Email</th>
                    <th className="text-center text-xs text-zinc-500 uppercase tracking-wider pb-3 font-medium px-4">Push</th>
                    <th className="text-center text-xs text-zinc-500 uppercase tracking-wider pb-3 font-medium px-4">SMS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {Object.entries(groupedEvents).map(([category, events]) => (
                    <>
                      <tr key={`cat-${category}`}>
                        <td colSpan={4} className="pt-4 pb-2">
                          <span className="text-xs font-semibold text-yellow-400/80 uppercase tracking-widest">
                            {categoryLabels[category]}
                          </span>
                        </td>
                      </tr>
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="py-3 text-sm text-zinc-300">{event.label}</td>
                          {(['email', 'push', 'sms'] as NotifChannel[]).map((channel) => (
                            <td key={channel} className="py-3 text-center px-4">
                              <div className="flex justify-center">
                                <ToggleSwitch
                                  small
                                  enabled={notifications[event.id]?.[channel] ?? false}
                                  onChange={() => toggleNotif(event.id, channel)}
                                />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ─── 4. API & WEBHOOKS ─── */}
          <SectionCard icon={Code2} title="API & Webhooks">
            {/* API Keys */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <Key size={15} className="text-yellow-400" />
                Clés API
              </h3>
              <div className="space-y-2 mb-3">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between bg-zinc-800/60 border border-zinc-700/50 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${key.status === 'active' ? 'bg-green-400' : 'bg-zinc-600'}`} />
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium">{key.name}</div>
                        <div className="text-xs font-mono text-zinc-500 truncate">{key.key}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs text-zinc-500">Créée le {key.created}</div>
                        <div className="text-xs text-zinc-600">Utilisée : {key.lastUsed}</div>
                      </div>
                      <button
                        onClick={() => handleCopyKey(key.id)}
                        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-yellow-400 bg-zinc-700/50 hover:bg-zinc-700 border border-zinc-600 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {copiedKey === key.id ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                        {copiedKey === key.id ? 'Copié!' : 'Copier'}
                      </button>
                      <button className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/20 px-4 py-2.5 rounded-xl transition-all">
                <Plus size={15} />
                Générer une nouvelle clé
              </button>
            </div>

            {/* Webhooks */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                <Globe size={15} className="text-yellow-400" />
                Endpoints Webhook
              </h3>
              <div className="space-y-2 mb-3">
                {webhooks.map((wh) => (
                  <div key={wh.id} className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.status === 'active' ? 'bg-green-400' : 'bg-zinc-600'}`} />
                          <span className="text-sm font-mono text-blue-400 truncate">{wh.url}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {wh.events.map((ev) => (
                            <span key={ev} className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full font-mono">{ev}</span>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-zinc-500">Dernière livraison :</span>
                          <span className={`text-xs font-medium ${wh.lastDelivery === 'Succès' ? 'text-green-400' : wh.lastDelivery === 'Échec' ? 'text-red-400' : 'text-zinc-500'}`}>
                            {wh.lastDelivery}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleTestWebhook(wh.id)}
                          className={`flex items-center gap-1.5 text-xs border px-3 py-1.5 rounded-lg transition-all ${
                            testedWebhook === wh.id
                              ? 'bg-green-400/10 border-green-400/20 text-green-400'
                              : 'bg-zinc-700/50 hover:bg-zinc-700 border-zinc-600 text-zinc-400 hover:text-yellow-400'
                          }`}
                        >
                          {testedWebhook === wh.id ? <CheckCircle2 size={12} /> : <Play size={12} />}
                          {testedWebhook === wh.id ? 'Envoyé!' : 'Tester'}
                        </button>
                        <button onClick={() => handleDeleteWebhook(wh.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://votre-endpoint.com/webhook"
                  className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all font-mono"
                />
                <button
                  onClick={handleAddWebhook}
                  className="px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-sm font-semibold text-zinc-900 transition-colors flex items-center gap-2 flex-shrink-0"
                >
                  <Plus size={15} /> Ajouter
                </button>
              </div>
            </div>
          </SectionCard>

          {/* ─── 5. SYSTÈME ─── */}
          <SectionCard icon={Settings} title="Système">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Maintenance Mode */}
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={15} className={maintenanceMode ? 'text-yellow-400' : 'text-zinc-500'} />
                    <span className="text-sm font-medium text-white">Mode Maintenance</span>
                  </div>
                  <ToggleSwitch enabled={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} />
                </div>
                <p className="text-xs text-zinc-500">Désactive l'accès utilisateur et affiche une page de maintenance</p>
                {maintenanceMode && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/20 px-3 py-2 rounded-lg">
                    <AlertTriangle size={12} />
                    Maintenance active — les utilisateurs sont bloqués
                  </div>
                )}
              </div>

              {/* Log Level */}
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Server size={15} className="text-zinc-500" />
                  <span className="text-sm font-medium text-white">Niveau de Log</span>
                </div>
                <select
                  value={logLevel}
                  onChange={(e) => setLogLevel(e.target.value)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                >
                  <option value="DEBUG">DEBUG — Très verbeux</option>
                  <option value="INFO">INFO — Standard</option>
                  <option value="WARN">WARN — Avertissements</option>
                  <option value="ERROR">ERROR — Erreurs seulement</option>
                </select>
                <p className="text-xs text-zinc-500 mt-2">Niveau actuel : <span className="text-yellow-400 font-mono">{logLevel}</span></p>
              </div>

              {/* Data Retention */}
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={15} className="text-zinc-500" />
                  <span className="text-sm font-medium text-white">Rétention des Données</span>
                </div>
                <select
                  value={dataRetention}
                  onChange={(e) => setDataRetention(e.target.value)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                >
                  <option value="30">30 jours</option>
                  <option value="60">60 jours</option>
                  <option value="90">90 jours</option>
                  <option value="180">6 mois</option>
                  <option value="365">1 an</option>
                  <option value="730">2 ans (conformité)</option>
                </select>
                <p className="text-xs text-zinc-500 mt-2">Les logs seront supprimés après <span className="text-yellow-400 font-mono">{dataRetention} jours</span></p>
              </div>

              {/* Backup Schedule */}
              <div className="bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={15} className="text-zinc-500" />
                  <span className="text-sm font-medium text-white">Planification des Sauvegardes</span>
                </div>
                <select
                  value={backupSchedule}
                  onChange={(e) => setBackupSchedule(e.target.value)}
                  className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                >
                  <option value="hourly">Toutes les heures</option>
                  <option value="daily">Quotidienne (02:00)</option>
                  <option value="weekly">Hebdomadaire (Dimanche)</option>
                  <option value="monthly">Mensuelle (1er du mois)</option>
                </select>
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-zinc-500">Prochaine sauvegarde : <span className="text-yellow-400">02:00</span></p>
                  <button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-yellow-400 bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 px-3 py-1.5 rounded-lg transition-all">
                    <RefreshCw size={11} />
                    Maintenant
                  </button>
                </div>
              </div>
            </div>

            {/* Save System Settings */}
            <div className="mt-4 flex justify-end">
              <button className="flex items-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-sm font-semibold text-zinc-900 transition-colors shadow-lg shadow-yellow-900/20">
                Enregistrer les paramètres système
              </button>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-5 flex items-center gap-2">
              <Lock size={18} className="text-yellow-400" />
              Changer le mot de passe
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Mot de passe actuel</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Nouveau mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wider">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 transition-all"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-sm text-zinc-300 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 px-4 py-2.5 bg-yellow-500 hover:bg-yellow-400 rounded-xl text-sm font-semibold text-zinc-900 transition-colors"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
