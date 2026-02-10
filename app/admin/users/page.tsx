"use client";

import { useState, useMemo } from "react";
import { Shield, Users, UserCheck, UserX, Search, MoreVertical, CheckCircle2, XCircle, Clock, Eye } from "lucide-react";

// MOCK DATA (à remplacer par Prisma / API)
const users = [
  {
    id: "1",
    name: "Jean Mukendi",
    email: "jean@mail.com",
    country: "CD",
    role: "USER",
    status: "ACTIVE",
    kyc: "VERIFIED",
    balanceUsd: 245.5,
    balancePi: 0.0042,
    createdAt: "2025-01-10",
    lastActive: "2026-02-09",
  },
];

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchQuery = u.name.toLowerCase().includes(query.toLowerCase()) || u.email.toLowerCase().includes(query.toLowerCase());
      const matchStatus = filterStatus === "ALL" || u.status === filterStatus;
      return matchQuery && matchStatus;
    });
  }, [query, filterStatus]);

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase italic">Admin · Utilisateurs</h1>
          <p className="text-xs text-slate-400">Contrôle & gestion des comptes</p>
        </div>
        <div className="flex gap-3">
          <div className="px-4 py-2 bg-white/5 rounded-xl flex items-center gap-2 text-xs font-bold">
            <Users size={14}/> Total: {users.length}
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-4 gap-4">
        <Stat icon={<UserCheck size={16}/>} label="Actifs" value="1" />
        <Stat icon={<UserX size={16}/>} label="Suspendus" value="0" />
        <Stat icon={<CheckCircle2 size={16}/>} label="KYC Validés" value="1" />
        <Stat icon={<Clock size={16}/>} label="En attente" value="0" />
      </div>

      {/* FILTERS */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Recherche utilisateur..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-12 bg-white/5 border border-white/10 rounded-xl pl-10 text-sm"
          />
        </div>
        <select onChange={(e) => setFilterStatus(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 text-sm">
          <option value="ALL">Tous</option>
          <option value="ACTIVE">Actifs</option>
          <option value="SUSPENDED">Suspendus</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5 text-xs uppercase text-slate-400">
            <tr>
              <th className="p-4 text-left">User</th>
              <th>Pays</th>
              <th>KYC</th>
              <th>Solde</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-t border-white/5">
                <td className="p-4">
                  <div className="font-bold">{user.name}</div>
                  <div className="text-xs text-slate-400">{user.email}</div>
                </td>
                <td className="text-center">🇨🇩</td>
                <td className="text-center">{user.kyc === "VERIFIED" ? "✅" : "⏳"}</td>
                <td className="text-center">${user.balanceUsd}</td>
                <td className="text-center">
                  <span className="px-2 py-1 text-xs rounded bg-emerald-600/20 text-emerald-400">{user.status}</span>
                </td>
                <td className="text-right pr-4">
                  <button className="p-2 hover:bg-white/10 rounded-lg"><MoreVertical size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: any) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
      <div className="p-3 bg-blue-600/20 rounded-xl text-blue-400">{icon}</div>
      <div>
        <p className="text-xs uppercase text-slate-400 font-bold">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  );
}
