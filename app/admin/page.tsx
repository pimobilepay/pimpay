"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users, Wallet, ArrowUpRight, ArrowDownLeft, ShieldCheck, Activity, Landmark, Globe,
  TrendingUp, AlertTriangle, Zap, Search, Loader2, LayoutGrid, Headphones,
  ArrowRightLeft, FileCheck, Settings, LogOut, RefreshCw, ChevronRight, Shield, MessageSquare,
  BarChart3, ArrowLeft, History, Eye, Bell
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Chargement de PimPayCore...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 font-sans pb-32">

      {/* HEADER WITH NOTIFICATIONS */}
      <AdminTopNav 
        title="Administration" 
        subtitle="PimPay"
        onRefresh={() => { setLoading(true); fetchDashboardData(); }}
        backPath="/"
      />

      {/* QUICK NAV GRID */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4 ml-1">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Navigation Rapide</h2>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Dashboard", desc: "Vue detaillee", icon: <LayoutGrid size={20} />, path: "/admin/dashboard", color: "blue" },
            { label: "Notifications", desc: "Alertes temps reel", icon: <Bell size={20} />, path: "/admin/notifications", color: "rose" },
            { label: "Utilisateurs", desc: "Gestion comptes", icon: <Users size={20} />, path: "/admin/users", color: "purple" },
            { label: "Transactions", desc: "Flux financiers", icon: <ArrowRightLeft size={20} />, path: "/admin/transactions", color: "emerald" },
            { label: "Historique", desc: "Toutes les transactions", icon: <History size={20} />, path: "/admin/historique", color: "teal" },
            { label: "KYC", desc: "Verifications", icon: <FileCheck size={20} />, path: "/admin/kyc", color: "amber" },
            { label: "Support", desc: "Tickets clients", icon: <Headphones size={20} />, path: "/admin/support", color: "rose" },
            { label: "Analytics", desc: "Statistiques", icon: <BarChart3 size={20} />, path: "/admin/analytics", color: "indigo" },
            { label: "Tresorerie", desc: "Finances", icon: <Landmark size={20} />, path: "/admin/treasury", color: "amber" },
            { label: "Logs", desc: "Activite users", icon: <Eye size={20} />, path: "/admin/logs", color: "teal" },
            { label: "Parametres", desc: "Configuration", icon: <Settings size={20} />, path: "/admin/settings", color: "cyan" },
            { label: "Banque", desc: "Portail bancaire", icon: <Landmark size={20} />, path: "/bank", color: "blue" },
            { label: "Business", desc: "Portail entreprise", icon: <Globe size={20} />, path: "/business", color: "emerald" },
          ].map((item) => {
            const colorMap: Record<string, string> = {
              blue: "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20",
              purple: "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20",
              emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20",
              teal: "bg-teal-500/10 border-teal-500/20 text-teal-400 hover:bg-teal-500/20",
              amber: "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20",
              rose: "bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20",
              indigo: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20",
              cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20",
            };
            const iconColorMap: Record<string, string> = {
              blue: "bg-blue-600 shadow-blue-500/30",
              purple: "bg-purple-600 shadow-purple-500/30",
              emerald: "bg-emerald-600 shadow-emerald-500/30",
              teal: "bg-teal-600 shadow-teal-500/30",
              amber: "bg-amber-600 shadow-amber-500/30",
              rose: "bg-rose-600 shadow-rose-500/30",
              indigo: "bg-indigo-600 shadow-indigo-500/30",
              cyan: "bg-cyan-600 shadow-cyan-500/30",
            };
            return (
              <button
                key={item.path}
                onClick={() => router.push(item.path)}
                className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border transition-all active:scale-[0.96] ${colorMap[item.color]}`}
              >
                <div className={`p-3 rounded-2xl text-white shadow-lg ${iconColorMap[item.color]}`}>
                  {item.icon}
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-tight text-white leading-none">{item.label}</p>
                  <p className="text-[8px] font-bold uppercase tracking-widest mt-1 opacity-60">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* STATISTIQUES RAPIDES */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4 ml-1">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Apercu Systeme</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard title="Volume Total" value={`$${stats?.totalVolume?.toLocaleString() || 0}`} icon={<Landmark className="text-blue-500" />} trend="+12.5%" color="blue" />
          <StatCard title="Utilisateurs" value={stats?.totalUsers || 0} icon={<Users className="text-purple-500" />} trend="+3.2%" color="purple" />
          <StatCard title="KYC en Attente" value={stats?.pendingKyc || 0} icon={<ShieldCheck className="text-amber-500" />} trend="Priorite" color="amber" />
          <StatCard title="Sante Systeme" value="99.9%" icon={<Zap className="text-emerald-500" />} trend="Stable" color="emerald" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* GRAPHIQUE PRINCIPAL */}
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-[32px] p-6 lg:p-8 backdrop-blur-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 group-hover:text-blue-500 transition-all duration-700">
            <TrendingUp size={80} />
          </div>
          
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Analyse des Flux</h3>
              <p className="text-[9px] text-slate-600 uppercase mt-1">7 derniers jours</p>
            </div>
          </div>

          <div className="h-64 w-full relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.length > 0 ? chartData : defaultChartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#475569" 
                  fontSize={10} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontWeight: 700 }} 
                  dy={8} 
                />
                <YAxis 
                  stroke="#475569" 
                  fontSize={9} 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b' }}
                  tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  width={45}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '16px', 
                    fontSize: '11px',
                    fontWeight: 600,
                    backdropFilter: 'blur(10px)' 
                  }}
                  labelStyle={{ color: '#94a3b8', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '1px', marginBottom: '6px', fontWeight: 800 }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Legend 
                  formatter={(value) => <span style={{ color: '#9ca3af', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{value}</span>}
                  wrapperStyle={{ paddingTop: '16px' }}
                />
                <Bar dataKey="entrees" name="Entrees" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="sorties" name="Sorties" fill="#f43f5e" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACTIVITE RECENTE */}
        <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 lg:p-8 backdrop-blur-xl flex flex-col">
          <div className="flex items-center gap-3 mb-6">
             <Activity className="text-blue-500" size={18} />
             <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Activite Recente</h3>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar max-h-[280px]">
            {activities.length > 0 ? activities.map((act, i) => (
               <ActivityItem key={i} icon={act.type === 'depot' ? <ArrowDownLeft className="text-emerald-500" /> : <ArrowUpRight className="text-rose-500" />} user={act.userName} action={act.label} amount={act.amount} time={act.time} />
            )) : (
              <div className="flex flex-col items-center justify-center py-16 opacity-20">
                <Globe size={32} className="mb-3" />
                <p className="text-[9px] text-center text-slate-500 uppercase font-black tracking-widest">Aucune donnee</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => router.push('/admin/transactions')} 
            className="w-full mt-6 py-4 bg-blue-600/5 border border-blue-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-500 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2"
          >
            Voir toutes les transactions <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* QUICK ACCESS FOOTER */}
      <section className="mt-10">
        <div className="flex items-center gap-2 mb-4 ml-1">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
          <h2 className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Acces Rapide</h2>
        </div>
        <div className="space-y-3">
          {[
            { label: "Gestion Complete", desc: "Dashboard detaille avec controle total", icon: <Shield size={18} />, path: "/admin/dashboard", color: "blue" },
            { label: "Tresorerie", desc: "Gestion des finances et flux", icon: <Landmark size={18} />, path: "/admin/treasury", color: "amber" },
            { label: "Messages Admin", desc: "Notifications et annonces globales", icon: <MessageSquare size={18} />, path: "/admin/messages", color: "purple" },
            { label: "Logs Utilisateurs", desc: "Suivi d'activite en temps reel", icon: <Eye size={18} />, path: "/admin/logs", color: "blue" },
            { label: "Mode Rescue", desc: "Outils de recuperation d'urgence", icon: <AlertTriangle size={18} />, path: "/admin/rescue", color: "red" },
          ].map((item) => (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className="w-full flex items-center justify-between p-5 bg-slate-900/40 border border-white/5 rounded-[2rem] hover:bg-white/5 transition-all active:scale-[0.98] group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${item.color === 'blue' ? 'bg-blue-500/10 text-blue-400' : item.color === 'purple' ? 'bg-purple-500/10 text-purple-400' : item.color === 'amber' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                  {item.icon}
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-black uppercase tracking-tight text-white">{item.label}</p>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{item.desc}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-slate-600 group-hover:text-white transition-colors" />
            </button>
          ))}
        </div>
      </section>

      {/* SECURITY FOOTER */}
      <div className="mt-12 flex flex-col items-center gap-2 opacity-15">
        <Shield size={14} />
        <p className="text-[8px] font-black uppercase tracking-[0.4em]">PimPay Admin Encrypted v4.0</p>
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
