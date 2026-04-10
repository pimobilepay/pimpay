'use client';

import React, { useState } from 'react';
import {
  Settings, Save, Upload, Shield, Bell, Link2, CreditCard, Eye, EyeOff,
  Copy, Check, X, Smartphone, Monitor, Globe, Lock, Key, Trash2,
  Mail, MessageSquare, Wifi, WifiOff, Download,
} from 'lucide-react';

type Tab = 'profil' | 'securite' | 'notifications' | 'integrations' | 'facturation';
interface Session { id: number; device: string; ip: string; location: string; lastActive: string; current: boolean; }
interface LoginEntry { id: number; date: string; ip: string; device: string; status: 'success' | 'failed'; }
interface BillingRow { id: string; date: string; description: string; amount: number; }

const SESSIONS: Session[] = [
  { id: 1, device: 'MacBook Pro — Chrome', ip: '197.159.2.45', location: 'Douala, CM', lastActive: 'Maintenant', current: true },
  { id: 2, device: 'iPhone 15 — Safari', ip: '197.159.2.48', location: 'Douala, CM', lastActive: 'Il y a 2 heures', current: false },
  { id: 3, device: 'Windows PC — Firefox', ip: '41.202.219.73', location: 'Yaoundé, CM', lastActive: 'Il y a 1 jour', current: false },
];

const LOGIN_HISTORY: LoginEntry[] = [
  { id: 1, date: '2024-04-10 14:23', ip: '197.159.2.45', device: 'Chrome / macOS', status: 'success' },
  { id: 2, date: '2024-04-10 09:15', ip: '197.159.2.48', device: 'Safari / iOS', status: 'success' },
  { id: 3, date: '2024-04-09 22:30', ip: '41.202.219.73', device: 'Firefox / Windows', status: 'success' },
  { id: 4, date: '2024-04-09 18:45', ip: '102.16.42.8', device: 'Chrome / Android', status: 'failed' },
  { id: 5, date: '2024-04-08 11:00', ip: '197.159.2.45', device: 'Chrome / macOS', status: 'success' },
  { id: 6, date: '2024-04-07 08:22', ip: '197.159.2.48', device: 'Safari / iOS', status: 'success' },
];

const BILLING_HISTORY: BillingRow[] = [
  { id: 'BILL-2024-04', date: '2024-04-01', description: 'Plan Entreprise — Avril 2024', amount: 150000 },
  { id: 'BILL-2024-03', date: '2024-03-01', description: 'Plan Entreprise — Mars 2024', amount: 150000 },
  { id: 'BILL-2024-02', date: '2024-02-01', description: 'Plan Entreprise — Février 2024', amount: 150000 },
  { id: 'BILL-2024-01', date: '2024-01-01', description: 'Plan Entreprise — Janvier 2024', amount: 150000 },
  { id: 'BILL-2023-12', date: '2023-12-01', description: 'Plan Entreprise — Décembre 2023', amount: 150000 },
];

const INTEGRATIONS = [
  { id: 'orange', name: 'Orange Money', description: 'Paiements mobiles via Orange Money Cameroun', icon: '🟠', connected: true },
  { id: 'mtn', name: 'MTN MoMo', description: 'Paiements mobiles via MTN Mobile Money', icon: '🟡', connected: true },
  { id: 'bank', name: 'API Bancaire', description: 'Connexion aux APIs des banques partenaires', icon: '🏦', connected: true },
  { id: 'ohada', name: 'OHADA Comptabilité', description: 'Exportation automatique au format SYSCOHADA', icon: '📊', connected: false },
];

const NOTIF_CATEGORIES = [
  { key: 'payments', label: 'Paiements', desc: 'Paiements envoyés, reçus ou échoués' },
  { key: 'invoices', label: 'Factures', desc: 'Nouvelles factures et rappels' },
  { key: 'employees', label: 'Employés', desc: 'Ajouts, modifications de personnel' },
  { key: 'reports', label: 'Rapports', desc: 'Rapports générés et disponibles' },
  { key: 'security', label: 'Sécurité', desc: 'Connexions suspectes et alertes' },
];

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' XAF';

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('profil');
  const [showPw, setShowPw] = useState(false);
  const [twoFA, setTwoFA] = useState(true);
  const [copied, setCopied] = useState(false);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifFreq, setNotifFreq] = useState('immediate');
  const [notifCats, setNotifCats] = useState<Record<string, boolean>>({ payments: true, invoices: true, employees: true, reports: false, security: true });
  const [integs, setIntegs] = useState(INTEGRATIONS);
  const [saved, setSaved] = useState(false);

  const tabList: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profil', label: 'Profil', icon: Settings },
    { key: 'securite', label: 'Sécurité', icon: Shield },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'integrations', label: 'Intégrations', icon: Link2 },
    { key: 'facturation', label: 'Facturation', icon: CreditCard },
  ];

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const handleCopy = () => { navigator.clipboard?.writeText('pk_live_aBcDeFgHiJkLmNoPqRsT'); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  const toggleInteg = (id: string) => setIntegs(prev => prev.map(i => i.id === id ? { ...i, connected: !i.connected } : i));

  const Toggle = ({ on, onToggle }: { on: boolean; onToggle: () => void }) => (
    <button onClick={onToggle} className={`relative w-11 h-6 rounded-full transition-colors ${on ? 'bg-indigo-600' : 'bg-white/10'}`}>
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? 'translate-x-5' : ''}`} />
    </button>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center"><Settings className="w-5 h-5 text-indigo-400" /></div>
          <div><h1 className="text-xl font-bold text-white">Paramètres</h1><p className="text-sm text-gray-400">Gérez votre profil, la sécurité et les préférences</p></div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1 overflow-x-auto">
        {tabList.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${tab === t.key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* PROFIL */}
      {tab === 'profil' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Informations de l&apos;entreprise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ label: "Nom de l'entreprise", value: 'PimPay Technologies SARL' },{ label: 'RCCM', value: 'RC/DLA/2022/B/4521' },{ label: 'NIU', value: 'M042312456789A' },{ label: 'Adresse', value: 'Rue Joss, Bonanjo' },{ label: 'Ville', value: 'Douala' },{ label: 'Pays', value: 'Cameroun' },{ label: 'Téléphone', value: '+237 233 42 18 90' },{ label: 'Email', value: 'contact@pimpay.cm' }].map((f, i) => (
                <div key={i}><label className="block text-xs text-gray-400 mb-1.5">{f.label}</label><input defaultValue={f.value} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500" /></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs text-gray-400 mb-1.5">Fuseau horaire</label><select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"><option>Africa/Douala (WAT +01:00)</option><option>Africa/Lagos (WAT +01:00)</option></select></div>
              <div><label className="block text-xs text-gray-400 mb-1.5">Langue</label><select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"><option>Français</option><option>English</option></select></div>
            </div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Logo</h2>
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">PP</div>
              <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors"><Upload className="w-4 h-4" />Changer le logo</button>
              <p className="text-xs text-gray-500 text-center">PNG, JPG ou SVG. Max 2 Mo.</p>
            </div>
          </div>
        </div>
      )}

      {/* SÉCURITÉ */}
      {tab === 'securite' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Lock className="w-5 h-5 text-indigo-400" />Changer le mot de passe</h2>
              {['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer'].map((l, i) => (
                <div key={i}><label className="block text-xs text-gray-400 mb-1.5">{l}</label><div className="relative"><input type={showPw ? 'text' : 'password'} placeholder="••••••••" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 pr-10" /><button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-2.5 text-gray-400 hover:text-white">{showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button></div></div>
              ))}
              <button className="w-full px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-medium rounded-lg transition-all">Mettre à jour</button>
            </div>
            <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Key className="w-5 h-5 text-amber-400" />Authentification 2FA</h2>
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div><p className="text-sm font-medium text-white">2FA par SMS</p><p className="text-xs text-gray-400">Code SMS à chaque connexion</p></div>
                <Toggle on={twoFA} onToggle={() => setTwoFA(!twoFA)} />
              </div>
              <div className={`p-3 rounded-lg text-xs ${twoFA ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                {twoFA ? '✓ 2FA activée' : '⚠ Recommandé d\'activer le 2FA'}
              </div>
            </div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Sessions actives</h2>
            <div className="space-y-3">{SESSIONS.map(s => (
              <div key={s.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">{s.device.includes('iPhone') ? <Smartphone className="w-5 h-5 text-gray-400" /> : <Monitor className="w-5 h-5 text-gray-400" />}</div>
                  <div><p className="text-sm font-medium text-white">{s.device}{s.current && <span className="ml-2 text-xs text-emerald-400">(Cette session)</span>}</p><p className="text-xs text-gray-500">{s.ip} — {s.location} — {s.lastActive}</p></div>
                </div>
                {!s.current && <button className="px-3 py-1.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/20 transition-colors">Révoquer</button>}
              </div>
            ))}</div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Historique de connexion</h2>
            <table className="w-full text-sm"><thead><tr className="text-left text-gray-500 text-xs uppercase"><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">IP</th><th className="pb-3 pr-4">Appareil</th><th className="pb-3">Statut</th></tr></thead>
            <tbody className="divide-y divide-white/5">{LOGIN_HISTORY.map(l => (
              <tr key={l.id} className="hover:bg-white/[0.02]"><td className="py-3 pr-4 text-gray-300">{l.date}</td><td className="py-3 pr-4 text-gray-400 font-mono text-xs">{l.ip}</td><td className="py-3 pr-4 text-gray-400">{l.device}</td>
              <td className="py-3"><span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${l.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{l.status === 'success' ? 'Succès' : 'Échec'}</span></td></tr>
            ))}</tbody></table>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS */}
      {tab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Canaux</h2>
            {[{ label: 'Email', desc: 'Alertes sur votre adresse email', icon: Mail, on: notifEmail, toggle: () => setNotifEmail(!notifEmail) },{ label: 'Push', desc: 'Navigateur et mobile', icon: Bell, on: notifPush, toggle: () => setNotifPush(!notifPush) },{ label: 'SMS', desc: 'Alertes critiques par SMS', icon: MessageSquare, on: notifSMS, toggle: () => setNotifSMS(!notifSMS) }].map((n, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-indigo-500/20 flex items-center justify-center"><n.icon className="w-4 h-4 text-indigo-400" /></div><div><p className="text-sm font-medium text-white">{n.label}</p><p className="text-xs text-gray-400">{n.desc}</p></div></div>
                <Toggle on={n.on} onToggle={n.toggle} />
              </div>
            ))}
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Catégories</h2>
            {NOTIF_CATEGORIES.map(c => (
              <div key={c.key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div><p className="text-sm font-medium text-white">{c.label}</p><p className="text-xs text-gray-400">{c.desc}</p></div>
                <Toggle on={notifCats[c.key]} onToggle={() => setNotifCats(prev => ({ ...prev, [c.key]: !prev[c.key] }))} />
              </div>
            ))}
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Fréquence</h2>
            <div className="flex gap-3">{[{ k: 'immediate', l: 'Immédiat' },{ k: 'daily', l: 'Quotidien' },{ k: 'weekly', l: 'Hebdomadaire' }].map(f => (
              <button key={f.k} onClick={() => setNotifFreq(f.k)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${notifFreq === f.k ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>{f.l}</button>
            ))}</div>
          </div>
        </div>
      )}

      {/* INTÉGRATIONS */}
      {tab === 'integrations' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{integs.map(ig => (
            <div key={ig.id} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><span className="text-2xl">{ig.icon}</span><div><p className="text-sm font-semibold text-white">{ig.name}</p><p className="text-xs text-gray-400">{ig.description}</p></div></div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${ig.connected ? 'bg-emerald-500/10 text-emerald-400' : 'bg-gray-500/10 text-gray-400'}`}>
                  {ig.connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}{ig.connected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
              <button onClick={() => toggleInteg(ig.id)} className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all ${ig.connected ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'}`}>{ig.connected ? 'Déconnecter' : 'Connecter'}</button>
            </div>
          ))}</div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Clé API</h2>
            <div className="flex items-center gap-3">
              <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg font-mono text-sm text-gray-300">pk_live_••••••••••••RsT</div>
              <button onClick={handleCopy} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">{copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}</button>
            </div>
            <div><label className="block text-xs text-gray-400 mb-1.5">URL Webhook</label><input defaultValue="https://api.pimpay.cm/webhooks/business/evt_123" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:border-indigo-500" /></div>
          </div>
        </div>
      )}

      {/* FACTURATION */}
      {tab === 'facturation' && (
        <div className="space-y-6">
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-lg font-semibold text-white">Plan Entreprise</h2><p className="text-sm text-gray-400">Abonnement actuel</p></div>
              <div className="text-right"><p className="text-2xl font-bold text-white">150 000 <span className="text-sm text-gray-400">XAF/mois</span></p><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">Actif</span></div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">{[{ label: 'Transactions/mois', value: '2 847 / 10 000', pct: 28 },{ label: 'Utilisateurs', value: '8 / 25', pct: 32 },{ label: 'Stockage', value: '4.2 Go / 20 Go', pct: 21 }].map((u, i) => (
              <div key={i} className="bg-white/5 rounded-lg p-4"><p className="text-xs text-gray-400 mb-1">{u.label}</p><p className="text-sm font-semibold text-white mb-2">{u.value}</p><div className="w-full h-1.5 bg-white/10 rounded-full"><div className="h-full bg-indigo-500 rounded-full" style={{ width: u.pct + '%' }} /></div></div>
            ))}</div>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Historique de facturation</h2>
            <table className="w-full text-sm"><thead><tr className="text-left text-gray-500 text-xs uppercase"><th className="pb-3 pr-4">Réf.</th><th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Description</th><th className="pb-3 pr-4">Montant</th><th className="pb-3 pr-4">Statut</th><th className="pb-3"></th></tr></thead>
            <tbody className="divide-y divide-white/5">{BILLING_HISTORY.map(b => (
              <tr key={b.id} className="hover:bg-white/[0.02]"><td className="py-3 pr-4 text-gray-300 font-mono text-xs">{b.id}</td><td className="py-3 pr-4 text-gray-400">{b.date}</td><td className="py-3 pr-4 text-gray-300">{b.description}</td><td className="py-3 pr-4 text-white font-medium">{fmt(b.amount)}</td><td className="py-3 pr-4"><span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">Payé</span></td><td className="py-3"><button className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white"><Download className="w-4 h-4" /></button></td></tr>
            ))}</tbody></table>
          </div>
          <div className="bg-[#0a0f1c] border border-white/5 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Moyen de paiement</h2>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center"><CreditCard className="w-5 h-5 text-indigo-400" /></div><div><p className="text-sm font-medium text-white">Carte Visa ••••4821</p><p className="text-xs text-gray-400">Expire 08/2026</p></div></div>
              <button className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 hover:bg-white/10 transition-colors">Modifier</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}