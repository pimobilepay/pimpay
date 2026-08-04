"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Gift, Loader2, AlertTriangle, Users, Trophy, Wallet, Settings2, Check, X, Power, Ban, Crown,
  Network, Search, ChevronRight, UserX, KeyRound, RefreshCw,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";
import { ReferralTree, type ReferralTopologyView } from "@/components/referral/ReferralTree";

type UserLite = { id: string; username: string | null; name: string | null; email: string | null; avatar: string | null; referralCode?: string | null } | null;
type Program = { id: string; enabled: boolean; signupBonus: number; commissionRate: number; currency: string; minPayout: number };
type Earning = { id: string; referrerId: string; type: string; amount: number; currency: string; status: string; createdAt: string; referrer: UserLite };
type TopReferrer = { referrerId: string; totalAmount: number; earningsCount: number; referralsCount: number; user: UserLite };
type Stats = { totalReferred: number; pendingAmount: number; pendingCount: number; paidAmount: number; paidCount: number };

const statusColor: Record<string, string> = {
  PENDING: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  PAID: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  CANCELLED: "text-slate-400 bg-white/5 border-white/10",
};

export default function ReferralPage() {
  const [tab, setTab] = useState<"overview" | "earnings" | "topology" | "config">("overview");
  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<Program | null>(null);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [topReferrers, setTopReferrers] = useState<TopReferrer[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [draft, setDraft] = useState<Program | null>(null);
  const [saving, setSaving] = useState(false);

  /* ── Topologie d'un utilisateur selectionne ─────────────── */
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<UserLite>(null);
  const [depth, setDepth] = useState(4);
  const [topology, setTopology] = useState<ReferralTopologyView | null>(null);
  const [topoLoading, setTopoLoading] = useState(false);
  const [topoError, setTopoError] = useState<string | null>(null);

  /* ── Edition du code de parrainage ──────────────────────── */
  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState("");
  const [savingCode, setSavingCode] = useState(false);

  const currentCode = topology?.root?.referralCode ?? selected?.referralCode ?? null;

  async function saveReferralCode(payload: { code?: string; generate?: boolean }) {
    if (!selected?.id) return;
    setSavingCode(true);
    try {
      const res = await fetch(`/api/admin/users/${selected.id}/referral-code`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Modification refusée");

      // Reflete le nouveau code sans recharger tout l'arbre
      setTopology((prev) =>
        prev ? { ...prev, root: { ...prev.root, referralCode: d.referralCode } } : prev
      );
      setSelected((prev) => (prev ? { ...prev, referralCode: d.referralCode } : prev));
      setEditingCode(false);
      setCodeDraft("");
      toast.success(
        d.unchanged ? "Code inchangé" : `Nouveau code de parrainage : ${d.referralCode}`
      );
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la modification");
    } finally {
      setSavingCode(false);
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/referral", { cache: "no-store" });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setProgram(d.program); setDraft(d.program); setEarnings(d.earnings); setTopReferrers(d.topReferrers); setStats(d.stats);
    } catch {
      toast.error("Erreur de chargement du parrainage");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Recherche d'utilisateur (debounce 350ms)
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal, cache: "no-store",
        });
        const d = await res.json();
        setResults(d.users || []);
      } catch {
        /* requete annulee */
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  // Chargement de la topologie de l'utilisateur selectionne
  useEffect(() => {
    if (!selected?.id) { setTopology(null); setTopoError(null); return; }
    let cancelled = false;
    setTopoLoading(true);
    setTopoError(null);
    (async () => {
      try {
        const res = await fetch(`/api/admin/users/${selected.id}/referral-tree?depth=${depth}`, { cache: "no-store" });
        const d = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(d.error || "Topologie indisponible");
        setTopology(d.topology);
      } catch (e: any) {
        if (!cancelled) { setTopology(null); setTopoError(e.message || "Erreur de chargement"); }
      } finally {
        if (!cancelled) setTopoLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selected?.id, depth]);

  function openTopology(user: UserLite) {
    setSelected(user);
    setQuery("");
    setResults([]);
    setEditingCode(false);
    setCodeDraft("");
    setTab("topology");
  }

  async function post(payload: any, msg: string) {
    try {
      const res = await fetch("/api/admin/referral", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      toast.success(msg);
      await fetchData();
    } catch (e: any) { toast.error(e.message || "Erreur"); }
  }

  async function saveConfig() {
    if (!draft) return;
    setSaving(true);
    await post({
      action: "updateProgram", enabled: draft.enabled, signupBonus: draft.signupBonus,
      commissionRate: draft.commissionRate, currency: draft.currency, minPayout: draft.minPayout,
    }, "Programme mis à jour");
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Parrainage & Affiliation" subtitle="Croissance" backPath="/admin" onRefresh={fetchData} />

      <div className="max-w-2xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <div className="inline-flex p-2 rounded-xl mb-2 text-purple-400 bg-purple-500/10"><Users size={16} /></div>
            <p className="text-2xl font-black text-white leading-none">{stats?.totalReferred ?? 0}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Filleuls totaux</p>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <div className="inline-flex p-2 rounded-xl mb-2 text-amber-400 bg-amber-500/10"><Wallet size={16} /></div>
            <p className="text-2xl font-black text-white leading-none">{(stats?.pendingAmount ?? 0).toLocaleString("en-US", { maximumFractionDigits: 1 })}</p>
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">Gains à payer ({stats?.pendingCount ?? 0})</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-2xl border border-white/5">
          {[
            { id: "overview", label: "Parrains", icon: <Trophy size={14} /> },
            { id: "earnings", label: "Gains", icon: <Gift size={14} /> },
            { id: "topology", label: "Réseau", icon: <Network size={14} /> },
            { id: "config", label: "Réglages", icon: <Settings2 size={14} /> },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id as any)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tab === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>
              <span className="shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : tab === "overview" ? (
          topReferrers.length === 0 ? <Empty label="Aucun parrain pour l'instant" /> : (
            <div className="space-y-3">
              {topReferrers.map((t, i) => (
                <button key={t.referrerId} onClick={() => openTopology(t.user)}
                  aria-label={`Voir la topologie de ${t.user?.username || t.user?.name || "cet utilisateur"}`}
                  className="w-full text-left bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 hover:border-blue-500/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[12px] ${i === 0 ? "bg-amber-500/20 text-amber-400" : i < 3 ? "bg-blue-500/10 text-blue-400" : "bg-white/5 text-slate-500"}`}>
                      {i === 0 ? <Crown size={14} /> : i + 1}
                    </div>
                    <Avatar user={t.user} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-white truncate uppercase tracking-tight">{t.user?.username || t.user?.name || "Inconnu"}</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{t.referralsCount} filleul(s) · {t.earningsCount} gain(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-400 tabular-nums">{t.totalAmount.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-slate-600 font-bold uppercase">{program?.currency || "PI"}</p>
                    </div>
                    <ChevronRight size={14} className="text-slate-600" aria-hidden="true" />
                  </div>
                </button>
              ))}
            </div>
          )
        ) : tab === "earnings" ? (
          earnings.length === 0 ? <Empty label="Aucun gain enregistré" /> : (
            <div className="space-y-3">
              {earnings.map((e) => (
                <div key={e.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar user={e.referrer} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[7px] font-black px-2 py-0.5 rounded-full bg-white/5 text-slate-400 border border-white/10 uppercase">{e.type}</span>
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded-full border uppercase ${statusColor[e.status]}`}>{e.status}</span>
                        </div>
                        <p className="text-[11px] font-black text-white truncate mt-1">{e.referrer?.username || e.referrer?.email || e.referrerId}</p>
                        <p className="text-[9px] text-slate-600 font-mono">{new Date(e.createdAt).toLocaleDateString("fr-FR")}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-black text-white tabular-nums">{e.amount.toLocaleString("en-US", { maximumFractionDigits: 2 })}</p>
                      <p className="text-[8px] text-slate-600 font-bold uppercase">{e.currency}</p>
                    </div>
                  </div>
                  {e.status === "PENDING" && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/5">
                      <Btn onClick={() => post({ action: "payEarning", id: e.id }, "Gain payé")} tone="emerald" icon={<Check size={12} />} label="Payer" />
                      <Btn onClick={() => post({ action: "cancelEarning", id: e.id }, "Gain annulé")} tone="slate" icon={<Ban size={12} />} label="Annuler" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        ) : tab === "topology" ? (
          <div className="space-y-4">
            {/* Selecteur d'utilisateur */}
            <div className="relative">
              <label htmlFor="topo-search" className="sr-only">Rechercher un utilisateur</label>
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" aria-hidden="true" />
              <input
                id="topo-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, @username, email ou téléphone…"
                className="r-input"
                style={{ paddingLeft: "2.25rem" }}
                autoComplete="off"
              />
              {searching && <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}

              {results.length > 0 && (
                <ul className="absolute z-20 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-slate-950/95 backdrop-blur p-1.5 shadow-2xl">
                  {results.map((u) => (
                    <li key={u!.id}>
                      <button onClick={() => openTopology(u)}
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-white/5 transition-colors">
                        <Avatar user={u} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-black text-white truncate uppercase tracking-tight">{u!.username || u!.name || "Sans nom"}</p>
                          <p className="text-[9px] text-slate-500 font-mono truncate">{u!.email || u!.id}</p>
                        </div>
                        <ChevronRight size={14} className="text-slate-600 shrink-0" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* En-tete de la selection + profondeur */}
            {selected && (
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar user={selected} />
                    <div className="min-w-0">
                      <p className="text-[12px] font-black text-white truncate uppercase tracking-tight">{selected.username || selected.name || "Sans nom"}</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate">{selected.email || selected.id}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelected(null)}
                    aria-label="Effacer la sélection"
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white transition-colors">
                    <X size={12} /> Effacer
                  </button>
                </div>
                {/* Code de parrainage : consultation / modification */}
                <div className="pt-3 border-t border-white/5">
                  {!editingCode ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Code de parrainage</p>
                        <p className="mt-1 text-[13px] font-black font-mono text-blue-400 truncate">
                          {currentCode || "— aucun —"}
                        </p>
                      </div>
                      <button
                        onClick={() => { setCodeDraft(currentCode || ""); setEditingCode(true); }}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-500/20 bg-blue-500/10 text-[9px] font-black uppercase tracking-wider text-blue-400 hover:bg-blue-500/20 transition-colors"
                      >
                        <KeyRound size={12} /> Modifier
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <label htmlFor="code-draft" className="block text-[9px] font-black uppercase tracking-widest text-slate-500">
                        Nouveau code de parrainage
                      </label>
                      <input
                        id="code-draft"
                        value={codeDraft}
                        onChange={(e) => setCodeDraft(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.nativeEvent.isComposing || e.keyCode === 229) return;
                          if (e.key === "Enter" && !savingCode) saveReferralCode({ code: codeDraft });
                        }}
                        placeholder="EX : PIMOBI2026"
                        maxLength={20}
                        autoComplete="off"
                        spellCheck={false}
                        className="r-input font-mono tracking-widest"
                      />
                      <p className="text-[9px] font-bold text-slate-500 leading-relaxed">
                        4 à 20 caractères : lettres, chiffres, tiret, underscore. Les anciens liens de
                        parrainage cesseront de fonctionner et le membre sera notifié.
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveReferralCode({ code: codeDraft })}
                          disabled={savingCode || codeDraft.trim().length < 4}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-blue-600 text-[9px] font-black uppercase tracking-wider text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
                        >
                          {savingCode ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Enregistrer
                        </button>
                        <button
                          onClick={() => saveReferralCode({ generate: true })}
                          disabled={savingCode}
                          title="Générer un code aléatoire"
                          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-[9px] font-black uppercase tracking-wider text-slate-300 disabled:opacity-40 hover:text-white transition-colors"
                        >
                          <RefreshCw size={12} /> Générer
                        </button>
                        <button
                          onClick={() => { setEditingCode(false); setCodeDraft(""); }}
                          disabled={savingCode}
                          aria-label="Annuler la modification"
                          className="flex items-center justify-center px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-400 disabled:opacity-40 hover:text-white transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Profondeur</span>
                  <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-slate-950/60 p-1" role="group" aria-label="Profondeur de l'arbre">
                    {[1, 2, 3, 4, 5, 6].map((d) => (
                      <button key={d} onClick={() => setDepth(d)} aria-pressed={depth === d}
                        className={`h-7 w-7 rounded-lg text-[10px] font-black transition-colors ${depth === d ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Arbre */}
            {!selected ? (
              <div className="flex flex-col items-center py-16 text-slate-600">
                <UserX size={28} className="mb-3 opacity-30" />
                <p className="text-[10px] font-black uppercase tracking-widest text-center text-balance">
                  Recherchez un utilisateur ou touchez un parrain du classement
                </p>
              </div>
            ) : topoLoading ? (
              <div className="flex justify-center py-16 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
            ) : topoError || !topology ? (
              <Empty label={topoError || "Topologie indisponible"} />
            ) : (
              <ReferralTree
                topology={topology}
                showUpline
                defaultExpandedDepth={2}
                onSelect={(node) => openTopology({
                  id: node.id, username: node.username, name: node.name,
                  email: null, avatar: node.avatar, referralCode: node.referralCode ?? null,
                })}
                emptyLabel="Cet utilisateur n'a aucun filleul"
              />
            )}
          </div>
        ) : (
          draft && (
            <div className="space-y-4">
              <button onClick={() => setDraft({ ...draft, enabled: !draft.enabled })}
                className={`w-full flex items-center justify-between px-4 py-4 rounded-2xl border ${draft.enabled ? "bg-emerald-500/10 border-emerald-500/20" : "bg-white/5 border-white/10"}`}>
                <div className="flex items-center gap-2"><Power size={16} className={draft.enabled ? "text-emerald-400" : "text-slate-500"} /><span className="text-[11px] font-black uppercase tracking-wide text-white">Programme {draft.enabled ? "actif" : "désactivé"}</span></div>
                <span className={`w-5 h-5 rounded-md flex items-center justify-center ${draft.enabled ? "bg-emerald-500 text-white" : "bg-white/5 text-transparent"}`}>{draft.enabled ? <Check size={12} /> : <X size={12} />}</span>
              </button>

              <Field label="Bonus d'inscription (filleul + parrain)">
                <input type="number" value={draft.signupBonus} onChange={(e) => setDraft({ ...draft, signupBonus: Number(e.target.value) })} className="r-input" />
              </Field>
              <Field label="Taux de commission (% des frais générés)">
                <div className="flex items-center gap-2">
                  <input type="number" step="0.01" value={draft.commissionRate} onChange={(e) => setDraft({ ...draft, commissionRate: Number(e.target.value) })} className="r-input" />
                  <span className="text-[10px] font-black text-slate-400 whitespace-nowrap">= {(draft.commissionRate * 100).toFixed(1)}%</span>
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Devise"><input value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })} className="r-input" /></Field>
                <Field label="Paiement min."><input type="number" value={draft.minPayout} onChange={(e) => setDraft({ ...draft, minPayout: Number(e.target.value) })} className="r-input" /></Field>
              </div>
              <button onClick={saveConfig} disabled={saving}
                className="w-full py-3.5 bg-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-blue-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Enregistrer les réglages
              </button>
            </div>
          )
        )}
      </div>

      <style jsx global>{`
        .r-input {
          width: 100%; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 0.75rem; padding: 0.7rem 0.9rem; font-size: 12px; font-weight: 600; color: white; outline: none;
        }
        .r-input::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}

function Avatar({ user }: { user: UserLite }) {
  if (user?.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatar} alt={user.name || "u"} className="w-9 h-9 rounded-xl object-cover border border-white/10" crossOrigin="anonymous" />;
  }
  return <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-black uppercase">{(user?.username || user?.name || "?")[0]}</div>;
}
function Btn({ onClick, tone, icon, label }: { onClick: () => void; tone: string; icon: React.ReactNode; label: string }) {
  const map: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    slate: "bg-white/5 text-slate-400 border-white/10",
  };
  return (
    <button onClick={onClick} className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider border ${map[tone]}`}>
      {icon}{label}
    </button>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5 block">{label}</label>{children}</div>;
}
function Empty({ label }: { label: string }) {
  return <div className="flex flex-col items-center py-16 text-slate-600"><AlertTriangle size={28} className="mb-3 opacity-30" /><p className="text-[10px] font-black uppercase tracking-widest text-center">{label}</p></div>;
}
