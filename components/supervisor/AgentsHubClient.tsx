"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, History, Loader2, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

type User = { id: string; name: string; username: string | null; role: string; roleLabel: string; status: string; kycStatus: string; createdAt: string };
type Log = { id: string; targetId: string | null; details: string | null; status: string; createdAt: string };

const formatDate = (value: string) => new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function AgentsHubClient() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<User | null>(null);
  const [newRole, setNewRole] = useState<"AGENT" | "SUPERVISEUR" | "">("");
  const [saving, setSaving] = useState(false);
  const [logs, setLogs] = useState<Log[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  async function searchUsers(event: React.FormEvent) {
    event.preventDefault();
    if (!query.trim()) return setError("Saisissez un username, un ID, un téléphone ou un email.");
    setLoading(true); setError(""); setSearched(true);
    try { const response = await fetch(`/api/supervisor/user-search?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setUsers(data.users); } catch (e) { setError(e instanceof Error ? e.message : "Recherche impossible."); setUsers([]); } finally { setLoading(false); }
  }

  async function changeRole() {
    if (!selected || !newRole) return;
    setSaving(true); setError("");
    try { const response = await fetch("/api/supervisor/user-role", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: selected.id, newRole }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error); setUsers((items) => items.map((item) => item.id === selected.id ? { ...item, role: data.user.role, roleLabel: data.user.roleLabel } : item)); setSelected(null); setNewRole(""); } catch (e) { setError(e instanceof Error ? e.message : "Modification impossible."); } finally { setSaving(false); }
  }

  async function loadLogs() { const response = await fetch("/api/supervisor/audit-log", { cache: "no-store" }); const data = await response.json(); setLogs(data.logs || []); setShowLogs(true); }
  const canEdit = (user: User) => !["ADMIN", "SUPERVISEUR_PRINCIPAL"].includes(user.role) && ["USER", "AGENT", "SUPERVISEUR"].includes(user.role);

  return <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-8"><div className="mx-auto flex max-w-5xl flex-col gap-8">
    <header className="flex flex-col gap-5 rounded-3xl border border-blue-900/50 bg-blue-950/40 p-6 shadow-2xl shadow-blue-950/20 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="rounded-2xl bg-blue-500/15 p-3 text-blue-300"><ShieldCheck className="size-7" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">PiMobiPay · Supervision</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Hub des Agents</h1><p className="mt-2 text-sm text-blue-100/70">Recherchez un utilisateur pour gérer son rôle.</p></div></div><Button variant="outline" className="border-blue-700 bg-blue-950/50 text-blue-100 hover:bg-blue-900" onClick={loadLogs}><History data-icon="inline-start" /> Mes actions</Button></header>
    <Card className="border-blue-900/60 bg-slate-900/80 text-slate-100"><CardHeader><CardTitle className="text-xl">Rechercher un utilisateur</CardTitle><CardDescription className="text-slate-400">Username, ID utilisateur, téléphone ou email. Aucun utilisateur n&apos;est chargé avant votre recherche.</CardDescription></CardHeader><CardContent><form onSubmit={searchUsers} className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-3 size-5 text-blue-300" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un utilisateur..." className="h-11 border-blue-900 bg-slate-950 pl-10 text-slate-100 placeholder:text-slate-500" /></div><Button type="submit" className="h-11 bg-blue-600 hover:bg-blue-500" disabled={loading}>{loading ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Search data-icon="inline-start" />} Rechercher</Button></form></CardContent></Card>
    {error && <Alert variant="destructive"><AlertCircle data-icon="inline-start" /><AlertDescription>{error}</AlertDescription></Alert>}
    {!searched && !error && <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-blue-900 bg-slate-900/50 px-6 py-16 text-center"><Search className="size-10 text-blue-400" /><p className="font-medium">Recherchez un utilisateur pour commencer.</p><p className="text-sm text-slate-500">Le Hub affiche uniquement les résultats correspondant à votre recherche.</p></div>}
    {searched && !loading && users.length === 0 && !error && <div className="rounded-3xl border border-blue-900 bg-slate-900/50 p-8 text-center text-slate-400">Aucun utilisateur ne correspond à cette recherche.</div>}
    <div className="flex flex-col gap-4">{users.map((user) => <Card key={user.id} className="border-blue-900/60 bg-slate-900 text-slate-100"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-4"><div className="rounded-full bg-blue-500/15 p-3 text-blue-300"><UserRound className="size-6" /></div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{user.name}</h2><Badge variant="outline" className="border-emerald-500/40 text-emerald-300">{user.status === "ACTIVE" ? "Actif" : user.status}</Badge></div><p className="mt-1 text-sm text-blue-200">{user.username ? `@${user.username}` : "Username non défini"}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400"><span>ID: {user.id}</span><span>Rôle: <strong className="text-amber-200">{user.roleLabel}</strong></span><span>KYC: {user.kycStatus}</span></div></div></div>{canEdit(user) && <Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => { setSelected(user); setNewRole(""); }}>Modifier le rôle</Button>}</CardContent></Card>)}</div>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}><DialogContent className="border-blue-900 bg-slate-900 text-slate-100"><DialogHeader><DialogTitle>Modifier le rôle de cet utilisateur ?</DialogTitle><DialogDescription className="text-slate-400">Cette action modifiera immédiatement les permissions de cet utilisateur.</DialogDescription></DialogHeader>{selected && <div className="flex flex-col gap-4 rounded-2xl bg-slate-950 p-4 text-sm"><div><span className="text-slate-500">Utilisateur</span><p className="font-semibold">{selected.username ? `@${selected.username}` : selected.name}</p></div><div className="flex justify-between"><span className="text-slate-500">Ancien rôle</span><strong>{selected.roleLabel}</strong></div><div className="flex flex-col gap-2"><span className="text-slate-500">Nouveau rôle</span><ToggleGroup type="single" value={newRole} onValueChange={(value) => setNewRole(value as typeof newRole)} className="justify-start"><ToggleGroupItem value="AGENT">AGENT</ToggleGroupItem><ToggleGroupItem value="SUPERVISEUR">SUPERVISEUR</ToggleGroupItem></ToggleGroup></div></div>}<DialogFooter><Button variant="outline" onClick={() => setSelected(null)}>Annuler</Button><Button className="bg-amber-400 text-slate-950 hover:bg-amber-300" disabled={!newRole || saving} onClick={changeRole}>{saving ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <CheckCircle2 data-icon="inline-start" />} Confirmer le changement</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showLogs} onOpenChange={setShowLogs}><DialogContent className="border-blue-900 bg-slate-900 text-slate-100"><DialogHeader><DialogTitle>Mes changements de rôle</DialogTitle><DialogDescription className="text-slate-400">Historique en lecture seule de vos actions.</DialogDescription></DialogHeader><div className="flex max-h-80 flex-col gap-3 overflow-y-auto">{logs.length ? logs.map((log) => <div key={log.id} className="rounded-xl border border-blue-900 bg-slate-950 p-3 text-xs"><div className="flex items-center gap-2 text-emerald-300"><Clock3 className="size-4" />{formatDate(log.createdAt)}</div><p className="mt-2 text-slate-300">Utilisateur: {log.targetId}</p><p className="mt-1 text-slate-500">{log.details}</p></div>) : <p className="text-sm text-slate-500">Aucun changement enregistré.</p>}</div></DialogContent></Dialog>
  </div></main>;
}
