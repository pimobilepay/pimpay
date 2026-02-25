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

// Prix GCV PimPay
const PI_GCV_PRICE = 314159;

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
        
        if (response.ok) {
          const data = await response.json();
          setTransaction(data);
          if (data.status === "SUCCESS") {
            setStep("success");
          }
        } else {
          // Fallback : On crée un objet temporaire pour l'UI
          setTransaction({
            reference: ref,
            amount: amountParam ? parseFloat(amountParam) : 0,
            fee: amountParam ? (parseFloat(amountParam) * 0.02) : 0,
            status: "PENDING",
            method: method,
            currency: currencyParam,
            date: new Date().toISOString(),
          });
        }
      } catch {
        // Silencieux
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [ref, mounted, method, amountParam, currencyParam]);

  // Polling pour vérifier si la blockchain a validé (via ton API complete)
  const checkStatus = useCallback(async () => {
    if (!ref || step === "success" || step === "failed") return;
    try {
      const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS") {
          setTransaction(data);
          setStep("success");
          toast.success("Dépôt confirmé ! Solde mis à jour.");
        }
      }
    } catch (e) { /* Silencieux */ }
  }, [ref, step]);

  useEffect(() => {
    if (step !== "summary" && step !== "processing") return;
    const interval = setInterval(checkStatus, 4000); // Polling toutes les 4s
    return () => clearInterval(interval);
  }, [checkStatus, step]);

  const handleFinalConfirm = async () => {
    if (!ref) return;
    setIsProcessing(true);
    setStep("processing");

    try {
      // On appelle ton API de confirmation de dépôt
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        body: JSON.stringify({ reference: ref }),
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setStep("success");
        toast.success("Validation réussie !");
      } else {
        // Si c'est déjà success coté serveur mais pas encore ici
        await checkStatus();
        if (step !== "success") {
          setStep("summary");
          toast.error("Veuillez patienter pendant la validation blockchain.");
        }
      }
    } catch {
      setStep("summary");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">Vérification PimPay...</p>
      </div>
    );
  }

  // Calcul des montants avec GCV si nécessaire
  const isPi = transaction?.currency === "PI";
  const rawAmount = transaction?.amount || 0;
  const amount = isPi ? rawAmount * PI_GCV_PRICE : rawAmount;
  const fee = transaction?.fee || (amount * 0.02);
  const total = amount + fee;

  if (step === "success") {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 pb-20 animate-in zoom-in-95">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 flex items-center justify-center mb-8 relative">
          <CheckCircle2 size={48} className="text-emerald-500" />
          <div className="absolute -bottom-2 bg-emerald-500 text-[8px] font-black px-3 py-0.5 rounded-full text-white uppercase">SUCCESS</div>
        </div>
        <h1 className="text-3xl font-black text-white uppercase mb-2 text-center">Dépôt réussi</h1>
        <p className="text-slate-400 text-center text-sm mb-10 leading-relaxed">
          Votre compte <span className="text-blue-400 font-black">PimPay</span> a été crédité de{" "}
          <span className="text-white font-bold">${amount.toLocaleString()} USD</span>.
        </p>

        <Card className="w-full bg-white/5 border-white/5 p-6 rounded-2xl mb-6 space-y-4">
          <div className="flex justify-between items-center py-2 border-b border-white/5">
            <span className="text-[9px] font-black text-slate-500 uppercase">Référence</span>
            <span className="text-[10px] font-mono text-emerald-400">{transaction?.reference?.slice(0, 18)}</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-[9px] font-black text-slate-500 uppercase">Frais</span>
            <span className="text-[10px] font-black text-red-400">+{fee.toFixed(2)} USD</span>
          </div>
        </Card>

        <div className="w-full space-y-3">
          <button onClick={() => router.push(`/deposit/details?ref=${ref}`)} className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[11px] text-slate-300 flex items-center justify-center gap-2">
            <ArrowUpRight size={16} /> Voir le reçu
          </button>
          <button onClick={() => router.push("/dashboard")} className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase text-[11px] text-white flex items-center justify-center gap-2">
            <Wallet size={16} /> Accéder au Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-36 font-sans">
      <div className="px-6 pt-10 pb-6">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.back()} className="p-3 rounded-xl bg-white/5 border border-white/10 text-slate-400"><ArrowLeft size={20} /></button>
          <div>
            <h1 className="text-xl font-black text-white uppercase">Récapitulatif</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full animate-pulse ${step === "processing" ? "bg-blue-500" : "bg-amber-500"}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${step === "processing" ? "text-blue-400" : "text-amber-500"}`}>
                {step === "processing" ? "Vérification..." : "Attente confirmation"}
              </span>
            </div>
          </div>
        </div>

        <Card className="bg-slate-900/60 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <p className="text-[10px] font-black text-blue-400 uppercase mb-2">Montant du dépôt</p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-white">${amount.toLocaleString()}</span>
            <span className="text-sm font-bold text-blue-400">USD</span>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-4">
        <Card className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-slate-500 uppercase">Référence</span>
              <span className="text-xs font-mono font-bold text-blue-400">{transaction?.reference?.slice(0, 18)}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <span className="text-[10px] font-black text-slate-500 uppercase">Méthode</span>
              <span className="text-[10px] font-bold text-white uppercase">{transaction?.method}</span>
            </div>
            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut</span>
              <span className="text-[10px] font-black px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full uppercase">
                {transaction?.status === "SUCCESS" ? "CONFIRMÉ" : "EN ATTENTE"}
              </span>
            </div>
        </Card>

        <Card className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 space-y-4">
          <div className="flex justify-between text-[10px] font-bold uppercase">
            <span className="text-slate-500">Montant net</span>
            <span className="text-white">${amount.toLocaleString()} USD</span>
          </div>
          <div className="flex justify-between text-[10px] font-bold uppercase">
            <span className="text-slate-500">Frais réseau</span>
            <span className="text-red-400">+{fee.toFixed(2)} USD</span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex justify-between text-[12px] font-black uppercase text-emerald-400">
            <span>Total débité</span>
            <span>${total.toLocaleString()} USD</span>
          </div>
        </Card>

        <div className="pt-2">
          <button
            onClick={handleFinalConfirm}
            disabled={isProcessing || step === "success"}
            className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest transition-all flex items-center justify-center ${
              isProcessing ? "bg-slate-800 text-slate-500" : "bg-blue-600 text-white shadow-xl shadow-blue-500/20"
            }`}
          >
            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : "Confirmer le dépôt"}
          </button>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

export default function DepositSummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <SummaryContent />
    </Suspense>
  );
}
