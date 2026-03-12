import React from 'react';
import { 
  TrendingUp, 
  Wallet, 
  ShieldCheck, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  BarChart3,
  PieChart
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Données fictives pour le graphique de croissance
const data = [
  { name: 'Lun', profit: 400 },
  { name: 'Mar', profit: 700 },
  { name: 'Mer', profit: 600 },
  { name: 'Jeu', profit: 1100 },
  { name: 'Ven', profit: 950 },
  { name: 'Sam', profit: 1500 },
  { name: 'Dim', profit: 1800 },
];

const TreasuryPage = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Trésorerie PimPay</h1>
        <p className="text-slate-500">Suivi des profits, des réserves et de la santé financière du protocole.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <TrendingUp size={24} />
            </div>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span>
          </div>
          <p className="text-sm text-slate-500 font-medium">Profits Totaux (Frais)</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">$14,250.45</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              <PieChart size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Volume Total Pi</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">314,159 π</h2>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <ShieldCheck size={24} />
            </div>
          </div>
          <p className="text-sm text-slate-500 font-medium">Réserve de Sécurité</p>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">$5,000.00</h2>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Graphique de croissance des profits */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-500" />
              Évolution des revenus
            </h3>
            <select className="text-sm border-none bg-slate-100 rounded-lg p-1 px-2 focus:ring-0">
              <option>7 derniers jours</option>
              <option>30 derniers jours</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="profit" stroke="#6366f1" fillOpacity={1} fill="url(#colorProfit)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Configuration Actuelle des Frais */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <h3 className="font-bold mb-6 flex items-center gap-2 text-indigo-300">
            <Wallet size={20} />
            Configuration des Frais
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Dépôt Mobile (Pi)</span>
              <span className="font-mono text-green-400">0.1 π</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Retrait Mobile</span>
              <span className="font-mono text-indigo-400">2.5%</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Échange (Swap)</span>
              <span className="font-mono text-indigo-400">0.1%</span>
            </div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-slate-400 text-sm">Transfert Interne</span>
              <span className="font-mono text-indigo-400">1.0%</span>
            </div>
          </div>
          
          <button className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-all transform hover:scale-[1.02]">
            Ajuster les paramètres
          </button>
        </div>

      </div>

      {/* Recent Revenue Transactions */}
      <div className="mt-10 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-bold text-slate-800">Flux de revenus récents</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-sm uppercase">
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Utilisateur</th>
                <th className="px-6 py-4 font-medium">Montant TX</th>
                <th className="px-6 py-4 font-medium text-green-600">Frais perçus</th>
                <th className="px-6 py-4 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[1, 2, 3].map((_, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ArrowDownCircle size={16} className="text-blue-500" />
                      <span className="font-medium text-slate-700">Dépôt Pi</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">@user_342</td>
                  <td className="px-6 py-4 font-semibold">10.00 π</td>
                  <td className="px-6 py-4 font-bold text-green-600">+0.10 π</td>
                  <td className="px-6 py-4 text-right text-slate-400 text-sm">Il y a 2h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TreasuryPage;
