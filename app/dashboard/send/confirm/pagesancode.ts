"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Loader2, 
  Lock,
  ChevronRight
} from "lucide-react";
import { toast } from "sonner";

function ConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Récupération des données passées par la page précédente
  const recipientId = searchParams.get("recipientId");
  const recipientName = searchParams.get("recipientName") || "Utilisateur Inconnu";
  const amountStr = searchParams.get("amount") || "0";
  const amount = parseFloat(amountStr);
  const description = searchParams.get("description") || "Transfert Pi Network";
  
  const networkFee = 0.01;
  const totalDebit = amount + networkFee;

  const handleFinalSign = async () => {
    setIsLoading(true);
    try {
      // Appel à l'API de transaction
      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId,
          amount,
          description,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Redirection vers la page Succès
        router.push(`/send/success?amount=${amount}&name=${encodeURIComponent(recipientName)}`);
      } else {
        // Redirection vers la page Échec avec le motif
        router.push(`/send/failed?error=${encodeURIComponent(result.error || "Transaction rejetée")}`);
      }
    } catch (err) {
      router.push(`/send/failed?error=Erreur de connexion au serveur`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-10 pt-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-xl font-black uppercase tracking-tighter">Confirmation</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Vérification finale</p>
        </div>
      </div>

      {/* MAIN CARD */}
      <div className="relative mb-8">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-[34px] blur opacity-20"></div>
        <div className="relative bg-[#020617] border border-white/10 rounded-[32px] overflow-hidden">
          
          {/* AMOUNT DISPLAY */}
          <div className="p-10 text-center border-b border-white/5 bg-white/[0.02]">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Vous envoyez</p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-6xl font-black tracking-tighter">{amount}</span>
              <span className="text-2xl font-black italic text-blue-500 pt-2">π</span>
            </div>
          </div>

          {/* DETAILS LIST */}
          <div className="p-6 space-y-6">
            {/* Destinataire */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Destinataire</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-black">
                    {recipientName.charAt(0).toUpperCase()}
                  </div>
                  <p className="font-bold text-white uppercase tracking-tight">{recipientName}</p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-700 mb-1" />
            </div>

            {/* Note */}
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Note de paiement</p>
              <p className="text-xs text-slate-400 font-medium italic">"{description}"</p>
            </div>

            {/* Frais */}
            <div className="flex justify-between items-center py-4 border-t border-white/5">
              <div className="flex items-center gap-2">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Frais de réseau</p>
                <Zap size={10} className="text-blue-500" />
              </div>
              <p className="text-xs font-bold text-white">{networkFee} π</p>
            </div>
          </div>

          {/* TOTAL DEBIT */}
          <div className="bg-blue-600/10 p-6 flex justify-between items-center border-t border-blue-500/20">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-blue-400" />
              <p className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Total à débiter</p>
            </div>
            <p className="text-2xl font-black text-white">{totalDebit.toFixed(2)} π</p>
          </div>
        </div>
      </div>

      {/* SECURITY NOTICE */}
      <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[22px] p-5 flex gap-4 items-center mb-10">
        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center shrink-0">
          <ShieldCheck className="text-emerald-500" size={20} />
        </div>
        <p className="text-[10px] font-bold text-emerald-500/80 uppercase leading-relaxed tracking-tight">
          Cette transaction est protégée par le protocole Pimpay. Une fois confirmée, elle sera inscrite sur la blockchain.
        </p>
      </div>

      {/* SIGN BUTTON */}
      <button
        onClick={handleFinalSign}
        disabled={isLoading}
        className="w-full relative group"
      >
        <div className="absolute -inset-1 bg-blue-600 rounded-[28px] blur opacity-30 group-hover:opacity-50 transition duration-300"></div>
        <div className="relative bg-blue-600 py-6 rounded-[28px] flex items-center justify-center gap-3 active:scale-[0.98] transition-all overflow-hidden">
          {isLoading ? (
            <Loader2 className="animate-spin text-white" />
          ) : (
            <>
              <span className="font-black uppercase tracking-[0.2em] text-sm">Signer & Confirmer</span>
              <ArrowRight size={20} />
            </>
          )}
          {/* Effet de brillance */}
          <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />
        </div>
      </button>

      <button 
        onClick={() => router.back()}
        disabled={isLoading}
        className="w-full mt-6 py-2 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] hover:text-white transition-colors disabled:opacity-0"
      >
        Annuler la transaction
      </button>
    </div>
  );
}

// Wrapper obligatoire pour useSearchParams dans Next.js
export default function ConfirmPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    }>
      <ConfirmContent />
    </Suspense>
  );
}
