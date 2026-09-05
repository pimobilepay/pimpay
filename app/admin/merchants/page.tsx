"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Store, MapPin, ArrowUpRight, RefreshCw, ShieldCheck, Clock3, Loader2 } from "lucide-react";
import { AdminTopNav } from "@/components/admin/AdminTopNav";

type Merchant = {
  id: string; name: string; category: string; address: string; city: string; country: string;
  piPaymentStatus: string; rating: number; isVerified: boolean; createdAt: string;
  user: { id: string; email: string | null; name: string | null; username: string | null; status: string } | null;
};

export default function AdminMerchantsPage() {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMerchants() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ q: query, status });
      const response = await fetch(`/api/admin/merchants?${params}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Impossible de charger les marchands");
      setMerchants(data.merchants || []);
    } catch (err) { setError(err instanceof Error ? err.message : "Erreur inattendue"); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadMerchants(); }, [status]);
  const verifiedCount = useMemo(() => merchants.filter((merchant) => merchant.isVerified).length, [merchants]);

  return (
    <main className="min-h-screen bg-[#020617] text-white px-4 pb-20 font-sans">
      <AdminTopNav title="Marchands" subtitle="PIMOBIPAY" onRefresh={loadMerchants} backPath="/admin" />
      <section className="mx-auto max-w-6xl pt-8">
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.3em] text-blue-400">Espace administration</p>
            <h2 className="text-3xl font-black tracking-tight md:text-4xl">Gestion des marchands</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">Consultez les comptes marchands et ouvrez leur espace opérationnel en un clic.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Total affiché</p><p className="mt-1 text-xl font-black">{merchants.length}</p></div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Vérifiés</p><p className="mt-1 text-xl font-black text-emerald-300">{verifiedCount}</p></div>
          </div>
        </div>
        <div className="mb-6 flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.04] p-4 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") loadMerchants(); }} placeholder="Rechercher par nom, ville ou email" className="w-full rounded-2xl border border-white/10 bg-black/20 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-600 focus:border-blue-500/50" /></div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-2xl border border-white/10 bg-[#0b1224] px-4 py-3 text-sm text-slate-300 outline-none"><option value="ALL">Tous les statuts</option><option value="VERIFIED">Vérifiés</option><option value="PENDING">En attente</option></select>
          <button onClick={loadMerchants} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-black uppercase tracking-wider transition hover:bg-blue-500"><RefreshCw size={15} /> Actualiser</button>
        </div>
        {loading ? <div className="flex justify-center py-24 text-blue-400"><Loader2 className="animate-spin" size={32} /></div> : error ? <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-sm text-red-300">{error}</div> : merchants.length === 0 ? <div className="rounded-3xl border border-dashed border-white/10 p-14 text-center"><Store className="mx-auto mb-4 text-slate-600" size={40} /><p className="font-bold">Aucun marchand trouvé</p><p className="mt-2 text-sm text-slate-500">Modifiez votre recherche ou vos filtres.</p></div> : <div className="grid gap-4 md:grid-cols-2">{merchants.map((merchant) => <article key={merchant.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 transition hover:border-blue-500/30"><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><div className="rounded-2xl bg-blue-500/15 p-3 text-blue-400"><Store size={21} /></div><div><h3 className="font-black">{merchant.name}</h3><p className="text-xs text-slate-500">{merchant.category}</p></div></div><span className={`rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider ${merchant.isVerified ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>{merchant.isVerified ? "Vérifié" : "En attente"}</span></div><div className="mt-5 flex flex-col gap-2 text-xs text-slate-400"><span className="flex items-center gap-2"><MapPin size={14} /> {merchant.city}, {merchant.country}</span><span className="flex items-center gap-2"><ShieldCheck size={14} /> {merchant.user?.email || "Compte non associé"}</span><span className="flex items-center gap-2"><Clock3 size={14} /> Créé le {new Date(merchant.createdAt).toLocaleDateString("fr-FR")}</span></div><button onClick={() => window.location.href = "/merchant"} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border border-blue-500/30 bg-blue-500/10 py-3 text-xs font-black uppercase tracking-wider text-blue-300 transition hover:bg-blue-500/20">Ouvrir l’espace merchant <ArrowUpRight size={15} /></button></article>)}</div>}
      </section>
    </main>
  );
}
