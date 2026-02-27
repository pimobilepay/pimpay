"use client";

import { Suspense, useRef, useState, useEffect, useCallback } from "react";
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
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

const PI_GCV_PRICE = 314159;

function DetailsContent() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref");

  const [isExporting, setIsExporting] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTx = useCallback(async () => {
    if (!ref) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/pi/transaction?ref=${encodeURIComponent(ref)}`);
      if (res.ok) {
        const data = await res.json();
        setTransaction(data);
      }
    } catch (err) {
      console.error("Erreur fetching tx:", err);
      toast.error("Impossible de charger les détails");
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={48} />
      <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-500/50 text-center">
        Sécurisation des données...
      </p>
    </div>
  );

  // --- LOGIQUE FINANCIÈRE PIMPAY ---
  const isPi = transaction?.currency === "PI" || !transaction?.currency;
  const amountPI = isPi ? (transaction?.amount || 0) : (transaction?.amount || 0) / PI_GCV_PRICE;
  const amountUSD = isPi ? (amountPI * PI_GCV_PRICE) : (transaction?.amount || 0);
  const feePI = transaction?.fee || (amountPI * 0.01); // 1% par défaut si non spécifié

  const isSuccess = transaction?.status === "SUCCESS";
  const isPending = transaction?.status === "PENDING";

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      toast.info("Génération du reçu officiel...");
      const { toPng } = await import("html-to-image");
      const { default: jsPDF } = await import("jspdf");

      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: "#020617",
        pixelRatio: 3, // Haute définition
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [receiptRef.current.clientWidth, receiptRef.current.clientHeight],
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, receiptRef.current.clientWidth, receiptRef.current.clientHeight);
      pdf.save(`PimPay_Receipt_${ref}.pdf`);
      toast.success("Reçu enregistré !");
    } catch (error) {
      toast.error("Erreur d'exportation");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-36 font-sans">
      <div className="px-6 pt-10">
        <button onClick={() => router.back()} className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
        </button>

        {/* SECTION REÇU EXPORTABLE */}
        <div ref={receiptRef} className="p-1">
          <Card className="bg-slate-900/60 border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
            {/* Header Statut */}
            <div className={`py-4 px-6 flex items-center justify-between ${isSuccess ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
              <div className="flex items-center gap-2">
                {isSuccess ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Clock size={16} className="text-amber-500" />}
                <span className={`text-[10px] font-black uppercase tracking-widest ${isSuccess ? "text-emerald-500" : "text-amber-500"}`}>
                  {transaction?.status || "PENDING"}
                </span>
              </div>
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">{transaction?.type || "DÉPÔT"}</span>
            </div>

            <div className="p-8 space-y-8 relative z-10">
              {/* Montant Principal */}
              <div className="flex flex-col items-center text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Valeur Transactionnelle</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{amountPI.toLocaleString('fr-FR', { maximumFractionDigits: 4 })}</span>
                  <span className="text-lg font-bold text-blue-500">PI</span>
                </div>
                <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <TrendingUp size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400">≈ ${amountUSD.toLocaleString()} USD (GCV)</span>
                </div>
              </div>

              {/* Grille de Détails */}
              <div className="space-y-5 border-t border-white/5 pt-8">
                <DetailRow icon={<Hash />} label="ID Transaction" value={ref?.slice(0, 18) + "..."} onCopy={() => {navigator.clipboard.writeText(ref || ""); toast.success("ID Copié");}} copyable />
                <DetailRow icon={<Calendar />} label="Date" value={transaction?.createdAt ? new Date(transaction.createdAt).toLocaleString("fr-FR") : "---"} />
                <DetailRow icon={<Smartphone />} label="Méthode" value={transaction?.description || "Pi Wallet"} />
                <DetailRow icon={<Banknote />} label="Frais Réseau" value={`${feePI.toFixed(4)} PI`} valueClassName="text-red-400" />

                {transaction?.blockchainTx && (
                  <DetailRow
                    icon={<ShieldCheck />}
                    label="Blockchain Hash"
                    value={transaction.blockchainTx.slice(0, 12) + "..."}
                    onCopy={() => {navigator.clipboard.writeText(transaction.blockchainTx); toast.success("Hash Copié");}}
                    copyable
                    valueClassName="text-blue-400 font-mono"
                  />
                )}
              </div>
            </div>

            {/* Footer Reçu */}
            <div className="bg-white/[0.02] py-4 text-center border-t border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">Authentifié par PimPay Network</p>
            </div>
          </Card>
        </div>

        {/* Boutons d'actions (Hors Reçu) */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex-1 h-16 bg-white text-[#020617] rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <><Download size={18} />Enregistrer le reçu</>}
          </button>

          <button
            onClick={() => {
                if(navigator.share) navigator.share({ title: 'Reçu PimPay', text: `Transaction de ${amountPI} PI réussie.` });
            }}
            className="w-16 h-16 bg-white/5 text-white rounded-2xl border border-white/10 flex items-center justify-center active:scale-90 transition-all"
          >
            <Share2 size={20} />
          </button>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

function DetailRow({ icon, label, value, onCopy, copyable, valueClassName }: any) {
  return (
    <div className="flex justify-between items-center group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white/5 rounded-xl text-blue-500 group-hover:bg-blue-500/10 transition-colors">
            {icon}
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-center gap-2" onClick={copyable ? onCopy : undefined}>
        <span className={`text-[11px] font-bold ${valueClassName || "text-white"} ${copyable ? "cursor-pointer" : ""}`}>
          {value}
        </span>
        {copyable && <Copy size={12} className="text-slate-600 hover:text-blue-400 transition-colors cursor-pointer" />}
      </div>
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
