'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity, Database, Globe, Wifi, AlertTriangle, CheckCircle, Clock, TrendingUp, TrendingDown, Zap, RefreshCw, Bell, Server, ArrowUpRight, ArrowDownRight, Circle } from 'lucide-react';

const CEMAC_COUNTRIES = [
  { code: 'CM', name: 'Cameroun', count: 4821, pct: 38 },
  { code: 'CG', name: 'Congo', count: 2134, pct: 17 },
  { code: 'GA', name: 'Gabon', count: 1987, pct: 16 },
  { code: 'TD', name: 'Tchad', count: 1654, pct: 13 },
  { code: 'CF', name: 'Centrafrique', count: 987, pct: 8 },
  { code: 'GQ', name: 'Guinée Éq.', count: 1043, pct: 8 },
];

const SYSTEM_SERVICES = [
  { name: 'API Gateway', status: 'operational', latency: '12ms', uptime: '99.98%' },
  { name: 'Base de données', status: 'operational', latency: '4ms', uptime: '99.99%' },
  { name: 'WebSocket', status: 'operational', latency: '8ms', uptime: '99.95%' },
  { name: 'ISO Gateway', status: 'degraded', latency: '145ms', uptime: '97.12%' },
];

const INITIAL_ALERTS = [
  { id: 1, severity: 'warning', message: 'ISO Gateway: latence élevée détectée (>100ms)', time: '14:32:11', service: 'ISO Gateway' },
  { id: 2, severity: 'info', message: 'Pic de trafic détecté sur le nœud CM-01', time: '14:28:45', service: 'API Gateway' },
  { id: 3, severity: 'error', message: 'Timeout connexion TD-03 — reconnexion auto', time: '14:15:22', service: 'WebSocket' },
  { id: 4, severity: 'info', message: 'Mise à jour certificat SSL — expiration dans 30j', time: '13:55:10', service: 'Sécurité' },
  { id: 5, severity: 'warning', message: 'Mémoire heap > 85% sur serveur PROD-02', time: '13:41:07', service: 'Infrastructure' },
];

const VOLUME_DATA = [
  { hour: '00h', vol: 312 }, { hour: '01h', vol: 189 }, { hour: '02h', vol: 97 },
  { hour: '03h', vol: 74 }, { hour: '04h', vol: 112 }, { hour: '05h', vol: 234 },
  { hour: '06h', vol: 567 }, { hour: '07h', vol: 892 }, { hour: '08h', vol: 1243 },
  { hour: '09h', vol: 1876 }, { hour: '10h', vol: 2134 }, { hour: '11h', vol: 2456 },
  { hour: '12h', vol: 2789 }, { hour: '13h', vol: 2654 }, { hour: '14h', vol: 2987 },
  { hour: '15h', vol: 0 }, { hour: '16h', vol: 0 }, { hour: '17h', vol: 0 },
  { hour: '18h', vol: 0 }, { hour: '19h', vol: 0 }, { hour: '20h', vol: 0 },
  { hour: '21h', vol: 0 }, { hour: '22h', vol: 0 }, { hour: '23h', vol: 0 },
];

const TX_TYPES = ['TRANSFERT', 'PAIEMENT', 'RETRAIT', 'DEPOT', 'VIREMENT'];
const TX_STATUSES = ['SUCCESS', 'SUCCESS', 'SUCCESS', 'SUCCESS', 'PENDING', 'FAILED'];
const TX_COUNTRIES = ['CM', 'CG', 'GA', 'TD', 'CF', 'GQ'];

function generateTx(id: number) {
  const type = TX_TYPES[Math.floor(Math.random() * TX_TYPES.length)];
  const status = TX_STATUSES[Math.floor(Math.random() * TX_STATUSES.length)];
  const country = TX_COUNTRIES[Math.floor(Math.random() * TX_COUNTRIES.length)];
  const amount = (Math.random() * 500000 + 1000).toFixed(0);
  const now = new Date();
  const time = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const ref = `PMP${Date.now().toString(36).toUpperCase().slice(-8)}`;
  const latency = Math.floor(Math.random() * 200 + 10);
  return { id, type, status, country, amount, time, ref, latency };
}

const INITIAL_TXS = Array.from({ length: 20 }, (_, i) => generateTx(i));

export default function MonitoringPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [transactions, setTransactions] = useState(INITIAL_TXS);
  const [tps, setTps] = useState(47.3);
  const [avgLatency, setAvgLatency] = useState(28);
  const [errorRate, setErrorRate] = useState(0.34);
  const [uptime] = useState(99.97);
  const [isLive, setIsLive] = useState(true);
  const [newTxFlash, setNewTxFlash] = useState(false);
  const [txCounter, setTxCounter] = useState(20);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      setTxCounter(c => {
        const newId = c + 1;
        const newTx = generateTx(newId);
        setTransactions(prev => [newTx, ...prev.slice(0, 19)]);
        setNewTxFlash(true);
        setTimeout(() => setNewTxFlash(false), 600);
        return newId;
      });
      setTps(v => parseFloat((v + (Math.random() - 0.5) * 3).toFixed(1)));
      setAvgLatency(v => Math.max(8, Math.min(200, v + Math.floor((Math.random() - 0.5) * 8))));
      setErrorRate(v => parseFloat(Math.max(0, Math.min(5, v + (Math.random() - 0.5) * 0.1)).toFixed(2)));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  const maxVol = Math.max(...VOLUME_DATA.map(d => d.vol));

  const statusColor = (s: string) => {
    if (s === 'operational') return 'text-emerald-400';
    if (s === 'degraded') return 'text-yellow-400';
    return 'text-red-400';
  };
  const statusDot = (s: string) => {
    if (s === 'operational') return 'bg-emerald-400 shadow-emerald-400/60';
    if (s === 'degraded') return 'bg-yellow-400 shadow-yellow-400/60 animate-pulse';
    return 'bg-red-500 shadow-red-500/60 animate-pulse';
  };
  const statusLabel = (s: string) => {
    if (s === 'operational') return 'Opérationnel';
    if (s === 'degraded') return 'Dégradé';
    return 'Hors ligne';
  };

  const txStatusStyle = (s: string) => {
    if (s === 'SUCCESS') return 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20';
    if (s === 'PENDING') return 'text-yellow-400 bg-yellow-400/10 border border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border border-red-400/20';
  };

  const alertStyle = (sev: string) => {
    if (sev === 'error') return { border: 'border-red-500/40', icon: 'text-red-400', bg: 'bg-red-500/5', label: 'CRITIQUE', labelCls: 'text-red-400 bg-red-400/10' };
    if (sev === 'warning') return { border: 'border-yellow-500/40', icon: 'text-yellow-400', bg: 'bg-yellow-500/5', label: 'AVERTISSEMENT', labelCls: 'text-yellow-400 bg-yellow-400/10' };
    return { border: 'border-blue-500/30', icon: 'text-blue-400', bg: 'bg-blue-500/5', label: 'INFO', labelCls: 'text-blue-400 bg-blue-400/10' };
  };

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
              <Activity size={16} className="text-black" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Monitoring Système</h1>
          </div>
          <p className="text-sm text-zinc-500 ml-11">Surveillance en temps réel — PIMPAY Infrastructure</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800">
            <Clock size={14} className="text-yellow-400" />
            <span className="text-sm font-mono text-zinc-300">
              {currentTime.toLocaleTimeString('fr-FR')}
            </span>
          </div>
          <button
            onClick={() => setIsLive(v => !v)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all ${
              isLive
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'}`} />
            {isLive ? 'EN DIRECT' : 'EN PAUSE'}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400 text-sm font-medium hover:bg-yellow-400/20 transition-all">
            <RefreshCw size={14} />
            Actualiser
          </button>
        </div>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        {SYSTEM_SERVICES.map((svc) => (
          <div key={svc.name} className={`rounded-2xl bg-zinc-900/80 border ${
            svc.status === 'degraded' ? 'border-yellow-500/30' : 'border-zinc-800'
          } p-5 relative overflow-hidden`}>
            {svc.status === 'degraded' && (
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
            )}
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                {svc.name === 'API Gateway' && <Globe size={16} className="text-yellow-400" />}
                {svc.name === 'Base de données' && <Database size={16} className="text-yellow-400" />}
                {svc.name === 'WebSocket' && <Wifi size={16} className="text-yellow-400" />}
                {svc.name === 'ISO Gateway' && <Server size={16} className="text-yellow-400" />}
              </div>
              <div className={`flex items-center gap-1.5`}>
                <span className={`w-2.5 h-2.5 rounded-full shadow-md ${statusDot(svc.status)}`} />
                <span className={`text-xs font-medium ${statusColor(svc.status)}`}>{statusLabel(svc.status)}</span>
              </div>
            </div>
            <p className="text-sm font-semibold text-white mb-3">{svc.name}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 mb-0.5">Latence</p>
                <p className={`text-sm font-mono font-bold ${
                  svc.status === 'degraded' ? 'text-yellow-400' : 'text-emerald-400'
                }`}>{svc.latency}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-zinc-500 mb-0.5">Disponibilité</p>
                <p className={`text-sm font-mono font-bold ${
                  svc.status === 'degraded' ? 'text-yellow-400' : 'text-emerald-400'
                }`}>{svc.uptime}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Temps de réponse moy.',
            value: `${avgLatency}ms`,
            sub: avgLatency > 50 ? '↑ Hausse détectée' : '↓ Nominal',
            trend: avgLatency > 50,
            icon: <Clock size={16} className="text-yellow-400" />,
          },
          {
            label: 'Transactions / sec',
            value: tps.toFixed(1),
            sub: `${(tps * 60).toFixed(0)} / min`,
            trend: false,
            icon: <Zap size={16} className="text-yellow-400" />,
          },
          {
            label: 'Taux d\'erreur',
            value: `${errorRate}%`,
            sub: errorRate > 1 ? '↑ Seuil atteint' : '↓ Sous seuil',
            trend: errorRate > 1,
            icon: <AlertTriangle size={16} className="text-yellow-400" />,
          },
          {
            label: 'Disponibilité',
            value: `${uptime}%`,
            sub: 'SLA 99.95% respecté',
            trend: false,
            icon: <CheckCircle size={16} className="text-yellow-400" />,
          },
        ].map((kpi, i) => (
          <div key={i} className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center">
                {kpi.icon}
              </div>
              {kpi.trend ? (
                <div className="flex items-center gap-1 text-red-400">
                  <ArrowUpRight size={14} />
                  <span className="text-xs">Hausse</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-400">
                  <ArrowDownRight size={14} />
                  <span className="text-xs">Stable</span>
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500 mb-1">{kpi.label}</p>
            <p className="text-2xl font-bold text-white font-mono mb-1">{kpi.value}</p>
            <p className={`text-xs ${kpi.trend ? 'text-red-400' : 'text-emerald-400'}`}>{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Live Transaction Feed */}
        <div className="xl:col-span-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                <TrendingUp size={15} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Flux de Transactions en Direct</h2>
                <p className="text-xs text-zinc-500">20 dernières — mise à jour automatique</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${
              newTxFlash ? 'bg-yellow-400/20 border border-yellow-400/40' : 'bg-zinc-800 border border-zinc-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                newTxFlash ? 'bg-yellow-400' : 'bg-emerald-400'
              }`} />
              <span className={`text-xs font-mono ${
                newTxFlash ? 'text-yellow-400' : 'text-zinc-400'
              }`}>{newTxFlash ? 'NOUVELLE TX' : 'EN DIRECT'}</span>
            </div>
          </div>
          <div ref={feedRef} className="overflow-y-auto max-h-[420px]">
            <div className="grid grid-cols-6 px-5 py-2 border-b border-zinc-800/50 sticky top-0 bg-zinc-900">
              {['Réf.', 'Type', 'Montant', 'Pays', 'Statut', 'Latence'].map(h => (
                <span key={h} className="text-xs text-zinc-500 font-medium">{h}</span>
              ))}
            </div>
            {transactions.map((tx, idx) => (
              <div
                key={tx.ref}
                className={`grid grid-cols-6 px-5 py-3 border-b border-zinc-800/30 items-center transition-all duration-500 hover:bg-zinc-800/40 ${
                  idx === 0 && newTxFlash ? 'bg-yellow-400/5' : ''
                }`}
              >
                <div>
                  <span className="text-xs font-mono text-zinc-300">{tx.ref}</span>
                  <p className="text-xs text-zinc-600">{tx.time}</p>
                </div>
                <span className="text-xs font-medium text-zinc-300">{tx.type}</span>
                <span className="text-xs font-mono text-white">{parseInt(tx.amount).toLocaleString('fr-FR')} XAF</span>
                <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded px-2 py-0.5 w-fit">{tx.country}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded w-fit ${
                  txStatusStyle(tx.status)
                }`}>
                  {tx.status === 'SUCCESS' ? '✓' : tx.status === 'PENDING' ? '⋯' : '✗'} {tx.status}
                </span>
                <span className={`text-xs font-mono ${
                  tx.latency > 100 ? 'text-red-400' : tx.latency > 50 ? 'text-yellow-400' : 'text-emerald-400'
                }`}>{tx.latency}ms</span>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800">
            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
              <Globe size={15} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Distribution Géographique</h2>
              <p className="text-xs text-zinc-500">Zone CEMAC — 6 pays</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {CEMAC_COUNTRIES.map((c) => (
              <div key={c.code}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 rounded px-1.5 py-0.5 font-mono">{c.code}</span>
                    <span className="text-sm text-zinc-300">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-white">{c.count.toLocaleString('fr-FR')}</span>
                    <span className="text-xs text-zinc-500 ml-1">tx</span>
                  </div>
                </div>
                <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400 transition-all duration-700"
                    style={{ width: `${c.pct}%` }}
                  />
                </div>
                <p className="text-right text-xs text-zinc-600 mt-0.5">{c.pct}%</p>
              </div>
            ))}
            <div className="pt-3 border-t border-zinc-800">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Total CEMAC</span>
                <span className="text-sm font-bold text-yellow-400">{CEMAC_COUNTRIES.reduce((a, c) => a + c.count, 0).toLocaleString('fr-FR')} tx</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Chart + Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Volume Chart */}
        <div className="xl:col-span-2 rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                <TrendingUp size={15} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Volume des Transactions</h2>
                <p className="text-xs text-zinc-500">Dernières 24h — par heure</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-yellow-500 to-yellow-400" />
              <span className="text-xs text-zinc-500">Transactions</span>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end gap-1.5 h-48">
              {VOLUME_DATA.map((d, i) => {
                const h = d.vol === 0 ? 2 : Math.max(4, (d.vol / maxVol) * 100);
                const isCurrentHour = i === new Date().getHours();
                return (
                  <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {d.vol > 0 ? d.vol.toLocaleString('fr-FR') : '–'}
                    </div>
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        d.vol === 0
                          ? 'bg-zinc-800'
                          : isCurrentHour
                          ? 'bg-gradient-to-t from-yellow-600 to-yellow-300 shadow-lg shadow-yellow-500/20'
                          : 'bg-gradient-to-t from-yellow-600/60 to-yellow-400/60 hover:from-yellow-600 hover:to-yellow-400'
                      }`}
                      style={{ height: `${h}%` }}
                    />
                    {i % 3 === 0 && (
                      <span className="text-xs text-zinc-600 font-mono">{d.hour}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="rounded-2xl bg-zinc-900/80 border border-zinc-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                <Bell size={15} className="text-yellow-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Alertes Système</h2>
                <p className="text-xs text-zinc-500">{INITIAL_ALERTS.length} alertes récentes</p>
              </div>
            </div>
            <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 rounded-full px-2 py-0.5">
              {INITIAL_ALERTS.filter(a => a.severity === 'error').length} critique{INITIAL_ALERTS.filter(a => a.severity === 'error').length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-zinc-800/50">
            {INITIAL_ALERTS.map((alert) => {
              const style = alertStyle(alert.severity);
              return (
                <div key={alert.id} className={`px-5 py-3.5 ${style.bg} border-l-2 ${style.border}`}>
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={14} className={`${style.icon} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.labelCls}`}>{style.label}</span>
                        <span className="text-xs text-zinc-600 font-mono">{alert.time}</span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">{alert.message}</p>
                      <p className="text-xs text-zinc-600 mt-1">{alert.service}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-5 py-3 border-t border-zinc-800">
            <button className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-medium">
              Voir tout l'historique des alertes →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
