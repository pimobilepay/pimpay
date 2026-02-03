"use client";

import { useState, useEffect } from "react";
import {
  Users, Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Activity, Landmark, Globe,
  TrendingUp, AlertTriangle, Zap, Search, Loader2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Dot
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
        const response = await fetch("/api/admin/dashboard-stats");
        if (!response.ok) throw new Error("Erreur de récupération");
        const data = await response.json();

        setStats(data.stats);
        setActivities(data.recentActivities);
        setChartData(data.history);
      } catch (error) {
        console.error("Erreur dashboard:", error);
        // On met des données de secours si l'API échoue pour ne pas bloquer l'affichage
        setChartData(defaultChartData);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chargement de PimPayCore...</p>
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
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 text-sm outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all backdrop-blur-md"
          />
        </div>
      </header>

      {/* STATISTIQUES RAPIDES (NEON CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <StatCard title="Volume Total" value={`${stats?.totalVolume?.toLocaleString() || 0} XAF`} icon={<Landmark className="text-blue-500" />} trend="+12.5%" color="blue" />
        <StatCard title="Utilisateurs" value={stats?.totalUsers || 0} icon={<Users className="text-purple-500" />} trend="+3.2%" color="purple" />
        <StatCard title="KYC en Attente" value={stats?.pendingKyc || 0} icon={<ShieldCheck className="text-amber-500" />} trend="Priorité" color="amber" />
        <StatCard title="Santé Système" value="99.9%" icon={<Zap className="text-emerald-500" />} trend="Stable" color="emerald" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* GRAPHIQUE PRINCIPAL RENDU "VIVANT" */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:text-blue-500 transition-all duration-700">
            <TrendingUp size={120} />
          </div>
          
          <div className="flex justify-between items-center mb-10 relative z-10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Analyse des Flux</h3>
              <p className="text-[9px] text-slate-500 uppercase mt-1">Données synchronisées en temps réel</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)] animate-pulse"></span> 
                Entrées
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.6)] animate-pulse"></span> 
                Sorties
              </div>
            </div>
          </div>

          <div className="h-80 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData.length > 0 ? chartData : defaultChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorEntree" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorSortie" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="10 10" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b' }}
                />
                <Tooltip 
                  cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                    border: '1px solid rgba(59, 130, 246, 0.2)', 
                    borderRadius: '16px', 
                    fontSize: '10px',
                    backdropFilter: 'blur(10px)',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                  }} 
                />
                <Area 
                  type="monotone" 
                  dataKey="entrees" 
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorEntree)" 
                  strokeWidth={4} 
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                  activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="sorties" 
                  stroke="#f43f5e" 
                  fill="url(#colorSortie)" 
                  strokeWidth={3} 
                  strokeDasharray="5 5" 
                  animationDuration={2500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LOGS D'ACTIVITÉ EN DIRECT */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl flex flex-col">
          <div className="flex items-center gap-3 mb-8">
             <Activity className="text-blue-500 animate-spin-slow" size={18} />
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Live Audit Log</h3>
          </div>
          <div className="space-y-6 flex-1 overflow-y-auto no-scrollbar max-h-[350px]">
            {activities.length > 0 ? activities.map((act, i) => (
               <ActivityItem key={i} icon={act.type === 'depot' ? <ArrowDownLeft className="text-emerald-500" /> : <ArrowUpRight className="text-rose-500" />} user={act.userName} action={act.label} amount={act.amount} time={act.time} />
            )) : (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <Globe size={40} className="mb-4" />
                <p className="text-[10px] text-center text-slate-500 uppercase font-black tracking-widest">Aucune donnée entrante</p>
              </div>
            )}
          </div>
          <button className="w-full mt-8 py-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-600 hover:text-white transition-all shadow-lg hover:shadow-blue-600/20">
            Explorer l'historique complet
          </button>
        </div>

      </div>
    </div>
  );
}

// Données fictives pour l'animation au démarrage si l'API est lente
const defaultChartData = [
  { name: "Lun", entrees: 4000, sorties: 2400 },
  { name: "Mar", entrees: 3000, sorties: 1398 },
  { name: "Mer", entrees: 2000, sorties: 9800 },
  { name: "Jeu", entrees: 2780, sorties: 3908 },
  { name: "Ven", entrees: 1890, sorties: 4800 },
  { name: "Sam", entrees: 2390, sorties: 3800 },
  { name: "Dim", entrees: 3490, sorties: 4300 },
];

function StatCard({ title, value, icon, trend, color }: any) {
  const colors: any = {
    blue: "group-hover:border-blue-500/50 border-blue-500/10",
    purple: "group-hover:border-purple-500/50 border-purple-500/10",
    amber: "group-hover:border-amber-500/50 border-amber-500/10",
    emerald: "group-hover:border-emerald-500/50 border-emerald-500/10",
  };

  return (
    <div className={`bg-white/5 border ${colors[color]} p-6 rounded-[28px] group transition-all duration-500 cursor-default hover:bg-white/10 relative overflow-hidden`}>
      <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
        {icon}
      </div>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-white/5 rounded-2xl group-hover:scale-110 transition-transform duration-500">{icon}</div>
        <span className={`text-[9px] font-black px-2 py-1 rounded-md bg-white/5 ${trend.includes('+') ? 'text-emerald-500' : 'text-amber-500'}`}>
          {trend}
        </span>
      </div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-xl font-black tracking-tighter">{value}</p>
    </div>
  );
}

function ActivityItem({ icon, user, action, amount, time }: any) {
  return (
    <div className="flex items-center justify-between group cursor-pointer p-2 hover:bg-white/5 rounded-2xl transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:scale-110 transition-all border border-white/5 shadow-inner">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-bold group-hover:text-blue-400 transition-colors">{user} <span className="text-slate-500 font-normal ml-1"> {action}</span></p>
          <p className="text-[9px] text-slate-600 uppercase font-black mt-0.5">{time}</p>
        </div>
      </div>
      <p className={`text-[10px] font-black italic ${amount.includes('-') ? 'text-rose-500' : 'text-emerald-500'}`}>{amount}</p>
    </div>
  );
}
