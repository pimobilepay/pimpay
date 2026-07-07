"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Smartphone,
  Search,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ChevronDown,
} from "lucide-react";
import {
  countries,
  type Country,
  type MobileOperator,
} from "@/lib/country-data";
import { isCountrySupported } from "@/lib/pawapay";
import { usePiPrice } from "@/hooks/usePiPrice";
import { toast } from "sonner";
import "flag-icons/css/flag-icons.min.css";

export default function MobileTransferPage() {
  const router = useRouter();
  const { price: piPrice } = usePiPrice();

  // Pays pris en charge par l'agrégateur Mobile Money (PawaPay)
  const supportedCountries = useMemo(
    () => countries.filter((c) => isCountrySupported(c.code)),
    []
  );

  const [selectedCountry, setSelectedCountry] = useState<Country>(
    supportedCountries.find((c) => c.code === "CG") || supportedCountries[0]
  );
  const [selectedOperator, setSelectedOperator] = useState<MobileOperator | null>(
    (selectedCountry.operators.find((o) => o.features?.cashOut) ||
      selectedCountry.operators[0]) ??
      null
  );
  const [phoneNumber, setPhoneNumber] = useState("");
  const [piAmount, setPiAmount] = useState("");
  const [note, setNote] = useState("");
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      supportedCountries.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase())
      ),
    [supportedCountries, search]
  );

  const payoutOperators = selectedCountry.operators.filter(
    (o) => o.features?.cashOut !== false
  );

  const pi = parseFloat(piAmount) || 0;
  const localAmount = pi > 0 ? pi * (selectedCountry.piToLocalRate || 0) : 0;
  const usdEquivalent = pi > 0 && piPrice > 0 ? pi * piPrice : 0;

  const canSubmit =
    pi > 0 && phoneNumber.trim().length >= 6 && selectedOperator && !isLoading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/transaction/transfer/mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piAmount: pi,
          phone: `${selectedCountry.dialCode}${phoneNumber}`,
          operatorId: selectedOperator?.id,
          operatorName: selectedOperator?.name,
          countryCode: selectedCountry.code,
          fiatAmount: Math.round(localAmount),
          fiatCurrency: selectedCountry.currency,
          note,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (res.ok && result.reference) {
        setSuccessRef(result.reference);
      } else {
        toast.error(result.error || "Échec du transfert Mobile Money");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  }

  if (successRef) {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mb-6"
        >
          <CheckCircle2 size={48} className="text-emerald-400" />
        </motion.div>
        <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
          Transfert initié
        </h1>
        <p className="text-sm text-slate-400 max-w-xs leading-relaxed">
          Votre transfert vers le compte Mobile Money du bénéficiaire est en
          cours de traitement par notre agrégateur.
        </p>
        <p className="mt-4 text-[11px] font-mono font-bold text-blue-400">
          Réf : {successRef}
        </p>
        <button
          onClick={() => router.push("/dashboard")}
          className="mt-10 w-full max-w-xs h-14 bg-blue-600 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all"
        >
          Terminer
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32">
      {/* Header */}
      <header className="px-6 pt-10 pb-6 flex items-center gap-4 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
            Transfert Mobile Money
          </h1>
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px] mt-1">
            Vers un numéro externe
          </p>
        </div>
      </header>

      <main className="px-6 space-y-6 max-w-md mx-auto">
        {/* Pays + Opérateur */}
        <section className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Pays du bénéficiaire
            </label>
            <button
              onClick={() => setIsCountryOpen(true)}
              className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 flex items-center justify-between active:scale-[0.99] transition-all"
            >
              <span className="flex items-center gap-3">
                <span className={`fi fi-${selectedCountry.code.toLowerCase()}`} />
                <span className="text-sm font-black uppercase">
                  {selectedCountry.name}
                </span>
              </span>
              <ChevronDown size={18} className="text-slate-500" />
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Opérateur
            </label>
            {payoutOperators.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {payoutOperators.map((op) => (
                  <button
                    key={op.id}
                    onClick={() => setSelectedOperator(op)}
                    className={`p-4 rounded-2xl border transition-all flex items-center gap-3 active:scale-95 ${
                      selectedOperator?.id === op.id
                        ? "bg-blue-600/10 border-blue-500/30"
                        : "bg-white/[0.03] border-white/5"
                    }`}
                  >
                    <img
                      src={op.icon || "/placeholder.svg"}
                      alt={op.name}
                      className="w-8 h-8 rounded-lg object-contain bg-white/10 p-1"
                      crossOrigin="anonymous"
                    />
                    <span className="text-[10px] font-black uppercase text-left">
                      {op.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[10px] font-bold text-amber-400 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                Aucun opérateur disponible pour ce pays.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Numéro du bénéficiaire
            </label>
            <div className="flex gap-2">
              <div className="h-14 px-4 bg-slate-900 rounded-2xl border border-white/10 flex items-center gap-2 shrink-0">
                <span className={`fi fi-${selectedCountry.code.toLowerCase()}`} />
                <span className="text-xs font-black text-blue-500">
                  {selectedCountry.dialCode}
                </span>
              </div>
              <input
                type="tel"
                inputMode="tel"
                value={phoneNumber}
                onChange={(e) =>
                  setPhoneNumber(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="Numéro de téléphone"
                className="flex-1 min-w-0 h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
              />
            </div>
          </div>
        </section>

        {/* Montant */}
        <section className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
              Montant à envoyer (Pi)
            </label>
            <div className="relative">
              <input
                type="number"
                value={piAmount}
                onChange={(e) => setPiAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-16 bg-slate-900/80 rounded-2xl border border-white/10 px-6 pr-16 text-2xl font-black text-blue-500 outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-800"
              />
              <span className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-black text-slate-500">
                Pi
              </span>
            </div>
          </div>

          {pi > 0 && (
            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                <span>Équivalent USD</span>
                <span className="text-slate-300">
                  ≈ ${usdEquivalent.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[12px] font-black uppercase pt-3 border-t border-white/5">
                <span className="text-emerald-500">Le bénéficiaire reçoit</span>
                <span className="text-emerald-400">
                  {new Intl.NumberFormat("fr-FR", {
                    maximumFractionDigits: 0,
                  }).format(Math.round(localAmount))}{" "}
                  {selectedCountry.currency}
                </span>
              </div>
            </div>
          )}

          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optionnel)"
            maxLength={100}
            className="w-full h-12 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-xs font-bold outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-700"
          />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                <Smartphone size={18} />
                Envoyer
              </>
            )}
          </button>
        </section>

        <div className="flex items-center justify-center gap-2 py-2">
          <ShieldCheck size={12} className="text-emerald-500" />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Transfert sécurisé via agrégateur Mobile Money
          </span>
        </div>
      </main>

      {/* Sélecteur de pays */}
      <AnimatePresence>
        {isCountryOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            className="fixed inset-0 z-50 bg-[#020617] p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black uppercase">Choisir le pays</h2>
              <button
                onClick={() => setIsCountryOpen(false)}
                className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black"
              >
                Fermer
              </button>
            </div>
            <div className="relative mb-6">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                placeholder="Rechercher"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl pl-12 pr-6 outline-none"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {filtered.map((c) => (
                <button
                  key={c.code}
                  onClick={() => {
                    setSelectedCountry(c);
                    setSelectedOperator(
                      c.operators.find((o) => o.features?.cashOut) ||
                        c.operators[0] ||
                        null
                    );
                    setIsCountryOpen(false);
                  }}
                  className="w-full p-4 flex items-center justify-between rounded-2xl bg-white/5 border border-white/5"
                >
                  <div className="flex items-center gap-4">
                    <span className={`fi fi-${c.code.toLowerCase()} scale-125`} />
                    <span className="text-xs font-black uppercase">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-blue-500 font-black">{c.dialCode}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
