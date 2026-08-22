"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, CalendarDays, ChevronDown, Clock3, Loader2, Luggage, Plane, PlaneTakeoff, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import type { Airport, CabinClass, FlightOffer, FlightSearchRequest, TripType } from "@/lib/flights/types";

type Sort = "best" | "cheapest" | "fastest";

const TRIP_LABELS: Record<TripType, string> = { "round-trip": "Aller-retour", "one-way": "Aller simple", "multi-city": "Multi-destinations" };
const CABIN_LABELS: Record<CabinClass, string> = { economy: "Économique", "premium-economy": "Premium éco.", business: "Affaires", first: "Première" };

const initialForm: FlightSearchRequest = { tripType: "round-trip", from: "", to: "", departureDate: "", returnDate: "", adults: 1, children: 0, infants: 0, cabin: "economy" };
const formatDuration = (minutes: number) => `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
const formatClock = (iso: string) => { try { return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch { return "--:--"; } };

function AirportPicker({ label, placeholder, value, onChange }: { label: string; placeholder: string; value: Airport | null; onChange: (airport: Airport | null) => void }) {
  const [query, setQuery] = useState(value?.iata ?? "");
  const [options, setOptions] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value || query.trim().length < 2) { setOptions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/flights/airports?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const data = await response.json();
        setOptions(data.airports ?? []);
        setOpen(true);
      } catch { /* les erreurs remontent à la soumission */ }
      finally { setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query, value]);

  return (
    <div className="relative flex-1">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
      <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 transition focus-within:border-sky-400/60 focus-within:bg-white/[0.06]">
        <PlaneTakeoff className="size-4 shrink-0 text-sky-400" />
        <input
          aria-label={label}
          value={value ? `${value.city} (${value.iata})` : query}
          onChange={(event) => { onChange(null); setQuery(event.target.value); }}
          onFocus={() => setOpen(options.length > 0)}
          placeholder={placeholder}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-600"
        />
        {loading && <Loader2 className="size-4 shrink-0 animate-spin text-slate-500" />}
        {value && !loading && (
          <button type="button" aria-label={`Effacer ${label}`} onClick={() => { onChange(null); setQuery(""); }} className="shrink-0">
            <X className="size-4 text-slate-500" />
          </button>
        )}
      </div>
      {open && options.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-slate-950 shadow-2xl">
          {options.map((airport) => (
            <button
              type="button"
              key={`${airport.iata}-${airport.name}`}
              onClick={() => { onChange(airport); setQuery(airport.iata); setOpen(false); }}
              className="flex w-full items-start gap-3 border-b border-white/5 px-3.5 py-3 text-left last:border-0 hover:bg-white/[0.06]"
            >
              <span className="mt-0.5 rounded-md bg-sky-500/15 px-2 py-1 text-[10px] font-black text-sky-300">{airport.iata}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold text-white">{airport.city}</span>
                <span className="block truncate text-[10px] text-slate-500">{airport.name} · {airport.country}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FlightCard({ offer, onSelect }: { offer: FlightOffer; onSelect: () => void }) {
  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];
  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-4 transition-colors hover:border-sky-400/40 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15">
            <Plane className="size-4 text-sky-400" />
          </span>
          <div>
            <p className="text-xs font-black text-white">{first?.airline ?? "Compagnie"}</p>
            <p className="text-[10px] text-slate-500">{first?.flightNumber ?? "Vol"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-white">{offer.price.currency} {offer.price.amount.toLocaleString("fr-FR")}</p>
          <p className="text-[10px] text-slate-500">par passager</p>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <div>
          <p className="text-xl font-black text-white">{formatClock(first?.departure.time ?? "")}</p>
          <p className="mt-0.5 text-[11px] font-black text-slate-400">{first?.departure.airport.iata}</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <p className="text-[10px] text-slate-500">{formatDuration(offer.totalDurationMinutes)}</p>
          <div className="flex w-full items-center gap-1.5">
            <div className="h-px flex-1 bg-white/10" />
            <Clock3 className="size-3 shrink-0 text-sky-400" />
            <div className="h-px flex-1 bg-white/10" />
          </div>
          <p className="text-[10px] font-bold text-slate-500">{offer.stops === 0 ? "Direct" : `${offer.stops} escale${offer.stops > 1 ? "s" : ""}`}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-black text-white">{formatClock(last?.arrival.time ?? "")}</p>
          <p className="mt-0.5 text-[11px] font-black text-slate-400">{last?.arrival.airport.iata}</p>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/5 pt-3.5">
        <p className="flex items-center gap-1.5 text-[10px] text-slate-500"><Luggage className="size-3.5" /> {offer.baggage}</p>
        <button type="button" onClick={onSelect} className="rounded-xl bg-sky-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-slate-950 transition hover:bg-sky-400">
          Sélectionner
        </button>
      </div>
    </article>
  );
}

export function FlightSearch() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [from, setFrom] = useState<Airport | null>(null);
  const [to, setTo] = useState<Airport | null>(null);
  const [flights, setFlights] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [sort, setSort] = useState<Sort>("best");
  const [passengersOpen, setPassengersOpen] = useState(false);

  const sortedFlights = useMemo(() => [...flights].sort((a, b) =>
    sort === "cheapest" ? a.price.amount - b.price.amount
    : sort === "fastest" ? a.totalDurationMinutes - b.totalDurationMinutes
    : (a.price.amount + a.totalDurationMinutes) - (b.price.amount + b.totalDurationMinutes)
  ), [flights, sort]);

  function swap() {
    const nextFrom = to; const nextTo = from;
    setFrom(nextFrom); setTo(nextTo);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setSearched(true);
    if (!from || !to) { setError("Sélectionnez un aéroport de départ et d'arrivée valides."); return; }
    if (!form.departureDate) { setError("Choisissez une date de départ."); return; }
    if (form.tripType === "round-trip" && !form.returnDate) { setError("Choisissez une date de retour."); return; }
    setLoading(true);
    setFlights([]);
    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, from: from.iata, to: to.iata, adults: Number(form.adults), children: Number(form.children), infants: Number(form.infants) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Recherche de vols indisponible");
      setFlights(data.flights ?? []);
    } catch (caught) {
      setFlights([]);
      setError(caught instanceof Error ? caught.message : "Recherche de vols indisponible");
    } finally {
      setLoading(false);
    }
  }

  function selectOffer(offer: FlightOffer) {
    // On transmet l'offre choisie ET le nombre de passagers recherchés à la
    // page de paiement/checkout via sessionStorage (les offres Duffel sont
    // trop volumineuses/éphémères pour un paramètre d'URL, et expirent en
    // quelques minutes).
    window.sessionStorage.setItem(
      "pimpay:flight-offer",
      JSON.stringify({ offer, passengerCounts: { adults: form.adults, children: form.children, infants: form.infants } })
    );
    router.push(`/mpay/flights/checkout?offerId=${encodeURIComponent(offer.id)}`);
  }

  const totalPassengers = form.adults + form.children + form.infants;

  return (
    <div>
      <form onSubmit={submit} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        <div className="flex flex-wrap gap-2">
          {(["round-trip", "one-way", "multi-city"] as TripType[]).map((type) => (
            <button
              type="button"
              key={type}
              onClick={() => setForm({ ...form, tripType: type })}
              className={`rounded-xl px-3.5 py-2 text-[10px] font-black uppercase tracking-wider transition ${form.tripType === type ? "bg-sky-500 text-slate-950" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}
            >
              {TRIP_LABELS[type]}
            </button>
          ))}
        </div>

        <div className="relative mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <AirportPicker label="Départ" placeholder="Ville ou aéroport" value={from} onChange={setFrom} />
          <button
            type="button"
            onClick={swap}
            aria-label="Inverser départ et arrivée"
            className="mx-auto flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-400 transition hover:rotate-180 hover:text-sky-400 sm:mb-3.5"
          >
            <ArrowLeftRight className="size-4" />
          </button>
          <AirportPicker label="Arrivée" placeholder="Ville ou aéroport" value={to} onChange={setTo} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Départ
            <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
              <CalendarDays className="size-4 shrink-0 text-sky-400" />
              <input required type="date" min={new Date().toISOString().slice(0, 10)} value={form.departureDate} onChange={(e) => setForm({ ...form, departureDate: e.target.value })} className="w-full bg-transparent text-sm font-bold text-white outline-none [color-scheme:dark]" />
            </div>
          </label>
          <label className={`text-[10px] font-black uppercase tracking-widest text-slate-500 ${form.tripType !== "round-trip" ? "opacity-40" : ""}`}>
            Retour
            <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
              <CalendarDays className="size-4 shrink-0 text-sky-400" />
              <input disabled={form.tripType !== "round-trip"} required={form.tripType === "round-trip"} type="date" min={form.departureDate || new Date().toISOString().slice(0, 10)} value={form.returnDate} onChange={(e) => setForm({ ...form, returnDate: e.target.value })} className="w-full bg-transparent text-sm font-bold text-white outline-none disabled:cursor-not-allowed [color-scheme:dark]" />
            </div>
          </label>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Passagers</label>
            <button type="button" onClick={() => setPassengersOpen((v) => !v)} className="mt-2 flex w-full items-center justify-between gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left">
              <span className="flex items-center gap-2.5 text-sm font-bold text-white"><Users className="size-4 text-sky-400" /> {totalPassengers} passager{totalPassengers > 1 ? "s" : ""}</span>
              <ChevronDown className={`size-4 text-slate-500 transition ${passengersOpen ? "rotate-180" : ""}`} />
            </button>
            {passengersOpen && (
              <div className="absolute left-0 right-0 z-10 mt-2 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950 p-4 shadow-2xl sm:right-1/2 sm:w-72">
                {([["adults", "Adultes", 1], ["children", "Enfants", 0], ["infants", "Bébés", 0]] as const).map(([key, label, min]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{label}</span>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setForm((f) => ({ ...f, [key]: Math.max(min, f[key] - 1) }))} className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white">−</button>
                      <span className="w-4 text-center text-xs font-black text-white">{form[key]}</span>
                      <button type="button" onClick={() => setForm((f) => ({ ...f, [key]: Math.min(9, f[key] + 1) }))} className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white">+</button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setPassengersOpen(false)} className="mt-1 rounded-xl bg-sky-500 py-2 text-[10px] font-black uppercase tracking-wider text-slate-950">Valider</button>
              </div>
            )}
          </div>

          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Classe
            <select value={form.cabin} onChange={(e) => setForm({ ...form, cabin: e.target.value as CabinClass })} className="mt-2 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none [color-scheme:dark]">
              {(Object.keys(CABIN_LABELS) as CabinClass[]).map((cabin) => <option key={cabin} value={cabin}>{CABIN_LABELS[cabin]}</option>)}
            </select>
          </label>
        </div>

        <button disabled={loading} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-sky-400 disabled:opacity-60">
          {loading ? <><Loader2 className="size-4 animate-spin" /> Recherche des meilleurs vols…</> : <><Search className="size-4" /> Rechercher des vols</>}
        </button>
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs font-bold text-red-300">{error}</p>}
      </form>

      {searched && !loading && (
        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Résultats de recherche</p>
              <h3 className="mt-1 text-xl font-black text-white">{sortedFlights.length > 0 ? `${sortedFlights.length} vol${sortedFlights.length > 1 ? "s" : ""} disponible${sortedFlights.length > 1 ? "s" : ""}` : "Vols disponibles"}</h3>
            </div>
            {sortedFlights.length > 0 && (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-slate-500" />
                <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold text-slate-300 [color-scheme:dark]">
                  <option value="best">Meilleur choix</option>
                  <option value="cheapest">Moins cher</option>
                  <option value="fastest">Plus rapide</option>
                </select>
              </div>
            )}
          </div>

          {!error && sortedFlights.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-5 py-14 text-center">
              <Plane className="mx-auto size-8 text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-400">Aucun vol trouvé pour ces critères.</p>
              <p className="mt-1 text-xs text-slate-600">Essayez une autre date ou un autre itinéraire.</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {sortedFlights.map((offer) => <FlightCard key={offer.id} offer={offer} onSelect={() => selectOffer(offer)} />)}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
