"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, Luggage, Plane, Printer, User } from "lucide-react";

type Airport = { iata?: string; city?: string; name?: string; country?: string };
type Segment = {
  flightNumber?: string;
  airline?: string;
  airlineLogo?: string;
  iataCode?: string;
  baggage?: string;
  durationMinutes?: number;
  departure?: { time?: string; airport?: Airport };
  arrival?: { time?: string; airport?: Airport };
};
type Passenger = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  documentNumber?: string;
  nationality?: string;
};
type Ticket = {
  id: string;
  provider: string;
  bookingReference?: string | null;
  status: string;
  tripType: string;
  currency: string;
  baseFare: number;
  taxes: number;
  serviceFee: number;
  totalAmount: number;
  createdAt: string;
  itinerary?: { segments?: Segment[]; offer?: { segments?: Segment[]; baggage?: string } };
  passengers?: Passenger[];
};

export function getSegments(itinerary: Ticket["itinerary"]): Segment[] {
  return itinerary?.offer?.segments ?? itinerary?.segments ?? [];
}

function parseDate(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatTime(value?: string) {
  const date = parseDate(value);
  return date ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "--:--";
}

function formatDate(value?: string) {
  const date = parseDate(value);
  return date
    ? date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" })
    : "—";
}

function formatDuration(minutes?: number) {
  if (!minutes || minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatAmount(value: number, currency: string) {
  return `${Number(value ?? 0).toLocaleString("fr-FR", { maximumFractionDigits: 4 })} ${currency}`;
}

function passengerName(p: Passenger) {
  return [p.lastName?.toUpperCase(), [p.firstName, p.middleName].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(" / ");
}

const statusStyles: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: "Confirmé", className: "bg-emerald-100 text-emerald-700" },
  CANCELLED: { label: "Annulé", className: "bg-red-100 text-red-700" },
  REFUNDED: { label: "Remboursé", className: "bg-amber-100 text-amber-700" },
};

function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function BoardingPass({
  ticket,
  segment,
  passenger,
  index,
  total,
  baggage,
}: {
  ticket: Ticket;
  segment: Segment;
  passenger: Passenger;
  index: number;
  total: number;
  baggage?: string;
}) {
  const status = statusStyles[ticket.status] ?? { label: ticket.status, className: "bg-slate-100 text-slate-700" };
  const origin = segment.departure?.airport ?? {};
  const destination = segment.arrival?.airport ?? {};
  const reference = ticket.bookingReference ?? "EN ATTENTE";
  const flightNumber = segment.flightNumber || "—";
  const isVoid = ticket.status !== "CONFIRMED";
  const qrValue = JSON.stringify({
    pnr: reference,
    booking: ticket.id,
    passenger: passengerName(passenger),
    flight: flightNumber,
    from: origin.iata,
    to: destination.iata,
    date: segment.departure?.time,
  });

  return (
    <article
      className="boarding-pass relative overflow-hidden rounded-3xl bg-white text-slate-900 shadow-2xl shadow-blue-950/40"
      aria-label={`Carte d'embarquement ${origin.iata ?? ""} vers ${destination.iata ?? ""} pour ${passengerName(passenger)}`}
    >
      <header className="flex items-center justify-between gap-3 bg-blue-700 px-5 py-4 text-white">
        <div className="flex min-w-0 items-center gap-3">
          {segment.airlineLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={segment.airlineLogo}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full bg-white object-contain p-1"
              crossOrigin="anonymous"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Plane className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{segment.airline ?? ticket.provider}</p>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">
              Carte d&apos;embarquement · E-ticket
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-blue-200">PiMobiPay</p>
          <p className="text-xs font-black">
            Vol {index + 1}/{total}
          </p>
        </div>
      </header>

      <div className="px-5 pb-5 pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-4xl font-black leading-none tracking-tight sm:text-5xl">{origin.iata ?? "---"}</p>
            <p className="mt-2 truncate text-xs font-bold text-slate-700">{origin.city ?? "—"}</p>
            <p className="truncate text-[10px] text-slate-400">{origin.name ?? ""}</p>
          </div>
          <div className="flex flex-1 flex-col items-center px-2">
            <div className="flex w-full items-center gap-1 text-blue-600">
              <span className="h-px flex-1 border-t-2 border-dashed border-blue-200" />
              <Plane className="h-5 w-5" aria-hidden="true" />
              <span className="h-px flex-1 border-t-2 border-dashed border-blue-200" />
            </div>
            <p className="mt-1 text-[10px] font-bold text-slate-400">{formatDuration(segment.durationMinutes)}</p>
          </div>
          <div className="min-w-0 text-right">
            <p className="text-4xl font-black leading-none tracking-tight sm:text-5xl">{destination.iata ?? "---"}</p>
            <p className="mt-2 truncate text-xs font-bold text-slate-700">{destination.city ?? "—"}</p>
            <p className="truncate text-[10px] text-slate-400">{destination.name ?? ""}</p>
          </div>
        </div>

        <div className="mt-6 flex items-end justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Départ</p>
            <p className="text-2xl font-black text-blue-700">{formatTime(segment.departure?.time)}</p>
            <p className="text-[10px] font-semibold capitalize text-slate-500">{formatDate(segment.departure?.time)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">Arrivée</p>
            <p className="text-2xl font-black text-slate-900">{formatTime(segment.arrival?.time)}</p>
            <p className="text-[10px] font-semibold capitalize text-slate-500">{formatDate(segment.arrival?.time)}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
          <Field label="Passager" value={passengerName(passenger) || "—"} className="col-span-2" />
          <Field label="Vol" value={flightNumber} />
          <Field label="Réf. réservation" value={reference} />
          <Field label="Bagages" value={segment.baggage ?? baggage ?? "—"} />
          <Field label="Passeport" value={passenger.documentNumber ?? "—"} />
        </div>
      </div>

      <div className="relative flex items-center" aria-hidden="true">
        <span className="absolute -left-4 h-8 w-8 rounded-full bg-slate-950 print:bg-white" />
        <span className="mx-6 w-full border-t-2 border-dashed border-slate-200" />
        <span className="absolute -right-4 h-8 w-8 rounded-full bg-slate-950 print:bg-white" />
      </div>

      <footer className="flex items-center gap-4 px-5 py-5">
        <div className="shrink-0 rounded-xl border border-slate-200 bg-white p-2">
          <QRCodeSVG value={qrValue} size={88} level="M" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${status.className}`}>
              {status.label}
            </span>
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-black uppercase text-blue-700">
              {ticket.tripType}
            </span>
          </div>
          <p className="font-mono text-lg font-black tracking-[0.3em] text-slate-900">{reference}</p>
          <p className="text-[10px] leading-relaxed text-slate-500">
            Présentez ce code et votre passeport à l&apos;enregistrement. Arrivez à l&apos;aéroport au moins 2h avant le
            départ.
          </p>
        </div>
      </footer>

      {isVoid && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="-rotate-12 rounded-xl border-4 border-red-500/70 px-6 py-2 text-3xl font-black uppercase tracking-widest text-red-500/70">
            {status.label}
          </span>
        </div>
      )}
    </article>
  );
}

export function FlightTicket({ id }: { id: string }) {
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/flights/bookings/${id}/ticket`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? "Billet indisponible");
        setTicket(data.ticket);
      })
      .catch((e: Error) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-8">
        <p className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-300">{error}</p>
        <button type="button" onClick={() => router.back()} className="text-xs font-black uppercase text-blue-400">
          Retour
        </button>
      </main>
    );
  }

  if (!ticket) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-8" aria-busy="true">
        <div className="h-[520px] animate-pulse rounded-3xl bg-white/[0.06]" />
        <span className="sr-only">Chargement du billet…</span>
      </main>
    );
  }

  const segments = getSegments(ticket.itinerary);
  const baggage = ticket.itinerary?.offer?.baggage;
  const passengers = ticket.passengers?.length ? ticket.passengers : [{}];

  return (
    <main className="mx-auto min-h-screen w-full max-w-xl bg-slate-950 px-4 pb-28 pt-5">
      <style>{`@media print {
        body * { visibility: hidden; }
        #flight-ticket, #flight-ticket * { visibility: visible; }
        #flight-ticket { position: absolute; inset: 0; padding: 16px; }
        #flight-ticket .boarding-pass { break-inside: avoid; box-shadow: none; border: 1px solid #e2e8f0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }`}</style>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs font-black uppercase text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Retour
        </button>
        <p className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-400">MPAY Fly</p>
      </div>

      <div id="flight-ticket" className="mt-5 flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-black text-white">Votre billet d&apos;avion</h1>
          <p className="mt-1 text-xs text-slate-400">
            {passengers.length} passager{passengers.length > 1 ? "s" : ""} · {segments.length} vol
            {segments.length > 1 ? "s" : ""} · Émis le {formatDate(ticket.createdAt)}
          </p>
        </header>

        {segments.length === 0 ? (
          <p className="rounded-2xl border border-white/10 p-6 text-center text-sm text-slate-400">
            Les détails de l&apos;itinéraire ne sont pas disponibles pour ce billet.
          </p>
        ) : (
          passengers.map((passenger, pIndex) =>
            segments.map((segment, sIndex) => (
              <BoardingPass
                key={`${pIndex}-${sIndex}`}
                ticket={ticket}
                segment={segment}
                passenger={passenger}
                index={sIndex}
                total={segments.length}
                baggage={baggage}
              />
            )),
          )
        )}

        <section className="boarding-pass rounded-3xl bg-white p-5 text-slate-900" aria-labelledby="ticket-passengers">
          <h2 id="ticket-passengers" className="flex items-center gap-2 text-sm font-black">
            <User className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Passagers
          </h2>
          <ul className="mt-3 flex flex-col divide-y divide-slate-100">
            {passengers.map((p, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                <span className="font-black">{passengerName(p) || "—"}</span>
                <span className="font-mono text-slate-500">{p.documentNumber ?? ""}</span>
              </li>
            ))}
          </ul>

          <h2 className="mt-5 flex items-center gap-2 text-sm font-black">
            <Luggage className="h-4 w-4 text-blue-700" aria-hidden="true" />
            Paiement
          </h2>
          <dl className="mt-3 flex flex-col gap-2 text-xs">
            <div className="flex justify-between">
              <dt className="text-slate-500">Tarif de base</dt>
              <dd className="font-bold">{formatAmount(ticket.baseFare, ticket.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Taxes</dt>
              <dd className="font-bold">{formatAmount(ticket.taxes, ticket.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Frais de service</dt>
              <dd className="font-bold">{formatAmount(ticket.serviceFee, ticket.currency)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-dashed border-slate-200 pt-3 text-sm">
              <dt className="font-black">Total payé</dt>
              <dd className="font-black text-blue-700">{formatAmount(ticket.totalAmount, ticket.currency)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="mt-6 grid gap-3 print:hidden">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-white"
        >
          <Printer className="h-4 w-4" aria-hidden="true" />
          Télécharger / Imprimer le billet
        </button>
      </div>
    </main>
  );
}
