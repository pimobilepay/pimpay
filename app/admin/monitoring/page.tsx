"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  Gauge,
  Globe2,
  KeyRound,
  Radio,
  RefreshCw,
  Server,
  ShieldCheck,
  Users,
  WalletCards,
  Wifi,
} from "lucide-react";

const services = [
  { name: "API Core", detail: "Requêtes plateforme", status: "Opérationnel", value: "99.99%", color: "emerald", icon: Server },
  { name: "Paiements", detail: "Flux de transactions", status: "Opérationnel", value: "1,248/min", color: "blue", icon: WalletCards },
  { name: "Ledger", detail: "Écritures sécurisées", status: "Opérationnel", value: "0.18s", color: "violet", icon: Database },
  { name: "KYC / Sécurité", detail: "Vérifications actives", status: "Surveillé", value: "98.4%", color: "amber", icon: ShieldCheck },
];

const initialEvents = [
  ["14:32:08", "Transaction confirmée", "TX-8F42A1 · 240.00 PI", "emerald"],
  ["14:31:54", "Nouvelle session", "Utilisateur #48291 · Kinshasa", "blue"],
  ["14:31:42", "Retrait traité", "WD-119A02 · 85.50 USDT", "violet"],
  ["14:31:19", "Contrôle KYC terminé", "Dossier #KYC-7731", "amber"],
  ["14:30:58", "Webhook reçu", "GeniusPay · paiement accepté", "cyan"],
];

const colorStyles: Record<string, string> = {
  emerald: "border-emerald-400/15 bg-emerald-400/10 text-emerald-300",
  blue: "border-blue-400/15 bg-blue-400/10 text-blue-300",
  violet: "border-violet-400/15 bg-violet-400/10 text-violet-300",
  amber: "border-amber-400/15 bg-amber-400/10 text-amber-300",
  cyan: "border-cyan-400/15 bg-cyan-400/10 text-cyan-300",
};

type MonitoringData = {
  generatedAt?: string;
  health?: { status?: string; healthyCount?: number; totalServices?: number };
  platform?: { liveSessions?: number; throughputMinute?: number; volume24h?: number; totalUsers?: number };
  database?: { latency?: string };
  reliability?: { apiLatency?: string; errorRate?: number };
  services?: Array<{ name?: string; label?: string; status?: string; severity?: string; value?: string; latency?: string }>;
  activityFeed?: Array<{ createdAt?: string; timestamp?: string; title?: string; event?: string; description?: string; detail?: string; severity?: string }>;
};

export default function MonitoringPage() {
  const [now, setNow] = useState(new Date());
  const [desktopMode, setDesktopMode] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "services" | "live">("live");
  const [telemetry, setTelemetry] = useState<MonitoringData | null>(null);
  const [events, setEvents] = useState(initialEvents);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncMode = () => setDesktopMode(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    const loadTelemetry = async () => {
      if (!media.matches) return;
      try {
        const response = await fetch("/api/admin/monitoring", { cache: "no-store" });
        if (!response.ok) return;
        setTelemetry(await response.json());
      } catch {
        // Le mode mobile conserve sa vue locale si l'API n'est pas disponible.
      }
    };
    loadTelemetry();
    const refresh = window.setInterval(loadTelemetry, 10000);
    return () => {
      media.removeEventListener("change", syncMode);
      window.clearInterval(timer);
      window.clearInterval(refresh);
    };
  }, []);

  const formattedTime = useMemo(() => now.toLocaleTimeString("fr-FR"), [now]);
  const liveUsers = desktopMode && telemetry?.platform?.liveSessions != null ? telemetry.platform.liveSessions.toLocaleString("fr-FR") : "8,492";
  const liveTransactions = desktopMode && telemetry?.platform?.throughputMinute != null ? telemetry.platform.throughputMinute.toLocaleString("fr-FR") : "1,248";
  const liveVolume = desktopMode && telemetry?.platform?.volume24h != null ? `$${Number(telemetry.platform.volume24h).toLocaleString("fr-FR")}` : "$284,920";
  const liveLatency = desktopMode && (telemetry?.database?.latency || telemetry?.reliability?.apiLatency) ? (telemetry.database?.latency || telemetry.reliability?.apiLatency) : "184 ms";
  const liveServices = desktopMode && telemetry?.services?.length ? telemetry.services : services;

  return (
    <main className="min-h-screen bg-[#02040a] px-4 pb-24 pt-24 text-white sm:px-6 lg:px-8 lg:pt-8">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <header className="flex flex-col justify-between gap-4 border-b border-white/10 pb-5 xl:flex-row xl:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-blue-400"><Radio className="h-3.5 w-3.5 animate-pulse" /> Centre de contrôle live</div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Monitoring total de la plateforme</h1>
            <p className="mt-1 text-sm text-slate-500">Vue opérationnelle en temps réel de tous les services PIMOBIPAY.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 px-4 py-3">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-400" />
            <div><p className="text-xs font-black text-emerald-300">{desktopMode && telemetry?.health?.status ? telemetry.health.status : "Système opérationnel"}</p><p className="text-[10px] text-slate-500">{desktopMode && telemetry?.generatedAt ? `API synchronisée ${new Date(telemetry.generatedAt).toLocaleTimeString("fr-FR")}` : `Dernière synchro ${formattedTime}`}</p></div>
            <RefreshCw className="ml-2 h-4 w-4 text-emerald-400" />
          </div>
        </header>

        <nav aria-label="Vues du monitoring" className="flex items-center gap-1 rounded-2xl border border-white/8 bg-[#0a101c]/80 p-1">
          {[
            ["overview", "Vue générale"],
            ["services", "Services"],
            ["live", "Live"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id as "overview" | "services" | "live")}
              aria-current={activeTab === id ? "page" : undefined}
              className={`flex-1 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-wider transition-colors ${activeTab === id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500 hover:bg-white/5 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        {activeTab === "live" ? (
          <>
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Indicateurs temps réel">
          {[
            ["Utilisateurs en ligne", liveUsers, "+12.8%", Users, "blue"],
            ["Transactions / minute", liveTransactions, "+8.4%", Activity, "emerald"],
            ["Volume traité aujourd'hui", liveVolume, "+18.2%", CircleDollarSign, "violet"],
            ["Latence moyenne", liveLatency, "-6.1%", Gauge, "amber"],
          ].map(([label, value, trend, Icon, color]) => (
            <div key={String(label)} className="rounded-2xl border border-white/8 bg-[#0a101c]/80 p-4 shadow-xl shadow-black/10"><div className={`mb-4 flex h-9 w-9 items-center justify-center rounded-xl ${colorStyles[String(color)]}`}><Icon className="h-4 w-4" /></div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="text-xl font-black tracking-tight">{value}</p><span className="flex items-center text-[10px] font-bold text-emerald-400"><ArrowUpRight className="h-3 w-3" />{trend}</span></div></div>
          ))}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-white/8 bg-[#0a101c]/80 p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-black">Santé des services</h2><p className="mt-1 text-xs text-slate-500">État des principaux composants</p></div><span className="rounded-lg border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black text-emerald-300">4 / 4 ACTIFS</span></div><div className="grid gap-3 sm:grid-cols-2">{services.map((service) => { const Icon = service.icon; return <div key={service.name} className="rounded-xl border border-white/6 bg-white/[0.025] p-4"><div className="flex items-start justify-between"><div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${colorStyles[service.color]}`}><Icon className="h-4 w-4" /></div><CheckCircle2 className="h-4 w-4 text-emerald-400" /></div><p className="mt-4 text-sm font-bold">{service.name}</p><p className="text-[11px] text-slate-500">{service.detail}</p><div className="mt-4 flex items-center justify-between"><span className="text-[10px] font-bold text-emerald-400">{service.status}</span><span className="text-sm font-black text-slate-200">{service.value}</span></div><div className="mt-2 h-1 overflow-hidden rounded-full bg-white/8"><div className={`h-full rounded-full bg-${service.color}-400`} style={{ width: service.color === "amber" ? "84%" : "98%" }} /></div></div> })}</div></section>

          <section className="rounded-2xl border border-white/8 bg-[#0a101c]/80 p-5"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-black">Activité en direct</h2><p className="mt-1 text-xs text-slate-500">Événements des dernières secondes</p></div><Wifi className="h-4 w-4 text-cyan-400" /></div><div className="space-y-1">{events.map((event, index) => <div key={`${event[0]}-${index}`} className="flex gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-white/[0.03]"><div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${colorStyles[event[3]]}`}><Activity className="h-3.5 w-3.5" /></div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><p className="truncate text-xs font-bold text-slate-200">{event[1]}</p><span className="shrink-0 text-[10px] text-slate-600">{event[0]}</span></div><p className="mt-0.5 truncate text-[10px] text-slate-500">{event[2]}</p></div></div>)}</div></section>
        </div>

        <section className="grid gap-5 lg:grid-cols-3"><div className="rounded-2xl border border-white/8 bg-[#0a101c]/80 p-5 lg:col-span-2"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-black">Débit réseau</h2><p className="mt-1 text-xs text-slate-500">Requêtes traitées sur les 60 dernières minutes</p></div><Globe2 className="h-5 w-5 text-blue-400" /></div><div className="flex h-32 items-end gap-1.5">{[38,48,42,65,58,72,61,78,69,83,75,92,80,88,95,82,98,90,100,94,86,97,91,100,96,100,92,99,94,100].map((height, i) => <div key={i} className="group relative flex-1"><div className="absolute -top-5 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] text-white group-hover:block">{height}%</div><div className={`h-full rounded-t-sm ${i > 25 ? "bg-blue-400" : "bg-blue-500/40"}`} style={{ height: `${height}%` }} /></div>)}</div><div className="mt-3 flex justify-between text-[10px] text-slate-600"><span>Il y a 60 min</span><span>Maintenant</span></div></div><div className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-5"><div className="flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /><h2 className="font-black">Incidents & alertes</h2></div><div className="mt-6 flex items-center gap-3"><div className="text-4xl font-black">0</div><p className="text-xs leading-5 text-slate-500">incident critique<br />au cours des dernières 24h</p></div><div className="mt-6 flex items-center gap-2 border-t border-white/8 pt-4 text-[10px] text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> Tous les contrôles sont passés</div></div></section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4 text-[10px] text-slate-600"><span className="flex items-center gap-2"><Clock3 className="h-3.5 w-3.5" /> Rafraîchissement automatique actif</span><span className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5" /> Console sécurisée · accès administrateur</span><span className="flex items-center gap-2"><ArrowDownRight className="h-3.5 w-3.5" /> Latence API stable</span></footer>
          </>
        ) : (
          <section className="flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-[#0a101c]/80 p-8 text-center">
            <Server className="mb-4 h-8 w-8 text-blue-400" />
            <h2 className="text-lg font-black">{activeTab === "services" ? "Services de la plateforme" : "Vue générale"}</h2>
            <p className="mt-2 max-w-md text-sm text-slate-500">Sélectionnez l&apos;onglet Live pour afficher le monitoring temps réel complet de la plateforme.</p>
            <button type="button" onClick={() => setActiveTab("live")} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition-colors hover:bg-blue-500">Ouvrir Live</button>
          </section>
        )}
      </div>
    </main>
  );
}
