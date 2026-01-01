"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Wallet, Clock, CheckCircle2, 
  ShieldAlert, Loader2, ArrowRight, XCircle, 
  Receipt, Fingerprint, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";

function SummaryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const ref = searchParams.get("ref");
  
  const [mounted, setMounted] = useState(false);
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // GESTION DES ÉTAPES : 'summary' | 'confirming' | 'success' | 'failed'
  const [step, setStep] = useState<'summary' | 'success' | 'failed'>('summary');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!ref) return;

    const fetchTransactionDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/transaction/${ref}`);
        if (!response.ok) throw new Error("Transaction introuvable");
        const data = await response.json();
        setTransaction(data);
      } catch (error) {
        toast.error("Erreur de récupération");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactionDetails();
  }, [ref]);

  const handleFinalConfirm = async () => {
    if (!ref) return;
    setIsProcessing(true);
    
    try {
      const res = await fetch("/api/deposit/confirm", {
        method: "POST",
        body: JSON.stringify({ reference: ref }),
        headers: { "Content-Type": "application/json" }
      });

      const data = await res.json();
      
      // On attend un peu pour simuler le processus réseau "Confirmation"
      setTimeout(() => {
        if (data.success) {
          setStep('success');
          toast.success("Transaction validée par le réseau");
        } else {
          setStep('failed');
        }
        setIsProcessing(false);
      }, 1500);

    } catch (e) {
      setStep('failed');
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;
  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
      <Loader2 className="animate-spin text-blue-500" size={40} />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Chargement du Ledger...</p>
    </div>
  );

  const metadata = transaction?.metadata || {};

  // --- RENDU ÉTAPE : SUCCESS ---
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-24 h-24 bg-emerald-500/20 rounded-[2rem] border border-emerald-500/30 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
          <CheckCircle2 size={48} className="text-emerald-500" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Succès !</h1>
        <p className="text-slate-400 text-center text-sm mb-8">Votre dépôt de <span className="text-white font-bold">${transaction?.amount}</span> a été confirmé et ajouté à votre compte.</p>
        
        <Card className="w-full bg-slate-900/40 border-white/5 p-6 rounded-[2rem] mb-8">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[9px] font-black text-slate-500 uppercase">ID Réseau</span>
                <span className="text-[10px] font-mono text-emerald-400">{transaction?.reference.slice(0,12)}...</span>
            </div>
            <div className="flex justify-between items-center py-2">
                <span className="text-[9px] font-black text-slate-500 uppercase">Date</span>
                <span className="text-[10px] font-bold text-white">{new Date().toLocaleDateString()}</span>
            </div>
        </Card>

        <Button onClick={() => router.push("/")} className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest">
          Retour au Wallet
        </Button>
      </div>
    );
  }

  // --- RENDU ÉTAPE : FAILED ---
  if (step === 'failed') {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 pb-20">
        <div className="w-24 h-24 bg-red-500/20 rounded-[2rem] border border-red-500/30 flex items-center justify-center mb-6">
          <XCircle size={48} className="text-red-500" />
        </div>
        <h1 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-2">Échec</h1>
        <p className="text-slate-400 text-center text-sm mb-8">La validation a échoué. Veuillez vérifier vos fonds ou réessayer plus tard.</p>
        <Button onClick={() => setStep('summary')} className="w-full h-16 bg-slate-800 rounded-2xl font-black uppercase tracking-widest">
          Réessayer
        </Button>
      </div>
    );
  }

  // --- RENDU ÉTAPE : SUMMARY (PAR DÉFAUT) ---
  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans">
      {/* Header */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/deposit">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white uppercase italic">Résumé</h1>
            <span className="text-[10px] font-bold text-blue-500 uppercase tracking-[2px]">Vérification Finale</span>
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-none rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-10 group-hover:rotate-12 transition-transform duration-700">
            <Receipt size={120} />
          </div>
          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest opacity-70">Montant à créditer</p>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-4xl font-black text-white tracking-tighter">
              ${transaction?.amount?.toFixed(2)}
            </span>
            <span className="text-sm font-bold text-blue-200 uppercase">USD</span>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-4">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] px-2">Détails du transfert</p>
        
        <Card className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg"><Fingerprint size={16} className="text-blue-500" /></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Référence</span>
              </div>
              <span className="text-xs font-mono font-bold text-blue-400">{transaction?.reference.slice(0,15)}...</span>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg"><Clock size={16} className="text-amber-500" /></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Statut Actuel</span>
              </div>
              <span className="text-[10px] font-black px-3 py-1 bg-amber-500/10 text-amber-500 rounded-full border border-amber-500/20 uppercase">
                {transaction?.status}
              </span>
            </div>

            <div className="flex justify-between items-center border-t border-white/5 pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/5 rounded-lg"><ShieldAlert size={16} className="text-slate-400" /></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Méthode</span>
              </div>
              <span className="text-[10px] font-bold text-white uppercase">{metadata?.phone || "Mobile Money"}</span>
            </div>
          </div>
        </Card>

        {/* ACTION FINALE : CONFIRMATION */}
        <div className="pt-4 space-y-3">
            <Button
                onClick={handleFinalConfirm}
                disabled={isProcessing}
                className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-900/20 group relative overflow-hidden"
            >
                {isProcessing ? (
                    <div className="flex items-center gap-3">
                        <Loader2 className="animate-spin" size={20} />
                        <span>Validation...</span>
                    </div>
                ) : (
                    <div className="flex items-center justify-between w-full px-4">
                        <span className="flex-1 text-center">Confirmer le dépôt</span>
                        <div className="bg-white/20 p-2 rounded-xl group-hover:translate-x-1 transition-transform">
                            <ChevronRight size={20} />
                        </div>
                    </div>
                )}
            </Button>

            <button 
                onClick={() => router.back()}
                className="w-full py-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.3em] hover:text-white transition-colors"
            >
                Annuler la transaction
            </button>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

export default function DepositSummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}>
      <SummaryContent />
    </Suspense>
  );
}
