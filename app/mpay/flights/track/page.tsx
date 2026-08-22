"use client";

import { useState } from "react";
import { ArrowLeft, CalendarDays, Clock3, Loader2, Plane, Radar } from "lucide-react";
import { useRouter } from "next/navigation";

// Suivi de statut d'un vol par numéro (AviationStack) — fonctionnalité
// distincte de l'achat de billets, déplacée ici depuis /mpay/flights pour
// ne pas être confondue avec le moteur de recherche/réservation.
type Flight = { flight?: { iata?: string; number?: string; date?: string; status?: string }; airline?: { name?: string; iata?: string }; departure?: { airport?: string; iata?: string; scheduled?: string; estimated?: string; terminal?: string; gate?: string }; arrival?: { airport?: string; iata?: string; scheduled?: string; estimated?: string; terminal?: string; gate?: string } };

const formatTime = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "—";
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value)) : "—";

export default function TrackFlightPage() {
  const router = useRouter();
  const [flightNumber, setFlightNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [results, setResults] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function search(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(""); setSearched(true);
    try {
      const response = await fetch(`/api/flights/search?flight=${encodeURIComponent(flightNumber)}&date=${date}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setResults(data.flights ?? []);
    } catch (caught) {
      setResults([]);
      setError(caught instanceof Error ? caught.message : "Recherche indisponible");
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 pb-24 pt-5 sm:px-6">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} aria-label="Retour" className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"><ArrowLeft className="size-5" /></button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">MPay Flight</p>
            <h1 className="mt-1 text-lg font-black">Suivre un vol</h1>
          </div>
        </header>

        <section className="mt-8">
          <p className="flex items-center gap-2 text-sm font-bold text-sky-400"><Radar className="size-4" /> Statut en temps réel</p>
          <h2 className="mt-2 text-2xl font-black tracking-tight">Où en est votre vol ?</h2>
          <p className="mt-2 max-w-lg text-sm text-slate-500">Saisissez un numéro de vol pour consulter ses horaires et son statut actuel.</p>
        </section>

        <form onSubmit={search} className="mt-7 rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-[1fr_170px_auto]">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Numéro de vol
              <input required minLength={3} value={flightNumber} onChange={(e) => setFlightNumber(e.target.value.toUpperCase())} placeholder="Ex. AF123" className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none focus:border-sky-400/60" />
            </label>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Date
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-white outline-none [color-scheme:dark]" />
            </label>
            <button disabled={loading} className="mt-auto flex h-12 items-center justify-center gap-2 rounded-xl bg-sky-500 px-6 text-xs font-black uppercase text-slate-950 hover:bg-sky-400 disabled:opacity-60">
              {loading ? <Loader2 className="size-4 animate-spin" /> : "Suivre"}
            </button>
          </div>
        </form>

        {error && <div role="alert" className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">{error}</div>}

        <section className="mt-8 grid gap-4">
          {results.map((item, index) => (
            <article key={`${item.flight?.iata}-${index}`} className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{item.airline?.name ?? "Compagnie aérienne"}</p>
                  <h2 className="mt-1 text-2xl font-black text-white">{item.flight?.iata ?? item.flight?.number ?? flightNumber}</h2>
                  <p className="mt-1 text-sm text-slate-500">{formatDate(item.flight?.date)}</p>
                </div>
                <span className="rounded-full bg-sky-500/15 px-3 py-1.5 text-xs font-black uppercase text-sky-300">{item.flight?.status ?? "programmé"}</span>
              </div>
              <div className="mt-8 grid gap-6 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div>
                  <p className="text-3xl font-black text-white">{formatTime(item.departure?.estimated ?? item.departure?.scheduled)}</p>
                  <p className="mt-1 font-black text-white">{item.departure?.iata ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.departure?.airport ?? "Aéroport de départ"}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-600">Terminal {item.departure?.terminal ?? "—"} · Porte {item.departure?.gate ?? "—"}</p>
                </div>
                <div className="hidden items-center gap-2 text-slate-600 sm:flex">
                  <div className="h-px w-16 bg-white/10" /><Clock3 className="size-4 text-sky-400" /><div className="h-px w-16 bg-white/10" />
                </div>
                <div className="sm:text-right">
                  <p className="text-3xl font-black text-white">{formatTime(item.arrival?.estimated ?? item.arrival?.scheduled)}</p>
                  <p className="mt-1 font-black text-white">{item.arrival?.iata ?? "—"}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.arrival?.airport ?? "Aéroport d'arrivée"}</p>
                  <p className="mt-3 text-xs font-semibold text-slate-600">Terminal {item.arrival?.terminal ?? "—"} · Porte {item.arrival?.gate ?? "—"}</p>
                </div>
              </div>
            </article>
          ))}
          {searched && !loading && !error && results.length === 0 && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
              <CalendarDays className="mx-auto size-8 text-sky-400" />
              <p className="mt-4 font-black text-white">Aucun vol trouvé</p>
              <p className="mt-2 text-sm text-slate-500">Vérifiez le numéro de vol et la date saisis.</p>
            </div>
          )}
          {!searched && (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
              <Plane className="mx-auto size-8 text-sky-400" />
              <p className="mt-4 font-black text-white">Votre suivi de vol commence ici</p>
              <p className="mt-2 text-sm text-slate-500">Saisissez un numéro de vol pour afficher son statut et ses horaires.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
