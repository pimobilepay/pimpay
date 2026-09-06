"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, Coins, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Position = {
  id?: string;
  amount?: number;
  effectiveAmount?: number;
  currency?: string;
  apy?: number;
  startDate?: string;
  endDate?: string;
  rewardsEarned?: number;
  user?: { name?: string; username?: string; email?: string };
};

type Data = {
  configured: boolean;
  whitelistRequired?: boolean;
  // [FIX ADMIN STAKING] `positions` peut être absent des réponses d'erreur
  // (ex. 401 "Accès non autorisé"). On le type en optionnel pour forcer
  // partout des accès défensifs (`data?.positions ?? []`) plutôt que de
  // supposer qu'il est toujours présent.
  positions?: Position[];
  totals: {
    amount?: number;
    rewards?: number;
    positions?: number;
    byCurrency?: Array<{ currency: string; _sum: { amount: number | null }; _count: { _all: number } }>;
  } | null;
  error?: string;
};

const format = (value = 0) => new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(value);

function Summary({ data, ecosystem }: { data: Data | null; ecosystem: boolean }) {
  // [FIX ADMIN STAKING] `data?.positions` peut être `undefined` (réponse
  // d'erreur de l'API) : on retombe systématiquement sur un tableau vide
  // avant tout `.reduce()` / `.length`, sinon la page plantait (TypeError)
  // dès que l'admin n'était plus authentifié ou que l'API renvoyait une
  // erreur.
  const positions = data?.positions ?? [];
  const total = ecosystem
    ? data?.totals?.amount || positions.reduce((sum, p) => sum + (p.effectiveAmount || p.amount || 0), 0)
    : data?.totals?.amount || 0;

  const cards = [
    { label: ecosystem ? "Mise effective" : "Total misé", value: `${format(total)} PI`, icon: Coins },
    { label: "Positions actives", value: format(data?.totals?.positions ?? positions.length), icon: Activity },
    {
      label: ecosystem ? "Source" : "Récompenses",
      value: ecosystem ? "Pi Network" : `${format(data?.totals?.rewards)} PI`,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon }) => (
        <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
          <Icon className="mb-4 text-blue-400" size={18} />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
          <p className="mt-2 text-xl font-black text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Table({ positions, ecosystem }: { positions: Position[]; ecosystem: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left">
          <thead className="border-b border-white/10 text-[10px] uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-5 py-4">Utilisateur</th>
              <th className="px-5 py-4">Montant</th>
              <th className="px-5 py-4">Mise effective</th>
              <th className="px-5 py-4">Devise</th>
              <th className="px-5 py-4">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {positions.map((position, index) => (
              <tr key={position.id || index} className="text-sm text-slate-300">
                <td className="px-5 py-4">
                  <p className="font-bold text-white">{position.user?.name || position.user?.username || "Pioneer"}</p>
                  <p className="text-xs text-slate-500">{position.user?.email || "API Pi Network"}</p>
                </td>
                <td className="px-5 py-4">{format(position.amount)} PI</td>
                <td className="px-5 py-4 font-bold text-blue-300">{format(position.effectiveAmount || position.amount)} PI</td>
                <td className="px-5 py-4">{position.currency || "PI"}</td>
                <td className="px-5 py-4">
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase text-emerald-300">
                    {ecosystem ? "API" : "Actif"}
                  </span>
                </td>
              </tr>
            ))}
            {positions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-sm text-slate-500">
                  Aucune position disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminStakingPage() {
  const [tab, setTab] = useState("ecosystem");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  // [FIX ADMIN STAKING] Il n'existait aucun état d'erreur visible : en cas de
  // 401/403/502, la page affichait silencieusement "Aucune position
  // disponible" (ou plantait, voir plus bas), sans que l'admin comprenne que
  // les données affichées ne reflètent pas la réalité.
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async (source: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/staking?source=${source}`, { cache: "no-store" });
      const json = await response.json().catch(() => null);

      // [FIX ADMIN STAKING] Bug principal : le code précédent faisait
      // `setData(await response.json())` sans jamais vérifier `response.ok`.
      // Or la route renvoie `{ error: "Accès non autorisé" }` (401, sans champ
      // `positions`) dès que la session admin expire ou que le rôle n'est
      // plus ADMIN. Comme `Summary`/`Table` appelaient ensuite
      // `data.positions.reduce(...)` / `.length` sans protection, la page
      // plantait entièrement (écran blanc) au lieu d'afficher un message
      // clair. On distingue maintenant explicitement le cas d'erreur.
      if (!response.ok) {
        const message =
          (json && (json.error as string)) ||
          (response.status === 401 || response.status === 403
            ? "Accès non autorisé — reconnectez-vous en tant qu'administrateur."
            : `Erreur lors du chargement (${response.status}).`);
        setLoadError(message);
        setData(json && typeof json === "object" ? { ...json, positions: json.positions ?? [] } : null);
        toast.error(message);
        return;
      }

      setLoadError(null);
      setData({ ...json, positions: json?.positions ?? [] });
    } catch {
      // [FIX ADMIN STAKING] Une erreur réseau (fetch qui rejette) n'était pas
      // interceptée : la promesse rejetait silencieusement (rejet non géré
      // dans la console) et la page restait bloquée en "chargement" avec des
      // données obsolètes, sans aucun retour pour l'admin.
      setLoadError("Impossible de joindre le serveur.");
      toast.error("Impossible de joindre le serveur.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(tab);
  }, [load, tab]);

  const positions = useMemo(() => {
    const list = data?.positions ?? [];
    return list.filter((p) =>
      `${p.user?.name || ""} ${p.user?.username || ""} ${p.user?.email || ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
  }, [data, query]);

  const ecosystem = tab === "ecosystem";

  return (
    <main className="min-h-screen bg-[#02040a] px-4 pb-28 pt-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400">PIMOBIPAY / ADMIN</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Staking</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Suivez les mises de l&apos;écosystème Pi et les positions gérées par la plateforme.
            </p>
          </div>
          <button
            onClick={() => load(tab)}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:bg-white/5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Actualiser
          </button>
        </div>

        {loadError && (
          <section className="mb-5 flex gap-3 rounded-2xl border border-red-400/20 bg-red-400/5 p-4 text-sm text-red-200">
            <AlertTriangle size={18} className="mt-0.5 shrink-0" />
            <p>{loadError}</p>
          </section>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-6 h-auto w-full justify-start rounded-xl bg-white/5 p-1 sm:w-fit">
            <TabsTrigger value="ecosystem" className="gap-2 py-2">
              <Users size={15} /> Écosystème Pi
            </TabsTrigger>
            <TabsTrigger value="platform" className="gap-2 py-2">
              <Coins size={15} /> Plateforme
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ecosystem">
            <section className="mb-5 rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4 text-sm text-slate-300">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 shrink-0 text-blue-400" size={18} />
                <p>L&apos;API Pi renvoie la mise effective spécifique à cette application. L&apos;accès reste conditionné à la whitelist Pi Network.</p>
              </div>
            </section>
            {data?.whitelistRequired && (
              <section className="mb-5 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-200">
                <AlertTriangle size={18} className="shrink-0" /> Application non configurée ou non whitelistée par Pi Network.
              </section>
            )}
            <Summary data={data} ecosystem />
            <div className="my-5 flex justify-end">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-400">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un pioneer"
                  className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>
            <Table positions={positions} ecosystem />
          </TabsContent>

          <TabsContent value="platform">
            <Summary data={data} ecosystem={false} />
            <div className="my-5 flex justify-end">
              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-slate-400">
                <Search size={15} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un utilisateur"
                  className="w-48 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
                />
              </label>
            </div>
            <Table positions={positions} ecosystem={false} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
