"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  BedDouble, CalendarDays, Crosshair, Hotel, Loader2, MapPin, Search,
  SlidersHorizontal, Star, Users, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import type { HotelResult } from "@/lib/hotels/types";

// La carte touche `window` (Leaflet) → chargée uniquement côté client.
const HotelMap = dynamic(() => import("@/components/mpay/hotel-map").then((m) => m.HotelMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-white/[0.02]">
      <Loader2 className="size-5 animate-spin text-fuchsia-400" />
    </div>
  ),
});

// Position de repli si la géolocalisation est refusée/indisponible (Brazzaville).
const FALLBACK_CENTER = { lat: -4.2634, lng: 15.2429 };

type Sort = "distance" | "cheapest" | "rating";

function todayPlus(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const formatMoney = (amount: number, currency: string) =>
  `${currency} ${amount.toLocaleString("fr-FR", { maximumFractionDigits: 0 })}`;

function HotelCard({
  hotel, active, onHover, onSelect,
}: { hotel: HotelResult; active: boolean; onHover: () => void; onSelect: () => void }) {
  const photo = hotel.photos[0];
  return (
    <article
      onMouseEnter={onHover}
      className={`overflow-hidden rounded-3xl border bg-white/[0.035] transition-colors ${active ? "border-fuchsia-400/60" : "border-white/10 hover:border-fuchsia-400/30"}`}
    >
      <div className="relative h-40 w-full bg-white/5">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo || "/placeholder.svg"} alt={hotel.name} crossOrigin="anonymous" loading="lazy" className="size-full object-cover" />
        ) : (
          <div className="flex size-full items-center justify-center"><Hotel className="size-8 text-slate-600" /></div>
        )}
        {hotel.distanceKm !== undefined && (
          <span className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
            <MapPin className="size-3 text-fuchsia-400" /> {hotel.distanceKm} km
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-black text-white">{hotel.name}</h3>
            <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
              <MapPin className="size-3 shrink-0" /> {[hotel.address, hotel.city].filter(Boolean).join(", ") || "Adresse indisponible"}
            </p>
          </div>
          {hotel.rating ? (
            <span className="flex shrink-0 items-center gap-0.5 rounded-lg bg-amber-500/15 px-2 py-1 text-[10px] font-black text-amber-300">
              {hotel.rating}<Star className="size-3 fill-amber-300" />
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
          {hotel.reviewScore ? (
            <span className="flex items-center gap-1 font-bold text-fuchsia-300">
              {hotel.reviewScore.toFixed(1)}/10
              {hotel.reviewCount ? <span className="text-slate-600">· {hotel.reviewCount} avis</span> : null}
            </span>
          ) : null}
          {hotel.amenities.some((a) => a.type === "wifi") && (
            <span className="flex items-center gap-1"><Wifi className="size-3" /> Wi-Fi</span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-3.5">
          <div>
            <p className="text-lg font-black text-white">{formatMoney(hotel.price.amount, hotel.price.currency)}</p>
            <p className="text-[10px] text-slate-500">total du séjour</p>
          </div>
          <button
            type="button"
            onClick={onSelect}
            className="rounded-xl bg-fuchsia-500 px-5 py-2.5 text-[10px] font-black uppercase tracking-wider text-white transition hover:bg-fuchsia-400"
          >
            Réserver
          </button>
        </div>
      </div>
    </article>
  );
}

export function HotelSearch() {
  const [center, setCenter] = useState(FALLBACK_CENTER);
  const [radiusKm, setRadiusKm] = useState(5);
  const [checkIn, setCheckIn] = useState(todayPlus(1));
  const [checkOut, setCheckOut] = useState(todayPlus(2));
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [locating, setLocating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("distance");
  const resultsRef = useRef<HTMLDivElement | null>(null);

  // Géolocalisation automatique au montage (le navigateur demande la permission).
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  function locateMe() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("La géolocalisation n'est pas disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocating(false);
        toast.success("Position mise à jour");
      },
      () => {
        setLocating(false);
        toast.error("Impossible de récupérer votre position. Touchez la carte pour choisir un point.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const sortedHotels = useMemo(
    () =>
      [...hotels].sort((a, b) =>
        sort === "cheapest"
          ? a.price.amount - b.price.amount
          : sort === "rating"
            ? (b.reviewScore ?? b.rating ?? 0) - (a.reviewScore ?? a.rating ?? 0)
            : (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity),
      ),
    [hotels, sort],
  );

  async function search() {
    setError("");
    setSearched(true);
    if (checkOut <= checkIn) {
      setError("La date de départ doit être postérieure à la date d'arrivée.");
      return;
    }
    setLoading(true);
    setHotels([]);
    setActiveId(null);
    try {
      const response = await fetch("/api/hotels/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: center.lat,
          longitude: center.lng,
          radiusKm,
          checkIn,
          checkOut,
          rooms,
          adults,
          children,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Recherche d'hôtels indisponible");
      setHotels(data.hotels ?? []);
    } catch (caught) {
      setHotels([]);
      setError(caught instanceof Error ? caught.message : "Recherche d'hôtels indisponible");
    } finally {
      setLoading(false);
    }
  }

  function selectHotel(hotel: HotelResult) {
    window.sessionStorage.setItem(
      "pimpay:hotel-result",
      JSON.stringify({ hotel, criteria: { checkIn, checkOut, rooms, adults, children } }),
    );
    toast.success(hotel.name, { description: "Réservation d'hôtel bientôt disponible sur PIMOBIPAY." });
  }

  const nights = Math.max(
    1,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000),
  );
  const totalGuests = adults + children;

  return (
    <div>
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
        {/* Carte OpenStreetMap */}
        <div className="relative h-72 overflow-hidden rounded-2xl border border-white/10 sm:h-80">
          <HotelMap
            center={center}
            radiusKm={radiusKm}
            hotels={hotels}
            activeId={activeId}
            onSelectHotel={(id) => {
              setActiveId(id);
              resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onPickLocation={(coords) => setCenter(coords)}
          />
          <button
            type="button"
            onClick={locateMe}
            className="absolute right-3 top-3 z-[500] flex items-center gap-1.5 rounded-xl bg-slate-950/85 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur transition hover:bg-slate-900"
          >
            {locating ? <Loader2 className="size-3.5 animate-spin" /> : <Crosshair className="size-3.5 text-fuchsia-400" />}
            Ma position
          </button>
          <p className="pointer-events-none absolute bottom-3 left-3 z-[500] rounded-lg bg-slate-950/80 px-2.5 py-1 text-[9px] font-bold text-slate-300 backdrop-blur">
            Touchez la carte pour changer le point de recherche
          </p>
        </div>

        {/* Rayon */}
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rayon de recherche</label>
            <span className="text-[11px] font-black text-fuchsia-300">{radiusKm} km</span>
          </div>
          <input
            type="range" min={1} max={25} value={radiusKm}
            onChange={(e) => setRadiusKm(Number(e.target.value))}
            className="mt-3 w-full accent-fuchsia-500"
            aria-label="Rayon de recherche en kilomètres"
          />
        </div>

        {/* Dates */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Arrivée
            <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
              <CalendarDays className="size-4 shrink-0 text-fuchsia-400" />
              <input
                type="date" min={todayPlus(0)} value={checkIn}
                onChange={(e) => {
                  setCheckIn(e.target.value);
                  if (checkOut <= e.target.value) setCheckOut(todayPlus(0) === e.target.value ? todayPlus(1) : e.target.value);
                }}
                className="w-full bg-transparent text-sm font-bold text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            Départ
            <div className="mt-2 flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3">
              <CalendarDays className="size-4 shrink-0 text-fuchsia-400" />
              <input
                type="date" min={checkIn} value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-transparent text-sm font-bold text-white outline-none [color-scheme:dark]"
              />
            </div>
          </label>
        </div>

        {/* Chambres + voyageurs */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {([
            ["Chambres", rooms, setRooms, 1, BedDouble],
            ["Adultes", adults, setAdults, 1, Users],
            ["Enfants", children, setChildren, 0, Users],
          ] as const).map(([label, value, setter, min, Icon]) => (
            <div key={label}>
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</label>
              <div className="mt-2 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5">
                <span className="flex items-center gap-2 text-sm font-bold text-white"><Icon className="size-4 text-fuchsia-400" /> {value}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setter(Math.max(min, value - 1))} className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white">−</button>
                  <button type="button" onClick={() => setter(Math.min(16, value + 1))} className="flex size-7 items-center justify-center rounded-full bg-white/10 text-white">+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={search}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-fuchsia-500 py-4 text-xs font-black uppercase tracking-widest text-white transition hover:bg-fuchsia-400 disabled:opacity-60"
        >
          {loading ? <><Loader2 className="size-4 animate-spin" /> Recherche des hôtels à proximité…</> : <><Search className="size-4" /> Rechercher des hôtels</>}
        </button>
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs font-bold text-red-300">{error}</p>}
      </div>

      {searched && !loading && (
        <section ref={resultsRef} className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Résultats · {nights} nuit{nights > 1 ? "s" : ""} · {totalGuests} voyageur{totalGuests > 1 ? "s" : ""}</p>
              <h3 className="mt-1 text-xl font-black text-white">
                {sortedHotels.length > 0 ? `${sortedHotels.length} hôtel${sortedHotels.length > 1 ? "s" : ""} à proximité` : "Hôtels à proximité"}
              </h3>
            </div>
            {sortedHotels.length > 0 && (
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="size-4 text-slate-500" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as Sort)}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold text-slate-300 [color-scheme:dark]"
                >
                  <option value="distance">Plus proche</option>
                  <option value="cheapest">Moins cher</option>
                  <option value="rating">Mieux noté</option>
                </select>
              </div>
            )}
          </div>

          {!error && sortedHotels.length === 0 ? (
            <div className="mt-4 rounded-3xl border border-dashed border-white/10 px-5 py-14 text-center">
              <Hotel className="mx-auto size-8 text-slate-600" />
              <p className="mt-3 text-sm font-bold text-slate-400">Aucun hôtel trouvé dans ce périmètre.</p>
              <p className="mt-1 text-xs text-slate-600">Élargissez le rayon ou déplacez le point de recherche sur la carte.</p>
            </div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sortedHotels.map((hotel) => (
                <HotelCard
                  key={hotel.id}
                  hotel={hotel}
                  active={hotel.id === activeId}
                  onHover={() => setActiveId(hotel.id)}
                  onSelect={() => selectHotel(hotel)}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
