'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Settings, Save, Upload, Shield, Bell, Link2, CreditCard, Eye, EyeOff,
  Copy, Check, X, Smartphone, Monitor, Globe, Lock, Key, Trash2,
  Mail, MessageSquare, Wifi, WifiOff, Download, Loader2, RefreshCw,
} from 'lucide-react';

type Tab = 'profil' | 'securite' | 'notifications' | 'integrations' | 'facturation';

interface ProfileData {
  // Admin info
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminAvatar: string | null;
  // Business info
  companyName: string;
  rccm: string;
  niu: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  timezone: string;
  language: string;
  logoUrl: string;
  businessId: string | null;
  businessStatus: string;
  businessType: string;
  businessCategory: string;
  businessDescription: string;
}

interface Session {
  id: number;
  sessionId?: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
}

interface SecurityData {
  twoFactorEnabled: boolean;
  twoFactorMethod: string;
  recoveryPhone: string;
  passwordLastChanged: string;
  activeSessions: Session[];
}

interface NotificationsData {
  channels: { email: boolean; push: boolean; sms: boolean };
  categories: Record<string, boolean>;
  frequency: string;
}

interface Integration {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  connected: boolean;
  lastSync: string | null;
}

interface BillingData {
  plan: string;
  planName: string;
  pricePerMonth: number;
  currency: string;
  status: string;
  usage: {
    transactions: { used: number; limit: number };
    users: { used: number; limit: number };
    storage: { usedGb: number; limitGb: number };
  };
  paymentMethod: { type: string; last4: string; expiry: string };
  history: { id: string; date: string; description: string; amount: number; status: string }[];
}

interface LoginEntry {
  id: number;
  date: string;
  ip: string;
  device: string;
  status: 'success' | 'failed';
}

const INTEGRATIONS_META: Record<string, { description: string; icon: string }> = {
  orange: { description: 'Paiements mobiles via Orange Money Cameroun', icon: '🟠' },
  mtn: { description: 'Paiements mobiles via MTN Mobile Money', icon: '🟡' },
  bank: { description: 'Connexion aux APIs des banques partenaires', icon: '🏦' },
  ohada: { description: 'Exportation automatique au format SYSCOHADA', icon: '📊' },
};

const NOTIF_CATEGORIES = [
  { key: 'payments', label: 'Paiements', desc: 'Paiements envoyes, recus ou echoues' },
  { key: 'invoices', label: 'Factures', desc: 'Nouvelles factures et rappels' },
  { key: 'employees', label: 'Employes', desc: 'Ajouts, modifications de personnel' },
  { key: 'reports', label: 'Rapports', desc: 'Rapports generes et disponibles' },
  { key: 'security', label: 'Securite', desc: 'Connexions suspectes et alertes' },
];

const LOGIN_HISTORY: LoginEntry[] = [
  { id: 1, date: '2024-04-10 14:23', ip: '197.159.2.45', device: 'Chrome / macOS', status: 'success' },
  { id: 2, date: '2024-04-10 09:15', ip: '197.159.2.48', device: 'Safari / iOS', status: 'success' },
  { id: 3, date: '2024-04-09 22:30', ip: '41.202.219.73', device: 'Firefox / Windows', status: 'success' },
  { id: 4, date: '2024-04-09 18:45', ip: '102.16.42.8', device: 'Chrome / Android', status: 'failed' },
  { id: 5, date: '2024-04-08 11:00', ip: '197.159.2.45', device: 'Chrome / macOS', status: 'success' },
  { id: 6, date: '2024-04-07 08:22', ip: '197.159.2.48', device: 'Safari / iOS', status: 'success' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  
  const [tab, setTab] = useState<Tab>('profil');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  // Data states
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [security, setSecurity] = useState<SecurityData | null>(null);
  const [notifications, setNotifications] = useState<NotificationsData | null>(null);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [billing, setBilling] = useState<BillingData | null>(null);

  // Form states
  const [formProfile, setFormProfile] = useState<Partial<ProfileData>>({});
  const [twoFA, setTwoFA] = useState(true);
  const [notifChannels, setNotifChannels] = useState({ email: true, push: true, sms: false });
  const [notifCats, setNotifCats] = useState<Record<string, boolean>>({});
  const [notifFreq, setNotifFreq] = useState('immediate');

  // Set tab from URL param
  useEffect(() => {
    if (tabParam) {
      const tabMap: Record<string, Tab> = {
        'profile': 'profil',
        'general': 'profil',
        'security': 'securite',
        'notifications': 'notifications',
        'integrations': 'integrations',
        'billing': 'facturation',
      };
      if (tabMap[tabParam]) {
        setTab(tabMap[tabParam]);
      }
    }
  }, [tabParam]);

  // Fetch all settings data
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/business/settings');
      if (res.ok) {
        const { data } = await res.json();
        
        // Profile
        if (data.profile) {
          setProfile(data.profile);
          setFormProfile(data.profile);
        }
        
        // Security
        if (data.security) {
          setSecurity(data.security);
          setTwoFA(data.security.twoFactorEnabled);
        }
        
        // Notifications
        if (data.notifications) {
          setNotifications(data.notifications);
          setNotifChannels(data.notifications.channels);
          setNotifCats(data.notifications.categories);
          setNotifFreq(data.notifications.frequency);
        }
        
        // Integrations
        if (data.integrations) {
          setIntegrations(data.integrations.map((ig: Integration) => ({
            ...ig,
            description: INTEGRATIONS_META[ig.id]?.description || '',
            icon: INTEGRATIONS_META[ig.id]?.icon || '🔌',
          })));
        }
        
        // Billing
        if (data.billing) {
          setBilling({
            ...data.billing,
            history: [
              { id: 'BILL-2024-04', date: '2024-04-01', description: 'Plan Entreprise - Avril 2024', amount: data.billing.pricePerMonth, status: 'paid' },
              { id: 'BILL-2024-03', date: '2024-03-01', description: 'Plan Entreprise - Mars 2024', amount: data.billing.pricePerMonth, status: 'paid' },
              { id: 'BILL-2024-02', date: '2024-02-01', description: 'Plan Entreprise - Fevrier 2024', amount: data.billing.pricePerMonth, status: 'paid' },
            ],
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save profile
      if (tab === 'profil') {
        await fetch('/api/business/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'profile', data: formProfile }),
        });
      }
      // Save security
      else if (tab === 'securite') {
        await fetch('/api/business/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section: 'security', data: { twoFactorEnabled: twoFA } }),
        });
      }
      // Save notifications
      else if (tab === 'notifications') {
        await fetch('/api/business/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            section: 'notifications', 
            data: { channels: notifChannels, categories: notifCats, frequency: notifFreq } 
          }),
        });
      }
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText('pk_live_aBcDeFgHiJkLmNoPqRsT');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleInteg = async (id: string) => {
    const integ = integrations.find(i => i.id === id);
    if (!integ) return;
    
    if (integ.connected) {
      await fetch('/api/business/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'integration', id }),
      });
    }
    
    setIntegrations(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i));
  };

  const revokeSession = async (sessionId: number, realSessionId?: string) => {
    await fetch('/api/business/settings', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'session', id: sessionId, sessionId: realSessionId }),
    });
    
    if (security) {
      setSecurity({
        ...security,
        activeSessions: security.activeSessions.filter(s => s.id !== sessionId),
      });
    }
  };

  const updateFormProfile = (field: keyof ProfileData, value: string) => {
    setFormProfile(prev => ({ ...prev, [field]: value }));
  };

  const tabList: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profil', label: 'Profil', icon: Settings },
    { key: 'securite', label: 'Securite', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'integrations', label: 'Integrations', icon: Link2 },
    { key: 'facturation', label: 'Facturation', icon: CreditCard },
  ];

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );

  const formatSessionTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (diff < 60000) return 'Maintenant';
    if (hours < 1) return `Il y a ${Math.floor(diff / 60000)} minutes`;
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-gray-400">Chargement des parametres...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Parametres</h1>
            <p className="text-sm text-gray-400">Gerez votre profil, la securite et les preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchSettings}
            className="p-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Enregistrement...' : saved ? 'Enregistre !' : 'Enregistrer'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 overflow-x-auto">
        {tabList.map(t => (
          <button 
            key={t.key} 
            onClick={() => setTab(t.key)} 
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* PROFIL */}
      {tab === 'profil' && profile && (
        <div className="space-y-6">
          {/* Admin Profile Card */}
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Profil Administrateur</h2>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="relative">
                {profile.adminAvatar ? (
                  <img 
                    src={profile.adminAvatar} 
                    alt={profile.adminName || 'Admin'} 
                    className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                    {profile.adminName?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'AD'}
                  </div>
                )}
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-500 transition-colors">
                  <Upload className="w-4 h-4" />
                </button>
              </div>
              {/* Admin Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-xl font-semibold text-white">{profile.adminName || 'Administrateur'}</p>
                  <p className="text-sm text-indigo-400">Administrateur Business</p>
                </div>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Mail className="w-4 h-4" />
                    <span>{profile.adminEmail || 'Non defini'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Smartphone className="w-4 h-4" />
                    <span>{profile.adminPhone || 'Non defini'}</span>
                  </div>
                </div>
              </div>
              {/* Business Status Badge */}
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  profile.businessStatus === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                  profile.businessStatus === 'PENDING_VERIFICATION' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {profile.businessStatus === 'ACTIVE' ? 'Verifie' : 
                   profile.businessStatus === 'PENDING_VERIFICATION' ? 'En attente' : 'Suspendu'}
                </span>
                {profile.businessId && (
                  <span className="text-xs text-gray-500">ID: {profile.businessId.substring(0, 8)}...</span>
                )}
              </div>
            </div>
          </div>

          {/* Business Info Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-5">
              <h2 className="text-lg font-semibold text-white">Informations de l&apos;entreprise</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Nom de l&apos;entreprise</label>
                <input 
                  value={formProfile.companyName || ''} 
                  onChange={(e) => updateFormProfile('companyName', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">RCCM</label>
                <input 
                  value={formProfile.rccm || ''} 
                  onChange={(e) => updateFormProfile('rccm', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">NIU</label>
                <input 
                  value={formProfile.niu || ''} 
                  onChange={(e) => updateFormProfile('niu', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Adresse</label>
                <input 
                  value={formProfile.address || ''} 
                  onChange={(e) => updateFormProfile('address', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Ville</label>
                <input 
                  value={formProfile.city || ''} 
                  onChange={(e) => updateFormProfile('city', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Pays</label>
                <input 
                  value={formProfile.country || ''} 
                  onChange={(e) => updateFormProfile('country', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Telephone</label>
                <input 
                  value={formProfile.phone || ''} 
                  onChange={(e) => updateFormProfile('phone', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Email</label>
                <input 
                  value={formProfile.email || ''} 
                  onChange={(e) => updateFormProfile('email', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" 
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Fuseau horaire</label>
                <select 
                  value={formProfile.timezone || 'Africa/Douala'}
                  onChange={(e) => updateFormProfile('timezone', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Africa/Douala">Africa/Douala (WAT +01:00)</option>
                  <option value="Africa/Lagos">Africa/Lagos (WAT +01:00)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Langue</label>
                <select 
                  value={formProfile.language || 'fr'}
                  onChange={(e) => updateFormProfile('language', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="fr">Francais</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
            <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">Logo Entreprise</h2>
              <div className="flex flex-col items-center gap-4">
                {profile.logoUrl ? (
                  <img 
                    src={profile.logoUrl} 
                    alt={profile.companyName || 'Logo'} 
                    className="w-24 h-24 rounded-xl object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                    {profile.companyName?.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || 'PP'}
                  </div>
                )}
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">
                  <Upload className="w-4 h-4" />Changer le logo
                </button>
                <p className="text-xs text-gray-500 text-center">PNG, JPG ou SVG. Max 2 Mo.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECURITE */}
      {tab === 'securite' && security && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Lock className="w-5 h-5 text-indigo-400" />Changer le mot de passe
              </h2>
              {['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer'].map((l, i) => (
                <div key={i}>
                  <label className="block text-xs text-gray-400 mb-1.5">{l}</label>
                  <div className="relative">
                    <input 
                      type={showPw ? 'text' : 'password'} 
                      placeholder="••••••••" 
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 pr-10" 
                    />
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-white">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <p className="text-xs text-gray-500">Dernier changement: {security.passwordLastChanged}</p>
              <button className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all">
                Mettre a jour
              </button>
            </div>
            <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />Authentification 2FA
              </h2>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">2FA par {security.twoFactorMethod?.toUpperCase()}</p>
                  <p className="text-xs text-gray-400">Code envoye a {security.recoveryPhone}</p>
                </div>
                <Toggle on={twoFA} onToggle={() => setTwoFA(!twoFA)} />
              </div>
              <div className={`p-3 rounded-lg text-xs ${twoFA ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {twoFA ? '2FA activee' : 'Recommande d\'activer le 2FA'}
              </div>
            </div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Sessions actives ({security.activeSessions.length})</h2>
            <div className="space-y-3">
              {security.activeSessions.map(s => (
                <div key={s.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      {s.device.includes('iPhone') || s.device.includes('Safari') ? (
                        <Smartphone className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Monitor className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {s.device}
                        {s.current && <span className="ml-2 text-xs text-emerald-400">(Cette session)</span>}
                      </p>
                      <p className="text-xs text-gray-500">{s.ip} - {s.location} - {formatSessionTime(s.lastActive)}</p>
                    </div>
                  </div>
                  {!s.current && (
                    <button 
                      onClick={() => revokeSession(s.id, s.sessionId)}
                      className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      Revoquer
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Historique de connexion</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">IP</th>
                  <th className="pb-3 pr-4">Appareil</th>
                  <th className="pb-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {LOGIN_HISTORY.map(l => (
                  <tr key={l.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-gray-300">{l.date}</td>
                    <td className="py-3 pr-4 text-gray-400 font-mono text-xs">{l.ip}</td>
                    <td className="py-3 pr-4 text-gray-400">{l.device}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${l.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {l.status === 'success' ? 'Succes' : 'Echec'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Canaux</h2>
            {[
              { label: 'Email', desc: 'Alertes sur votre adresse email', icon: Mail, key: 'email' as const },
              { label: 'Push', desc: 'Navigateur et mobile', icon: Bell, key: 'push' as const },
              { label: 'SMS', desc: 'Alertes critiques par SMS', icon: MessageSquare, key: 'sms' as const }
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                    <n.icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{n.label}</p>
                    <p className="text-xs text-gray-400">{n.desc}</p>
                  </div>
                </div>
                <Toggle 
                  on={notifChannels[n.key]} 
                  onToggle={() => setNotifChannels(prev => ({ ...prev, [n.key]: !prev[n.key] }))} 
                />
              </div>
            ))}
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Categories</h2>
            {NOTIF_CATEGORIES.map(c => (
              <div key={c.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">{c.label}</p>
                  <p className="text-xs text-gray-400">{c.desc}</p>
                </div>
                <Toggle 
                  on={notifCats[c.key] || false} 
                  onToggle={() => setNotifCats(prev => ({ ...prev, [c.key]: !prev[c.key] }))} 
                />
              </div>
            ))}
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Frequence</h2>
            <div className="flex gap-3">
              {[
                { k: 'immediate', l: 'Immediat' },
                { k: 'daily', l: 'Quotidien' },
                { k: 'weekly', l: 'Hebdomadaire' }
              ].map(f => (
                <button 
                  key={f.k} 
                  onClick={() => setNotifFreq(f.k)} 
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${notifFreq === f.k ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* INTEGRATIONS */}
      {tab === 'integrations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {integrations.map(ig => (
              <div key={ig.id} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ig.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{ig.name}</p>
                      <p className="text-xs text-gray-400">{ig.description}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ig.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                    {ig.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    {ig.connected ? 'Connecte' : 'Deconnecte'}
                  </span>
                </div>
                <button 
                  onClick={() => toggleInteg(ig.id)} 
                  className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all ${ig.connected ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'}`}
                >
                  {ig.connected ? 'Deconnecter' : 'Connecter'}
                </button>
              </div>
            ))}
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Cle API</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg font-mono text-sm text-gray-300">
                pk_live_••••••••••••RsT
              </div>
              <button 
                onClick={handleCopy} 
                className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">URL Webhook</label>
              <input 
                defaultValue="https://api.pimpay.cm/webhooks/business/evt_123" 
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:border-indigo-500" 
              />
            </div>
          </div>
        </div>
      )}

      {/* FACTURATION */}
      {tab === 'facturation' && billing && (
        <div className="space-y-6">
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">{billing.planName}</h2>
                <p className="text-sm text-gray-400">Abonnement actuel</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-white">
                  {fmt(billing.pricePerMonth).replace(' XAF', '')} <span className="text-sm text-gray-400">XAF/mois</span>
                </p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${billing.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                  {billing.status === 'active' ? 'Actif' : 'Inactif'}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Transactions/mois</p>
                <p className="text-sm font-semibold text-white mb-2">
                  {billing.usage.transactions.used.toLocaleString()} / {billing.usage.transactions.limit.toLocaleString()}
                </p>
                <div className="w-full h-1.5 bg-white/10 rounded-full">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${(billing.usage.transactions.used / billing.usage.transactions.limit) * 100}%` }} 
                  />
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Utilisateurs</p>
                <p className="text-sm font-semibold text-white mb-2">
                  {billing.usage.users.used} / {billing.usage.users.limit}
                </p>
                <div className="w-full h-1.5 bg-white/10 rounded-full">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${(billing.usage.users.used / billing.usage.users.limit) * 100}%` }} 
                  />
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <p className="text-xs text-gray-400 mb-1">Stockage</p>
                <p className="text-sm font-semibold text-white mb-2">
                  {billing.usage.storage.usedGb} Go / {billing.usage.storage.limitGb} Go
                </p>
                <div className="w-full h-1.5 bg-white/10 rounded-full">
                  <div 
                    className="h-full bg-indigo-500 rounded-full" 
                    style={{ width: `${(billing.usage.storage.usedGb / billing.usage.storage.limitGb) * 100}%` }} 
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Historique de facturation</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 text-xs uppercase">
                  <th className="pb-3 pr-4">Ref.</th>
                  <th className="pb-3 pr-4">Date</th>
                  <th className="pb-3 pr-4">Description</th>
                  <th className="pb-3 pr-4">Montant</th>
                  <th className="pb-3 pr-4">Statut</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {billing.history?.map(b => (
                  <tr key={b.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 pr-4 text-gray-300 font-mono text-xs">{b.id}</td>
                    <td className="py-3 pr-4 text-gray-400">{b.date}</td>
                    <td className="py-3 pr-4 text-gray-300">{b.description}</td>
                    <td className="py-3 pr-4 text-white font-medium">{fmt(b.amount)}</td>
                    <td className="py-3 pr-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                        Paye
                      </span>
                    </td>
                    <td className="py-3">
                      <button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white">
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Moyen de paiement</h2>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Carte {billing.paymentMethod.type.charAt(0).toUpperCase() + billing.paymentMethod.type.slice(1)} ••••{billing.paymentMethod.last4}
                  </p>
                  <p className="text-xs text-gray-400">Expire {billing.paymentMethod.expiry}</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">
                Modifier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
