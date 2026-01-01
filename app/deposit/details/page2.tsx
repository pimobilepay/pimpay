"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Download, Share2, CheckCircle2, 
  ExternalLink, Copy, Clock, Calendar, Hash
} from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

export default function TransactionDetailsPage() {
  // Simulation d'une transaction extraite de ton modèle Prisma 'Transaction'
  const tx = {
    reference: "TX-PIMPAY-992834", // champ 'reference'
    amount: 50.00,                 // champ 'amount'
    fee: 0.00,                     // champ 'fee'
    status: "COMPLETED",           // enum 'TransactionStatus'
    type: "DEPOSIT",               // enum 'TransactionType'
    createdAt: new Date().toLocaleDateString(),
    description: "Dépôt via Airtel Money"
  };

  const handleDownloadPDF = () => {
    toast.success("Génération du reçu PDF...");
    // Ici la logique de génération PDF (ex: jspdf)
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans">
      <div className="px-6 pt-12">
        <Link href="/wallet" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Retour</span>
        </Link>

        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-4">
            <CheckCircle2 className="text-green-500" size={40} />
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter">Transaction Réussie</h1>
          <p className="text-slate-500 text-xs mt-2">{tx.description}</p>
        </div>

        <Card className="bg-slate-900/60 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-8 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg"><Hash size={14} className="text-blue-500"/></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Référence</span>
              </div>
              <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                {tx.reference} <Copy size={12} className="text-slate-600 cursor-pointer"/>
              </span>
            </div>

            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg"><Calendar size={14} className="text-blue-500"/></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Date</span>
              </div>
              <span className="text-xs font-bold text-white">{tx.createdAt}</span>
            </div>

            <div className="flex justify-between items-center border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg"><Clock size={14} className="text-blue-500"/></div>
                <span className="text-[10px] font-black text-slate-500 uppercase">Statut</span>
              </div>
              <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                <span className="text-[9px] font-black text-green-500 uppercase">{tx.status}</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col items-center">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Montant Total</p>
               <h2 className="text-4xl font-black text-white">${tx.amount.toFixed(2)}</h2>
            </div>
          </div>

          <div className="bg-white/5 p-6 flex gap-3">
            <Button 
              onClick={handleDownloadPDF}
              className="flex-1 h-14 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-[10px] uppercase tracking-widest gap-2"
            >
              <Download size={16} /> Reçu PDF
            </Button>
            <Button className="w-14 h-14 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10">
              <Share2 size={18} />
            </Button>
          </div>
        </Card>

        <Link href="/">
          <Button className="w-full h-16 mt-8 bg-transparent border border-white/10 hover:bg-white/5 text-white rounded-[2rem] font-black uppercase tracking-widest">
            Fermer
          </Button>
        </Link>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
