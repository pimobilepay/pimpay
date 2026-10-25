"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft, ShieldCheck, Zap, Loader2, Lock, X, Wallet, Delete
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

// Fiat currencies list
const FIAT_CURRENCIES = ["XAF", "EUR", "USD", "XOF", "GHS", "NGN", "KES", "ZAR"];

function ConfirmContent() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [feeConfig, setFeeConfig] = useState<{
    transferFee: number;
    fiatTransferFee: number;
  }>({ transferFee: 0.01, fiatTransferFee: 0.005 });

  // Transaction data from URL params
  const recipientId = searchParams.get("recipientId") || searchParams.get("recipient") || "";
  const recipientName = searchParams.get("recipientName") || searchParams.get("name") || "Utilisateur";
  const amount = parseFloat(searchParams.get("amount") || "0");
  const currency = (searchParams.get("currency") || "XAF").toUpperCase();
  const description = searchParams.get("description") || "Transfert PIMOBIPAY";

  // Determine if currency is fiat and use appropriate fee
  const isFiat = FIAT_CURRENCIES.includes(currency);
  const networkFee = isFiat ? feeConfig.fiatTransferFee : feeConfig.transferFee;
  const totalDebit = amount + networkFee;

// Fetch fees from API
  useEffect(() => {
  const fetchFees = async () => {
  try {
  const res = await fetch("/api/fees", {
  cache: "no-store",
  headers: { "Cache-Control": "no-cache" },
  });
  if (res.ok) {
  const data = await res.json();
  if (data.ok && data.fees) {
  setFeeConfig({
  transferFee: data.fees.transferFee ?? 0.01,
  fiatTransferFee: data.fees.fiatTransferFee ?? 0.005,
  });
  }
  }
  } catch (err) {
  console.error("Fee fetch error:", err);
  }
  };
  fetchFees();
  }, []);

  // Fetch the correct wallet balance for the selected currency
  useEffect(() => {
  const fetchBalance = async () => {
  try {
  const res = await fetch("/api/user/profile", {
  cache: "no-store",
  headers: { "Cache-Control": "no-cache" },
  });
  if (res.ok) {
  const d = await res.json();
  const userWallets = d.user?.wallets || d.wallets || [];
  const targetWallet = userWallets.find(
  (w: any) => String(w.currency || "").toUpperCase() === currency
  );
  const bal = targetWallet?.balance;
  const parsed = typeof bal === "number" ? bal : parseFloat(String(bal ?? "0"));
          setWalletBalance(Number.isFinite(parsed) ? parsed : 0);
        }
      } catch (err) {
        console.error("Erreur recuperation solde:", err);
      }
    };
    fetchBalance();
  }, [currency]);

  const handleNumberClick = (num: string) => {
    if (pin.length >= 4 || isLoading) return;

    const nextPin = `${pin}${num}`;
    setPin(nextPin);

    if (nextPin.length === 4) {
      executeTransaction(nextPin);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const executeTransaction = async (transactionPin: string) => {
    setIsPinModalOpen(false);
    setIsLoading(true);

    try {
      // Use the unified transfer API that handles all currencies + internal/external
      const response = await fetch("/api/user/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientIdentifier: recipientId,
          amount: amount,
          currency: currency,
          description: description,
          pin: transactionPin,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        const isExternal = result.mode === "EXTERNAL";
        toast.success(
          isExternal
            ? "Retrait externe enregistre"
            : t("transfer.signatureAccepted") || "Transfert reussi"
        );

        const qs = new URLSearchParams({
          amount: String(amount),
          currency,
          name: encodeURIComponent(recipientName),
        });
        if (result.transaction?.reference) qs.set("ref", result.transaction.reference);
        if (isExternal) qs.set("mode", "external");

        router.push(`/transfer/success?${qs.toString()}`);
      } else {
        toast.error(result.error || t("transfer.transactionFailed") || "Transaction echouee");
        router.push(`/transfer/failed?error=${encodeURIComponent(result.error || "Erreur")}`);
      }
    } catch (err) {
      toast.error(t("transfer.blockchainError") || "Erreur reseau");
      router.push(`/transfer/failed?error=${encodeURIComponent("Erreur de connexion au serveur")}`);
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
          <h1 className="text-xl font-black uppercase italic">PIMOBIPAY<span className="text-blue-500">.Sign</span></h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("transfer.confirmTransfer") || "Confirmer le transfert"}</p>
        </div>
      </div>

      {/* Current Balance Badge */}
      <div className="mb-6 flex justify-center">
        <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-sm">
          <Wallet size={14} className="text-blue-500" />
          <span className="text-xs font-bold text-slate-300">
            {walletBalance !== null
              ? `${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${currency} ${t("transfer.availableBalance") || "disponible"}`
              : t("transfer.syncing") || "Synchronisation..."}
          </span>
        </div>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-8 shadow-2xl relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Zap size={100} />
        </div>

        <div className="p-10 text-center bg-white/[0.01]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">{t("transfer.amountToSend") || "Montant a envoyer"}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black tracking-tighter">{amount.toLocaleString()}</span>
            <span className="text-2xl font-black italic text-blue-500">{currency}</span>
          </div>
        </div>

        <div className="p-6 space-y-5 border-t border-white/5 bg-black/20">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase">{t("transfer.recipientLabel") || "Destinataire"}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold uppercase truncate max-w-[150px]">{recipientName}</span>
              <ShieldCheck size={14} className="text-emerald-500" />
            </div>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-blue-500 font-black text-[11px] uppercase tracking-tighter">{t("transfer.totalDebitLabel") || "Total Debit"}</span>
              <span className="text-[8px] text-slate-500 font-bold uppercase italic">{t("transfer.includingFees") || "frais inclus"}</span>
            </div>
            <span className={`text-xl font-black ${isInsufficient ? 'text-red-500' : 'text-white'}`}>
              {totalDebit.toFixed(2)} {currency}
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
            : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-600/30"
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

      {/* PIN MODAL */}
      {isPinModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020617]/90 p-4 backdrop-blur-xl animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="transfer-pin-title"
        >
          <div className="w-full max-w-sm overflow-hidden rounded-[32px] border border-emerald-500/20 bg-slate-900/95 p-6 shadow-[0_20px_80px_rgba(16,185,129,0.16)] sm:p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                <h2 id="transfer-pin-title" className="text-sm font-black uppercase tracking-widest text-white">Validation PIN</h2>
              </div>
              <button
                type="button"
                aria-label="Fermer la saisie du PIN"
                onClick={() => { setIsPinModalOpen(false); setPin(""); }}
                className="rounded-full bg-white/5 p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
              Entrez votre code secret pour confirmer
            </p>

            <div className="my-8 flex justify-center gap-4" aria-label={`${pin.length} chiffres sur 4 saisis`}>
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 w-4 rounded-full border-2 border-emerald-500/30 transition-all duration-300 ${pin.length > i ? "scale-125 border-emerald-400 bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]" : "bg-transparent"}`}
                />
              ))}
            </div>

            <div className="mx-auto grid max-w-xs grid-cols-3 gap-3 sm:gap-4">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={key === "delete" ? "Supprimer le dernier chiffre" : key || undefined}
                  onClick={() => key === "delete" ? handleDelete() : key !== "" && handleNumberClick(key)}
                  className={`h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90 active:bg-emerald-600/40 sm:h-16 ${key === "" ? "invisible" : "border border-white/5 bg-white/5 text-white hover:border-emerald-500/30 hover:bg-white/10"}`}
                >
                  {key === "delete" ? <Delete size={22} /> : key}
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
