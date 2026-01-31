"use client";

import { useState } from "react";
import { 
  Users, Wallet, ArrowUpRight, ArrowDownLeft, 
  ShieldCheck, Activity, Landmark, Globe,
  TrendingUp, AlertTriangle, Zap, Search
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from "recharts";

// Données fictives pour le graph de flux monétaire
const chartData = [
  { name: "Lun", entrees: 4000, sorties: 2400 },
  { name: "Mar", entrees: 3000, sorties: 1398 },
  { name: "Mer", entrees: 2000, sorties: 9800 },
  { name: "Jeu", entrees: 2780, sorties: 3908 },
  { name: "Ven", entrees: 1890, sorties: 4800 },
  { name: "Sam", entrees: 2390, sorties: 3800 },
  { name: "Dim", entrees: 3490, sorties: 4300 },
];

export default function AdminDashboard() {
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
        <StatCard title="Volume Total" value="1.284.500 XAF" icon={<Landmark className="text-blue-500" />} trend="+12.5%" color="blue" />
        <StatCard title="Utilisateurs Actifs" value="12,840" icon={<Users className="text-purple-500" />} trend="+3.2%" color="purple" />
        <StatCard title="KYC en Attente" value="48" icon={<ShieldCheck className="text-amber-500" />} trend="Priorité" color="amber" />
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
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorEntree" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }} />
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
            <ActivityItem icon={<ArrowDownLeft className="text-emerald-500" />} user="Abdoulaye A." action="Dépôt réussi" amount="+25,000 XAF" time="Il y a 2 min" />
            <ActivityItem icon={<ShieldCheck className="text-blue-500" />} user="Moussa K." action="KYC Soumis" amount="Dossier" time="Il y a 15 min" />
            <ActivityItem icon={<ArrowUpRight className="text-rose-500" />} user="Sarah O." action="Transfert Sortant" amount="-12,400 XAF" time="Il y a 24 min" />
            <ActivityItem icon={<AlertTriangle className="text-amber-500" />} user="Système" action="Tentative de connexion" amount="IP: 192..." time="Il y a 1h" />
          </div>
          <button className="w-full mt-10 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">
            Voir tout l'audit log
          </button>
        </div>

      </div>
    </div>
  );
}

// --- SOUS-COMPOSANTS ---

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
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
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
