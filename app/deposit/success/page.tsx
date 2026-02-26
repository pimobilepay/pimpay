"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  ArrowRight,
  Receipt,
  Wallet,
  Loader2,
  Copy,
  Clock,
  ShieldCheck,
  Share2,
  ArrowUpRight,
  Banknote,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref = searchParams.get("ref");
  const txid = searchParams.get("txid");
  const amountParam = searchParams.get("amount");
  const methodParam = searchParams.get("method") || "Dépôt PimPay";

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTx = useCallback(async () => {
    if (!ref && !txid) {
      setLoading(false);
      return;
    }
    try {
      const params = new URLSearchParams();
      if (txid) params.set("txid", txid);
      if (ref) params.set("ref", ref);

      const res = await fetch(`/api/pi/transaction?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransaction(data);
        
        // SECURITÉ : Si par accident l'utilisateur arrive ici mais que c'est PENDING, 
        // on le renvoie au summary pour éviter l'incohérence
        if (data.status === "PENDING") {
           router.replace(`/deposit/summary?ref=${ref || txid}`);
        }
      }
    } catch (error) {
      console.error("Erreur fetch transaction:", error);
    } finally {
      setLoading(false);
    }
  }, [ref, txid, router]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  // Constantes GCV PimPay
  const PI_GCV_PRICE = 314159;
  const rawAmount = transaction?.amount ?? (amountParam ? parseFloat(amountParam) : 0.0);
  const currency = transaction?.currency || "PI";
  const displayAmount = currency === "PI" ? rawAmount : rawAmount / PI_GCV_PRICE;
  const usdEquivalent = displayAmount * PI_GCV_PRICE;
  const reference = transaction?.reference || ref || "PIMPAY-TX-PENDING";

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    toast.success("Référence copiée !");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="animate-spin text-blue-500" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-6 text-center font-sans overflow-hidden relative">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Succès */}
      <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className="w-24 h-24 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl mb-8">
          <CheckCircle2 className="text-emerald-500" size={48} strokeWidth={2.5} />
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">Dépôt Confirmé</h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em]">
          Votre solde PimPay a été crédité
        </p>

        <div className="mt-8">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">
              {displayAmount.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}
            </span>
            <span className="text-xl font-bold text-blue-500">PI</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-bold">
            ≈ ${usdEquivalent.toLocaleString("fr-FR")} USD (GCV)
          </p>
        </div>
      </div>

      {/* Bloc Actions - Nouveaux boutons ajoutés */}
      <div className="w-full space-y-3 relative z-10 max-w-sm mt-8">
        
        {/* BOUTON 1 : Télécharger Reçu (Action Principale) */}
        <Link href={`/deposit/receipt?ref=${reference}`} className="block">
          <button className="w-full h-16 bg-white text-[#020617] rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-between px-6 shadow-xl active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-xl"><Receipt size={18} className="text-blue-600" /></div>
              <span>Télécharger le reçu</span>
            </div>
            <ArrowRight size={18} />
          </button>
        </Link>

        {/* BOUTON 2 : Détails de la transaction (Nouveau) */}
        <Link href={`/deposit/details?ref=${reference}`} className="block">
          <button className="w-full h-14 bg-white/5 border border-white/10 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 hover:bg-white/10 transition-colors">
            <Info size={16} className="text-blue-400" />
            Détails de la transaction
          </button>
        </Link>

        {/* BOUTON 3 : Retour Wallet & Partage */}
        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1">
            <button className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20">
              <Wallet size={16} />
              Mon Wallet
            </button>
          </Link>
          <button 
            onClick={() => {
                if(navigator.share) navigator.share({ title: 'Dépôt PimPay', text: `J'ai déposé ${displayAmount} PI sur PimPay !` });
                else copyRef();
            }}
            className="h-14 px-6 bg-white/5 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center active:bg-white/10"
          >
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DepositSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
