"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertCircle,
  Wallet,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

/** Détection simple “comme la page send” (interne vs externe) */
function detectExternalAddress(identifier: string): boolean {
  const clean = (identifier || "").trim();
  if (!clean || clean.length < 20) return false;

  if (/^G[A-Z2-7]{55}$/.test(clean)) return true; // Stellar/Pi
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) return true; // EVM
  if (/^T[a-zA-Z0-9]{33}$/.test(clean)) return true; // TRON
  if (/^r[a-zA-Z0-9]{24,33}$/.test(clean)) return true; // XRP
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) return true; // Solana
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean)) return true; // BTC legacy
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(clean)) return true; // BTC bech32
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(clean)) return true; // LTC

  return false;
}

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  const data = useMemo(() => {
    const recipientId = searchParams.get("recipient") || "";
    const name = searchParams.get("recipientName") || "Utilisateur";
    const avatar = searchParams.get("recipientAvatar") || "";
    const currency = (searchParams.get("currency") || "XAF").toUpperCase();

    const amount = parseFloat(searchParams.get("amount") || "0");
    const feeParam = parseFloat(searchParams.get("fee") || "0.01");

    const description = searchParams.get("description") || "Transfert PimPay";

    const fee = Number.isFinite(feeParam) && feeParam >= 0 ? feeParam : 0.01;
    const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;

    const isExternal = detectExternalAddress(recipientId);

    return {
      recipientId,
      name,
      avatar,
      amount: safeAmount,
      currency,
      description,
      fee,
      isExternal,
    };
  }, [searchParams]);

  const totalRequired = useMemo(() => data.amount + data.fee, [data.amount, data.fee]);

  // --- RÉCUPÉRATION DU SOLDE RÉEL ---
  useEffect(() => {
    if (!mounted) return;

    const ac = new AbortController();

    const fetchBalance = async () => {
      setBalanceLoading(true);
      try {
        const res = await fetch("/api/user/profile", {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
          signal: ac.signal,
        });

        if (!res.ok) {
          setWalletBalance(0);
          return;
        }

        const d = await res.json();
        const userWallets = d.user?.wallets || d.wallets || [];
        const targetWallet = userWallets.find(
          (w: any) => String(w.currency || "").toUpperCase() === data.currency
        );

        const bal = targetWallet?.balance;
        const parsed = typeof bal === "number" ? bal : parseFloat(String(bal ?? "0"));

        setWalletBalance(Number.isFinite(parsed) ? parsed : 0);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error("Erreur solde:", err);
          setWalletBalance(0);
        }
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
    return () => ac.abort();
  }, [data.currency, mounted]);

  const isInsufficient =
    walletBalance !== null && Number.isFinite(walletBalance) && walletBalance < totalRequired;

  const canConfirm =
    mounted &&
    !isLoading &&
    !isInsufficient &&
    !!data.recipientId &&
    data.amount > 0 &&
    !!data.currency;

  const handleConfirm = async () => {
    if (!canConfirm) {
      if (!data.recipientId) toast.error("Destinataire manquant.");
      else if (data.amount <= 0) toast.error("Montant invalide.");
      return;
    }

    if (walletBalance !== null && walletBalance < totalRequired) {
      toast.error(`Solde ${data.currency} insuffisant.`);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/user/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify({
          recipientIdentifier: data.recipientId,
          amount: data.amount,
          currency: data.currency,
          description: data.description,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (response.ok && result.success) {
        const isExt = result.mode === "EXTERNAL";
        toast.success(isExt ? "Retrait externe enregistré !" : "Transfert réussi !");

        const ref = result?.transaction?.reference;
        const qs = new URLSearchParams({
          amount: String(data.amount),
          currency: data.currency,
          name: data.name,
        });
        if (ref) qs.set("ref", ref);
        if (isExt) qs.set("mode", "external");

        router.push(`/transfer/success?${qs.toString()}`);
      } else {
        const msg = result?.error || "Transaction refusée";
        router.push(`/transfer/failed?error=${encodeURIComponent(msg)}`);
      }
    } catch (err) {
      router.push("/transfer/failed?error=Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (!data.recipientId || data.amount <= 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900/40 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="text-red-400" />
            <h2 className="font-black uppercase tracking-tight">Récapitulatif invalide</h2>
          </div>
          <p className="text-sm text-slate-400">
            Informations manquantes. Retourne à la page précédente.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-5 w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 font-black uppercase tracking-widest"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-12 font-sans">
      <div className="flex items-center gap-4 mb-8 pt-4">
        <button
          onClick={() => router.back()}
          className="p-3 bg-slate-900 border border-white/5 rounded-full active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black uppercase tracking-tighter">Récapitulatif</h2>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
            Vérification finale
          </p>
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
          {!data.isExternal ? (
            <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full p-1 border-2 border-[#020617]">
              <CheckCircle2 size={14} className="text-white" />
            </div>
          ) : (
            <div className="absolute -bottom-1 -right-1 bg-amber-500 rounded-full p-1 border-2 border-[#020617]">
              <AlertCircle size={14} className="text-white" />
            </div>
          )}
        </div>
        <h2 className="text-lg font-black uppercase tracking-tight text-center">{data.name}</h2>
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${data.isExternal ? "text-amber-400" : "text-slate-500"}`}>
          {data.isExternal ? "Adresse externe (réseau)" : "Bénéficiaire certifié"}
        </p>
      </div>

      <div className="bg-slate-900/40 border border-white/10 rounded-[32px] overflow-hidden mb-6 shadow-2xl">
        <div className="p-8 text-center bg-white/[0.02]">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">
            Montant à envoyer
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-4xl font-black tracking-tighter">
              {data.amount.toLocaleString()}
            </span>
            <span className="text-xl font-black italic text-blue-500">{data.currency}</span>
          </div>
        </div>
        <div className="p-6 space-y-4 border-t border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Frais Réseau
            </span>
            <span className="text-sm font-bold">
              {data.fee} {data.currency}
            </span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center">
            <span className="text-blue-500 font-black text-[11px] uppercase tracking-wider">
              Total Débit
            </span>
            <span className={`text-xl font-black ${isInsufficient ? "text-red-500" : "text-white"}`}>
              {totalRequired.toLocaleString(undefined, { minimumFractionDigits: 2 })}{" "}
              {data.currency}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between p-5 bg-white/5 rounded-[24px] mb-6 border border-white/5">
        <div className="flex items-center gap-3">
          <Wallet size={18} className="text-blue-500" />
          <div>
            <p className="text-[9px] font-black text-slate-500 uppercase">Portefeuille</p>
            <p className="text-[11px] font-black uppercase">{data.currency}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-sm font-black text-white">
            {balanceLoading
              ? "Chargement..."
              : walletBalance !== null
                ? `${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${data.currency}`
                : "—"}
          </span>
        </div>
      </div>

      {data.isExternal && (
        <div className="flex items-center gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl mb-6">
          <AlertCircle size={20} className="text-amber-400 flex-shrink-0" />
          <p className="text-[10px] font-black text-amber-400 uppercase tracking-tight">
            Vérifie attentivement l'adresse. Un envoi externe peut être irréversible.
          </p>
        </div>
      )}

      {isInsufficient && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-8">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
          <p className="text-[10px] font-black text-red-500 uppercase tracking-tight">
            Solde insuffisant pour couvrir le montant + les frais.
          </p>
        </div>
      )}

      <button
        onClick={handleConfirm}
        disabled={!canConfirm}
        className={`w-full py-6 rounded-[28px] flex items-center justify-center gap-3 transition-all shadow-xl ${
          !canConfirm
            ? "bg-slate-800 text-slate-500 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20 active:scale-95"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin" size={20} />
            <span className="font-black uppercase tracking-widest text-sm">
              Transfert en cours...
            </span>
          </div>
        ) : (
          <>
            <span className="font-black uppercase tracking-widest text-sm">
              Confirmer l'envoi
            </span>
            <ArrowRight size={20} />
          </>
        )}
      </button>
    </div>
  );
}

export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" />
        </div>
      }
    >
      <SummaryContent />
    </Suspense>
  );
}
