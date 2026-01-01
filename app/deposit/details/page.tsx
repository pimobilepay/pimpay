"use client";

import { useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Download,
  Share2,
  CheckCircle2,
  Copy,
  Calendar,
  Hash,
  ShieldCheck,
  Zap,
  Smartphone // Ajouté ici pour corriger l'erreur ReferenceError
} from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function TransactionDetailsPage() {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Données simulées issues de ton schéma Transaction
  const tx = {
    reference: "TX-PIMPAY-992834",
    amount: 50.00,
    fee: 0.00,
    status: "SUCCESS", // Enum TransactionStatus
    type: "DEPOSIT",  // Enum TransactionType
    createdAt: new Date().toLocaleString('fr-FR'),
    method: "Airtel Money",
    phone: "+243 812 345 678"
  };

  // Fonction de génération PDF
  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;

    try {
      setIsExporting(true);
      toast.info("Préparation du reçu...");

      const canvas = await html2canvas(receiptRef.current, {
        scale: 2, // Haute résolution
        backgroundColor: "#020617", // Fond sombre identique au design
        logging: false,
        useCORS: true
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width / 2, canvas.height / 2]
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
      pdf.save(`PimPay_Receipt_${tx.reference}.pdf`);

      toast.success("Reçu téléchargé !");
    } catch (error) {
      console.error("Erreur PDF:", error);
      toast.error("Échec de la génération du PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans">
      <div className="px-6 pt-12">
        <Link href="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors group">
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-widest">Retour Accueil</span>
        </Link>

        {/* ZONE CAPTURÉE PAR LE PDF */}
        <div ref={receiptRef} className="p-1"> {/* Padding léger pour éviter les bords coupés */}
          <Card className="bg-slate-900/60 border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative">
            {/* Filigrane décoratif pour le PDF */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none">
                <Zap size={300} fill="currentColor" />
            </div>

            <div className="p-8 space-y-8 relative z-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center border border-green-500/20 mb-4">
                  <CheckCircle2 className="text-green-500" size={32} />
                </div>
                <h1 className="text-xl font-black text-white uppercase tracking-tighter italic">Transaction Réussie</h1>
                <p className="text-blue-500 text-[9px] font-bold uppercase tracking-[0.3em] mt-1">PimPay Protocol Receipt</p>
              </div>

              <div className="space-y-5">
                <div className="flex justify-between items-center group cursor-pointer" onClick={() => copyToClipboard(tx.reference)}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg"><Hash size={14} className="text-blue-500"/></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Référence</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-white flex items-center gap-2">
                    {tx.reference} <Copy size={12} className="text-slate-600"/>
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg"><Calendar size={14} className="text-blue-500"/></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Date & Heure</span>
                  </div>
                  <span className="text-xs font-bold text-white">{tx.createdAt}</span>
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/5 rounded-lg"><Smartphone size={14} className="text-blue-500"/></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Méthode</span>
                  </div>
                  <span className="text-xs font-bold text-white uppercase">{tx.method}</span>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg"><ShieldCheck size={14} className="text-blue-500"/></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase">Statut Final</span>
                  </div>
                  <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
                    <span className="text-[9px] font-black text-green-500 uppercase">{tx.status}</span>
                  </div>
                </div>

                <div className="pt-6 flex flex-col items-center">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Montant Crédité</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${tx.amount.toFixed(2)}</span>
                    <span className="text-sm font-bold text-blue-500 italic">USD</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied du reçu */}
            <div className="bg-blue-600 py-3 text-center">
                <p className="text-[8px] font-black text-white uppercase tracking-[0.4em]">Fintech Beyond Frontiers</p>
            </div>
          </Card>
        </div>

        {/* BOUTONS D'ACTION (Hors zone PDF) */}
        <div className="mt-8 flex gap-4">
          <Button
            onClick={handleDownloadPDF}
            disabled={isExporting}
            className="flex-1 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest gap-3 shadow-xl shadow-blue-900/20"
          >
            {isExporting ? "Génération..." : <><Download size={18} /> Télécharger PDF</>}
          </Button>

          <Button
            className="w-16 h-16 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all active:scale-95"
          >
            <Share2 size={20} />
          </Button>
        </div>

        <p className="mt-8 text-center text-slate-600 text-[9px] font-medium uppercase tracking-widest px-10">
          Ce reçu est une preuve officielle de votre transaction sur le réseau <span className="text-slate-400 font-bold">PimPay</span>.
        </p>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
