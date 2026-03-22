"use client";

import { Suspense, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  Download,
  Share2,
  Clock,
  Copy,
  Calendar,
  Hash,
  ShieldCheck,
  Loader2,
  Banknote,
  Smartphone,
  Building2,
  Globe,
  Activity,
  CheckCircle2,
  ArrowDownLeft,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

function ReceiptContent() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref           = searchParams.get("ref") || "—";
  const amount        = searchParams.get("amount") || "0";
  const currency      = searchParams.get("currency") || "PI";
  const fiatAmount    = searchParams.get("fiatAmount") || "";
  const fiatCurrency  = searchParams.get("fiatCurrency") || "";
  const method        = searchParams.get("method") || "";
  const country       = searchParams.get("country") || "";
  const provider      = searchParams.get("provider") || "";
  const phone         = searchParams.get("phone") || "";
  const bankName      = searchParams.get("bankName") || "";
  const accountName   = searchParams.get("accountName") || "";
  const accountNumber = searchParams.get("accountNumber") || "";

  const [isExporting, setIsExporting] = useState(false);

  const isMobile = method === "mobile";

  const formatAmount = () => {
    const n = parseFloat(amount);
    if (isNaN(n)) return amount;
    if (currency === "PI") {
      // Affichage intelligent: plus de décimales pour petits montants
      if (n < 0.0001) {
        return n.toFixed(10).replace(/0+$/, '').replace(/\.$/, '');
      }
      return n.toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    }
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(n);
  };

  const formatFiat = () => {
    const n = parseFloat(fiatAmount);
    if (isNaN(n) || !fiatAmount) return null;
    return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
  };

  const displayDate = new Date().toLocaleString("fr-FR");

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setIsExporting(true);
    try {
      toast.info("Generation du recu officiel...");
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: "#020617",
        pixelRatio: 2,
        skipAutoScale: true,
        style: { transform: "none" },
      });
      const link = document.createElement("a");
      link.download = `PimPay_Retrait_${ref}.png`;
      link.href = dataUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
      toast.success("Recu telecharge !");
    } catch (err) {
      console.error("Export error:", err);
      toast.error("Erreur d'exportation. Veuillez faire une capture d'ecran.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Recu PimPay Retrait",
        text: `Retrait de ${formatAmount()} ${currency} en cours. Ref: ${ref}`,
      });
    } else {
      navigator.clipboard.writeText(ref);
      toast.success("Reference copiee !");
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-36 font-sans">
      <div className="px-6 pt-10">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
        </button>

        {/* EXPORTABLE RECEIPT SECTION */}
        <div ref={receiptRef} className="p-1">
          <Card className="bg-slate-900/60 border-white/10 rounded-[2rem] overflow-hidden shadow-2xl relative">
            {/* Status header */}
            <div className="py-4 px-6 flex items-center justify-between bg-amber-500/10">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                  En Attente
                </span>
              </div>
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">RETRAIT</span>
            </div>

            <div className="p-8 space-y-8 relative z-10">
              {/* Watermark */}
              <div className="absolute top-4 right-4 opacity-5">
                <ArrowDownLeft size={80} />
              </div>

              {/* Main amount */}
              <div className="flex flex-col items-center text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">
                  Montant Retire
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">{formatAmount()}</span>
                  <span className="text-lg font-bold text-blue-500">{currency}</span>
                </div>
                {formatFiat() && (
                  <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <Banknote size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold text-blue-400">
                      ≈ {formatFiat()} {fiatCurrency}
                    </span>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="space-y-5 border-t border-white/5 pt-8">
                {/* Method */}
                <DetailRow
                  icon={isMobile ? <Smartphone size={14} /> : <Building2 size={14} />}
                  label="Methode"
                  value={isMobile ? "Mobile Money" : "Virement Bancaire"}
                />

                {/* Country */}
                {country && (
                  <DetailRow
                    icon={<Globe size={14} />}
                    label="Pays"
                    value={country}
                  />
                )}

                {/* Mobile fields */}
                {isMobile && provider && (
                  <DetailRow
                    icon={<Smartphone size={14} />}
                    label="Operateur"
                    value={provider}
                  />
                )}
                {isMobile && phone && (
                  <DetailRow
                    icon={<Smartphone size={14} />}
                    label="Telephone"
                    value={phone}
                    valueClassName="font-mono"
                  />
                )}

                {/* Bank fields */}
                {!isMobile && bankName && (
                  <DetailRow
                    icon={<Building2 size={14} />}
                    label="Banque"
                    value={bankName}
                  />
                )}
                {!isMobile && accountName && (
                  <DetailRow
                    icon={<ShieldCheck size={14} />}
                    label="Titulaire"
                    value={accountName}
                  />
                )}
                {!isMobile && accountNumber && (
                  <DetailRow
                    icon={<Banknote size={14} />}
                    label="IBAN / Compte"
                    value={
                      accountNumber.length > 20
                        ? accountNumber.slice(0, 10) + "..." + accountNumber.slice(-6)
                        : accountNumber
                    }
                    valueClassName="font-mono"
                    copyable
                    onCopy={() => {
                      navigator.clipboard.writeText(accountNumber);
                      toast.success("Numero copie !");
                    }}
                  />
                )}

                {/* Reference */}
                <DetailRow
                  icon={<Hash size={14} />}
                  label="Reference"
                  value={ref.length > 20 ? ref.slice(0, 20) + "..." : ref}
                  copyable
                  onCopy={() => {
                    navigator.clipboard.writeText(ref);
                    toast.success("Reference copiee !");
                  }}
                />

                {/* Date */}
                <DetailRow
                  icon={<Calendar size={14} />}
                  label="Date"
                  value={displayDate}
                />

                {/* Status info */}
                <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                  <Clock size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-bold text-amber-300/80 text-left leading-relaxed">
                    Ce retrait est en attente de validation par l&apos;administration PimPay.
                    Delai estime : <strong className="text-amber-300">15 min</strong> (Mobile) —{" "}
                    <strong className="text-amber-300">48h</strong> (Banque).
                  </p>
                </div>
              </div>
            </div>

            {/* Receipt footer */}
            <div className="bg-white/[0.02] py-4 text-center border-t border-white/5">
              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.5em]">
                Authentifie par PimPay Network
              </p>
            </div>
          </Card>
        </div>

        {/* Action buttons (outside receipt) */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={handleDownload}
            disabled={isExporting}
            className="flex-1 h-16 bg-white text-[#020617] rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Download size={18} />
                Enregistrer le recu
              </>
            )}
          </button>
          <button
            onClick={handleShare}
            className="w-16 h-16 bg-white/5 text-white rounded-2xl border border-white/10 flex items-center justify-center active:scale-90 transition-all"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Return to dashboard */}
        <Link href="/dashboard" className="block mt-4">
          <button className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            Retour au Wallet
          </button>
        </Link>

        {/* Footer secure badge */}
        <div className="flex items-center justify-center gap-2 text-slate-700 mt-6">
          <Activity size={12} />
          <span className="text-[8px] font-black uppercase tracking-widest">PimPay Secure Protocol</span>
        </div>
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
    <div className="flex justify-between items-center group">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-white/5 rounded-xl text-blue-500 group-hover:bg-blue-500/10 transition-colors">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <div
        className="flex items-center gap-2"
        onClick={copyable ? onCopy : undefined}
      >
        <span
          className={`text-[11px] font-bold ${valueClassName || "text-white"} ${copyable ? "cursor-pointer" : ""}`}
        >
          {value}
        </span>
        {copyable && (
          <Copy size={12} className="text-slate-600 hover:text-blue-400 transition-colors cursor-pointer" />
        )}
      </div>
    </div>
  );
}

export default function WithdrawReceiptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <ReceiptContent />
    </Suspense>
  );
}
