"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, Wallet, XCircle, AlertTriangle } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const ref = searchParams.get("ref") || searchParams.get("piPaymentId");
  const method = searchParams.get("method") || "Pi Network";
  const amountParam = searchParams.get("amount");

  const [mounted, setMounted] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"summary" | "processing" | "success" | "failed">("summary");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const fetchTransactionDetails = useCallback(async () => {
    if (!ref || !mounted) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (response.ok) {
        const data = await response.json();
        setTransaction(data);
        if (data.status === "SUCCESS") setStep("success");
        if (data.status === "FAILED") setStep("failed");
      } else {
        setTransaction({
          reference: ref,
          amount: amountParam ? parseFloat(amountParam) : 0,
          currency: method.includes("Pi") ? "PI" : "USD", // Déduction intelligente
          status: "PENDING",
          method: method
        });
      }
    } catch {
      toast.error("Erreur de synchronisation PimPay");
    } finally {
      setLoading(false);
    }
  }, [ref, mounted, amountParam, method]);

  useEffect(() => { fetchTransactionDetails(); }, [fetchTransactionDetails]);

  const checkStatus = useCallback(async () => {
    if (!ref || step === "success" || step === "failed" || isProcessing) return;
    try {
      const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS") {
          setTransaction(data);
          setStep("success");
          toast.success("Paiement validé !");
        } else if (data.status === "FAILED") {
          setStep("failed");
        }
      }
    } catch (e) { console.error("Polling error", e); }
  }, [ref, step, isProcessing]);

  useEffect(() => {
    const interval = setInterval(checkStatus, 4000);
    return () => clearInterval(interval);
  }, [checkStatus]);

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
      const data = await res.json();
      if (res.ok && data.status === "SUCCESS") {
        // Redirection vers la page Success dédiée pour le reçu
        router.push(`/deposit/success?ref=${ref}`);
      } else {
        await fetchTransactionDetails();
        toast.info("Validation encore en cours sur la blockchain...");
        setStep("summary");
      }
    } catch {
      setStep("summary");
      toast.error("Erreur lors de la confirmation");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">Vérification PimPay...</p>
    </div>
  );

  const amount = transaction?.amount || parseFloat(amountParam || "0");
  const currency = transaction?.currency || "USD";
  const fee = transaction?.fee || amount * 0.02;

  // UI SUCCESS INTEGRÉE (En cas de validation par polling)
  if (step === "success") return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] border border-emerald-500/20 flex items-center justify-center mb-8 relative">
        <CheckCircle2 size={48} className="text-emerald-500" />
        <div className="absolute -bottom-2 bg-emerald-500 text-[8px] font-black px-3 py-0.5 rounded-full text-white uppercase shadow-lg">CONFIRMÉ</div>
      </div>
      <h1 className="text-3xl font-black text-white uppercase mb-2">Dépôt Réussi</h1>
      <p className="text-slate-400 text-center text-sm mb-10 leading-relaxed">
        Votre compte a été crédité de <br/>
        <span className="text-white font-black text-xl">{amount.toLocaleString()} {currency}</span>
      </p>
      <button onClick={() => router.push("/dashboard")} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase text-[12px] text-white shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3">
        <Wallet size={18} /> Retour au Dashboard
      </button>
    </div>
  );

  if (step === "failed") return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
        <XCircle size={48} className="text-red-500" />
      </div>
      <h1 className="text-2xl font-black text-white uppercase mb-2">Échec du dépôt</h1>
      <p className="text-slate-400 text-center text-sm mb-10 leading-relaxed px-6">La transaction a été rejetée ou annulée par le réseau.</p>
      <button onClick={() => router.back()} className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[11px] text-white">Réessayer</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-36 font-sans">
      <div className="px-6 pt-10 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-transform"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-black uppercase tracking-tight">Récapitulatif</h1>
      </div>

      <div className="px-6 space-y-6">
        <Card className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden">
          {step === "processing" && <div className="absolute inset-0 bg-blue-600/10 animate-pulse" />}
          <p className="text-[10px] font-black text-blue-400 uppercase mb-3 tracking-widest">Montant net à recevoir</p>
          <div className="text-5xl font-black">
            {amount.toLocaleString()}
            <span className="text-lg text-blue-500 ml-1 uppercase">{currency}</span>
          </div>
        </Card>

        <Card className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Méthode</span>
            <span className="text-white">{method}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Frais PimPay (2%)</span>
            <span className="text-red-400">+ {fee.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Statut actuel</span>
            <span className="flex items-center gap-2 text-amber-500">
              <Loader2 size={12} className="animate-spin" /> {step === "processing" ? "Vérification..." : "En attente"}
            </span>
          </div>
        </Card>

        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
          <AlertTriangle className="text-blue-400 shrink-0" size={20} />
          <p className="text-[9px] font-bold text-blue-200/70 leading-relaxed uppercase">
            Veuillez confirmer uniquement après avoir validé le transfert dans votre Pi Wallet. Toute fausse déclaration peut suspendre votre compte.
          </p>
        </div>

        <button
          onClick={handleFinalConfirm}
          disabled={isProcessing}
          className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center ${
            isProcessing ? "bg-slate-800 text-slate-500" : "bg-blue-600 text-white shadow-blue-600/20"
          }`}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : "Confirmer la réception"}
        </button>
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
