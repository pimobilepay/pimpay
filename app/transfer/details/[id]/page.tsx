"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  XCircle,
  Share2,
  ShieldCheck,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import { toast } from "sonner";

export default function TransactionDetailsPage() {
  const router = useRouter();
  const { id } = useParams();
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/user/transactions/${id}`);
        if (res.ok) {
          const data = await res.json();
          setTx(data);
        } else {
          toast.error("Transaction introuvable");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetails();
  }, [id]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié !`);
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="animate-pulse text-blue-500 font-black italic">PIMPAY...</div>
    </div>
  );

  if (!tx) return null;

  const isSent = tx.type === "TRANSFER" || tx.type === "WITHDRAWAL";

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <button 
          onClick={() => router.back()}
          className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Détails du Reçu</h1>
        <button className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform">
          <Share2 size={20} />
        </button>
      </div>

      {/* Status Card */}
      <div className="text-center mb-10">
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-4 ${
          tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
        }`}>
          {tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? <CheckCircle2 size={40} /> : <Clock size={40} />}
        </div>
        <h2 className="text-4xl font-black mb-1">
          {isSent ? '-' : '+'}{tx.amount.toLocaleString()} <span className="text-xl italic text-blue-500">π</span>
        </h2>
        <p className={`text-[10px] font-black uppercase tracking-widest ${
          tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 'text-emerald-500' : 'text-amber-500'
        }`}>
          Transaction {tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 'Confirmée' : 'En attente'}
        </p>
      </div>

      {/* Info Sections */}
      <div className="space-y-4">
        {/* Main Info */}
        <div className="bg-slate-900/50 border border-white/5 rounded-[32px] p-6 space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Type</p>
              <div className="flex items-center gap-2">
                {isSent ? <ArrowUpRight size={14} className="text-red-400" /> : <ArrowDownLeft size={14} className="text-emerald-400" />}
                <p className="text-sm font-bold uppercase">{tx.type}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Date & Heure</p>
              <p className="text-sm font-bold uppercase">{new Date(tx.createdAt).toLocaleString('fr-FR')}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
              {isSent ? 'Destinataire' : 'Expéditeur'}
            </p>
            <p className="text-sm font-bold uppercase text-blue-400">
              {isSent ? tx.toUser?.username || tx.toUser?.name : tx.fromUser?.username || tx.fromUser?.name}
            </p>
          </div>

          <div className="pt-4 border-t border-white/5">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Référence</p>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-mono text-slate-400 break-all mr-4">{tx.reference}</p>
              <button onClick={() => copyToClipboard(tx.reference, "Référence")} className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-lg">
                <Copy size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Blockchain Info (Si applicable) */}
        {tx.blockchainTx && (
          <div className="bg-blue-600/5 border border-blue-500/10 rounded-[24px] p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg text-blue-500">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest">Blockchain Hash</p>
                  <p className="text-[10px] font-mono text-blue-400 truncate w-40">{tx.blockchainTx}</p>
                </div>
              </div>
              <button className="p-2 text-blue-500">
                <ExternalLink size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Download Receipt Button */}
      <button className="w-full mt-10 py-5 bg-white text-black rounded-[24px] font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 active:scale-95 transition-all">
        Télécharger le reçu (PDF)
      </button>

      <div className="mt-8 text-center">
        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Propulsé par PIMPAY Network</p>
      </div>
    </div>
  );
}
