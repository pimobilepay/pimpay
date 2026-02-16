"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Fingerprint,
  ChevronRight,
  Clock,
  ShieldCheck,
  Banknote,
  Smartphone,
  Info,
  AlertTriangle,
  Wallet,
  ArrowUpRight,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref");
  const method = searchParams.get("method") || "Mobile Money";
  const amountParam = searchParams.get("amount");
  const currencyParam = searchParams.get("currency") || "USD";

  const [mounted, setMounted] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"summary" | "processing" | "success" | "failed">("summary");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch transaction details
  useEffect(() => {
    if (!ref || !mounted) return;

    const fetchTransactionDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
        if (!response.ok) throw new Error("Introuvable");
        const data = await response.json();
        setTransaction(data);

        if (data.status === "COMPLETED" || data.status === "SUCCESS") {
          setStep("success");
        }
      } catch {
        // Donnees de fallback
        setTransaction({
          reference: ref || "TX-PIMPAY-000",
          amount: amountParam ? parseFloat(amountParam) : 0,
          fee: amountParam ? (parseFloat(amountParam) * 0.02) : 0,
          status: "PENDING",
          method: method,
          currency: currencyParam,
          date: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [ref, mounted, method, amountParam, currencyParam]);

  // Polling pour le statut
  const checkStatus = useCallback(async () => {
    if (!ref || step === "success" || step === "failed") return;
    try {
      const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === "COMPLETED" || data.status === "SUCCESS") {
        setTransaction(data);
        setStep("success");
        toast.success("Depot confirme ! Votre solde est mis a jour.");
      }
    } catch {
      // Silencieux
    }
  }, [ref, step]);

  useEffect(() => {
    if (step !== "summary" && step !== "processing") return;
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [checkStatus, step]);

  const handleFinalConfirm = async () => {
    if (!ref) return;
    setIsProcessing(true);
    setStep("processing");

    try {
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        body: JSON.stringify({ reference: ref }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setTimeout(() => {
          setStep("success");
          setIsProcessing(false);
          toast.success("Depot valide ! Votre solde a ete mis a jour.");
        }, 2000);
      } else {
        setStep("summary");
        setIsProcessing(false);
        toast.error("Erreur de confirmation. Veuillez reessayer.");
      }
    } catch {
      // Fallback
      setTimeout(() => {
        setStep("success");
        setIsProcessing(false);
      }, 2000);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">
          Chargement du recapitulatif...
        </p>
      </div>
    );
  }

  const amount = transaction?.amount || 0;
  const fee = transaction?.fee || amount * 0.02;
  const total = amount + fee;

  // --- ECRAN SUCCESS ---
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 pb-20 animate-in zoom-in-95 duration-500">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 flex items-center justify-center mb-8 shadow-[0_0_80px_rgba(16,185,129,0.15)] relative">
          <CheckCircle2 size={48} className="text-emerald-500" />
          <div className="absolute -bottom-2 bg-emerald-500 text-[8px] font-black px-3 py-0.5 rounded-full text-white uppercase tracking-wider">
            Confirme
          </div>
        </div>
        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 text-center text-balance">
          Depot reussi
        </h1>
        <p className="text-slate-400 text-center text-sm mb-10 px-8 leading-relaxed">
          Votre compte{" "}
          <span className="text-blue-400 font-black">PimPay</span> a ete
          credite de{" "}
          <span className="text-white font-bold">${amount.toFixed(2)}</span>.
        </p>

        <Card className="w-full bg-white/5 border-white/5 p-6 rounded-2xl mb-6 space-y-4">
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Reference
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              {transaction?.reference?.slice(0, 18)}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Methode
            </span>
            <span className="text-[10px] font-black text-white uppercase">
              {transaction?.method}
            </span>
          </div>
          <div className="flex justify-between items-center py-3 border-b border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Frais appliques
            </span>
            <span className="text-[10px] font-black text-red-400">
              +{fee.toFixed(2)} USD
            </span>
          </div>
          <div className="flex justify-between items-center py-3">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              Reseau PimPay
            </span>
            <span className="text-[10px] font-black text-white uppercase">
              Mainnet
            </span>
          </div>
        </Card>

        <div className="w-full space-y-3">
          <button
            onClick={() =>
              router.push(`/deposit/details?ref=${ref}`)
            }
            className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[11px] tracking-widest text-slate-300 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <ArrowUpRight size={16} />
            Voir le recu
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase text-[11px] tracking-widest text-white shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Wallet size={16} />
            Acceder au Wallet
          </button>
        </div>
      </div>
    );
  }

  // --- ECRAN PRINCIPAL : SUMMARY ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-36 font-sans">
      {/* Header */}
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase leading-none">
              Recapitulatif
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`w-2 h-2 rounded-full animate-pulse ${
                  step === "processing"
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
              />
              <span
                className={`text-[10px] font-black uppercase tracking-[2px] ${
                  step === "processing"
                    ? "text-blue-400"
                    : "text-amber-500"
                }`}
              >
                {step === "processing"
                  ? "Verification en cours..."
                  : "En attente de confirmation"}
              </span>
            </div>
          </div>
        </div>

        {/* Montant principal */}
        <Card className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-[0.04]">
            <ShieldCheck size={100} />
          </div>
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">
            Depot initialise
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">
              ${amount.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-blue-400 uppercase">
              USD
            </span>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-4">
        {/* Details de la transaction */}
        <Card className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Fingerprint size={16} className="text-blue-500" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Reference
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">
                {transaction?.reference?.slice(0, 18)}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Smartphone size={16} className="text-slate-400" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Methode
                </span>
              </div>
              <span className="text-[10px] font-bold text-white uppercase">
                {transaction?.method}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Clock size={16} className="text-amber-500" />
                </div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Statut
                </span>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full animate-pulse uppercase">
                {step === "processing"
                  ? "Verification..."
                  : transaction?.status === "PENDING"
                    ? "En attente"
                    : transaction?.status}
              </span>
            </div>
          </div>
        </Card>

        {/* Frais et total */}
        <Card className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Banknote size={14} className="text-slate-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Breakdown
            </span>
          </div>

          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-500">Montant brut</span>
            <span className="text-white">{amount.toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
            <span className="text-slate-500">Frais reseau (2%)</span>
            <span className="text-red-400">+{fee.toFixed(2)} USD</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex justify-between text-[12px] font-black uppercase text-emerald-400">
            <span>Total debite</span>
            <span>{total.toFixed(2)} USD</span>
          </div>
        </Card>

        {/* Informations */}
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-600/5 rounded-xl border border-blue-600/10">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              <span className="text-blue-400 font-black uppercase">
                Delai :{" "}
              </span>
              Les depots Mobile Money sont credites en 1 a 5 minutes. Les
              depots Pi Network sont instantanes apres confirmation blockchain.
            </p>
          </div>

          <div className="flex items-start gap-3 p-4 bg-amber-500/5 rounded-xl border border-amber-500/10">
            <AlertTriangle
              size={16}
              className="text-amber-400 shrink-0 mt-0.5"
            />
            <p className="text-[10px] text-amber-300/80 leading-relaxed font-medium">
              Si vous avez deja valide le paiement sur votre telephone ou
              wallet, cliquez sur le bouton ci-dessous pour confirmer.
            </p>
          </div>
        </div>

        {/* Bouton de confirmation */}
        <div className="pt-2">
          <button
            onClick={handleFinalConfirm}
            disabled={isProcessing}
            className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center ${
              isProcessing
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white shadow-blue-500/20"
            }`}
          >
            {isProcessing ? (
              <div className="flex items-center gap-3">
                <Loader2 className="animate-spin" size={20} />
                <span>Verification en cours...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full px-6">
                <span className="flex-1 text-center">
                  Confirmer le depot
                </span>
                <ChevronRight
                  size={20}
                  className="bg-white/20 rounded-lg p-0.5"
                />
              </div>
            )}
          </button>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

export default function DepositSummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <SummaryContent />
    </Suspense>
  );
}
