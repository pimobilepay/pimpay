"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck, Zap, Info, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const data = {
    recipientId: searchParams.get("recipientId"),
    name: searchParams.get("recipientName") || "Utilisateur",
    amount: parseFloat(searchParams.get("amount") || "0"),
    description: searchParams.get("description") || "Transfert Pi",
    fee: 0.01
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: data.recipientId,
          amount: data.amount,
          description: data.description,
        }),
      });

      if (response.ok) {
        router.push(`/send/success?amount=${data.amount}&name=${data.name}`);
      } else {
        const errorData = await response.json();
        router.push(`/send/failed?error=${encodeURIComponent(errorData.error || "Transaction refusée")}`);
      }
    } catch (err) {
      router.push("/send/failed?error=Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <div className="flex items-center gap-4 mb-10 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 border border-white/5 rounded-full"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-black uppercase tracking-tighter">Confirmation</h1>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-6">
        <div className="p-8 text-center border-b border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total à envoyer</p>
          <div className="text-5xl font-black text-white">{data.amount} <span className="text-blue-500 italic text-2xl">π</span></div>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500 uppercase text-[10px]">Destinataire</span>
            <span className="uppercase tracking-tight">{data.name}</span>
          </div>
          <div className="flex justify-between items-center text-sm font-bold">
            <span className="text-slate-500 uppercase text-[10px]">Frais réseau</span>
            <span className="text-blue-400">{data.fee} π</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-blue-500 uppercase text-[10px] font-black">Total Débité</span>
            <span className="text-xl font-black">{(data.amount + data.fee).toFixed(2)} π</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl mb-8 text-[10px] font-bold text-emerald-500 uppercase">
        <ShieldCheck size={18} /> Transaction sécurisée par Pi Blockchain
      </div>

      <button onClick={handleConfirm} disabled={isLoading} className="w-full bg-blue-600 py-6 rounded-[28px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-blue-600/20">
        {isLoading ? <Loader2 className="animate-spin" /> : <><span className="font-black uppercase tracking-widest">Signer l'envoi</span><ArrowRight size={20} /></>}
      </button>
    </div>
  );
}

export default function SummaryPage() {
  return <Suspense><SummaryContent /></Suspense>;
}
