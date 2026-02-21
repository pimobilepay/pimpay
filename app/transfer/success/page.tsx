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
  User,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

function TransferSuccessContent() {
  const searchParams = useSearchParams();

  // Extraction des paramètres
  const ref = searchParams.get("ref");
  const amountParam = searchParams.get("amount");
  const nameParam = searchParams.get("name") || "Utilisateur";
  const currencyParam = searchParams.get("currency") || "XAF";

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setLoading(false);
      return;
    }

    const fetchTx = async () => {
      try {
        const res = await fetch(`/api/transaction/detail?ref=${ref}`);
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
  }, [ref]);

  // Données finales
  const amount = transaction?.amount ?? parseFloat(amountParam || "0");
  const currency = (transaction?.currency || currencyParam).toUpperCase();
  const reference = transaction?.reference || ref || "PIMPAY-TR-PENDING";
  const status = transaction?.status || "SUCCESS";
  const blockchainTx = transaction?.blockchainTx || transaction?.metadata?.blockchainTx;
  const beneficiary = transaction?.toUser?.username || transaction?.toUser?.name || nameParam;

  // Configuration des Explorateurs selon la devise
  const getBlockExplorer = (curr: string, txHash: string) => {
    if (!txHash) return null;
    switch (curr) {
      case "PI": return `https://minepi.com/blockexplorer/tx/${txHash}`;
      case "SDA": return `https://sidrascan.com/tx/${txHash}`;
      case "BTC": return `https://blockchain.info/tx/${txHash}`;
      case "USDT": return `https://tronscan.org/#/transaction/${txHash}`;
      case "ETH": return `https://etherscan.io/tx/${txHash}`;
      default: return null;
    }
  };

  const explorerUrl = getBlockExplorer(currency, blockchainTx);

  const statusConfig: any = {
    SUCCESS: { label: "Transféré", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    PENDING: { label: "En cours", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
    FAILED: { label: "Échec", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  };

  const currentStatus = statusConfig[status] || statusConfig.SUCCESS;

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center py-12 px-6 text-center relative overflow-hidden">
      {/* Glow effect */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="animate-in fade-in zoom-in duration-700 w-full max-w-md relative z-10">
        
        {/* Badge Statut */}
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border ${currentStatus.bg} ${currentStatus.border} mb-8`}>
          <div className={`w-1.5 h-1.5 rounded-full ${currentStatus.color.replace('text', 'bg')} animate-pulse`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${currentStatus.color}`}>
            {currentStatus.label}
          </span>
        </div>

        {/* Icône de succès */}
        <div className="relative w-24 h-24 bg-white/5 border border-white/10 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
           <CheckCircle2 className="text-emerald-500" size={40} />
        </div>

        <h1 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">
          Transfert Réussi
        </h1>
        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
          Fonds envoyés avec succès vers le destinataire
        </p>

        {/* Montant */}
        <div className="mb-10">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-black text-white tracking-tighter">{amount.toLocaleString()}</span>
            <span className="text-xl font-black text-blue-500 italic">{currency}</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-widest">Confirmation PimPay Network</p>
        </div>

        {/* Card Détails */}
        <div className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden mb-8">
          <div className="p-6 space-y-4">
            <DetailRow icon={<User size={14}/>} label="Bénéficiaire" value={beneficiary} />
            <DetailRow icon={<ShieldCheck size={14}/>} label="Référence" value={reference} isCopy />
            <DetailRow icon={<Banknote size={14}/>} label="Méthode" value={`Portefeuille ${currency}`} />
            <DetailRow icon={<Clock size={14}/>} label="Date" value={new Date().toLocaleDateString('fr-FR')} />
            
            {explorerUrl && (
              <a 
                href={explorerUrl} 
                target="_blank" 
                className="flex justify-between items-center pt-3 border-t border-white/5 group"
              >
                <div className="flex items-center gap-2">
                  <ExternalLink size={14} className="text-blue-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Blockchain</span>
                </div>
                <span className="text-[10px] font-bold text-blue-400 group-hover:underline">Vérifier l'envoi</span>
              </a>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/dashboard" className="w-full h-16 bg-blue-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
            <Wallet size={18} /> Retour au Portefeuille
          </Link>
          
          <div className="grid grid-cols-2 gap-3">
            <button className="h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <Receipt size={16} /> Reçu
            </button>
            <button className="h-14 bg-white/5 border border-white/10 rounded-2xl font-black uppercase text-[10px] text-slate-400 flex items-center justify-center gap-2">
              <Share2 size={16} /> Partager
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sous-composant pour les lignes de détails
function DetailRow({ icon, label, value, isCopy = false }: any) {
  const copy = () => {
    navigator.clipboard.writeText(value);
    toast.success("Copié !");
  };

  return (
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-2">
        <span className="text-blue-500">{icon}</span>
        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span 
        onClick={isCopy ? copy : undefined}
        className={`text-[10px] font-bold text-white uppercase ${isCopy ? 'cursor-pointer hover:text-blue-400 transition-colors font-mono' : ''}`}
      >
        {isCopy ? `${value.slice(0, 12)}...` : value}
      </span>
    </div>
  );
}

export default function TransferSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}>
      <TransferSuccessContent />
    </Suspense>
  );
}
