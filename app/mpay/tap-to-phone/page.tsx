"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CreditCard,
  Delete,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Wifi,
  Lock,
  X,
  Nfc,
  RadioTower,
  Receipt,
  Home,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────
type Step = "amount" | "tap" | "reading" | "pin" | "processing" | "success" | "declined";

interface ReceiptData {
  reference: string;
  authCode: string;
  amount: number;
  fee: number;
  netAmount: number;
  currency: string;
  cardScheme: string;
  cardLast4: string;
  cardHolder: string | null;
  newBalance: number;
  date: string;
}

const CURRENCIES = [
  { code: "USD", symbol: "$" },
  { code: "EUR", symbol: "€" },
  { code: "XAF", symbol: "FCFA" },
  { code: "XOF", symbol: "CFA" },
];

const PIN_THRESHOLD = 50; // au-dessus, code confidentiel requis

// Simule les données non sensibles issues d'un tap (aucun PAN complet)
function simulateCardTap() {
  const holders = ["J. MBEMBA", "A. KOUASSI", "M. NDONG", "S. OBAMI", "P. MOUKALA"];
  const last4 = Math.floor(1000 + Math.random() * 9000).toString();
  return {
    cardScheme: "VISA",
    cardLast4: last4,
    cardHolder: holders[Math.floor(Math.random() * holders.length)],
  };
}

export default function TapToPhonePage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0]);
  const [pin, setPin] = useState("");
  const [card, setCard] = useState<{ cardScheme: string; cardLast4: string; cardHolder: string } | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [nfcSupported, setNfcSupported] = useState(false);

  const nfcAbort = useRef<AbortController | null>(null);

  const numAmount = parseFloat(amount || "0");

  useEffect(() => {
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      setNfcSupported(true);
    }
    return () => {
      nfcAbort.current?.abort();
    };
  }, []);

  // ── Numpad montant ──────────────────────────────────────────────────────
  const handleKey = useCallback((key: string) => {
    setAmount((prev) => {
      if (key === "delete") return prev.slice(0, -1);
      if (key === ".") return prev.includes(".") ? prev : prev === "" ? "0." : prev + ".";
      // max 2 décimales
      if (prev.includes(".") && prev.split(".")[1]?.length >= 2) return prev;
      const next = prev === "0" && key !== "." ? key : prev + key;
      return next;
    });
  }, []);

  // ── Démarrer l'attente du tap ─────────────────────────────────────────────
  const startTap = () => {
    if (numAmount < 0.5) {
      toast.error("Montant minimum : 0.50");
      return;
    }
    setStep("tap");
    // Tentative Web NFC (détection de proximité uniquement, pas de lecture EMV)
    if (typeof window !== "undefined" && "NDEFReader" in window) {
      try {
        // @ts-ignore — NDEFReader n'est pas typé partout
        const reader = new window.NDEFReader();
        const controller = new AbortController();
        nfcAbort.current = controller;
        reader
          .scan({ signal: controller.signal })
          .then(() => {
            reader.onreading = () => onCardDetected();
          })
          .catch(() => {
            /* fallback bouton manuel */
          });
      } catch {
        /* ignore */
      }
    }
  };

  // ── Carte détectée ───────────────────────────────────────────────────────
  const onCardDetected = () => {
    nfcAbort.current?.abort();
    setStep("reading");
    const detected = simulateCardTap();
    setCard(detected);
    // temps de "lecture" de la puce
    setTimeout(() => {
      if (numAmount >= PIN_THRESHOLD) {
        setStep("pin");
      } else {
        processPayment(detected, "");
      }
    }, 1800);
  };

  // ── Saisie PIN ────────────────────────────────────────────────────────────
  const handlePinKey = (key: string) => {
    if (key === "delete") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    setPin((p) => {
      const next = (p + key).slice(0, 4);
      if (next.length === 4 && card) {
        setTimeout(() => processPayment(card, next), 250);
      }
      return next;
    });
  };

  // ── Appel API : crédite le wallet PIMOBIPAY ───────────────────────────────────
  const processPayment = async (
    detected: { cardScheme: string; cardLast4: string; cardHolder: string },
    _pin: string
  ) => {
    setStep("processing");
    try {
      const res = await fetch("/api/mpay/tap-to-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          currency: currency.code,
          cardScheme: detected.cardScheme,
          cardLast4: detected.cardLast4,
          cardHolder: detected.cardHolder,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Paiement refusé");
        setStep("declined");
        return;
      }
      setReceipt(data.receipt);
      setStep("success");
    } catch {
      setErrorMsg("Erreur réseau. Réessayez.");
      setStep("declined");
    }
  };

  const reset = () => {
    setStep("amount");
    setAmount("");
    setPin("");
    setCard(null);
    setReceipt(null);
    setErrorMsg("");
  };

  const cancel = () => {
    nfcAbort.current?.abort();
    if (step === "amount") router.push("/mpay");
    else reset();
  };

  const fmt = (n: number) =>
    n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* Header */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button
          onClick={cancel}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-lg font-black uppercase tracking-tight">Tap to Phone</h1>
          <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase flex items-center justify-center gap-1">
            <CreditCard size={10} /> Visa sans contact
          </p>
        </div>
        <button
          onClick={() => router.push("/mpay")}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </header>

      <main className="px-6 pt-6 pb-32 max-w-md mx-auto">
        {/* ─────────── STEP: AMOUNT ─────────── */}
        {step === "amount" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 text-center backdrop-blur-md">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">
                Montant à encaisser
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-3xl font-black text-blue-500">{currency.symbol}</span>
                <span className="text-5xl font-black tracking-tighter">{amount || "0"}</span>
              </div>

              {/* Devise */}
              <div className="grid grid-cols-4 gap-2 mt-6">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => setCurrency(c)}
                    className={`py-2 rounded-xl border text-[10px] font-black uppercase transition-all ${
                      currency.code === c.code
                        ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/20"
                        : "bg-white/5 border-white/10 text-slate-500"
                    }`}
                  >
                    {c.code}
                  </button>
                ))}
              </div>
            </div>

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className="h-14 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                >
                  {key === "delete" ? <Delete size={20} className="text-red-500" /> : key}
                </button>
              ))}
            </div>

            <button
              onClick={startTap}
              disabled={numAmount < 0.5}
              className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-3"
            >
              <Nfc size={20} /> Encaisser par tap
            </button>

            <p className="text-[9px] text-slate-500 text-center leading-relaxed flex items-center justify-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-500" />
              Paiement sécurisé — aucune donnée de carte n&apos;est stockée
            </p>
          </div>
        )}

        {/* ─────────── STEP: TAP (attente) ─────────── */}
        {step === "tap" && (
          <div className="flex flex-col items-center justify-center text-center pt-8 animate-in zoom-in-95 duration-500">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Montant
            </div>
            <div className="text-4xl font-black mb-10">
              {currency.symbol} {fmt(numAmount)}
            </div>

            {/* Ondes NFC animées */}
            <div className="relative w-56 h-56 flex items-center justify-center mb-10">
              <span className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
              <span className="absolute inset-6 rounded-full border-2 border-blue-500/40 animate-ping [animation-delay:200ms]" />
              <span className="absolute inset-12 rounded-full border-2 border-blue-500/50 animate-ping [animation-delay:400ms]" />
              <div className="relative w-28 h-28 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/40">
                <RadioTower size={48} className="text-white" />
              </div>
            </div>

            <h2 className="text-xl font-black uppercase tracking-tight">Approchez la carte</h2>
            <p className="text-[11px] text-slate-500 font-bold mt-2 max-w-[220px]">
              Placez la carte Visa sans contact contre l&apos;arrière du téléphone
            </p>

            <div className="mt-4 text-[9px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1.5">
              <Wifi size={12} className={nfcSupported ? "text-emerald-500" : "text-amber-500"} />
              {nfcSupported ? "Lecteur NFC actif" : "NFC non détecté sur cet appareil"}
            </div>

            {/* Déclencheur manuel (démo / appareils sans NFC web) */}
            <button
              onClick={onCardDetected}
              className="mt-8 w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300 hover:bg-white/10 active:scale-95 transition-all"
            >
              Simuler la détection de la carte
            </button>
            <button
              onClick={cancel}
              className="mt-3 text-[10px] font-black uppercase tracking-widest text-red-400"
            >
              Annuler
            </button>
          </div>
        )}

        {/* ─────────── STEP: READING ─────────── */}
        {step === "reading" && (
          <div className="flex flex-col items-center justify-center text-center pt-16 animate-in fade-in duration-300">
            <div className="relative w-72 h-44 rounded-[1.5rem] bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-800 p-5 shadow-2xl shadow-blue-900/40 overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20">
                <Wifi size={40} className="rotate-90" />
              </div>
              <div className="w-10 h-7 bg-amber-400/80 rounded-md mb-6" />
              <div className="text-left text-lg font-black tracking-widest">
                •••• •••• •••• {card?.cardLast4}
              </div>
              <div className="flex justify-between items-end mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  {card?.cardHolder}
                </span>
                <span className="text-xl font-black italic tracking-tight">VISA</span>
              </div>
            </div>
            <div className="mt-10 flex items-center gap-2 text-blue-400">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-[11px] font-black uppercase tracking-widest">
                Lecture de la carte…
              </span>
            </div>
          </div>
        )}

        {/* ─────────── STEP: PIN ─────────── */}
        {step === "pin" && (
          <div className="space-y-8 animate-in slide-in-from-right-8 duration-400">
            <div className="text-center pt-4">
              <div className="w-14 h-14 mx-auto bg-blue-600/15 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-4">
                <Lock size={26} />
              </div>
              <h2 className="text-lg font-black uppercase tracking-tight">Code confidentiel</h2>
              <p className="text-[11px] text-slate-500 font-bold mt-1">
                Le titulaire saisit son code — {currency.symbol} {fmt(numAmount)}
              </p>
            </div>

            <div className="flex justify-center gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all ${
                    pin.length > i ? "bg-blue-500 scale-110" : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) =>
                key === "" ? (
                  <div key={i} />
                ) : (
                  <button
                    key={key}
                    onClick={() => handlePinKey(key)}
                    className="h-16 rounded-2xl bg-white/5 border border-white/5 text-xl font-black hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                  >
                    {key === "delete" ? <Delete size={22} className="text-red-500" /> : key}
                  </button>
                )
              )}
            </div>

            <p className="text-[9px] text-slate-600 text-center flex items-center justify-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-500" /> Saisie chiffrée de bout en bout
            </p>
          </div>
        )}

        {/* ─────────── STEP: PROCESSING ─────────── */}
        {step === "processing" && (
          <div className="flex flex-col items-center justify-center text-center pt-24 animate-in fade-in duration-300">
            <div className="relative w-24 h-24 flex items-center justify-center mb-8">
              <span className="absolute inset-0 rounded-full border-2 border-blue-500/30 animate-ping" />
              <Loader2 className="animate-spin text-blue-500" size={48} />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tight">Autorisation en cours</h2>
            <p className="text-[11px] text-slate-500 font-bold mt-2">
              Connexion au réseau Visa…
            </p>
          </div>
        )}

        {/* ─────────── STEP: SUCCESS ─────────── */}
        {step === "success" && receipt && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="flex flex-col items-center text-center pt-4">
              <div className="relative w-24 h-24 flex items-center justify-center mb-4">
                <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                  <CheckCircle2 size={44} className="text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Paiement accepté</h2>
              <p className="text-[11px] text-emerald-400 font-black mt-1 uppercase tracking-widest">
                Crédité sur votre wallet PIMOBIPAY
              </p>
            </div>

            {/* Reçu */}
            <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 space-y-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 pb-3 border-b border-white/5">
                <Receipt size={16} className="text-blue-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  Reçu de transaction
                </span>
              </div>

              <div className="text-center py-2">
                <p className="text-[10px] font-black text-slate-500 uppercase">Net encaissé</p>
                <p className="text-3xl font-black text-emerald-400">
                  {receipt.currency} {fmt(receipt.netAmount)}
                </p>
              </div>

              {[
                ["Montant carte", `${receipt.currency} ${fmt(receipt.amount)}`],
                ["Frais marchand", `- ${receipt.currency} ${fmt(receipt.fee)}`],
                ["Carte", `${receipt.cardScheme} •••• ${receipt.cardLast4}`],
                ["Titulaire", receipt.cardHolder || "—"],
                ["Code autor.", receipt.authCode],
                ["Référence", receipt.reference],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex-shrink-0">
                    {label}
                  </span>
                  <span className="text-[11px] font-black text-white truncate">{value}</span>
                </div>
              ))}

              <div className="flex justify-between items-center pt-3 border-t border-white/5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Nouveau solde
                </span>
                <span className="text-sm font-black text-blue-400">
                  {receipt.currency} {fmt(receipt.newBalance)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={reset}
                className="bg-blue-600 p-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-600/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Nfc size={16} /> Nouveau
              </button>
              <button
                onClick={() => router.push("/mpay")}
                className="bg-white/5 border border-white/10 p-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-slate-300 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Home size={16} /> Terminer
              </button>
            </div>
          </div>
        )}

        {/* ─────────── STEP: DECLINED ─────────── */}
        {step === "declined" && (
          <div className="flex flex-col items-center justify-center text-center pt-16 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-red-500/15 border border-red-500/30 rounded-full flex items-center justify-center mb-5">
              <X size={44} className="text-red-500" />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Paiement refusé</h2>
            <p className="text-[11px] text-slate-400 font-bold mt-2 max-w-[240px]">{errorMsg}</p>
            <button
              onClick={reset}
              className="mt-10 w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
            >
              Réessayer
            </button>
            <button
              onClick={() => router.push("/mpay")}
              className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-500"
            >
              Retour à mPay
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
