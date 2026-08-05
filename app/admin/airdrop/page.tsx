"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Gift, Loader2, Rocket, Users, Wallet, Calculator, Send, Check, AlertTriangle,
  Sparkles, History, ShieldAlert, X, Coins,
} from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

const ROLES = ["USER", "AGENT", "MERCHANT", "BUSINESS_ADMIN", "BANK_ADMIN", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

const ROLE_LABELS: Record<Role, string> = {
  USER: "Utilisateurs",
  AGENT: "Agents",
  MERCHANT: "Marchands",
  BUSINESS_ADMIN: "Entreprises",
  BANK_ADMIN: "Banques",
  ADMIN: "Administrateurs",
};

type RoleRow = { role: Role; total: number; active: number };
type UserLite = { id: string; username: string | null; name: string | null; email: string | null; avatar: string | null; role: string } | null;
type PendingRow = { referrerId: string; currency: string; amount: number; earningsCount: number; eligible: boolean; user: UserLite };
type HistoryRow = { id: string; action: string; adminName: string | null; details: string | null; createdAt: string; status: string | null };

type Data = {
  currency: string;
  minPayout: number;
  programEnabled: boolean;
  roles: RoleRow[];
  airdrop: { distributedAmount: number; distributedCount: number; history: HistoryRow[] };
  referral: {
    pendingAmount: number; pendingCount: number; paidAmount: number; paidCount: number;
    referrersPending: number; eligibleReferrers: number; eligibleAmount: number; rows: PendingRow[];
  };
};

type Computed = {
  computedAt: string; minPayout: number; totalPending: number; totalEligible: number;
  referrersPending: number; referrersEligible: number; earningsEligible: number;
  byCurrency: { currency: string; amount: number }[];
};

const nf = (n: number, d = 2) => n.toLocaleString("fr-FR", { maximumFractionDigits: d });

export default function AdminAirdropPage() {
  const [section, setSection] = useState<"airdrop" | "referral">("airdrop");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Data | null>(null);

  const [amounts, setAmounts] = useState<Record<Role, string>>(
    () => ROLES.reduce((acc, r) => ({ ...acc, [r]: "" }), {} as Record<Role, string>)
  );
  const [note, setNote] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [confirm, setConfirm] = useState<null | "airdrop" | "referral">(null);

  const [computing, setComputing] = useState(false);
  const [computed, setComputed] = useState<Computed | null>(null);
  const [paying, setPaying] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/airdrop", { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Chargement impossible");
      setData(d);
    } catch (e: any) {
      toast.error(e.message || "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const roleMap = useMemo(
    () => new Map((data?.roles || []).map((r) => [r.role, r])),
    [data]
  );

  const plan = useMemo(() => {
    return ROLES.map((role) => {
      const amount = Number.parseFloat(amounts[role]) || 0;
      const row = roleMap.get(role);
      const recipients = onlyActive ? row?.active ?? 0 : row?.total ?? 0;
      return { role, amount, recipients, total: amount * recipients };
    }).filter((p) => p.amount > 0);
  }, [amounts, roleMap, onlyActive]);

  const grandTotal = plan.reduce((s, p) => s + p.total, 0);
  const totalRecipients = plan.reduce((s, p) => s + p.recipients, 0);

  async function distribute() {
    setDistributing(true);
    try {
      const res = await fetch("/api/admin/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "distributeAirdrop",
          amounts: ROLES.reduce((acc, r) => ({ ...acc, [r]: Number.parseFloat(amounts[r]) || 0 }), {}),
          note,
          onlyActive,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Distribution refusée");
      toast.success(`Airdrop distribué : ${nf(d.grandTotal)} ${d.currency}`);
      setAmounts(ROLES.reduce((acc, r) => ({ ...acc, [r]: "" }), {} as Record<Role, string>));
      setNote("");
      setConfirm(null);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setDistributing(false);
    }
  }

  async function compute() {
    setComputing(true);
    try {
      const res = await fetch("/api/admin/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "computeReferralBonuses" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Calcul impossible");
      setComputed(d);
      toast.success(`${nf(d.totalPending)} de bonus en attente calculés`);
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setComputing(false);
    }
  }

  async function payAll() {
    setPaying(true);
    try {
      const res = await fetch("/api/admin/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "payReferralBonuses" }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Paiement refusé");
      toast.success(`${nf(d.paidAmount)} versés à ${d.paidReferrers} parrain(s)`);
      setConfirm(null);
      setComputed(null);
      await fetchData();
    } catch (e: any) {
      toast.error(e.message || "Erreur");
    } finally {
      setPaying(false);
    }
  }

  const currency = data?.currency || "PI";

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <AdminTopNav title="Airdrop & Bonus" subtitle="Distribution" backPath="/admin" onRefresh={fetchData} />

      <main className="max-w-2xl mx-auto px-4 pt-4">
        {/* Bascule des deux sections */}
        <div className="flex gap-2 mb-6 p-1 bg-slate-900/60 rounded-2xl border border-white/5" role="tablist">
          {[
            { id: "airdrop", label: "Airdrop", icon: <Rocket size={14} /> },
            { id: "referral", label: "Bonus parrainage", icon: <Gift size={14} /> },
          ].map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={section === t.id}
              onClick={() => setSection(t.id as any)}
              className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                section === t.id ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"
              }`}
            >
              <span className="shrink-0">{t.icon}</span>
              <span className="truncate">{t.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20 text-blue-500"><Loader2 className="animate-spin" size={28} /></div>
        ) : !data ? (
          <Empty label="Données indisponibles" />
        ) : section === "airdrop" ? (
          /* ═══════════════ SECTION 1 · AIRDROP ═══════════════ */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Coins size={16} />} tone="amber" value={`${nf(data.airdrop.distributedAmount)}`} label={`Airdrop distribué (${currency})`} />
              <Stat icon={<Users size={16} />} tone="blue" value={nf(data.airdrop.distributedCount, 0)} label="Crédits envoyés" />
            </div>

            {/* Saisie du montant par rôle */}
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles size={14} className="text-amber-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-white">Montant par rôle</h2>
              </div>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed mb-4">
                Saisissez le montant en {currency} attribué à chaque membre du rôle. Laissez vide pour exclure un rôle.
              </p>

              <div className="space-y-2.5">
                {ROLES.map((role) => {
                  const row = roleMap.get(role);
                  const recipients = onlyActive ? row?.active ?? 0 : row?.total ?? 0;
                  const amount = Number.parseFloat(amounts[role]) || 0;
                  return (
                    <div key={role} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                      <div className="min-w-0 flex-1">
                        <label htmlFor={`amt-${role}`} className="block text-[11px] font-black uppercase tracking-tight text-white truncate">
                          {ROLE_LABELS[role]}
                        </label>
                        <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                          {recipients} bénéficiaire(s){amount > 0 ? ` · ${nf(amount * recipients)} ${currency}` : ""}
                        </p>
                      </div>
                      <input
                        id={`amt-${role}`}
                        inputMode="decimal"
                        value={amounts[role]}
                        onChange={(e) => {
                          const v = e.target.value.replace(",", ".");
                          if (v === "" || /^\d*\.?\d*$/.test(v)) setAmounts((p) => ({ ...p, [role]: v }));
                        }}
                        placeholder="0"
                        className="w-24 shrink-0 rounded-xl bg-slate-950 border border-white/10 px-3 py-2.5 text-right text-[12px] font-black tabular-nums text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label htmlFor="ad-note" className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5">
                    Motif (visible par le bénéficiaire)
                  </label>
                  <input
                    id="ad-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={200}
                    placeholder="Ex : Campagne de lancement Pi Mainnet"
                    className="w-full rounded-xl bg-slate-950 border border-white/10 px-3.5 py-3 text-[12px] font-bold text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <button
                  onClick={() => setOnlyActive((v) => !v)}
                  className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[10px] font-black uppercase tracking-wider text-white">Comptes actifs uniquement</span>
                    <span className="block text-[9px] font-bold text-slate-500 mt-0.5">Exclut les comptes bannis, gelés ou en attente</span>
                  </span>
                  <span className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${onlyActive ? "bg-emerald-500" : "bg-white/10"}`}>
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${onlyActive ? "left-6" : "left-1"}`} />
                  </span>
                </button>
              </div>

              {/* Recapitulatif */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-end justify-between gap-3 mb-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total à distribuer</p>
                    <p className="text-2xl font-black text-amber-400 tabular-nums leading-none mt-1">
                      {nf(grandTotal)} <span className="text-[11px] text-slate-500">{currency}</span>
                    </p>
                  </div>
                  <p className="text-[9px] font-mono text-slate-500 text-right">
                    {plan.length} rôle(s)<br />{totalRecipients} bénéficiaire(s)
                  </p>
                </div>
                <button
                  onClick={() => setConfirm("airdrop")}
                  disabled={grandTotal <= 0 || distributing}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-amber-500 text-[10px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-30 hover:bg-amber-400 transition-colors"
                >
                  <Rocket size={14} /> Partager l&apos;airdrop
                </button>
              </div>
            </section>

            {/* Historique */}
            <section>
              <div className="flex items-center gap-2 mb-3 ml-1">
                <History size={12} className="text-slate-500" />
                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Dernières distributions</h2>
              </div>
              {data.airdrop.history.length === 0 ? (
                <Empty label="Aucune distribution enregistrée" />
              ) : (
                <ul className="space-y-2">
                  {data.airdrop.history.map((h) => (
                    <li key={h.id} className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-wider text-white truncate">
                            {h.action.replace("AIRDROP_", "").replaceAll("_", " ")}
                          </p>
                          <p className="text-[9px] font-mono text-slate-500 mt-1 break-words">{h.details || "—"}</p>
                        </div>
                        <p className="text-[8px] font-mono text-slate-600 shrink-0 text-right">
                          {new Date(h.createdAt).toLocaleDateString("fr-FR")}<br />{h.adminName || "SYSTEM"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : (
          /* ═══════════ SECTION 2 · BONUS DE PARRAINAGE ═══════════ */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <Stat icon={<Wallet size={16} />} tone="amber" value={nf(data.referral.pendingAmount)} label={`En attente (${data.referral.pendingCount})`} />
              <Stat icon={<Check size={16} />} tone="emerald" value={nf(data.referral.paidAmount)} label={`Déjà payé (${data.referral.paidCount})`} />
            </div>

            {!data.programEnabled && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <ShieldAlert size={14} className="text-rose-400 mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold text-rose-300 leading-relaxed">
                  Le programme de parrainage est désactivé. Les paiements restent possibles mais aucun nouveau gain n&apos;est généré.
                </p>
              </div>
            )}

            {/* Calcul global */}
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calculator size={14} className="text-blue-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-white">Calcul des bonus gagnés</h2>
              </div>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed mb-4">
                Agrège tous les gains en attente par parrain et vérifie le seuil de paiement ({nf(data.minPayout)} {currency}).
              </p>

              <button
                onClick={compute}
                disabled={computing}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-40 hover:bg-blue-500 transition-colors"
              >
                {computing ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                Calculer tous les bonus
              </button>

              {computed && (
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MiniStat value={nf(computed.totalPending)} label="Bonus gagnés" tone="text-white" />
                    <MiniStat value={nf(computed.totalEligible)} label="Payable maintenant" tone="text-emerald-400" />
                    <MiniStat value={nf(computed.referrersEligible, 0)} label={`Parrains éligibles / ${computed.referrersPending}`} tone="text-blue-400" />
                    <MiniStat value={nf(computed.earningsEligible, 0)} label="Gains concernés" tone="text-amber-400" />
                  </div>
                  {computed.byCurrency.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {computed.byCurrency.map((c) => (
                        <span key={c.currency} className="text-[9px] font-black px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 tabular-nums">
                          {nf(c.amount)} {c.currency}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[8px] font-mono text-slate-600">
                    Calculé à {new Date(computed.computedAt).toLocaleTimeString("fr-FR")}
                  </p>
                </div>
              )}
            </section>

            {/* Paiement global */}
            <section className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Send size={14} className="text-emerald-400" />
                <h2 className="text-[11px] font-black uppercase tracking-widest text-white">Paiement à tous les parrains</h2>
              </div>
              <p className="text-[9px] font-bold text-slate-500 leading-relaxed mb-4">
                Un seul appui crédite le portefeuille de chaque parrain éligible, marque ses gains comme payés et le notifie.
              </p>
              <div className="flex items-end justify-between gap-3 mb-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Montant total</p>
                  <p className="text-2xl font-black text-emerald-400 tabular-nums leading-none mt-1">
                    {nf(data.referral.eligibleAmount)} <span className="text-[11px] text-slate-500">{currency}</span>
                  </p>
                </div>
                <p className="text-[9px] font-mono text-slate-500 text-right">
                  {data.referral.eligibleReferrers} parrain(s)<br />éligible(s)
                </p>
              </div>
              <button
                onClick={() => setConfirm("referral")}
                disabled={data.referral.eligibleReferrers === 0 || paying}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-emerald-500 text-[10px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-30 hover:bg-emerald-400 transition-colors"
              >
                <Send size={14} /> Payer tous les bonus
              </button>
            </section>

            {/* Détail par parrain */}
            <section>
              <div className="flex items-center gap-2 mb-3 ml-1">
                <Users size={12} className="text-slate-500" />
                <h2 className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">Bonus en attente par parrain</h2>
              </div>
              {data.referral.rows.length === 0 ? (
                <Empty label="Aucun bonus en attente" />
              ) : (
                <ul className="space-y-2">
                  {data.referral.rows.map((r) => (
                    <li key={`${r.referrerId}-${r.currency}`} className="bg-slate-900/40 border border-white/5 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-tight text-white truncate">
                          {r.user?.username || r.user?.name || r.user?.email || r.referrerId}
                        </p>
                        <p className="text-[9px] font-mono text-slate-500 mt-0.5">
                          {r.earningsCount} gain(s) · {r.user?.role || "—"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-black tabular-nums text-white">{nf(r.amount)} <span className="text-[9px] text-slate-500">{r.currency}</span></p>
                        <p className={`text-[8px] font-black uppercase tracking-wider mt-0.5 ${r.eligible ? "text-emerald-400" : "text-slate-600"}`}>
                          {r.eligible ? "Éligible" : "Sous le seuil"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Confirmation */}
      {confirm && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setConfirm(null)} />
          <div role="dialog" aria-modal="true" aria-label="Confirmation" className="fixed z-[70] left-4 right-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-[#0a0f1a] border border-white/10 rounded-3xl p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400"><AlertTriangle size={18} /></div>
              <button onClick={() => setConfirm(null)} aria-label="Fermer" className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white transition-colors"><X size={14} /></button>
            </div>
            <h3 className="text-[13px] font-black uppercase tracking-wider text-white">
              {confirm === "airdrop" ? "Confirmer l'airdrop" : "Confirmer le paiement"}
            </h3>
            <p className="text-[10px] font-bold text-slate-400 leading-relaxed mt-2">
              {confirm === "airdrop" ? (
                <>
                  {nf(grandTotal)} {currency} seront crédités à {totalRecipients} bénéficiaire(s) sur {plan.length} rôle(s).
                  Cette action est irréversible.
                </>
              ) : (
                <>
                  {nf(data?.referral.eligibleAmount || 0)} {currency} seront versés à {data?.referral.eligibleReferrers || 0} parrain(s)
                  et tous leurs gains seront marqués comme payés. Cette action est irréversible.
                </>
              )}
            </p>
            {confirm === "airdrop" && plan.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {plan.map((p) => (
                  <li key={p.role} className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-400">{ROLE_LABELS[p.role]}</span>
                    <span className="font-mono text-white tabular-nums">{nf(p.amount)} × {p.recipients}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 mt-5">
              <button onClick={() => setConfirm(null)} className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-300">
                Annuler
              </button>
              <button
                onClick={confirm === "airdrop" ? distribute : payAll}
                disabled={distributing || paying}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-950 disabled:opacity-40 ${confirm === "airdrop" ? "bg-amber-500" : "bg-emerald-500"}`}
              >
                {distributing || paying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                Confirmer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Sous-composants ─────────────────────────────────────────── */

function Stat({ icon, value, label, tone }: { icon: React.ReactNode; value: string; label: string; tone: "amber" | "blue" | "emerald" }) {
  const tones = {
    amber: "text-amber-400 bg-amber-500/10",
    blue: "text-blue-400 bg-blue-500/10",
    emerald: "text-emerald-400 bg-emerald-500/10",
  };
  return (
    <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
      <div className={`inline-flex p-2 rounded-xl mb-2 ${tones[tone]}`}>{icon}</div>
      <p className="text-xl font-black text-white leading-none tabular-nums">{value}</p>
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1">{label}</p>
    </div>
  );
}

function MiniStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] border border-white/5 p-3">
      <p className={`text-[15px] font-black tabular-nums leading-none ${tone}`}>{value}</p>
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter mt-1.5">{label}</p>
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-600 bg-slate-900/20 border border-white/5 rounded-2xl">
      <Gift size={22} className="mb-2 opacity-30" />
      <p className="text-[10px] font-black uppercase tracking-wider">{label}</p>
    </div>
  );
}
