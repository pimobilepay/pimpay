"use client";

import { FormEvent, useMemo, useState } from "react";
import { ArrowLeft, Car, CheckCircle2, Clock3, Loader2, MapPin, Navigation, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const rideOptions = [
  { id: "standard", name: "Taxi standard", detail: "4 places · arrivée en 5 à 10 min", price: 4.5, accent: "from-amber-500 to-orange-500" },
  { id: "comfort", name: "Taxi confort", detail: "4 places · véhicule premium", price: 7.5, accent: "from-blue-500 to-indigo-500" },
  { id: "xl", name: "Taxi XL", detail: "6 places · idéal pour les groupes", price: 10, accent: "from-emerald-500 to-teal-500" },
];

export default function TaxiPaymentPage() {
  const router = useRouter();
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [selectedRide, setSelectedRide] = useState("standard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paidReference, setPaidReference] = useState<string | null>(null);

  const selectedOption = useMemo(
    () => rideOptions.find((ride) => ride.id === selectedRide) ?? rideOptions[0],
    [selectedRide],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!pickup.trim() || !destination.trim()) {
      toast.error("Renseignez le départ et la destination");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: selectedOption.price,
          currency: "PI",
          method: "MPAY_WALLET",
          type: "PAYMENT",
          countryCode: "CD",
          bankDetails: {
            service: "TAXI",
            rideType: selectedOption.id,
            pickup: pickup.trim(),
            destination: destination.trim(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "Paiement refusé");
      setPaidReference(data.transactionId ?? "MPAY-TAXI");
      toast.success("Course confirmée", { description: "Le paiement a été enregistré dans votre wallet MPay." });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de confirmer le paiement");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (paidReference) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
        <div className="mx-auto flex min-h-[70vh] max-w-xl items-center justify-center">
          <section className="w-full rounded-[2rem] border border-emerald-400/20 bg-white/[0.04] p-7 text-center shadow-2xl shadow-emerald-950/30">
            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"><CheckCircle2 size={34} /></div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Paiement confirmé</p>
            <h1 className="mt-3 text-2xl font-black">Votre taxi est en route</h1>
            <p className="mt-2 text-sm text-slate-400">Le montant de {selectedOption.price.toFixed(2)} PI a été réservé pour votre course.</p>
            <p className="mt-5 rounded-xl bg-black/20 px-3 py-2 text-xs text-slate-500">Référence : {paidReference}</p>
            <button onClick={() => router.push("/mpay")} className="mt-6 w-full rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-emerald-400">Retour à MPay</button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-5 text-white sm:px-6 sm:py-8">
      <div className="mx-auto max-w-3xl">
        <button onClick={() => router.back()} className="mb-7 inline-flex items-center gap-2 text-xs font-bold text-slate-400 transition hover:text-white"><ArrowLeft size={16} /> Retour à MPay</button>
        <header className="mb-7 flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg shadow-amber-500/20"><Car size={27} /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">MPay mobilité</p><h1 className="mt-1 text-3xl font-black tracking-tight">Commander un taxi</h1><p className="mt-1 text-sm text-slate-400">Réservez votre course et payez directement avec votre wallet.</p></div>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <div className="space-y-3">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 focus-within:border-amber-400/50"><MapPin className="text-amber-400" size={18} /><span className="sr-only">Lieu de départ</span><input value={pickup} onChange={(event) => setPickup(event.target.value)} placeholder="Lieu de départ" className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-600" required /></label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 focus-within:border-amber-400/50"><Navigation className="text-emerald-400" size={18} /><span className="sr-only">Destination</span><input value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="Destination" className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-600" required /></label>
            </div>
          </section>

          <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-black">Choisissez votre véhicule</h2><span className="text-xs text-slate-500">Estimation</span></div><div className="grid gap-3 sm:grid-cols-3">{rideOptions.map((ride) => <button type="button" key={ride.id} onClick={() => setSelectedRide(ride.id)} className={`rounded-2xl border p-4 text-left transition ${selectedRide === ride.id ? "border-amber-400 bg-amber-400/10" : "border-white/10 bg-white/[0.03] hover:border-white/20"}`}><div className={`mb-3 flex size-10 items-center justify-center rounded-xl bg-gradient-to-br ${ride.accent}`}><Car size={19} /></div><p className="text-sm font-black">{ride.name}</p><p className="mt-1 min-h-8 text-[11px] leading-relaxed text-slate-400">{ride.detail}</p><p className="mt-3 text-lg font-black text-amber-300">{ride.price.toFixed(2)} PI</p></button>)}</div></section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-400">Paiement sécurisé par MPay</p><p className="mt-1 text-2xl font-black">{selectedOption.price.toFixed(2)} PI</p></div><ShieldCheck className="text-emerald-400" size={25} /></div><div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500"><Clock3 size={14} /> Le chauffeur sera recherché après confirmation.</div><button type="submit" disabled={isSubmitting} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-400 px-4 py-3.5 text-sm font-black text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60">{isSubmitting ? <><Loader2 className="animate-spin" size={17} /> Traitement du paiement...</> : <>Confirmer et payer avec MPay</>}</button></section>
        </form>
      </div>
    </main>
  );
}
