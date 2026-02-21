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
  
  // Extraction securisee des parametres
  const ref = searchParams.get("ref");
  const txid = searchParams.get("txid");
  const amountParam = searchParams.get("amount");
  const methodParam = searchParams.get("method") || "Depot Mobile";

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref && !txid) {
      setLoading(false);
      return;
    }

    const fetchTx = async () => {
      try {
        // Construire l'URL avec les parametres disponibles
        const params = new URLSearchParams();
        if (txid) params.set("txid", txid);
        if (ref) params.set("ref", ref);

        const res = await fetch(`/api/pi/transaction?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setTransaction(data);
        }
      } catch (error) {
        console.error("Erreur fetch transaction:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [ref, txid]);

  // Montant reel depuis la transaction DB, puis fallback sur le param URL
  const rawAmount = transaction?.amount ?? (amountParam ? parseFloat(amountParam) : 0.0);
  const currency = transaction?.currency || "PI";
  
  // Frais reels depuis la DB, sinon calcul 2%
  const fee = transaction?.fee ?? rawAmount * 0.02;
  
  const reference = transaction?.reference || ref || "PIMPAY-TX-PENDING";
  const method = transaction?.description || methodParam;
  const status = transaction?.status || "SUCCESS";
  const blockchainTx = transaction?.blockchainTx || txid || null;

  // GCV rate: 1 PI = $314,159 USD
  const PI_GCV_PRICE = 314159;

  // Calcul de la valeur nette en PI
  // Si la devise est PI, le montant est deja en PI
  // Sinon (USD, XAF), on convertit en PI via le GCV
  const piNetAmount = currency === "PI" 
    ? rawAmount 
    : rawAmount / PI_GCV_PRICE;
  
  // Montant affiche: toujours en PI (valeur nette deposee)
  const displayAmount = piNetAmount;
  const displayCurrency = "PI";

  // Equivalent USD via GCV
  const usdEquivalent = displayAmount * PI_GCV_PRICE;

  // Formatage intelligent des montants
  const formatAmount = (val: number, cur: string) => {
    if (cur === "PI") {
      // Pour PI: pas de decimales inutiles, max 4 decimales
      if (val === Math.floor(val)) return val.toLocaleString("fr-FR");
      return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatFee = (val: number, cur: string) => {
    if (cur === "PI") {
      if (val < 0.01) return val.toFixed(6);
      return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    }
    return val.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatUSD = (val: number) => {
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
    return val.toFixed(2);
  };

  // Statut affichage avec classes explicites (Tailwind ne supporte pas les classes dynamiques)
  const statusConfig: Record<string, { label: string; badge: string; text: string; bg: string; border: string; dot: string; icon: string }> = {
    SUCCESS: {
      label: "Complete",
      badge: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      dot: "bg-emerald-500",
      icon: "text-emerald-500",
    },
    COMPLETED: {
      label: "Complete",
      badge: "bg-emerald-500/10 border-emerald-500/20",
      text: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      dot: "bg-emerald-500",
      icon: "text-emerald-500",
    },
    PENDING: {
      label: "En attente",
      badge: "bg-amber-500/10 border-amber-500/20",
      text: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      dot: "bg-amber-500",
      icon: "text-amber-500",
    },
    FAILED: {
      label: "Echoue",
      badge: "bg-red-500/10 border-red-500/20",
      text: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      dot: "bg-red-500",
      icon: "text-red-500",
    },
  };
  const currentStatus = statusConfig[status] || statusConfig.SUCCESS;
  
  const txDate = transaction?.createdAt
    ? new Date(transaction.createdAt).toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : new Date().toLocaleString("fr-FR", {
        dateStyle: "medium",
        timeStyle: "short",
      });

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    toast.success("Référence copiée !");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Dépôt PimPay réussi",
          text: `Depot de ${formatAmount(displayAmount, "PI")} PI confirme sur PimPay. Ref: ${reference}`,
        });
      } catch {
        // Annulé
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
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top section */}
      <div className="flex flex-col items-center w-full animate-in fade-in zoom-in-95 duration-700 relative z-10">
        <div className={`flex items-center gap-2 px-4 py-2 ${currentStatus.badge} border rounded-full mb-10`}>
          <div className={`w-2 h-2 ${currentStatus.dot} rounded-full animate-pulse`} />
          <span className={`text-[9px] font-black ${currentStatus.text} uppercase tracking-widest`}>
            {status === "PENDING" ? "Transaction en attente" : "Transaction approuvee"}
          </span>
        </div>

        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-[2.5rem] blur-2xl animate-pulse opacity-50" />
          <div className="relative w-28 h-28 bg-emerald-500/10 rounded-[2.5rem] flex items-center justify-center border border-emerald-500/20 shadow-2xl">
            <CheckCircle2 className="text-emerald-500" size={48} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-3xl font-black text-white uppercase tracking-tighter mb-2 text-balance">
          {status === "PENDING" ? "Depot en attente" : "Depot confirme"}
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.25em] max-w-[240px] leading-relaxed">
          {status === "PENDING"
            ? "Votre depot est en cours de validation par l'equipe"
            : "Votre solde PimPay a ete mis a jour avec succes"}
        </p>

        {/* Montant Net en PI */}
        <div className="mt-8 mb-2">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-4xl font-black text-white tracking-tighter">
              {formatAmount(displayAmount, displayCurrency)}
            </span>
            <span className="text-lg font-bold text-blue-500">{displayCurrency}</span>
          </div>
          {displayAmount > 0 && (
            <p className="text-xs text-slate-500 mt-1 font-bold">
              {`~ $${formatUSD(usdEquivalent)} USD (GCV)`}
            </p>
          )}
          {currency !== "PI" && rawAmount > 0 && (
            <p className="text-[10px] text-slate-600 mt-1 font-medium">
              {`Depot initial: $${rawAmount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`}
            </p>
          )}
        </div>

        {/* Détails de la transaction liés au Schéma Prisma */}
        <div className="mt-6 w-full max-w-sm bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 space-y-4">
            {/* Référence (reference dans ton Prisma) */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Référence
                </span>
              </div>
              <button
                onClick={copyRef}
                className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 font-bold"
              >
                {reference.slice(0, 16)}...
                <Copy size={10} className="text-slate-600" />
              </button>
            </div>

            {/* Date (createdAt dans ton Prisma) */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Date
                </span>
              </div>
              <span className="text-[10px] font-bold text-white">{txDate}</span>
            </div>

            {/* Méthode */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Banknote size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Méthode
                </span>
              </div>
              <span className="text-[10px] font-bold text-white uppercase">
                {method}
              </span>
            </div>

            {/* Frais (fee dans ton Prisma) */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <Receipt size={14} className="text-blue-500" />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Frais
                </span>
              </div>
              <span className="text-[10px] font-bold text-blue-400">
                {formatFee(fee, "PI")} PI
              </span>
            </div>

            {/* Statut (status dans Prisma) */}
            <div className="flex justify-between items-center border-t border-white/5 pt-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={currentStatus.icon} />
                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                  Statut
                </span>
              </div>
              <div className={`px-3 py-1 ${currentStatus.bg} border ${currentStatus.border} rounded-full`}>
                <span className={`text-[9px] font-black ${currentStatus.text} uppercase`}>
                  {currentStatus.label}
                </span>
              </div>
            </div>

            {/* Blockchain TX (si disponible) - LIEN VERIFICATION */}
            {blockchainTx && (
              <div className="flex justify-between items-center border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <ArrowUpRight size={14} className="text-blue-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                    TX Blockchain
                  </span>
                </div>
                <a
                  href={`https://minepi.com/blockexplorer/tx/${blockchainTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[10px] font-mono text-blue-400 font-bold hover:text-blue-300 transition-colors"
                >
                  {blockchainTx.slice(0, 10)}...
                  <ArrowUpRight size={10} />
                </a>
              </div>
            )}
          </div>

          {/* Bouton verification blockchain */}
          {blockchainTx && (
            <a
              href={`https://minepi.com/blockexplorer/tx/${blockchainTx}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3 bg-blue-600/10 text-blue-400 border-t border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600/20 transition-colors"
            >
              <ShieldCheck size={14} />
              Verifier sur Pi Blockchain
              <ArrowUpRight size={12} />
            </a>
          )}

          {!blockchainTx && (
            <div className="bg-blue-600/5 py-2.5 text-center border-t border-white/5">
              <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.4em]">
                PimPay Network - Securise par Blockchain
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Boutons d'action */}
      <div className="w-full space-y-3 relative z-10 max-w-sm mt-8">
        <Link href={`/deposit/receipt?ref=${reference}`} className="block">
          <button className="w-full h-16 bg-white text-[#020617] rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-between px-6 shadow-xl shadow-white/5 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600/10 rounded-xl">
                <Receipt size={18} className="text-blue-600" />
              </div>
              <span>Télécharger le reçu</span>
            </div>
            <ArrowRight size={18} />
          </button>
        </Link>

        <div className="flex gap-3">
          <Link href="/dashboard" className="flex-1 block">
            <button className="w-full h-14 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
              <Wallet size={16} />
              Wallet
            </button>
          </Link>

          <button
            onClick={handleShare}
            className="h-14 px-6 bg-white/5 border border-white/10 text-slate-400 rounded-2xl flex items-center justify-center"
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
