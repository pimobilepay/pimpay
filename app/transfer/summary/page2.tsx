"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  ShieldCheck, 
  ArrowRight, 
  Loader2, 
  Lock 
} from "lucide-react";
import { toast } from "sonner";

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Extraction et sécurisation des données
  const data = {
    recipientId: searchParams.get("recipientId"),
    name: searchParams.get("recipientName") || "Utilisateur",
    amount: parseFloat(searchParams.get("amount") || "0"),
    description: searchParams.get("description") || "Transfert Pi",
    fee: 0.01
  };

  const handleConfirm = async () => {
    // Vérification de sécurité avant de lancer l'appel
    if (!data.recipientId || data.amount <= 0) {
      toast.error("Données de transaction invalides");
      return;
    }

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
        // CORRECTION : Redirection vers /transfer/success
        router.push(`/transfer/success?amount=${data.amount}&name=${encodeURIComponent(data.name)}`);
      } else {
        const errorData = await response.json();
        // CORRECTION : Redirection vers /transfer/failed
        router.push(`/transfer/failed?error=${encodeURIComponent(errorData.error || "Transaction refusée")}`);
      }
    } catch (err) {
      // CORRECTION : Redirection vers /transfer/failed
      router.push("/transfer/failed?error=Erreur réseau ou serveur");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 pt-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Récapitulatif</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Étape 2 sur 2</p>
        </div>
      </div>

      {/* Carte du reçu */}
      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-8 shadow-2xl">
        <div className="p-8 text-center border-b border-white/5 bg-white/[0.01]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Montant à envoyer</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black">{data.amount}</span>
            <span className="text-2xl font-black text-blue-500 italic">π</span>
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Destinataire</span>
            <span className="font-bold uppercase tracking-tight">{data.name}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500 uppercase text-[10px] font-black tracking-widest">Frais Réseau</span>
            <span className="font-bold text-blue-400">{data.fee} π</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-blue-500 uppercase text-[10px] font-black">Total Débité</span>
            <span className="text-2xl font-black">{(data.amount + data.fee).toFixed(2)} π</span>
          </div>
        </div>
      </div>

      {/* Badge de sécurité */}
      <div className="flex items-center gap-3 p-5 bg-emerald-500/5 border border-emerald-500/10 rounded-[22px] mb-8">
        <div className="bg-emerald-500/20 p-2 rounded-lg">
          <ShieldCheck size={20} className="text-emerald-500" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sécurisé</p>
          <p className="text-[9px] text-emerald-500/60 font-bold uppercase">Cryptage de bout en bout actif</p>
        </div>
      </div>

      {/* Bouton d'action */}
      <button 
        onClick={handleConfirm} 
        disabled={isLoading} 
        className="w-full bg-blue-600 hover:bg-blue-500 py-6 rounded-[28px] flex items-center justify-center gap-3 active:scale-95 transition-all shadow-2xl shadow-blue-600/20 disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <span className="font-black uppercase tracking-widest text-sm">Confirmer & Envoyer</span>
            <ArrowRight size={20} />
          </>
        )}
      </button>

      {/* Note de sécurité */}
      <p className="mt-8 text-center text-[9px] font-bold text-slate-600 uppercase tracking-widest px-6">
        En cliquant sur confirmer, vous autorisez le débit de votre portefeuille Pi.
      </p>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    }>
      <SummaryContent />
    </Suspense>
  );
}
