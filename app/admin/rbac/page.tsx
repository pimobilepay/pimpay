"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, Crown, Check, X, ScrollText, Search,
  UserCog, ChevronDown, ChevronUp, Power, Tag,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type Admin = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
  avatar: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  isSuperAdmin: boolean;
  permissions: string[];
  title: string | null;
  active: boolean;
  hasProfile: boolean;
};

type CatalogItem = { key: string; label: string };
type Preset = { key: string; label: string; permissions: string[] };
type AuditLog = {
  id: string;
  adminName: string | null;
  action: string;
  category: string | null;
  targetEmail: string | null;
  details: string | null;
  ip: string | null;
  status: string;
  createdAt: string;
};

const statusColor: Record<string, string> = {
  SUCCESS: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  DENIED: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  FAILED: "text-rose-400 bg-rose-500/10 border-rose-500/20",
};

export default function RbacPage() {
  const [tab, setTab] = useState<"roles" | "audit">("roles");
  const [loading, setLoading] = useState(true);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);

  // Audit log
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [logCategory, setLogCategory] = useState("ALL");
  const [logStatus, setLogStatus] = useState("ALL");
  const [logQuery, setLogQuery] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/rbac", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAdmins(data.admins);
      setCatalog(data.catalog);
      setPresets(data.presets);
      const d: Record<string, string[]> = {};
      data.admins.forEach((a: Admin) => (d[a.id] = a.permissions));
      setDraft(d);
    } catch {
      toast.error("Erreur de chargement RBAC");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
    setLogLoading(true);
    try {
      const params = new URLSearchParams({ category: logCategory, status: logStatus });
      if (logQuery) params.set("q", logQuery);
      const res = await fetch(`/api/admin/audit-log?${params}`, { cache: "no-store" });
      if (res.ok) setLogs((await res.json()).logs);
    } finally {
      setLogLoading(false);
    }
  }, [logCategory, logStatus, logQuery]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    if (tab === "audit") fetchLogs();
  }, [tab, fetchLogs]);

  async function post(payload: any, successMsg: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/rbac", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      toast.success(successMsg);
      await fetchRoles();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  function togglePerm(adminId: string, key: string) {
    setDraft((prev) => {
      const cur = prev[adminId] || [];
      return {
        ...prev,
        [adminId]: cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key],
      };
    });
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="RBAC & Audit" subtitle="Permissions" backPath="/admin" onRefresh={tab === "roles" ? fetchRoles : fetchLogs} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-2xl border border-white/5">
          {[
            { id: "roles", label: "Rôles & Permissions", icon: <ShieldCheck size={14} /> },
            { id: "audit", label: "Journal d'audit", icon: <ScrollText size={14} /> },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {tab === "roles" && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-20 text-blue-500">
                <Loader2 className="animate-spin mb-3" size={32} />
                <p className="text-[10px] font-black uppercase tracking-widest">Chargement…</p>
              </div>
            ) : admins.length === 0 ? (
              <EmptyState label="Aucun administrateur" />
            ) : (
              admins.map((a) => {
                const isOpen = expanded === a.id;
                const dPerms = draft[a.id] || [];
                return (
                  <div key={a.id} className="bg-slate-900/40 border border-white/5 rounded-[2rem] overflow-hidden">
                    <button
                      onClick={() => setExpanded(isOpen ? null : a.id)}
                      className="w-full flex items-center justify-between p-5 text-left"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {a.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={a.avatar} alt={a.name || "admin"} className="w-11 h-11 rounded-2xl object-cover border border-white/10" crossOrigin="anonymous" />
                        ) : (
                          <div className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 font-black uppercase">
                            {(a.username || a.name || "?")[0]}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-white truncate uppercase tracking-tight">{a.username || a.name || "Admin"}</p>
                            {a.isSuperAdmin && (
                              <span className="flex items-center gap-1 text-[7px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase">
                                <Crown size={8} /> Super
                              </span>
                            )}
                            {!a.active && (
                              <span className="text-[7px] font-black px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-full border border-rose-500/20 uppercase">Inactif</span>
                            )}
                          </div>
                          <p className="text-[10px] text-blue-400 font-mono truncate">{a.title || a.email || "—"}</p>
                          <p className="text-[9px] text-slate-600 font-bold uppercase mt-0.5">
                            {a.isSuperAdmin ? "Accès total" : `${a.permissions.length} permission(s)`}
                          </p>
                        </div>
                      </div>
                      {isOpen ? <ChevronUp size={18} className="text-slate-500 shrink-0" /> : <ChevronDown size={18} className="text-slate-500 shrink-0" />}
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                        {/* Quick controls */}
                        <div className="flex flex-wrap gap-2">
                          <button
                            disabled={saving}
                            onClick={() => post({ action: "setSuperAdmin", userId: a.id, isSuperAdmin: !a.isSuperAdmin }, "Statut super-admin mis à jour")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-colors ${
                              a.isSuperAdmin ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-white/5 text-slate-400 border-white/10 hover:text-white"
                            }`}
                          >
                            <Crown size={12} /> Super-admin
                          </button>
                          <button
                            disabled={saving}
                            onClick={() => post({ action: "setActive", userId: a.id, active: !a.active }, "Statut actif mis à jour")}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-colors ${
                              a.active ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border-rose-500/30"
                            }`}
                          >
                            <Power size={12} /> {a.active ? "Actif" : "Inactif"}
                          </button>
                          <button
                            disabled={saving}
                            onClick={() => {
                              const title = prompt("Titre / fonction :", a.title || "");
                              if (title !== null) post({ action: "setTitle", userId: a.id, title }, "Titre mis à jour");
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border bg-white/5 text-slate-400 border-white/10 hover:text-white"
                          >
                            <Tag size={12} /> Titre
                          </button>
                        </div>

                        {/* Presets */}
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Rôles prédéfinis</p>
                          <div className="flex flex-wrap gap-2">
                            {presets.map((p) => (
                              <button
                                key={p.key}
                                disabled={saving}
                                onClick={() => post({ action: "applyPreset", userId: a.id, preset: p.key }, `Preset "${p.label}" appliqué`)}
                                className="px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Permission matrix */}
                        <div>
                          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Permissions individuelles</p>
                          <div className="grid grid-cols-1 gap-1.5">
                            {catalog.map((c) => {
                              const checked = a.isSuperAdmin || dPerms.includes(c.key);
                              return (
                                <button
                                  key={c.key}
                                  disabled={a.isSuperAdmin}
                                  onClick={() => togglePerm(a.id, c.key)}
                                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl border text-left transition-colors ${
                                    checked ? "bg-emerald-500/5 border-emerald-500/20" : "bg-white/[0.02] border-white/5"
                                  } ${a.isSuperAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                  <span className="text-[11px] font-bold text-white">{c.label}</span>
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center ${checked ? "bg-emerald-500 text-white" : "bg-white/5 text-transparent"}`}>
                                    {checked ? <Check size={12} /> : <X size={12} className="opacity-0" />}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {!a.isSuperAdmin && (
                          <button
                            disabled={saving}
                            onClick={() => post({ action: "updatePermissions", userId: a.id, permissions: dPerms }, "Permissions enregistrées")}
                            className="w-full py-3.5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer les permissions
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-slate-900/60 border border-white/5 rounded-2xl px-4 py-3">
                <Search size={16} className="text-slate-500" />
                <input
                  value={logQuery}
                  onChange={(e) => setLogQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
                  placeholder="Rechercher action, admin, cible…"
                  className="flex-1 bg-transparent text-[12px] text-white placeholder:text-slate-600 outline-none"
                />
              </div>
              <div className="flex gap-2">
                <select value={logCategory} onChange={(e) => setLogCategory(e.target.value)} className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white uppercase tracking-wider outline-none">
                  {["ALL", "rbac", "users", "finance", "aml", "disputes", "exchange", "referral", "security", "kyc", "system"].map((c) => (
                    <option key={c} value={c}>{c === "ALL" ? "Toutes catégories" : c}</option>
                  ))}
                </select>
                <select value={logStatus} onChange={(e) => setLogStatus(e.target.value)} className="flex-1 bg-slate-900/60 border border-white/5 rounded-xl px-3 py-2.5 text-[10px] font-bold text-white uppercase tracking-wider outline-none">
                  {["ALL", "SUCCESS", "DENIED", "FAILED"].map((s) => (
                    <option key={s} value={s}>{s === "ALL" ? "Tous statuts" : s}</option>
                  ))}
                </select>
              </div>
            </div>

            {logLoading ? (
              <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
            ) : logs.length === 0 ? (
              <EmptyState label="Aucune entrée d'audit" />
            ) : (
              logs.map((l) => (
                <div key={l.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[11px] font-black text-white uppercase tracking-tight">{l.action}</p>
                        <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[l.status] || "text-slate-400 bg-white/5 border-white/10"}`}>{l.status}</span>
                        {l.category && <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">{l.category}</span>}
                      </div>
                      {l.details && <p className="text-[10px] text-slate-400 mt-1">{l.details}</p>}
                      <p className="text-[9px] text-slate-600 font-mono mt-1">
                        {l.adminName || "SYSTEM"}{l.targetEmail ? ` → ${l.targetEmail}` : ""}{l.ip ? ` · ${l.ip}` : ""}
                      </p>
                    </div>
                    <p className="text-[8px] text-slate-600 font-bold uppercase shrink-0 whitespace-nowrap">
                      {new Date(l.createdAt).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-600">
      <UserCog size={32} className="mb-3 opacity-30" />
      <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
    </div>
  );
}
