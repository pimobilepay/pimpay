"use client";

import { useState, useEffect } from "react";
import {
  Users, Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Activity, Landmark, Globe,
  TrendingUp, AlertTriangle, Zap, Search, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // RÉCUPÉRATION DES DONNÉES RÉELLES
  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Appels vers tes API (à créer selon tes besoins)
        const response = await fetch("/api/admin/dashboard-stats");
        const data = await response.json();
        
        setStats(data.stats);
        setActivities(data.recentActivities);
        setChartData(data.history);
      } catch (error) {
        console.error("Erreur dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans">

      {/* HEADER AVEC BARRE DE RECHERCHE */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            PIMPAY<span className="text-blue-500">CORE</span>
          </h1>
          <p className="text-[10px] text-blue-400 font-black uppercase tracking-[0.4em] animate-pulse">
            Système de Contrôle Central v2.4.0
          </p>
        </div>
        <div className="relative group w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            placeholder="Rechercher transaction, utilisateur ou log..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 transition-all backdrop-blur-md"
          />
        </div>
      </header>

      {/* STATISTIQUES RAPIDES (NEON CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Volume Total" value={`${stats?.totalVolume || 0} XAF`} icon={<Landmark className="text-blue-500" />} trend="+12.5%" color="blue" />
        <StatCard title="Utilisateurs" value={stats?.totalUsers || 0} icon={<Users className="text-purple-500" />} trend="+3.2%" color="purple" />
        <StatCard title="KYC en Attente" value={stats?.pendingKyc || 0} icon={<ShieldCheck className="text-amber-500" />} trend="Priorité" color="amber" />
        <StatCard title="Santé Système" value="99.9%" icon={<Zap className="text-emerald-500" />} trend="Stable" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* GRAPHIQUE PRINCIPAL (STYLE ELARA) */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={120} />
          </div>
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Flux Monétaire (7 derniers jours)</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></span> Entrées</div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase"><span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span> Sorties</div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : defaultChartData}>
                <defs>
                  <linearGradient id="colorEntree" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="entrees" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEntree)" strokeWidth={3} />
                <Area type="monotone" dataKey="sorties" stroke="#f43f5e" fill="transparent" strokeWidth={3} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LOGS D'ACTIVITÉ EN DIRECT */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 italic mb-6">Activités Récentes</h3>
          <div className="space-y-6">
            {activities.length > 0 ? activities.map((act, i) => (
               <ActivityItem key={i} icon={act.type === 'depot' ? <ArrowDownLeft className="text-emerald-500" /> : <ArrowUpRight className="text-rose-500" />} user={act.userName} action={act.label} amount={act.amount} time={act.time} />
            )) : (
              <p className="text-[10px] text-center text-slate-500 uppercase font-black py-10">Aucune activité récente</p>
            )}
          </div>
          <button className="w-full mt-10 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            Voir tout l'audit log
          </button>
        </div>

      </div>
    </div>
  );
}

// Données par défaut si l'API est vide
const defaultChartData = [
  { name: "Lun", entrees: 0, sorties: 0 }, { name: "Mar", entrees: 0, sorties: 0 },
  { name: "Mer", entrees: 0, sorties: 0 }, { name: "Jeu", entrees: 0, sorties: 0 },
  { name: "Ven", entrees: 0, sorties: 0 }, { name: "Sam", entrees: 0, sorties: 0 },
  { name: "Dim", entrees: 0, sorties: 0 },
];

function StatCard({ title, value, icon, trend, color }: any) {
  const colors: any = {
    blue: "group-hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] border-blue-500/10",
    purple: "group-hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] border-purple-500/10",
    amber: "group-hover:shadow-[0_0_20px_rgba(245,158,11,0.2)] border-amber-500/10",
    emerald: "group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] border-emerald-500/10",
  };

  return (
    <div className={`bg-white/5 border ${colors[color]} p-6 rounded-[28px] group transition-all cursor-default`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-2xl">{icon}</div>
        <span className={`text-[9px] font-black px-2 py-1 rounded-md bg-white/5 ${trend.includes('+') ? 'text-emerald-500' : 'text-amber-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-xl font-black">{value}</p>
    </div>
  );
}

function ActivityItem({ icon, user, action, amount, time }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all border border-white/5">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-bold">{user} <span className="text-slate-500 font-normal">• {action}</span></p>
          <p className="text-[9px] text-slate-600 uppercase font-black">{time}</p>
        </div>
      </div>
      <p className="text-[10px] font-black italic">{amount}</p>
    </div>
  );
}
