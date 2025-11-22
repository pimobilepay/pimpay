import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Users,
  Wallet,
  Receipt,
  Shield,
  LogOut,
  Settings,
  Search,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// Admin Panel single-file demo
// - Sections: Users, Wallets, Transactions, KYC, Support, Audit Logs, Settings
// - Each section contains sample UI, actions placeholders and API call comments

function SectionHeader({ title, children }: any) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-semibold">{title}</h3>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("dashboard");

  // Sample state for each section (replace with hooks that fetch real data)
  const [users, setUsers] = useState<any[]>([]);
  const [wallets, setWallets] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    // TODO: replace with fetch()/SWR to your API endpoints
    setUsers([
      { id: "u1", phone: "+243812345678", name: "Jean", role: "USER", status: "ACTIVE" },
      { id: "u2", phone: "+243812345679", name: "Marie", role: "ADMIN", status: "ACTIVE" },
    ]);
    setWallets([
      { id: "w1", userId: "u1", balance: 120.5, currency: "PI" },
      { id: "w2", userId: "u2", balance: 5000, currency: "PI" },
    ]);
    setTransactions([
      { id: "t1", ref: "TX1", amount: 24, type: "DEPOSIT", status: "SUCCESS", user: "Jean", date: "2025-11-20" },
      { id: "t2", ref: "TX2", amount: -52, type: "WITHDRAW", status: "FAILED", user: "Marie", date: "2025-11-19" },
    ]);
    setTickets([
      { id: "s1", user: "Jean", subject: "Problème paiement", status: "OPEN", createdAt: "2025-11-20" },
    ]);
    setLogs([
      { id: "l1", action: "USER_LOGIN", user: "u1", at: "2025-11-20T10:00:00Z" },
    ]);
  }, []);

  // Action placeholders
  const banUser = (id: string) => {
    // call: POST /api/admin/users/ban
    setUsers((s) => s.map((u) => (u.id === id ? { ...u, status: "BLOCKED" } : u)));
  };

  const unbanUser = (id: string) => {
    setUsers((s) => s.map((u) => (u.id === id ? { ...u, status: "ACTIVE" } : u)));
  };

  const verifyKyc = (id: string) => {
    // call: POST /api/admin/kyc/verify
    setLogs((l) => [...l, { id: "l" + Date.now(), action: "KYC_VERIFY", user: id, at: new Date().toISOString() }]);
  };

  const deleteTransaction = (id: string) => {
    // call: DELETE /api/admin/transactions/:id
    setTransactions((t) => t.filter((x) => x.id !== id));
  };

  // Filter utilities
  const filteredUsers = users.filter((u) => u.phone.includes(query) || u.name.toLowerCase().includes(query.toLowerCase()));
  const filteredTx = transactions.filter((t) => t.ref.includes(query) || t.user.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg p-4 hidden md:block fixed h-full">
        <h1 className="text-2xl font-bold mb-6 text-purple-600">PIMPAY Admin</h1>
        <nav className="flex flex-col gap-2">
          <button onClick={() => setActive("dashboard")} className={`flex items-center gap-3 p-2 rounded ${active === "dashboard" ? "bg-white/5" : "hover:bg-white/2"}`}><Receipt/> Tableau de bord</button>
          <button onClick={() => setActive("users")} className={`flex items-center gap-3 p-2 rounded ${active === "users" ? "bg-white/5" : "hover:bg-white/2"}`}><Users/> Utilisateurs</button>
          <button onClick={() => setActive("wallets")} className={`flex items-center gap-3 p-2 rounded ${active === "wallets" ? "bg-white/5" : "hover:bg-white/2"}`}><Wallet/> Wallets</button>
          <button onClick={() => setActive("transactions")} className={`flex items-center gap-3 p-2 rounded ${active === "transactions" ? "bg-white/5" : "hover:bg-white/2"}`}><Receipt/> Transactions</button>
          <button onClick={() => setActive("kyc")} className={`flex items-center gap-3 p-2 rounded ${active === "kyc" ? "bg-white/5" : "hover:bg-white/2"}`}><Shield/> KYC</button>
          <button onClick={() => setActive("support")} className={`flex items-center gap-3 p-2 rounded ${active === "support" ? "bg-white/5" : "hover:bg-white/2"}`}><Menu/> Support</button>
          <button onClick={() => setActive("logs")} className={`flex items-center gap-3 p-2 rounded ${active === "logs" ? "bg-white/5" : "hover:bg-white/2"}`}><Menu/> Logs</button>
          <button onClick={() => setActive("settings")} className={`flex items-center gap-3 p-2 rounded ${active === "settings" ? "bg-white/5" : "hover:bg-white/2"}`}><Settings/> Paramètres</button>
        </nav>

        <div className="mt-6">
          <Button className="w-full bg-red-500 text-white"><LogOut className="mr-2"/> Déconnexion</Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 md:ml-64">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-semibold">Admin Panel</h2>
            <div className="text-sm text-muted-foreground">Gestion complète PIMPAY</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Rechercher..." className="px-3 py-2 rounded-lg bg-white/5" />
              <div className="absolute right-2 top-2 text-muted-foreground"><Search size={14} /></div>
            </div>
            <Button onClick={()=>{setActive('users'); setQuery('');}}>Reset</Button>
          </div>
        </header>

        {active === "dashboard" && (
          <section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="shadow-md"><CardContent className="p-4"><h3 className="text-lg font-semibold">Utilisateurs</h3><p className="text-3xl font-bold mt-2">{users.length}</p></CardContent></Card>
              <Card className="shadow-md"><CardContent className="p-4"><h3 className="text-lg font-semibold">Wallets</h3><p className="text-3xl font-bold mt-2">{wallets.length}</p></CardContent></Card>
              <Card className="shadow-md"><CardContent className="p-4"><h3 className="text-lg font-semibold">Transactions</h3><p className="text-3xl font-bold mt-2">{transactions.length}</p></CardContent></Card>
            </div>

            <Card className="shadow-md mb-6"><CardContent className="p-4"><h3 className="text-xl font-semibold mb-4">Transactions récentes</h3>
              <div className="space-y-3">{transactions.slice(0,5).map(tx=> (
                <div key={tx.id} className="flex justify-between border-b pb-2"><div>{tx.ref} • {tx.user}</div><div className={`font-bold ${tx.amount>0? 'text-green-600':'text-red-600'}`}>{tx.amount} PI</div></div>
              ))}</div>
            </CardContent></Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="shadow-md"><CardContent className="p-4"><h3 className="text-lg font-semibold">Support ouverts</h3><div className="space-y-2">{tickets.map(t=> (<div key={t.id} className="border p-2 rounded"><div className="font-medium">{t.subject}</div><div className="text-xs text-muted-foreground">{t.user} • {t.createdAt}</div></div>))}</div></CardContent></Card>

              <Card className="shadow-md"><CardContent className="p-4"><h3 className="text-lg font-semibold">Journal d'audit</h3><div className="space-y-2">{logs.map(l=> (<div key={l.id} className="border p-2 rounded"><div className="text-sm">{l.action}</div><div className="text-xs text-muted-foreground">{l.user} • {new Date(l.at).toLocaleString()}</div></div>))}</div></CardContent></Card>
            </div>
          </section>
        )}

        {active === 'users' && (
          <section>
            <SectionHeader title="Utilisateurs">
              <Button onClick={()=>{/* open create modal */}}>Créer</Button>
            </SectionHeader>

            <div className="overflow-auto bg-white/5 rounded-lg border border-white/10">
              <table className="w-full text-left">
                <thead className="text-xs text-muted-foreground">
                  <tr><th className="p-3">ID</th><th>Nom</th><th>Téléphone</th><th>Rôle</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u=> (
                    <tr key={u.id} className="border-t">
                      <td className="p-3">{u.id}</td>
                      <td>{u.name||'-'}</td>
                      <td>{u.phone}</td>
                      <td>{u.role}</td>
                      <td>{u.status}</td>
                      <td className="p-3 flex gap-2">
                        <Button onClick={()=>banUser(u.id)} className="bg-red-500">Bannir</Button>
                        <Button onClick={()=>unbanUser(u.id)} className="bg-green-500">Réactiver</Button>
                        <Button className="bg-white/5"><Edit3/></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {active === 'wallets' && (
          <section>
            <SectionHeader title="Wallets">
              <Button onClick={()=>{/* fund wallet modal */}}>Créditer</Button>
            </SectionHeader>

            <div className="overflow-auto bg-white/5 rounded-lg border border-white/10">
              <table className="w-full text-left">
                <thead className="text-xs text-muted-foreground"><tr><th className="p-3">ID</th><th>User</th><th>Balance</th><th>Devise</th><th>Actions</th></tr></thead>
                <tbody>
                  {wallets.map(w=> (
                    <tr key={w.id} className="border-t"><td className="p-3">{w.id}</td><td>{w.userId}</td><td>{w.balance} {w.currency}</td><td>{w.currency}</td><td className="p-3 flex gap-2"><Button className="bg-green-600">Crediter</Button><Button className="bg-red-600">Debiter</Button></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {active === 'transactions' && (
          <section>
            <SectionHeader title="Transactions">
              <Button onClick={()=>{/* export CSV */}}>Exporter</Button>
            </SectionHeader>
            <div className="overflow-auto bg-white/5 rounded-lg border border-white/10">
              <table className="w-full text-left"><thead className="text-xs text-muted-foreground"><tr><th className="p-3">Réf</th><th>User</th><th>Montant</th><th>Type</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>{filteredTx.map(tx=> (
                  <tr key={tx.id} className="border-t"><td className="p-3">{tx.ref}</td><td>{tx.user}</td><td>{tx.amount} PI</td><td>{tx.type}</td><td>{tx.status}</td><td className="p-3 flex gap-2"><Button onClick={()=>deleteTransaction(tx.id)} className="bg-red-600"><Trash2/></Button><Button className="bg-white/5"><Edit3/></Button></td></tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}

        {active === 'kyc' && (
          <section>
            <SectionHeader title="KYC">
              <Button onClick={()=>{/* bulk verify */}}>Vérifier tout</Button>
            </SectionHeader>
            <div className="space-y-3">
              {users.map(u=> (
                <div key={u.id} className="p-3 border rounded flex justify-between items-center"><div><div className="font-medium">{u.name || u.phone}</div><div className="text-xs text-muted-foreground">KYC: {u.kycStatus || 'NONE'}</div></div><div className="flex gap-2"><Button onClick={()=>verifyKyc(u.id)} className="bg-green-600"><CheckCircle2/></Button><Button className="bg-red-500"><XCircle/></Button></div></div>
              ))}
            </div>
          </section>
        )}

        {active === 'support' && (
          <section>
            <SectionHeader title="Support & Tickets">
              <Button onClick={()=>{/* open new ticket */}}>Nouveau Ticket</Button>
            </SectionHeader>
            <div className="space-y-3">
              {tickets.map(t=> (
                <div key={t.id} className="p-3 border rounded"><div className="font-medium">{t.subject}</div><div className="text-xs text-muted-foreground">{t.user} • {t.createdAt}</div><div className="mt-2 flex gap-2"><Button>Ouvrir</Button><Button className="bg-red-600">Clore</Button></div></div>
              ))}
            </div>
          </section>
        )}

        {active === 'logs' && (
          <section>
            <SectionHeader title="Journal d'audit">
              <Button onClick={()=>{/* download logs */}}>Télécharger</Button>
            </SectionHeader>
            <div className="space-y-2">
              {logs.map(l=> (<div key={l.id} className="p-2 border rounded"><div className="text-sm">{l.action}</div><div className="text-xs text-muted-foreground">{l.user} • {new Date(l.at).toLocaleString()}</div></div>))}
            </div>
          </section>
        )}

        {active === 'settings' && (
          <section>
            <SectionHeader title="Paramètres">
              <Button onClick={()=>{/* save */}}>Sauvegarder</Button>
            </SectionHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card><CardContent className="p-4"><h4 className="font-semibold">Frais</h4><p className="text-sm text-muted-foreground">% et fixe</p></CardContent></Card>
              <Card><CardContent className="p-4"><h4 className="font-semibold">SMTP / Email</h4><p className="text-sm text-muted-foreground">Configurer le provider</p></CardContent></Card>
              <Card><CardContent className="p-4"><h4 className="font-semibold">Sécurité</h4><p className="text-sm text-muted-foreground">2FA, rate-limits</p></CardContent></Card>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
