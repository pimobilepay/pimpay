import React, { useState, useEffect } from 'react';
import { Shield, Key, Search, RefreshCw, CheckCircle } from 'lucide-react';

export default function AdminCryptoManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/wallets')
      .then(res => res.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="text-blue-500" /> Crypto Master Control
        </h1>
        <div className="bg-slate-800 p-2 rounded-lg flex items-center gap-2">
          <Search size={18} className="text-slate-400" />
          <input className="bg-transparent outline-none text-sm" placeholder="Rechercher un utilisateur..." />
        </div>
      </div>

      <div className="grid gap-4">
        {users.map((user: any) => (
          <div key={user.id} className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">@{user.username || 'Utilisateur sans nom'}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
              <div className="flex gap-4 mt-2">
                <div className="text-[10px] bg-slate-700 px-2 py-1 rounded">
                  <span className="text-yellow-500">SDA:</span> {user.sidraAddress?.slice(0,6)}...
                </div>
                <div className="text-[10px] bg-slate-700 px-2 py-1 rounded">
                  <span className="text-blue-400">XRP:</span> {user.xrpAddress?.slice(0,6)}...
                </div>
                <div className="text-[10px] bg-slate-700 px-2 py-1 rounded">
                  <span className="text-purple-400">PI/XLM:</span> {user.xlmAddress?.slice(0,6)}...
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="p-2 hover:bg-slate-700 rounded-lg transition" title="Générer/Réinitialiser les clés">
                <RefreshCw size={20} className="text-green-500" />
              </button>
              <button className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                <Key size={16} /> Configurer
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
