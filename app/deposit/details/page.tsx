"use client";

import { Suspense, useRef, useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  Copy,
  Calendar,
  Hash,
  ShieldCheck,
  Smartphone,
  Loader2,
  Banknote,
  Clock,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

// Prix GCV de ton schéma Prisma
const PI_GCV_PRICE = 314159;

function DetailsContent() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref");

  const [isExporting, setIsExporting] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const fetchTx = async () => {
      try {
        // CORRECTION DU CHEMIN : Pointage vers app/api/pi/transaction
        const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
        if (res.ok) {
          const data = await res.json();
          setTransaction(data);
        }
      } catch (err) {
        console.error("Erreur fetching tx:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [ref]);

  // --- LOGIQUE DE CALCUL (Synchronisée Prisma) ---
  const isPi = transaction?.currency === "PI";
  const rawAmount = transaction?.amount || 0;

  // Conversion GCV si c'est du Pi, sinon montant brut
  const displayAmount = isPi ? rawAmount * PI_GCV_PRICE : rawAmount;

  const tx = {
    reference: transaction?.reference || ref || "CHARGEMENT...",
    amount: displayAmount,
    fee: transaction?.fee || (displayAmount * 0.02),
    status: transaction?.status?.toUpperCase() || "PENDING",
    type: transaction?.type || "DEPOSIT",
    createdAt: transaction?.createdAt
      ? new Date(transaction.createdAt).toLocaleString("fr-FR")
      : new Date().toLocaleString("fr-FR"),
    method: transaction?.method || transaction?.description || "PimPay System",
    phone: transaction?.metadata?.phone || "",
    blockchainTx: transaction?.blockchainTx || null,
    currency: "USD",
  };

  // Correction : On ne vérifie que SUCCESS selon ton enum Prisma
  const isSuccess = tx.status === "SUCCESS";

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      toast.info("Préparation du reçu...");
      const { toPng } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");

      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: "#020617",
        pixelRatio: 2,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [receiptRef.current.clientWidth, receiptRef.current.clientHeight],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, receiptRef.current.clientWidth, receiptRef.current.clientHeight);
      pdf.save(`PimPay_Recu_${tx.reference}.pdf`);
      toast.success("Reçu téléchargé !");
    } catch (error) {
      toast.error("Échec de la génération du PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reçu PimPay - ${tx.reference}`,
          text: `Transaction ${tx.type} de $${tx.amount.toFixed(2)}. Réf: ${tx.reference}.`,
        });
      } catch {}
    } else {
      copyToClipboard(tx.reference);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">
          Vérification PimPay...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-36 font-sans">
      <div className="px-6 pt-10">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
        </Link>

        <div ref={receiptRef} className="p-1">
          <Card className="bg-slate-900/60 border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            <div className={`py-3 px-6 flex items-center justify-between ${isSuccess ? "bg-emerald-500/5" : "bg-amber-500/5"}`}>
              <div className="flex items-center gap-2">
                {isSuccess ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Clock size={16} className="text-amber-500" />}
                <span className={`text-[9px] font-black uppercase tracking-widest ${isSuccess ? "text-emerald-500" : "text-amber-500"}`}>
                  {isSuccess ? "SUCCESS" : tx.status}
                </span>
              </div>
              <span className="text-[8px] font-mono text-slate-600">{tx.type}</span>
            </div>

            <div className="p-6 space-y-6 relative z-10">
              <div className="flex flex-col items-center text-center py-4">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Montant crédité</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">${tx.amount.toFixed(2)}</span>
                  <span className="text-sm font-bold text-blue-500">{tx.currency}</span>
                </div>
              </div>

              <div className="space-y-4">
                <DetailRow icon={<Hash size={14} className="text-blue-500" />} label="Référence" value={tx.reference} onCopy={() => copyToClipboard(tx.reference)} copyable />
                <DetailRow icon={<Calendar size={14} className="text-blue-500" />} label="Date et heure" value={tx.createdAt} />
                <DetailRow icon={<Smartphone size={14} className="text-blue-500" />} label="Méthode" value={tx.method} />
                {tx.phone && <DetailRow icon={<Smartphone size={14} className="text-blue-500" />} label="Téléphone" value={tx.phone} />}
                <DetailRow icon={<Banknote size={14} className="text-blue-500" />} label="Frais" value={`+${tx.fee.toFixed(2)} ${tx.currency}`} valueClassName="text-red-400" />
                {tx.blockchainTx && (
                  <DetailRow icon={<ShieldCheck size={14} className="text-blue-500" />} label="TX Blockchain" value={tx.blockchainTx.slice(0, 20) + "..."} onCopy={() => copyToClipboard(tx.blockchainTx)} copyable />
                )}
                <DetailRow icon={<Clock size={14} className="text-blue-500" />} label="Réseau" value="PimPay Mainnet" />
              </div>
            </div>

            <div className="bg-blue-600/5 py-3 text-center border-t border-white/5">
              <p className="text-[8px] font-black text-blue-400/50 uppercase tracking-[0.4em]">Reçu officiel PimPay</p>
            </div>
          </Card>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={handleDownloadPDF} disabled={isExporting} className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform disabled:opacity-50">
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <><Download size={16} />Télécharger PDF</>}
          </button>
          <button onClick={handleShare} className="w-14 h-14 bg-white/5 text-white rounded-2xl border border-white/10 flex items-center justify-center active:scale-95 transition-transform">
            <Share2 size={18} />
          </button>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

function DetailRow({ icon, label, value, onCopy, copyable, valueClassName }: any) {
  return (
    <div className={`flex justify-between items-center ${copyable ? "cursor-pointer" : ""}`} onClick={copyable ? onCopy : undefined}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-xs font-bold flex items-center gap-1.5 ${valueClassName || "text-white"}`}>
        {value}
        {copyable && <Copy size={10} className="text-slate-600" />}
      </span>
    </div>
  );
}

export default function TransactionDetailsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <DetailsContent />
    </Suspense>
  );
}
