"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  ArrowLeft, Share2, Download, CheckCircle2, 
  Copy, Clock, Hash, ArrowUpRight, ArrowDownLeft,
  ExternalLink, Loader2
} from "lucide-react";
import { toast } from "sonner";

function TransactionDetailContent() {
  const router = useRouter();
  const { id } = useParams(); // Récupère l'ID de l'URL
  const [tx, setTx] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getDetails() {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/transaction/details?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          setTx(data);
        } else {
          toast.error("Impossible de charger les détails");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    if (id) getDetails();
  }, [id]);

  const copyRef = () => {
    navigator.clipboard.writeText(tx?.reference || "");
    toast.success("Référence copiée !");
  };

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Chargement du reçu...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 border border-white/5 rounded-full">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Reçu Officiel</h1>
        <div className="w-10"></div>
      </div>

      {/* DESIGN DU REÇU (STYLE TICKET) */}
      <div className="relative bg-slate-900/40 border border-white/10 rounded-[40px] p-8 overflow-hidden shadow-2xl">
        {/* Décoration Blockchain */}
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Hash size={120} />
        </div>

        <div className="flex flex-col items-center text-center mb-10 relative z-10">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 border border-emerald-500/20">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <p className="text-[10px] font-black uppercase text-emerald-500 tracking-widest mb-2">Paiement Terminé</p>
          <h2 className="text-5xl font-black italic tracking-tighter">
            {tx?.amount} <span className="text-blue-500 text-2xl">π</span>
          </h2>
        </div>

        <div className="space-y-6 border-t border-white/5 pt-8 relative z-10">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Date</span>
            <span className="text-xs font-bold">{tx?.date}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Hash size={12}/> Référence</span>
            <button onClick={copyRef} className="text-xs font-mono bg-white/5 px-2 py-1 rounded flex items-center gap-2 hover:bg-white/10 transition-colors">
              {tx?.reference?.substring(0, 12)}... <Copy size={10} />
            </button>
          </div>

          {/* FLUX DE FONDS */}
          <div className="bg-[#020617]/50 rounded-[24px] p-5 border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg"><ArrowUpRight size={14} className="text-red-400" /></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Depuis</p>
                    <p className="text-xs font-black uppercase italic">{tx?.sender}</p>
                  </div>
               </div>
               <p className="text-[10px] font-bold text-slate-600 italic">Fee: 0.01 π</p>
            </div>
            <div className="flex items-center justify-between border-t border-white/5 pt-4">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><ArrowDownLeft size={14} className="text-emerald-400" /></div>
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase">Vers</p>
                    <p className="text-xs font-black uppercase italic">{tx?.recipient}</p>
                  </div>
               </div>
               <ExternalLink size={14} className="text-slate-700" />
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Mémo</p>
            <p className="text-xs text-slate-400 italic font-medium">"{tx?.description || 'Aucune note'}"</p>
          </div>
        </div>
      </div>

      {/* ACTIONS */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        <button className="bg-slate-900 border border-white/10 py-5 rounded-[24px] flex flex-col items-center gap-2 active:scale-95 transition-all">
          <Share2 size={20} className="text-blue-500" />
          <span className="text-[9px] font-black uppercase tracking-widest">Partager</span>
        </button>
        <button className="bg-slate-900 border border-white/10 py-5 rounded-[24px] flex flex-col items-center gap-2 active:scale-95 transition-all">
          <Download size={20} className="text-blue-500" />
          <span className="text-[9px] font-black uppercase tracking-widest">Facture PDF</span>
        </button>
      </div>

      <button onClick={() => router.push('/dashboard')} className="w-full mt-8 py-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
        Retour à l'accueil
      </button>
    </div>
  );
}

export default function DetailsPage() {
  return (
    <Suspense>
      <TransactionDetailContent />
    </Suspense>
  );
}
