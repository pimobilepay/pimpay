"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Trash2,
  Download,
  Filter,
  Calendar,
  User,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

/**
 * Admin Messages Page
 * - liste utilisateurs
 * - messages par utilisateur
 * - recherche / filtres (date range + rôle)
 * - suppression message
 * - export PDF
 * - analytics widget
 *
 * Assure-toi d'avoir les endpoints API suivants (tels que fournis précédemment):
 * - GET /api/admin/users
 * - GET /api/admin/messages?userId=...
 * - GET /api/admin/messages/search?q=...
 * - POST /api/admin/messages/delete  { id }
 * - GET /api/admin/messages/export?userId=...
 * - GET /api/admin/messages/stats
 *
 * Auth: token (JWT) lu depuis localStorage 'pimpay_token'
 */

export default function AdminMessagesPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);

  // Search & filters
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "assistant">(
    "all"
  );
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Analytics
  const [stats, setStats] = useState<any | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);

  // token helper
  const token =
    typeof window !== "undefined" ? localStorage.getItem("pimpay_token") : null;

  useEffect(() => {
    loadUsers();
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load users
  async function loadUsers() {
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error("Load users error", err);
    } finally {
      setLoadingUsers(false);
    }
  }

  // load messages for a user
  async function loadMessagesForUser(user: any) {
    setSelectedUser(user);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/admin/messages?userId=${user.id}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error("Load messages error", err);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }

  // delete message
  async function deleteMessage(id: string) {
    if (!confirm("Supprimer ce message ? Cette action est irréversible.")) return;
    try {
      const res = await fetch("/api/admin/messages/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        // remove locally
        setMessages((m) => m.filter((x) => x.id !== id));
      } else {
        alert("Erreur suppression : " + (json.error || "unknown"));
      }
    } catch (err) {
      console.error("Delete error", err);
      alert("Erreur réseau lors de la suppression.");
    }
  }

  // export PDF for selected user
  async function exportPdfForUser(userId: string) {
    try {
      const res = await fetch(`/api/admin/messages/export?userId=${userId}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        alert("Export error: " + txt);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pimpay_messages_${userId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error", err);
      alert("Erreur lors de l'export.");
    }
  }

  // search messages (global)
  async function searchMessages(q: string) {
    if (!q.trim()) return;
    try {
      const res = await fetch(`/api/admin/messages/search?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const json = await res.json();
      setMessages(json.results || []);
      setSelectedUser(null);
    } catch (err) {
      console.error("Search error", err);
      alert("Erreur lors de la recherche.");
    }
  }

  // load stats
  async function loadStats() {
    setLoadingStats(true);
    try {
      const res = await fetch("/api/admin/messages/stats", {
        headers: { Authorization: `Bearer ${token || ""}` },
      });
      const json = await res.json();
      setStats(json.stats || null);
    } catch (err) {
      console.error("Stats error", err);
    } finally {
      setLoadingStats(false);
    }
  }

  // apply client-side filters to the currently loaded messages (role + date)
  const filteredMessages = useMemo(() => {
    let list = [...messages];
    if (roleFilter !== "all") {
      list = list.filter((m) => m.role === roleFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter((m) => new Date(m.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      // include entire day
      to.setHours(23, 59, 59, 999);
      list = list.filter((m) => new Date(m.createdAt) <= to);
    }
    return list;
  }, [messages, roleFilter, dateFrom, dateTo]);

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/settings" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} />
              <span className="ml-2">Retour</span>
            </Link>
            <h1 className="text-3xl font-bold mt-4">Admin Dashboard — Messages</h1>
            <p className="text-sm text-muted-foreground">Gestion, recherche, export et statistiques des conversations.</p>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={() => { loadStats(); loadUsers(); }} className="hidden md:inline-flex">
              Actualiser
            </Button>
            <Button onClick={() => { localStorage.removeItem("pimpay_token"); alert("Token supprimé."); }} variant="ghost">
              Déconnexion admin
            </Button>
          </div>
        </div>

        <Separator className="my-6" />
      </div>

      {/* Analytics */}
      <div className="max-w-6xl mx-auto">
        <Card className="p-4 bg-card border-border">
          <h3 className="text-lg font-semibold mb-3">Statistiques</h3>
          {loadingStats ? (
            <p className="text-sm text-muted-foreground">Chargement...</p>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-xs text-muted-foreground">Utilisateurs</div>
                <div className="text-2xl font-bold">{stats.totalUsers}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-xs text-muted-foreground">Messages totaux</div>
                <div className="text-2xl font-bold">{stats.totalMessages}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-xs text-muted-foreground">Messages aujourd'hui</div>
                <div className="text-2xl font-bold">{stats.messagesToday}</div>
              </div>
              <div className="p-4 bg-white/5 rounded-lg">
                <div className="text-xs text-muted-foreground">Top utilisateurs</div>
                <div className="text-sm mt-2">
                  {stats.topUsers?.map((u: any) => (
                    <div key={u.id} className="flex items-center justify-between">
                      <span>{u.email}</span>
                      <span className="text-xs text-muted-foreground">{u._count?.messages}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune statistique disponible.</p>
          )}
        </Card>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Users column */}
        <div className="lg:col-span-1">
          <Card className="p-4 bg-card border-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Utilisateurs</h3>
              <Button size="sm" onClick={loadUsers} variant="ghost">Rafraîchir</Button>
            </div>

            {loadingUsers ? (
              <p className="text-sm text-muted-foreground">Chargement...</p>
            ) : (
              <ScrollArea className="h-[60vh]">
                {users.map((u) => (
                  <div key={u.id} className="mb-2">
                    <button
                      onClick={() => loadMessagesForUser(u)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${selectedUser?.id === u.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User size={16} />
                          <div className="text-sm">{u.email}</div>
                        </div>
                        <div className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</div>
                      </div>
                    </button>
                  </div>
                ))}
              </ScrollArea>
            )}
          </Card>

          <Card className="p-4 mt-4 bg-card border-border">
            <h4 className="text-sm font-medium mb-2">Actions</h4>
            <div className="flex flex-col gap-2">
              <Button onClick={() => { if (!selectedUser) return alert("Sélectionne un utilisateur"); exportPdfForUser(selectedUser.id); }} disabled={!selectedUser}>
                <Download className="mr-2" /> Exporter PDF (user)
              </Button>
              <Button onClick={() => { const q = prompt("Recherche globale (text)"); if (q) { setQuery(q); searchMessages(q); } }}>
                <Search className="mr-2" /> Recherche globale
              </Button>
            </div>
          </Card>
        </div>

        {/* Messages & Controls column */}
        <div className="lg:col-span-3">
          <Card className="p-4 bg-card border-border">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="flex-1 min-w-[220px]">
                <Input
                  placeholder="Rechercher parmi les messages..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") searchMessages(query);
                  }}
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter size={16} />
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="rounded-md border px-2 py-2 bg-background"
                >
                  <option value="all">Tous</option>
                  <option value="user">Utilisateur</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <Calendar size={16} />
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-md border px-2 py-2 bg-background" />
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-md border px-2 py-2 bg-background" />
              </div>

              <div className="ml-auto flex gap-2">
                <Button onClick={() => { setQuery(""); setRoleFilter("all"); setDateFrom(""); setDateTo(""); }}>
                  Réinitialiser
                </Button>
                <Button onClick={() => { if (selectedUser) exportPdfForUser(selectedUser.id); else alert("Sélectionnez un utilisateur pour exporter"); }}>
                  <Download className="mr-2" /> Exporter
                </Button>
              </div>
            </div>

            <Separator className="my-2" />

            {/* Messages list */}
            <div>
              {loadingMessages ? (
                <p className="text-sm text-muted-foreground">Chargement des messages...</p>
              ) : filteredMessages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun message à afficher.</p>
              ) : (
                <ScrollArea className="h-[58vh] pr-2">
                  {filteredMessages.map((msg) => (
                    <div key={msg.id} className="mb-4">
                      <div className={`p-3 rounded-lg w-fit max-w-[85%] ${msg.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto bg-muted/30"}`}>
                        <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <div className="text-[11px] text-muted-foreground">
                          {msg.role} • {new Date(msg.createdAt).toLocaleString()}
                        </div>

                        <div className="ml-auto flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => deleteMessage(msg.id)}>
                            <Trash2 size={12} /> Supprimer
                          </Button>
                          {/* quick copy */}
                          <button
                            onClick={() => { navigator.clipboard.writeText(msg.content); alert("Copié"); }}
                            className="px-2 py-1 rounded-md border text-xs"
                          >
                            Copier
                          </button>
                        </div>
                      </div>

                      <Separator className="my-2" />
                    </div>
                  ))}
                </ScrollArea>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
