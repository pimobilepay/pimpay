"use client";

import { Suspense, useState, useEffect } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

function SuccessContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");
  const amountParam = searchParams.get("amount");
  const methodParam = searchParams.get("method") || "Mobile Money";

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const fetchTx = async () => {
      try {
        const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
        if (res.ok) {
          const data = await res.json();
          setTransaction(data);
        }
      } catch {
        // Fallback data
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [ref]);

  const amount = transaction?.amount || (amountParam ? parseFloat(amountParam) : 50.0);
  const fee = transaction?.fee || amount * 0.02;
  const reference = transaction?.reference || ref || "PIMPAY-TX-000";
  const txDate = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleString("fr-FR")
    : new Date().toLocaleString("fr-FR");

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    toast.success("Reference copiee !");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Depot PimPay reussi",
          text: `Depot de $${amount.toFixed(2)} USD confirme sur PimPay. Ref: ${reference}`,
        });
      } catch {
        // Utilisateur a annule le partage
      }
    } else {
      copyRef();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-6 text-center font-sans overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Top section */}
      <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-700 relative z-10">
        {/* Badge */}
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-10">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">
            Transaction approuvee
          </span>
        </div>

        {/* Icone succes */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-[2.5rem] blur-2xl animate-pulse opacity-50" />
          <div className="relative w-28 h-28 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl">
            <CheckCircle2 className="text-emerald-500" size={48} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 text-balance">
          Depot confirme
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em] max-w-[240px] leading-relaxed">
          Votre solde PimPay a ete mis a jour avec succes
        </p>

        {/* Montant */}
        <div className="mt-8 mb-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-black text-white tracking-tighter">
              ${amount.toFixed(2)}
            </span>
            <span className="text-lg font-bold text-blue-500">USD</span>
          </div>
        </div>

        {/* Details card */}
        <div className="mt-6 w-full max-w-sm bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Reference */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Reference
                </span>
              </div>
              <button
                onClick={copyRef}
                className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold"
              >
                {reference.slice(0, 16)}
                <Copy size={10} className="text-slate-600" />
              </button>
            </div>

            {/* Date */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Date
                </span>
              </div>
              <span className="text-[10px] font-bold text-white">{txDate}</span>
            </div>

            {/* Methode */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Banknote size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Methode
                </span>
              </div>
              <span className="text-[10px] font-bold text-white uppercase">
                {methodParam}
              </span>
            </div>

            {/* Frais */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Frais
                </span>
              </div>
              <span className="text-[10px] font-bold text-red-400">
                +{fee.toFixed(2)} USD
              </span>
            </div>

            {/* Statut */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Statut
                </span>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <span className="text-[9px] font-black text-emerald-500 uppercase">
                  Confirme
                </span>
              </div>
            </div>
          </div>

          {/* Network badge */}
          <div className="bg-blue-600/5 py-2.5 text-center border-t border-white/5">
            <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.4em]">
              PimPay Mainnet - Protocole de securite v4.0
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full space-y-3 relative z-10 max-w-sm mt-8">
        <Link href={`/deposit/details?ref=${ref}`} className="block">
          <button className="w-full h-16 bg-white text-[#020617] rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-between px-6 shadow-xl shadow-white/5 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-xl">
                <Receipt size={18} className="text-blue-600" />
              </div>
              <span>Telecharger le recu</span>
            </div>
            <ArrowRight size={18} />
          </button>
        </Link>

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1 block">
            <button className="w-full h-14 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Wallet size={16} />
              Wallet
            </button>
          </Link>

          <button
            onClick={handleShare}
            className="h-14 px-6 bg-white/5 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center active:scale-[0.98] transition-transform"
          >
            <Share2 size={18} />
          </button>

          <Link href="/deposit" className="block">
            <button className="h-14 px-6 bg-white/5 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center active:scale-[0.98] transition-transform">
              <ArrowUpRight size={18} />
            </button>
          </Link>
        </div>

        <div className="flex flex-col items-center gap-1 mt-4">
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
            Protocole de securite PimPay v4.0
          </p>
          <div className="w-12 h-0.5 bg-blue-500/10 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export default function DepositSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
