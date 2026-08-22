"use client";

import { ArrowLeft, BadgeCheck, PlaneTakeoff, Radar, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { FlightSearch } from "@/components/mpay/flight-search";

// ✅ REDESIGN : cette page affichait auparavant un simple "suivi de vol"
// (recherche par numéro de vol via AviationStack) alors qu'il s'agit de la
// page d'ACHAT de billets d'avion PimPay. Elle utilise maintenant le vrai
// moteur de recherche/réservation de vols (<FlightSearch />, provider
// Duffel) avec un habillage visuel neuf, cohérent avec le reste du module
// vols (Mes voyages, réservations, e-ticket).
export default function FlightsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-sky-500/20 via-slate-950 to-slate-950" />

      <div className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => router.back()} aria-label="Retour" className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-black tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-500 text-slate-950"><PlaneTakeoff className="size-4" /></span>
            MPay Flight
          </div>
          <button type="button" onClick={() => router.push("/mpay/flights/my-trips")} aria-label="Mes voyages" className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
            <Ticket className="size-4" />
          </button>
        </header>

        <section className="mt-10 max-w-xl">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-sky-400">
            <Sparkles className="size-3.5" /> Achat de billets d'avion
          </p>
          <h1 className="mt-4 text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Réservez votre prochain vol, sans quitter PIMOBIPAY.
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-slate-400">
            Comparez les vols disponibles pour votre itinéraire, choisissez votre tarif et payez directement avec votre solde PIMOBIPAY — sécurisé de bout en bout.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-sky-400" /> Paiement sécurisé</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-sky-400" /> Compagnies vérifiées</span>
            <button type="button" onClick={() => router.push("/mpay/flights/track")} className="flex items-center gap-1.5 underline decoration-dotted underline-offset-4 hover:text-sky-300">
              <Radar className="size-3.5 text-sky-400" /> Suivre un vol existant
            </button>
          </div>
        </section>

        <section className="mt-8">
          <FlightSearch />
        </section>
      </div>
    </main>
  );
}
