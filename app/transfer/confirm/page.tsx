"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, Zap, ArrowRight,
  Loader2, Lock, ChevronRight, X, Wallet
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

function ConfirmContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  // Données de transaction depuis l'URL
  const recipientId = searchParams.get("recipientId");
  const recipientName = searchParams.get("recipientName") || t("common.noData");
  const amount = parseFloat(searchParams.get("amount") || "0");
  const description = searchParams.get("description") || t("transfer.defaultDescription");
  
  // Utilisation des frais définis dans le schéma ou par défaut
  const networkFee = 0.01;
  const totalDebit = amount + networkFee;

  // 1. RÉCUPÉRATION DU SOLDE (Alignée sur Wallet model de Prisma)
  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const res = await fetch('/api/user/wallet-info'); // Route optimisée pour Prisma
        if (res.ok) {
          const d = await res.json();
          // Accès direct au solde PI selon ton schéma
          setWalletBalance(Number(d.userData.balance));
        }
      } catch (err) {
        console.error("Erreur récupération solde:", err);
      }
    };
    fetchBalance();
  }, []);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  // 2. EXÉCUTION UNE FOIS LE PIN COMPLET
  useEffect(() => {
    if (pin.length === 4) {
      executeTransaction();
    }
  }, [pin]);

  const executeTransaction = async () => {
    setIsPinModalOpen(false);
    setIsLoading(true);

    try {
      // Appel à ton API de transaction (Singulier /api/transaction/send)
      const response = await fetch("/api/transaction/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientId: recipientId,
          amount: amount,
          description: description,
          pin: pin // Le PIN est envoyé pour vérification côté serveur
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success(t("transfer.signatureAccepted"));
        // Redirection vers le succès avec la référence Prisma
        router.push(`/transfer/success?amount=${amount}&name=${encodeURIComponent(recipientName)}&ref=${result.data.reference}`);
      } else {
        toast.error(result.error || t("transfer.transactionFailed"));
        router.push(`/transfer/failed?error=${encodeURIComponent(result.error || t("transfer.signatureRefusal"))}`);
      }
    } catch (err) {
      toast.error(t("transfer.blockchainError"));
      router.push(`/transfer/failed?error=${encodeURIComponent(t("transfer.networkError"))}`);
    } finally {
      setIsLoading(false);
      setPin("");
    }
  };

  const isInsufficient = walletBalance !== null && walletBalance < totalDebit;

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12">
      <div className="flex items-center justify-between mb-8 pt-4">
        <button onClick={() => router.back()} className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <div className="text-right">
          <h1 className="text-xl font-black uppercase italic">PimPay<span className="text-blue-500">.Sign</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("transfer.confirmTransfer")}</p>
        </div>
      </div>

      {/* Badge Solde Actuel */}
      <div className="mb-6 flex justify-center">
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
          <Wallet size={14} className="text-blue-500" />
          <span className="text-xs font-bold text-slate-300">
            {walletBalance !== null ? `${walletBalance.toFixed(4)} π ${t("transfer.availableBalance")}` : t("transfer.syncing")}
          </span>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-8 shadow-2xl relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Zap size={100} />
        </div>
        
        <div className="p-10 text-center bg-white/[0.01]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{t("transfer.amountToSend")}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black tracking-tighter">{amount}</span>
            <span className="text-2xl font-black italic text-blue-500">π</span>
          </div>
        </div>

        <div className="p-6 space-y-5 border-t border-white/5 bg-black/20">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">{t("transfer.recipientLabel")}</span>
            <div className="flex items-center gap-2">
                <span className="text-sm font-bold uppercase truncate max-w-[150px]">{recipientName}</span>
                <ShieldCheck size={14} className="text-emerald-500" />
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <div className="flex flex-col">
                <span className="text-blue-500 font-black text-[11px] uppercase tracking-tighter">{t("transfer.totalDebitLabel")}</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase italic">{t("transfer.includingFees")}</span>
            </div>
            <span className={`text-xl font-black ${isInsufficient ? 'text-red-500' : 'text-white'}`}>
                {totalDebit.toFixed(2)} π
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={() => setIsPinModalOpen(true)}
        disabled={isLoading || isInsufficient || walletBalance === null}
        className={`w-full py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${
          isInsufficient || walletBalance === null
          ? "bg-slate-800 text-slate-600 cursor-not-allowed"
          : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/20"
        }`}
      >
        {isLoading ? <Loader2 className="animate-spin" /> : (
          <>
            <span className="font-black uppercase tracking-widest text-sm">
              {isInsufficient ? "Fonds insuffisants" : "Autoriser le transfert"}
            </span>
            {!isInsufficient && <Lock size={18} />}
          </>
        )}
      </button>

      {/* MODAL CLAVIER PIN */}
      {isPinModalOpen && (
        <div className="fixed inset-0 z-[100] bg-[#020617]/95 backdrop-blur-xl flex flex-col justify-end animate-in slide-in-from-bottom duration-300">
          <div className="p-8 pb-12 bg-slate-900/90 rounded-t-[40px] border-t border-white/10 shadow-[0_-20px_80px_rgba(0,0,0,0.8)]">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-widest text-white">Validation PIN</h2>
              </div>
              <button
                onClick={() => { setIsPinModalOpen(false); setPin(""); }}
                className="p-2 bg-white/5 rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex justify-center gap-4 mb-12">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 border-blue-500/30 transition-all duration-300 ${pin.length > i ? "bg-blue-500 scale-125 shadow-[0_0_20px_rgba(59,130,246,0.6)] border-blue-400" : ""}`}
                />
              ))}
            </div>

            <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => key === "delete" ? handleDelete() : key !== "" && handleNumberClick(key)}
                  className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:bg-blue-600/40 active:scale-90 ${key === "" ? "invisible" : "bg-white/5 border border-white/5 hover:border-white/20"}`}
                >
                  {key === "delete" ? "←" : key}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#020617] flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}>
      <ConfirmContent />
    </Suspense>
  );
}
