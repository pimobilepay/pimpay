"use client";

import { Suspense } from "react";
import {
  XCircle,
  RefreshCcw,
  AlertTriangle,
  Home,
  ChevronRight,
  Loader2,
  MessageCircle,
  Clock,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function FailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref");
  const reason = searchParams.get("reason");

  const errorReasons = [
    { label: "Solde insuffisant", desc: "Le solde de votre compte operateur est trop faible pour ce montant." },
    { label: "Code PIN incorrect", desc: "Le code PIN saisi ne correspond pas a celui enregistre chez votre operateur." },
    { label: "Delai d'attente expire", desc: "Vous n'avez pas confirme le paiement dans le delai imparti (2 minutes)." },
    { label: "Numero invalide", desc: "Le numero de telephone fourni n'est pas reconnu par l'operateur." },
  ];

  const getReasonText = () => {
    switch (reason) {
      case "timeout":
        return "Le delai de confirmation a expire. L'operateur n'a pas recu votre validation a temps.";
      case "rejected":
        return "L'operateur a rejete la demande de paiement.";
      case "insufficient":
        return "Le solde de votre compte mobile est insuffisant pour ce depot.";
      default:
        return "La demande de paiement a ete interrompue par l'operateur ou le systeme.";
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-between py-12 px-6 text-center font-sans overflow-hidden relative">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="w-full flex justify-between items-center max-w-md relative z-10">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-white/5 rounded-xl border border-white/10"
        >
          <ArrowLeft size={18} className="text-slate-400" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full">
          <AlertTriangle size={12} className="text-red-500" />
          <span className="text-[9px] font-black text-red-500 uppercase tracking-widest">
            Transaction echouee
          </span>
        </div>
        <div className="text-slate-600 text-[9px] font-mono">
          {ref?.slice(0, 12) || "N/A"}
        </div>
      </div>

      {/* Main */}
      <div className="flex flex-col items-center w-full animate-in fade-in slide-in-from-bottom-4 duration-700 relative z-10">
        {/* Icone erreur */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-red-500/20 rounded-[2.5rem] blur-2xl opacity-40" />
          <div className="relative w-28 h-28 bg-red-500/10 rounded-[2.5rem] flex items-center justify-center border border-red-500/20 shadow-2xl">
            <XCircle className="text-red-500" size={48} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-3 text-balance">
          Depot echoue
        </h1>
        <p className="text-slate-400 text-[11px] font-medium max-w-[280px] leading-relaxed mb-8">
          {getReasonText()}
        </p>

        {/* Raisons possibles */}
        <div className="w-full max-w-sm bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
              Raisons possibles
            </p>
          </div>
          <div className="divide-y divide-white/5">
            {errorReasons.map((r, i) => (
              <div key={i} className="px-4 py-3.5">
                <p className="text-[10px] font-black text-white uppercase mb-1">
                  {r.label}
                </p>
                <p className="text-[9px] text-slate-500 leading-relaxed">
                  {r.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Que faire */}
        <div className="w-full max-w-sm mt-4 space-y-3">
          <div className="flex items-start gap-3 p-4 bg-blue-600/5 rounded-xl border border-blue-600/10">
            <Clock size={16} className="text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium text-left">
              <span className="text-blue-400 font-black uppercase">
                Conseil :{" "}
              </span>
              Verifiez votre solde operateur et reessayez dans quelques
              instants. Si le probleme persiste, contactez le support PimPay.
            </p>
          </div>
        </div>
      </div>

      {/* Boutons */}
      <div className="w-full space-y-3 relative z-10 max-w-sm">
        <Link href="/deposit" className="block">
          <button className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-between px-6 shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <RefreshCcw size={18} />
              <span>Reessayer un depot</span>
            </div>
            <ChevronRight size={18} />
          </button>
        </Link>

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1 block">
            <button className="w-full h-14 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <Home size={16} />
              Accueil
            </button>
          </Link>

          <Link href="/support" className="flex-1 block">
            <button className="w-full h-14 bg-white/5 border border-white/10 text-slate-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 active:scale-[0.98] transition-transform">
              <MessageCircle size={16} />
              Support
            </button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-white/[0.02] rounded-xl">
          <ShieldCheck size={12} className="text-slate-600" />
          <p className="text-[8px] font-bold text-slate-600 uppercase tracking-[0.2em]">
            Aucun prelevement n'a ete effectue sur votre compte
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DepositFailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <FailedContent />
    </Suspense>
  );
}
