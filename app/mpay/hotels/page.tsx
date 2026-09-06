"use client";

import { ArrowLeft, BadgeCheck, Hotel, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { HotelSearch } from "@/components/mpay/hotel-search";

// Page de réservation d'hôtels PIMOBIPAY. Elle affiche une carte OpenStreetMap
// qui récupère les hôtels réservables autour de la position de l'utilisateur
// (géolocalisation navigateur) via l'API Duffel Stays, avec un bouton de
// recherche. Habillage cohérent avec le module vols, accent fuchsia.
export default function HotelsPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-fuchsia-500/20 via-slate-950 to-slate-950" />

      <div className="mx-auto max-w-3xl px-4 pb-28 pt-5 sm:px-6">
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => router.back()} aria-label="Retour" className="flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10">
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-2 text-sm font-black tracking-tight">
            <span className="flex size-9 items-center justify-center rounded-xl bg-fuchsia-500 text-white"><Hotel className="size-4" /></span>
            MPay Hotels
          </div>
          <span className="size-10" aria-hidden="true" />
        </header>

        <section className="mt-10 max-w-xl">
          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-fuchsia-400">
            <Sparkles className="size-3.5" /> Réservation d'hôtels
          </p>
          <h1 className="mt-4 text-balance text-4xl font-black tracking-tight sm:text-5xl">
            Trouvez un hôtel autour de vous, en un instant.
          </h1>
          <p className="mt-4 text-pretty text-sm leading-6 text-slate-400">
            La carte détecte votre position et affiche les hôtels disponibles à proximité. Ajustez le rayon, choisissez vos dates et réservez directement avec votre solde PIMOBIPAY.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500">
            <span className="flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-fuchsia-400" /> Paiement sécurisé</span>
            <span className="flex items-center gap-1.5"><BadgeCheck className="size-3.5 text-fuchsia-400" /> Établissements vérifiés</span>
            <span className="flex items-center gap-1.5"><MapPin className="size-3.5 text-fuchsia-400" /> Autour de vous</span>
          </div>
        </section>

        <section className="mt-8">
          <HotelSearch />
        </section>
      </div>
    </main>
  );
}
