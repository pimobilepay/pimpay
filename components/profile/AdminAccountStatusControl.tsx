"use client";

import useSWR from "swr";
import { useState } from "react";
import { AlertTriangle, Check, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface Props { currentUserId: string; }
const fetcher = (url: string) => fetch(url, { credentials: "include" }).then((r) => r.json());

export function AdminAccountStatusControl({ currentUserId }: Props) {
  const { data } = useSWR("/api/admin/users?pageSize=100", fetcher);
  const users = (data?.users || []).filter((item: { id: string }) => item.id !== currentUserId);
  const [targetUserId, setTargetUserId] = useState("");
  const target = users.find((item: { id: string; status: string }) => item.id === targetUserId);
  const [status, setStatus] = useState(target?.status || "ACTIVE");
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<"totp" | "pin">("totp");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const disabled = status === "FROZEN";

  async function submit() {
    if (!targetUserId) { toast.error("Sélectionnez un compte utilisateur."); return; }
    if (!/^\d{4,6}$/.test(code)) { toast.error(method === "pin" ? "Le PIN doit contenir 4 à 6 chiffres." : "Le code doit contenir 6 chiffres."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/account-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetUserId, action: disabled ? "UNFREEZE" : "FREEZE", method, code }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action refusée");
      setStatus(disabled ? "ACTIVE" : "FROZEN"); setCode(""); setOpen(false);
      toast.success(disabled ? "Compte réactivé." : "Compte désactivé temporairement.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Impossible de modifier le compte."); }
    finally { setLoading(false); }
  }

  return (
    <section className="mx-6 mb-8 rounded-[28px] border border-red-500/20 bg-red-500/[0.06] p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-red-500/10 p-3 text-red-400"><AlertTriangle aria-hidden="true" size={20} /></div>
        <div className="min-w-0 flex-1"><p className="text-sm font-bold text-white">Gestion du compte utilisateur</p><p className="mt-1 text-xs leading-5 text-slate-400">Désactivation réversible. Les transactions et historiques sont conservés.</p></div>
      </div>
      <label className="mt-4 block text-xs font-bold text-slate-400" htmlFor="target-user">Compte à gérer</label>
      <select id="target-user" value={targetUserId} onChange={(e) => { setTargetUserId(e.target.value); setStatus(users.find((item: { id: string; status: string }) => item.id === e.target.value)?.status || "ACTIVE"); }} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm text-white outline-none focus:border-blue-400"><option value="">Sélectionner un utilisateur</option>{users.map((item: { id: string; name?: string; email?: string; status: string }) => <option key={item.id} value={item.id}>{item.name || item.email || item.id} — {item.status}</option>)}</select>
      <button type="button" onClick={() => setOpen(true)} disabled={!targetUserId} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition hover:bg-red-500/20">
        {disabled ? <Check aria-hidden="true" size={17} /> : <LockKeyhole aria-hidden="true" size={17} />}{disabled ? "Réactiver ce compte" : "Désactiver ce compte"}
      </button>
      {open && <div role="dialog" aria-modal="true" className="mt-4 rounded-2xl border border-white/10 bg-slate-950 p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-white"><ShieldCheck aria-hidden="true" size={18} className="text-blue-400" /> Vérification requise</div>
        <p className="mt-2 text-xs leading-5 text-slate-400">Confirmez avec Google Authenticator ou votre PIN administrateur.</p>
        <div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => { setMethod("totp"); setCode(""); }} aria-pressed={method === "totp"} className={`rounded-xl border px-3 py-2 text-xs font-bold ${method === "totp" ? "border-blue-400 bg-blue-500/15 text-blue-300" : "border-white/10 text-slate-400"}`}>Google Authenticator</button><button type="button" onClick={() => { setMethod("pin"); setCode(""); }} aria-pressed={method === "pin"} className={`rounded-xl border px-3 py-2 text-xs font-bold ${method === "pin" ? "border-blue-400 bg-blue-500/15 text-blue-300" : "border-white/10 text-slate-400"}`}>PIN administrateur</button></div>
        <label className="mt-4 block text-xs font-bold text-slate-400" htmlFor="admin-proof">{method === "pin" ? "PIN" : "Code à 6 chiffres"}</label>
        <input id="admin-proof" autoComplete="one-time-code" inputMode="numeric" type="password" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, method === "pin" ? 6 : 6))} className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg tracking-[0.35em] text-white outline-none focus:border-blue-400" />
        <div className="mt-4 flex gap-2"><button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-white/10 px-3 py-3 text-xs font-bold text-slate-300">Annuler</button><button type="button" onClick={submit} disabled={loading} className="flex-1 rounded-xl bg-blue-600 px-3 py-3 text-xs font-bold text-white disabled:opacity-50">{loading ? <Loader2 aria-hidden="true" className="mx-auto animate-spin" size={16} /> : "Confirmer"}</button></div>
      </div>}
    </section>
  );
}
