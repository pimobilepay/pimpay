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
        const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
        if (res.ok) {
          const data = await res.json();
          setTransaction(data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    };

    fetchTx();
  }, [ref]);

  // Donnees affichees (reelles ou fallback)
  const tx = {
    reference: transaction?.reference || ref || "TX-PIMPAY-000",
    amount: transaction?.amount || 50.0,
    fee: transaction?.fee || (transaction?.amount ? transaction.amount * 0.02 : 1.0),
    status: transaction?.status || "SUCCESS",
    type: transaction?.type || "DEPOSIT",
    createdAt: transaction?.createdAt
      ? new Date(transaction.createdAt).toLocaleString("fr-FR")
      : new Date().toLocaleString("fr-FR"),
    method: transaction?.description || transaction?.method || "Mobile Money",
    phone: transaction?.metadata?.phone || "",
    blockchainTx: transaction?.blockchainTx || null,
    currency: transaction?.currency || "USD",
  };

  const isSuccess = tx.status === "SUCCESS" || tx.status === "COMPLETED";

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      setIsExporting(true);
      toast.info("Preparation du recu...");

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

      pdf.addImage(
        dataUrl,
        "PNG",
        0,
        0,
        receiptRef.current.clientWidth,
        receiptRef.current.clientHeight
      );
      pdf.save(`PimPay_Recu_${tx.reference}.pdf`);

      toast.success("Recu telecharge !");
    } catch (error) {
      console.error("Erreur PDF:", error);
      toast.error("Echec de la generation du PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copie !");
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recu PimPay - ${tx.reference}`,
          text: `Transaction ${tx.type} de $${tx.amount.toFixed(2)} ${tx.currency}. Ref: ${tx.reference}. Statut: ${tx.status}.`,
        });
      } catch {
        // Annule
      }
    } else {
      copyToClipboard(tx.reference);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50">
          Chargement du recu...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-36 font-sans">
      <div className="px-6 pt-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft
            size={20}
            className="group-hover:-translate-x-1 transition-transform"
          />
          <span className="text-[10px] font-black uppercase tracking-widest">
            Retour
          </span>
        </Link>

        {/* Zone du recu (capturee pour PDF) */}
        <div ref={receiptRef} className="p-1">
          <Card className="bg-slate-900/60 border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
            {/* Header statut */}
            <div
              className={`py-3 px-6 flex items-center justify-between ${
                isSuccess ? "bg-emerald-500/5" : "bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-2">
                {isSuccess ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <XCircle size={16} className="text-red-500" />
                )}
                <span
                  className={`text-[9px] font-black uppercase tracking-widest ${
                    isSuccess ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {isSuccess ? "Confirme" : tx.status}
                </span>
              </div>
              <span className="text-[8px] font-mono text-slate-600">
                {tx.type}
              </span>
            </div>

            <div className="p-6 space-y-6 relative z-10">
              {/* Montant */}
              <div className="flex flex-col items-center text-center py-4">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">
                  Montant credite
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">
                    ${tx.amount.toFixed(2)}
                  </span>
                  <span className="text-sm font-bold text-blue-500">
                    {tx.currency}
                  </span>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <DetailRow
                  icon={<Hash size={14} className="text-blue-500" />}
                  label="Reference"
                  value={tx.reference}
                  onCopy={() => copyToClipboard(tx.reference)}
                  copyable
                />
                <DetailRow
                  icon={<Calendar size={14} className="text-blue-500" />}
                  label="Date et heure"
                  value={tx.createdAt}
                />
                <DetailRow
                  icon={<Smartphone size={14} className="text-blue-500" />}
                  label="Methode"
                  value={tx.method}
                />
                {tx.phone && (
                  <DetailRow
                    icon={<Smartphone size={14} className="text-blue-500" />}
                    label="Telephone"
                    value={tx.phone}
                  />
                )}
                <DetailRow
                  icon={<Banknote size={14} className="text-blue-500" />}
                  label="Frais"
                  value={`+${tx.fee.toFixed(2)} ${tx.currency}`}
                  valueClassName="text-red-400"
                />
                {tx.blockchainTx && (
                  <DetailRow
                    icon={<ShieldCheck size={14} className="text-blue-500" />}
                    label="TX Blockchain"
                    value={tx.blockchainTx.slice(0, 20) + "..."}
                    onCopy={() => copyToClipboard(tx.blockchainTx)}
                    copyable
                  />
                )}
                <DetailRow
                  icon={<Clock size={14} className="text-blue-500" />}
                  label="Reseau"
                  value="PimPay Mainnet"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-blue-600/5 py-3 text-center border-t border-white/5">
              <p className="text-[8px] font-black text-blue-400/50 uppercase tracking-[0.4em]">
                Recu officiel PimPay
              </p>
            </div>
          </Card>
        </div>

        {/* Boutons d'action */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Preparation...
              </>
            ) : (
              <>
                <Download size={16} />
                Telecharger PDF
              </>
            )}
          </button>

          <button
            onClick={handleShare}
            className="w-14 h-14 bg-white/5 text-white rounded-2xl border border-white/10 flex items-center justify-center active:scale-95 transition-transform"
          >
            <Share2 size={18} />
          </button>
        </div>

        <p className="mt-6 text-center text-slate-600 text-[9px] font-medium uppercase tracking-widest px-8">
          Ce recu est une preuve officielle de votre transaction sur le reseau PimPay.
        </p>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
  onCopy,
  copyable,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onCopy?: () => void;
  copyable?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`flex justify-between items-center ${copyable ? "cursor-pointer" : ""}`}
      onClick={copyable ? onCopy : undefined}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {label}
        </span>
      </div>
      <span
        className={`text-xs font-bold flex items-center gap-1.5 ${valueClassName || "text-white"}`}
      >
        {value}
        {copyable && <Copy size={10} className="text-slate-600" />}
      </span>
    </div>
  );
}

export default function TransactionDetailsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <DetailsContent />
    </Suspense>
  );
}
