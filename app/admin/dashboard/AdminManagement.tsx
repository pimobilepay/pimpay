import React, { useState } from 'react';
import { 
  ShieldCheck, 
  History, 
  CheckCircle, 
  XCircle, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft,
  Filter
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

// Données simulées pour le graphique de flux de transactions
const transactionData = [
  { name: 'Lun', flux: 4000 },
  { name: 'Mar', flux: 3000 },
  { name: 'Mer', flux: 5000 },
  { name: 'Jeu', flux: 2780 },
  { name: 'Ven', flux: 1890 },
  { name: 'Sam', flux: 2390 },
  { name: 'Dim', flux: 3490 },
];

const AdminManagement = () => {
  const [activeTab, setActiveTab] = useState('transactions');

  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Console d'Administration</h1>
          <p className="text-gray-500">Gérez les validations KYC et surveillez les flux financiers.</p>
        </header>

        {/* Navigation Onglets */}
        <div className="flex space-x-4 mb-8 border-b">
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center pb-4 px-2 space-x-2 ${activeTab === 'transactions' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500'}`}
          >
            <History size={20} />
            <span>Flux Transactions</span>
          </button>
          <button 
            onClick={() => setActiveTab('kyc')}
            className={`flex items-center pb-4 px-2 space-x-2 ${activeTab === 'kyc' ? 'border-b-2 border-blue-600 text-blue-600 font-semibold' : 'text-gray-500'}`}
          >
            <ShieldCheck size={20} />
            <span>Validation KYC</span>
          </button>
        </div>

        {activeTab === 'transactions' ? (
          <div className="space-y-6">
            {/* Graphique des flux */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border">
              <h2 className="text-xl font-semibold mb-4">Aperçu du Flux Global</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={transactionData}>
                    <defs>
                      <linearGradient id="colorFlux" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis hide={true} />
                    <Tooltip />
                    <Area type="monotone" dataKey="flux" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFlux)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Liste des transactions à valider */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold">Dépôts en attente (Hash)</h2>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input type="text" placeholder="Rechercher un hash..." className="pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <tr>
                      <th className="px-6 py-3">Utilisateur</th>
                      <th className="px-6 py-3">Montant</th>
                      <th className="px-6 py-3">Hash de Transaction</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[1, 2].map((i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium">User_{i}9283</td>
                        <td className="px-6 py-4 text-green-600 font-semibold">+ 250.00 Pi</td>
                        <td className="px-6 py-4 font-mono text-sm text-gray-400">0x7d2a...f9c{i}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"><CheckCircle size={20}/></button>
                          <button className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"><XCircle size={20}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Section KYC */
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Documents KYC à réviser</h2>
              <button className="flex items-center space-x-2 text-gray-500 text-sm border px-3 py-1 rounded-lg hover:bg-gray-50">
                <Filter size={16} />
                <span>Filtrer</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((id) => (
                <div key={id} className="border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                      U{id}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Candidat #{id}482</p>
                      <p className="text-xs text-gray-500 font-mono italic">Soumis il y a 2h</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-blue-700 font-medium">Voir Dossier</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminManagement;

