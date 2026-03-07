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
  Loader2,
  Banknote,
  Clock,
  User,
  Send,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

const PI_GCV_PRICE = 314159;

function ReceiptContent() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const ref = searchParams.get("ref");
  const urlAmount = searchParams.get("amount");
  const urlCurrency = searchParams.get("currency") || "XAF";
  const urlName = searchParams.get("name") || "Utilisateur";

  const [isExporting, setIsExporting] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchTx = useCallback(async () => {
    if (!ref) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/transaction/details?ref=${encodeURIComponent(ref)}`, {
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache' }
      });
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

  // --- LOGIQUE FINANCIÈRE ---
  const currency = transaction?.currency || urlCurrency;
  const amount = Number(transaction?.amount) || Number(urlAmount) || 0;
  const beneficiary = transaction?.toUser?.username || transaction?.toUser?.name || urlName;
  
  const isPi = currency === "PI";
  const amountDisplay = amount;
  let amountUSD = 0;

  if (isPi) {
    amountUSD = amount * PI_GCV_PRICE;
  } else if (currency === "XAF") {
    amountUSD = amount / 600;
  } else {
    amountUSD = amount;
  }

  const feeAmount = transaction?.fee || (amount * 0.01);
  const displayRef = transaction?.reference || ref || "PIMPAY-TR";
  const isSuccess = transaction?.status === "SUCCESS" || !transaction?.status;
  const isPending = transaction?.status === "PENDING";
  const blockchainTx = transaction?.blockchainTx || transaction?.metadata?.blockchainTx;

  // Configuration des Explorateurs selon la devise
  const getBlockExplorer = (curr: string, txHash: string) => {
    if (!txHash) return null;
    switch (curr) {
      case "PI": return `https://blockexplorer.minepi.com/tx/${txHash}`;
      case "SDA": return `https://ledger.sidrachain.com/tx/${txHash}`;
      case "BTC": return `https://blockchain.info/tx/${txHash}`;
      case "USDT": return `https://tronscan.org/#/transaction/${txHash}`;
      case "ETH": return `https://etherscan.io/tx/${txHash}`;
      default: return null;
    }
  };

  const explorerUrl = getBlockExplorer(currency, blockchainTx);

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      setIsExporting(true);
      toast.info("Génération du reçu officiel...");
      
      const { toPng } = await import("html-to-image");

      const dataUrl = await toPng(receiptRef.current, {
        cacheBust: true,
        backgroundColor: "#020617",
        pixelRatio: 2,
        skipAutoScale: true,
        style: {
          transform: 'none',
        }
      });

      const link = document.createElement("a");
      link.download = `PimPay_Transfer_${displayRef}.png`;
      link.href = dataUrl;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);

      toast.success("Reçu téléchargé !");
    } catch (error) {
      console.error("Export error:", error);
      try {
        const { toPng } = await import("html-to-image");
        const dataUrl = await toPng(receiptRef.current!, {
          cacheBust: true,
          backgroundColor: "#020617",
          pixelRatio: 2,
        });
        const newTab = window.open();
        if (newTab) {
          newTab.document.write(`<img src="${dataUrl}" style="max-width:100%;"/>`);
          newTab.document.title = "PimPay Receipt";
          toast.info("Reçu ouvert dans un nouvel onglet. Maintenez l'image pour la sauvegarder.");
        } else {
          toast.error("Veuillez autoriser les pop-ups pour télécharger le reçu");
        }
      } catch {
        toast.error("Erreur d'exportation. Veuillez faire une capture d'écran.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Reçu PimPay',
        text: `Transfert de ${amountDisplay} ${currency} vers ${beneficiary} réussi. Réf: ${displayRef}`
      });
    } else {
      navigator.clipboard.writeText(displayRef);
      toast.success("Référence copiée !");
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
            <div className={`py-4 px-6 flex items-center justify-between ${isSuccess ? "bg-emerald-500/10" : isPending ? "bg-amber-500/10" : "bg-red-500/10"}`}>
              <div className="flex items-center gap-2">
                {isSuccess ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <Clock size={16} className={isPending ? "text-amber-500" : "text-red-500"} />
                )}
                <span className={`text-[10px] font-black uppercase tracking-widest ${isSuccess ? "text-emerald-500" : isPending ? "text-amber-500" : "text-red-500"}`}>
                  {transaction?.status || "SUCCESS"}
                </span>
              </div>
              <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">TRANSFERT</span>
            </div>

            <div className="p-8 space-y-8 relative z-10">
              {/* Icône Transfert */}
              <div className="absolute top-4 right-4 opacity-5">
                <Send size={80} />
              </div>

              {/* Montant Principal */}
              <div className="flex flex-col items-center text-center">
                <p className="text-[10px] font-black text-slate-500 uppercase mb-3 tracking-widest">Montant Transféré</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white">
                    {isPi ? amountDisplay.toFixed(4) : amountDisplay.toLocaleString('fr-FR')}
                  </span>
                  <span className="text-lg font-bold text-blue-500">{currency}</span>
                </div>
                <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                  <TrendingUp size={12} className="text-blue-400" />
                  <span className="text-[10px] font-bold text-blue-400">
                    ≈ ${amountUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>

              {/* Grille de Détails */}
              <div className="space-y-5 border-t border-white/5 pt-8">
                <DetailRow 
                  icon={<User />} 
                  label="Bénéficiaire" 
                  value={beneficiary} 
                />
                <DetailRow 
                  icon={<Hash />} 
                  label="ID Transaction" 
                  value={displayRef.length > 18 ? displayRef.slice(0, 18) + "..." : displayRef} 
                  onCopy={() => { navigator.clipboard.writeText(displayRef); toast.success("ID Copié"); }} 
                  copyable 
                />
                <DetailRow 
                  icon={<Calendar />} 
                  label="Date" 
                  value={transaction?.createdAt ? new Date(transaction.createdAt).toLocaleString("fr-FR") : new Date().toLocaleString("fr-FR")} 
                />
                <DetailRow 
                  icon={<Send />} 
                  label="Type" 
                  value="Transfert interne" 
                />
                <DetailRow 
                  icon={<Banknote />} 
                  label="Frais Réseau" 
                  value={`${feeAmount.toFixed(isPi ? 4 : 2)} ${currency}`} 
                  valueClassName="text-red-400" 
                />

                {blockchainTx && (
                  <DetailRow
                    icon={<ShieldCheck />}
                    label="Blockchain Hash"
                    value={blockchainTx.slice(0, 12) + "..."}
                    onCopy={() => { navigator.clipboard.writeText(blockchainTx); toast.success("Hash Copié"); }}
                    copyable
                    valueClassName="text-blue-400 font-mono"
                  />
                )}

                {explorerUrl && (
                  <a 
                    href={explorerUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex justify-between items-center pt-3 border-t border-white/5 group"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink size={14} className="text-blue-500" />
                      <span className="text-[9px] font-black text-slate-500 uppercase">Blockchain</span>
                    </div>
                    <span className="text-[10px] font-bold text-blue-400 group-hover:underline">Vérifier sur l'explorateur</span>
                  </a>
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
            onClick={handleShare}
            className="w-16 h-16 bg-white/5 text-white rounded-2xl border border-white/10 flex items-center justify-center active:scale-90 transition-all"
          >
            <Share2 size={20} />
          </button>
        </div>

        {/* Bouton retour dashboard */}
        <Link href="/dashboard" className="block mt-4">
          <button className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            Retour au Wallet
          </button>
        </Link>
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

export default function TransferReceiptPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" size={40} /></div>}>
      <ReceiptContent />
    </Suspense>
  );
}
