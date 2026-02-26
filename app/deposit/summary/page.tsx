"use client";
import { useState, useEffect, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, Wallet, XCircle, AlertTriangle, PiIcon } from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref = searchParams.get("ref");
  const method = searchParams.get("method") || "mobile";
  const amountParam = searchParams.get("amount");

  const [mounted, setMounted] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const goToSuccess = useCallback((reference: string) => {
    router.push(`/deposit/success?ref=${reference}`);
  }, [router]);

  const fetchTransactionDetails = useCallback(async () => {
    if (!ref || !mounted) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === "SUCCESS") {
          goToSuccess(ref);
          return;
        }
        setTransaction(data);
      }
    } catch (e) {
      console.error("Fetch Error", e);
    } finally {
      setLoading(false);
    }
  }, [ref, mounted, goToSuccess]);

  useEffect(() => { fetchTransactionDetails(); }, [fetchTransactionDetails]);

  // Polling pour les dépôts Mobile Money (validation externe)
  useEffect(() => {
    if (!ref || isProcessing || method === "crypto") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "SUCCESS") goToSuccess(ref);
        }
      } catch (e) { console.error("Polling error", e); }
    }, 4000);
    return () => clearInterval(interval);
  }, [ref, isProcessing, method, goToSuccess]);

  // LOGIQUE PI NETWORK SDK
  const handlePiPayment = async () => {
    if (!window.Pi) {
      toast.error("Veuillez ouvrir PimPay dans le Pi Browser");
      return;
    }
    setIsProcessing(true);
    try {
      const payment = await window.Pi.createPayment({
        amount: parseFloat(amountParam || "0"),
        memo: `Dépôt PimPay - Ref: ${ref}`,
        metadata: { reference: ref, type: "DEPOSIT" },
      }, {
        onReadyForServerApproval: async (paymentId) => {
          await fetch("/api/pi/approve", {
            method: "POST",
            body: JSON.stringify({ paymentId, reference: ref }),
            headers: { "Content-Type": "application/json" },
          });
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          const res = await fetch("/api/deposit/confirm", {
            method: "POST",
            body: JSON.stringify({ paymentId, txid, reference: ref }),
            headers: { "Content-Type": "application/json" },
          });
          if (res.ok) goToSuccess(ref);
        },
        onCancel: () => setIsProcessing(false),
        onError: (error) => {
          console.error(error);
          setIsProcessing(false);
          toast.error("Le paiement Pi a échoué");
        },
      });
    } catch (error) {
      setIsProcessing(false);
      toast.error("Erreur d'initialisation du paiement");
    }
  };

  // LOGIQUE MOBILE MONEY (Validation Manuelle)
  const handleManualConfirm = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        body: JSON.stringify({ reference: ref }),
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === "SUCCESS") goToSuccess(ref);
        else toast.info("Nous attendons toujours la confirmation de l'opérateur.");
      }
    } catch {
      toast.error("Erreur de connexion");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!mounted || loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">Préparation du reçu...</p>
    </div>
  );

  const amount = transaction?.amount || parseFloat(amountParam || "0");
  const currency = transaction?.currency || "USD";

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-36 font-sans">
      <div className="px-6 pt-10 pb-6 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 rounded-xl bg-white/5 border border-white/10 active:scale-95">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tight">Récapitulatif</h1>
      </div>

      <div className="px-6 space-y-6">
        <Card className="bg-slate-900/60 border border-white/10 rounded-3xl p-8 text-center relative overflow-hidden">
          <p className="text-[10px] font-black text-blue-400 uppercase mb-3 tracking-widest">Montant à transférer</p>
          <div className="text-5xl font-black">
            {amount.toLocaleString()}
            <span className="text-lg text-blue-500 ml-1 uppercase">{currency}</span>
          </div>
          {method === "crypto" && (
            <div className="mt-4 p-2 bg-blue-500/10 rounded-xl inline-flex items-center gap-2">
              <span className="text-[10px] font-bold text-blue-400">VIA PI NETWORK BRIDGE</span>
            </div>
          )}
        </Card>

        <Card className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Référence</span>
            <span className="text-blue-400 font-mono">{ref?.slice(0, 15)}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Frais PimPay</span>
            <span className="text-white">{transaction?.fee || (amount * 0.02).toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/5 text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Statut Actuel</span>
            <span className="flex items-center gap-2 text-amber-500">
              <Loader2 size={12} className="animate-spin" />
              PENDING
            </span>
          </div>
        </Card>

        <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-3">
          <AlertTriangle className="text-blue-500 shrink-0" size={20} />
          <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
            {method === "crypto" 
              ? "Cliquez sur le bouton ci-dessous pour ouvrir votre Pi Wallet et signer la transaction GCV."
              : "Une fois le transfert effectué sur votre téléphone, cliquez sur le bouton pour synchroniser."}
          </p>
        </div>

        <button
          onClick={method === "crypto" ? handlePiPayment : handleManualConfirm}
          disabled={isProcessing}
          className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all active:scale-[0.98] flex items-center justify-center ${
            isProcessing ? "bg-slate-800 text-slate-500" : "bg-blue-600 text-white shadow-blue-600/20"
          }`}
        >
          {isProcessing ? <Loader2 className="animate-spin" /> : (method === "crypto" ? "PAYER AVEC PI" : "J'AI ENVOYÉ LES FONDS")}
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
