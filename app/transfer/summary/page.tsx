"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  ArrowRight,
  Loader2,
  AlertCircle,
  Wallet,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Correction cruciale : État de montage pour éviter l'erreur removeChild
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // RÉCUPÉRATION DES DONNÉES
  const data = {
    recipientId: searchParams.get("recipient"),
    name: searchParams.get("recipientName") || "Utilisateur",
    avatar: searchParams.get("recipientAvatar"),
    amount: parseFloat(searchParams.get("amount") || "0"),
    currency: searchParams.get("currency") || "XAF",
    description: searchParams.get("description") || "Transfert PimPay",
    fee: parseFloat(searchParams.get("fee") || "0.01")
  };

  const totalRequired = data.amount + data.fee;

  useEffect(() => {
    if (!mounted) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/user/profile');
        if (res.ok) {
          const d = await res.json();
          const targetWallet = d.wallets?.find((w: any) => w.currency === data.currency);
          const balanceValue = targetWallet ? parseFloat(targetWallet.balance) : 0;
          setWalletBalance(balanceValue);
        }
      } catch (err) {
        console.error("Erreur solde:", err);
      }
    };
    fetchBalance();
  }, [data.currency, mounted]);

  const handleConfirm = async () => {
    if (walletBalance !== null && walletBalance < totalRequired) {
      toast.error(`Solde insuffisant.`);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/user/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIdentifier: data.recipientId,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
        }),
      });

      if (response.ok) {
        router.push(`/transfer/success?amount=${data.amount}&currency=${data.currency}&name=${encodeURIComponent(data.name)}`);
      } else {
        const result = await response.json();
        router.push(`/transfer/failed?error=${encodeURIComponent(result.error || "Échec")}`);
      }
    } catch (err) {
      router.push("/transfer/failed?error=Erreur serveur");
    } finally {
      setIsLoading(false);
    }
  };

  // Si pas encore monté côté client, on affiche un loader propre pour éviter le conflit DOM
  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  const isInsufficient = walletBalance !== null && walletBalance < totalRequired;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12 font-sans">
      <div className="flex items-center gap-4 mb-8 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Récapitulatif</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Vérification finale</p>
        </div>
      </div>

      <div className="flex flex-col items-center mb-8">
        <div className="relative mb-4">
          {data.avatar ? (
            <div className="w-20 h-20 rounded-full border-2 border-blue-500 p-1">
              <img 
                src={data.avatar} 
                alt="Avatar" 
                className="w-full h-full rounded-full object-cover" 
              />
            </div>
          ) : (
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-900 rounded-full flex items-center justify-center text-2xl font-black border-2 border-white/10">
              {data.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-[#020617]">
            <CheckCircle2 size={14} className="text-white" />
          </div>
        </div>
        <h2 className="text-lg font-black uppercase tracking-tight text-center">{data.name}</h2>
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Bénéficiaire certifié</p>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-6 shadow-2xl">
        <div className="p-8 text-center bg-white/[0.02]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Montant à envoyer</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-black tracking-tighter">{data.amount.toLocaleString()}</span>
            <span className="text-xl font-black italic text-blue-500">{data.currency}</span>
          </div>
        </div>

        <div className="p-6 space-y-4 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Frais Réseau</span>
            <span className="text-sm font-bold">{data.fee} {data.currency}</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-blue-500 font-black text-[11px] uppercase tracking-wider">Total Débit</span>
            <span className={`text-xl font-black ${isInsufficient ? 'text-red-500' : 'text-white'}`}>
              {totalRequired.toLocaleString(undefined, { minimumFractionDigits: 2 })} {data.currency}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-5 bg-white/5 rounded-[24px] mb-8 border border-white/5">
        <div className="flex items-center gap-3">
          <Wallet size={18} className="text-blue-500" />
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase">Portefeuille</p>
            <p className="text-[11px] font-black uppercase">{data.currency}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-white">
            {walletBalance !== null ? `${walletBalance.toLocaleString()} ${data.currency}` : "..."}
          </span>
        </div>
      </div>

      {isInsufficient && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-[10px] font-black text-red-500 uppercase tracking-tight">
            Solde insuffisant pour couvrir les frais.
          </p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={isLoading || isInsufficient}
        className={`w-full py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
          isInsufficient
          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
          : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
        }`}
      >
        {isLoading ? <Loader2 className="animate-spin" /> : (
          <>
            <span className="font-black uppercase tracking-widest text-sm">
              {isInsufficient ? "Solde insuffisant" : "Confirmer l'envoi"}
            </span>
            {!isInsufficient && <ArrowRight size={20} />}
          </>
        )}
      </button>
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
