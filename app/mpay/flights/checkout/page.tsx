"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, BadgeCheck, Clock3, Loader2, Plane, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import type { FlightOffer } from "@/lib/flights/types";

// Page de finalisation d'achat : reçoit l'offre sélectionnée depuis
// <FlightSearch /> (via sessionStorage), confirme le prix auprès du
// fournisseur, recueille les informations passagers, puis déclenche le
// paiement + la réservation via /api/flights/price puis /api/flights/book.

type PassengerForm = {
  firstName: string; middleName: string; lastName: string; dateOfBirth: string;
  gender: "male" | "female" | "other"; nationality: string; email: string; phone: string;
  documentNumber: string; issuingCountry: string; passportExpirationDate: string;
};

const emptyPassenger: PassengerForm = { firstName: "", middleName: "", lastName: "", dateOfBirth: "", gender: "male", nationality: "", email: "", phone: "", documentNumber: "", issuingCountry: "", passportExpirationDate: "" };

const formatClock = (iso: string) => { try { return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)); } catch { return "--:--"; } };

export default function FlightCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerId = searchParams.get("offerId") ?? "";

  const [offer, setOffer] = useState<FlightOffer | null>(null);
  const [passengerCount, setPassengerCount] = useState(1);
  const [passengers, setPassengers] = useState<PassengerForm[]>([emptyPassenger]);
  const [pricing, setPricing] = useState<{ baseFare: number; taxes: number; serviceFee: number; total: number; currency: string; priceChanged: boolean } | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [priceError, setPriceError] = useState("");
  const [bookError, setBookError] = useState("");
  const [booking, setBooking] = useState(false);
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fl-${Date.now()}-${Math.random().toString(36).slice(2)}`));

  // 1) Charger l'offre stockée par la page de recherche.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem("pimpay:flight-offer");
      if (!raw) return;
      const parsed = JSON.parse(raw) as { offer: FlightOffer; passengerCounts: { adults: number; children: number; infants: number } };
      if (parsed.offer?.id !== offerId) return;
      setOffer(parsed.offer);
      const total = Math.max(1, parsed.passengerCounts.adults + parsed.passengerCounts.children + parsed.passengerCounts.infants);
      setPassengerCount(total);
      setPassengers(Array.from({ length: total }, () => ({ ...emptyPassenger })));
    } catch { /* offre absente/invalide → l'écran d'erreur s'affiche */ }
  }, [offerId]);

  // 2) Confirmer le prix réel auprès du fournisseur (les prix évoluent vite).
  useEffect(() => {
    if (!offerId || !offer) return;
    setPriceLoading(true);
    setPriceError("");
    fetch("/api/flights/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offerId, displayedAmount: offer.price.amount }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Ce vol n'est plus disponible.");
        setPricing(data);
      })
      .catch((caught) => setPriceError(caught instanceof Error ? caught.message : "Ce vol n'est plus disponible."))
      .finally(() => setPriceLoading(false));
  }, [offerId, offer]);

  function updatePassenger(index: number, field: keyof PassengerForm, value: string) {
    setPassengers((current) => current.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  const isFormComplete = useMemo(() => passengers.every((p) =>
    p.firstName.trim() && p.lastName.trim() && p.dateOfBirth && p.nationality.trim().length === 2 &&
    p.email.trim() && p.phone.trim() && p.documentNumber.trim() && p.issuingCountry.trim().length === 2 && p.passportExpirationDate
  ), [passengers]);

  async function confirmBooking() {
    if (!offer || !pricing) return;
    setBooking(true);
    setBookError("");
    try {
      const response = await fetch("/api/flights/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          displayedAmount: pricing.total,
          tripType: offer.segments.length > (offer.stops + 1) ? "multi-city" : "one-way",
          passengers: passengers.map((p) => ({ ...p, nationality: p.nationality.toUpperCase(), issuingCountry: p.issuingCountry.toUpperCase() })),
          idempotencyKey,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "La réservation a échoué.");
      window.sessionStorage.removeItem("pimpay:flight-offer");
      router.push(`/mpay/flights/bookings/${data.bookingId}`);
    } catch (caught) {
      setBookError(caught instanceof Error ? caught.message : "La réservation a échoué.");
    } finally {
      setBooking(false);
    }
  }

  if (!offer) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-center text-white">
        <div>
          <AlertTriangle className="mx-auto size-8 text-amber-400" />
          <p className="mt-4 text-sm font-bold text-slate-300">Cette sélection de vol a expiré ou est introuvable.</p>
          <button type="button" onClick={() => router.push("/mpay/flights")} className="mt-5 rounded-xl bg-sky-500 px-5 py-3 text-xs font-black uppercase text-slate-950">Relancer une recherche</button>
        </div>
      </main>
    );
  }

  const first = offer.segments[0];
  const last = offer.segments[offer.segments.length - 1];

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-white">
      <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => router.back()} aria-label="Retour" className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"><ArrowLeft className="size-5" /></button>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-sky-400">Finaliser la réservation</p>
            <h1 className="mt-1 text-lg font-black">Détails du voyage</h1>
          </div>
        </header>

        <section className="mt-7 rounded-3xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500/15"><Plane className="size-4 text-sky-400" /></span>
            <div>
              <p className="text-xs font-black text-white">{first?.airline ?? "Compagnie"}</p>
              <p className="text-[10px] text-slate-500">{first?.flightNumber}</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3">
            <div><p className="text-xl font-black text-white">{formatClock(first?.departure.time ?? "")}</p><p className="text-[11px] font-black text-slate-400">{first?.departure.airport.iata}</p></div>
            <div className="flex min-w-0 flex-1 items-center gap-1.5"><div className="h-px flex-1 bg-white/10" /><Clock3 className="size-3.5 text-sky-400" /><div className="h-px flex-1 bg-white/10" /></div>
            <div className="text-right"><p className="text-xl font-black text-white">{formatClock(last?.arrival.time ?? "")}</p><p className="text-[11px] font-black text-slate-400">{last?.arrival.airport.iata}</p></div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Prix total confirmé</p>
          {priceLoading ? (
            <p className="mt-3 flex items-center gap-2 text-sm font-bold text-slate-400"><Loader2 className="size-4 animate-spin" /> Confirmation du tarif…</p>
          ) : priceError ? (
            <p className="mt-3 text-sm font-bold text-red-300">{priceError}</p>
          ) : pricing ? (
            <>
              <p className="mt-2 text-3xl font-black text-white">{pricing.currency} {pricing.total.toLocaleString("fr-FR")}</p>
              {pricing.priceChanged && <p className="mt-1 text-xs font-bold text-amber-400">Le tarif a légèrement changé depuis la recherche.</p>}
              <p className="mt-2 text-[11px] text-slate-500">Tarif de base {pricing.baseFare.toLocaleString("fr-FR")} + frais de service {pricing.serviceFee.toLocaleString("fr-FR")} {pricing.currency}</p>
            </>
          ) : null}
        </section>

        <section className="mt-6">
          <p className="text-xs font-black uppercase tracking-widest text-slate-500">Informations passagers ({passengerCount})</p>
          <div className="mt-3 flex flex-col gap-4">
            {passengers.map((passenger, index) => (
              <div key={index} className="rounded-3xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
                <p className="text-xs font-black text-sky-400">Passager {index + 1}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <input required placeholder="Prénom" value={passenger.firstName} onChange={(e) => updatePassenger(index, "firstName", e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none" />
                  <input required placeholder="Nom" value={passenger.lastName} onChange={(e) => updatePassenger(index, "lastName", e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none" />
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Date de naissance
                    <input required type="date" value={passenger.dateOfBirth} onChange={(e) => updatePassenger(index, "dateOfBirth", e.target.value)} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none [color-scheme:dark]" />
                  </label>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Genre
                    <select value={passenger.gender} onChange={(e) => updatePassenger(index, "gender", e.target.value)} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none [color-scheme:dark]">
                      <option value="male">Homme</option><option value="female">Femme</option><option value="other">Autre</option>
                    </select>
                  </label>
                  <input required maxLength={2} placeholder="Nationalité (ex. CG)" value={passenger.nationality} onChange={(e) => updatePassenger(index, "nationality", e.target.value.toUpperCase())} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold uppercase text-white outline-none" />
                  <input required type="email" placeholder="Email" value={passenger.email} onChange={(e) => updatePassenger(index, "email", e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none" />
                  <input required placeholder="Téléphone" value={passenger.phone} onChange={(e) => updatePassenger(index, "phone", e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none" />
                  <input required placeholder="N° de passeport" value={passenger.documentNumber} onChange={(e) => updatePassenger(index, "documentNumber", e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none" />
                  <input required maxLength={2} placeholder="Pays émetteur (ex. CG)" value={passenger.issuingCountry} onChange={(e) => updatePassenger(index, "issuingCountry", e.target.value.toUpperCase())} className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold uppercase text-white outline-none" />
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 sm:col-span-2">Passeport valide jusqu'au
                    <input required type="date" value={passenger.passportExpirationDate} onChange={(e) => updatePassenger(index, "passportExpirationDate", e.target.value)} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white outline-none [color-scheme:dark]" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {bookError && <p role="alert" className="mt-5 rounded-xl border border-red-500/20 bg-red-500/10 px-3.5 py-3 text-xs font-bold text-red-300">{bookError}</p>}

        <button
          type="button"
          disabled={!isFormComplete || !pricing || priceLoading || booking}
          onClick={confirmBooking}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-xs font-black uppercase tracking-widest text-slate-950 transition hover:bg-sky-400 disabled:opacity-50"
        >
          {booking ? <><Loader2 className="size-4 animate-spin" /> Traitement du paiement…</> : <><ShieldCheck className="size-4" /> Payer et réserver {pricing ? `— ${pricing.currency} ${pricing.total.toLocaleString("fr-FR")}` : ""}</>}
        </button>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[10px] text-slate-600"><BadgeCheck className="size-3.5" /> Le montant sera débité de votre solde Pi PimPay.</p>
      </div>
    </main>
  );
}
