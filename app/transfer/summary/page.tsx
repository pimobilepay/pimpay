"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  Wallet
} from "lucide-react";
import { toast } from "sonner";

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Récupération des données depuis l'URL
  const data = {
    recipientId: searchParams.get("recipientId"), // Email ou Téléphone
    name: searchParams.get("recipientName") || "Utilisateur",
    amount: parseFloat(searchParams.get("amount") || "0"),
    description: searchParams.get("description") || "Transfert Pi",
    fee: 0.01
  };

  const totalRequired = data.amount + data.fee;

  // RÉCUPÉRATION DU SOLDE (Alignée sur le schéma Prisma Wallet[])
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const res = await fetch('/api/user/profile', {
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
          const d = await res.json();
          
          /**
           * CORRECTION LOGIQUE :
           * Selon ton schéma, le solde est dans la relation 'wallets'.
           * On cherche le wallet dont la currency est "PI".
           */
          const wallets = d.wallets || d.user?.wallets || [];
          const piWallet = wallets.find((w: any) => w.currency === "PI");
          
          // Fallback sur d.balance si ton API renvoie déjà le solde à plat
          const balanceValue = piWallet ? piWallet.balance : (d.balance ?? 0);
          
          setWalletBalance(parseFloat(balanceValue));
        }
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchBalance();
  }, []);

  const handleConfirm = async () => {
    // 1. Validation locale
    if (walletBalance !== null && walletBalance < totalRequired) {
      toast.error("Solde insuffisant");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");

      /**
       * CORRECTION API : 
       * 'identifier' pour le destinataire, 
       * 'amount' en nombre, 
       * 'note' pour la description
       */
      const response = await fetch("/api/user/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          identifier: data.recipientId, 
          amount: data.amount,
          note: data.description,      
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("Transfert réussi !");
        router.push(`/transfer/success?amount=${data.amount}&name=${encodeURIComponent(data.name)}`);
      } else {
        if (response.status === 401) {
          toast.error("Session expirée");
          router.push("/auth/login");
          return;
        }
        const errorMsg = result.error || "Erreur lors du transfert";
        router.push(`/transfer/failed?error=${encodeURIComponent(errorMsg)}`);
      }
    } catch (err) {
      console.error("Erreur transfert:", err);
      router.push("/transfer/failed?error=Erreur de connexion réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const isInsufficient = walletBalance !== null && walletBalance < totalRequired;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Vérification</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Détails du transfert</p>
        </div>
      </div>

      {/* Recap Card */}
      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-6 shadow-2xl">
        <div className="p-10 text-center bg-white/[0.02]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Montant à transférer</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black">{data.amount}</span>
            <span className="text-2xl font-black italic text-blue-500">π</span>
          </div>
        </div>

        <div className="p-6 space-y-5 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Destinataire</span>
            <span className="text-sm font-bold uppercase">{data.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frais de réseau</span>
            <span className="text-sm font-bold text-blue-400">{data.fee} π</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-blue-500 font-black text-[11px] uppercase">Total à débiter</span>
            <span className={`text-xl font-black ${isInsufficient ? 'text-red-500' : 'text-white'}`}>
              {totalRequired.toFixed(2)} π
            </span>
          </div>
        </div>
      </div>

      {/* Balance Check */}
      <div className="flex items-center justify-between p-5 bg-white/5 rounded-[24px] mb-8 border border-white/5">
        <div className="flex items-center gap-3">
          <Wallet size={18} className="text-slate-400" />
          <span className="text-[10px] font-black text-slate-400 uppercase">Ton Solde</span>
        </div>
        <span className="text-sm font-black tracking-tight">
          {walletBalance !== null ? `${walletBalance.toFixed(4)} π` : "..."}
        </span>
      </div>

      {isInsufficient && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8">
          <AlertCircle size={20} className="text-red-500" />
          <p className="text-[10px] font-black text-red-500 uppercase tracking-tight">
            Attention : Solde insuffisant.
          </p>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleConfirm}
        disabled={isLoading || isInsufficient || walletBalance === null}
        className={`w-full py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
          isInsufficient || walletBalance === null
          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-500 text-white"
        }`}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <>
            <span className="font-black uppercase tracking-widest text-sm">
              {isInsufficient ? "Solde insuffisant" : "Confirmer le transfert"}
            </span>
            {!isInsufficient && <ArrowRight size={20} />}
          </>
        )}
      </button>

      <div className="mt-8 flex items-center justify-center gap-2 text-emerald-500 opacity-50">
        <ShieldCheck size={14} />
        <span className="text-[9px] font-black uppercase tracking-[0.2em]">Sécurisé par Pi Network</span>
      </div>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}>
      <SummaryContent />
    </Suspense>
  );
}
