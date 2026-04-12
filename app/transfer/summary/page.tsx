"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Wallet,
  ShieldCheck,
  Send,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
function detectExternalAddress(identifier: string): boolean {
  const clean = (identifier || "").trim();
  if (!clean || clean.length < 20) return false;
  if (/^G[A-Z2-7]{55}$/.test(clean)) return true;
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) return true;
  if (/^T[a-zA-Z0-9]{33}$/.test(clean)) return true;
  if (/^r[a-zA-Z0-9]{24,33}$/.test(clean)) return true;
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) return true;
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean)) return true;
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(clean)) return true;
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(clean)) return true;
  return false;
}
// Fiat currencies list
const FIAT_CURRENCIES = ["XAF", "EUR", "USD", "XOF", "GHS", "NGN", "KES", "ZAR"];

function SummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [feeConfig, setFeeConfig] = useState<{
    transferFee: number;
    fiatTransferFee: number;
  }>({ transferFee: 0.01, fiatTransferFee: 0.005 });
  const [feeLoading, setFeeLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    // Fetch fees from API
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
      } finally {
        setFeeLoading(false);
      }
    };
    fetchFees();
  }, []);
const data = useMemo(() => {
  const recipientId = searchParams.get("recipient") || "";
  const name = searchParams.get("recipientName") || "Utilisateur";
  const avatar = searchParams.get("recipientAvatar") || "";
  const currency = (searchParams.get("currency") || "XAF").toUpperCase();
  const amount = parseFloat(searchParams.get("amount") || "0");
  const description = searchParams.get("description") || "Transfert PimPay";
  
  // Determine if currency is fiat and use appropriate fee rate
  const isFiat = FIAT_CURRENCIES.includes(currency);
  const feeRate = isFiat ? feeConfig.fiatTransferFee : feeConfig.transferFee;
  
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 0;
  const isExternal = detectExternalAddress(recipientId);
  return {
  recipientId,
  name,
  avatar,
  amount: safeAmount,
  currency,
  description,
  fee: feeRate,
  isExternal,
  };
  }, [searchParams, feeConfig]);
  const totalRequired = useMemo(() => data.amount + data.fee, [data.amount, data.fee]);
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
      // Pour les transferts externes Pi, utiliser l'API mpay/external-transfer
      // qui fait un broadcast direct sur la blockchain (comme mpay/send)
      if (data.isExternal && data.currency === "PI") {
        const response = await fetch("/api/mpay/external-transfer", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            destination: data.recipientId,
            amount: data.amount,
            memo: data.description || `Retrait PimPay`,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && result.success) {
          const txRef = result.data?.txid || `WD-${Date.now()}`;
          const status = result.data?.status || "BROADCASTED";
          const blockchainHash = result.data?.blockchainTxHash || "";
          toast.success(result.message || "Transfert Pi reussi !");
          const qs = new URLSearchParams({
            amount: String(data.amount),
            currency: data.currency,
            name: data.name,
            ref: txRef,
            mode: "external",
            status: status,
          });
          if (blockchainHash) qs.set("hash", blockchainHash);
          router.push(`/transfer/success?${qs.toString()}`);
        } else {
          const errorMsg = result?.error || `Erreur ${response.status}`;
          router.push(`/transfer/failed?error=${encodeURIComponent(errorMsg)}`);
        }
        return;
      }

      // Pour les transferts internes ou autres devises, utiliser l'API user/transfer
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
  if (!mounted || balanceLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
        <Loader2 className="animate-spin text-blue-500" size={48} />
        <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">Sécurisation du flux...</p>
      </div>
    );
  }
  if (!data.recipientId || data.amount <= 0) {
    return (
      <div className="min-h-screen bg-[#020617] text-white p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-slate-900/40 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="text-red-400" />
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
    <div className="min-h-screen bg-[#020617] text-white pb-36 font-sans overflow-x-hidden">
      <div className="px-6 pt-10 pb-6 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-3 rounded-xl bg-white/5 border border-white/10 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tight leading-none">Récapitulatif</h1>
          <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest mt-1">Validation de transfert</p>
        </div>
      </div>
      <div className="px-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Card className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-10 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Send size={80} /></div>
          <p className="text-[10px] font-black text-blue-400 uppercase mb-3 tracking-[0.2em]">Montant à envoyer</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-black tracking-tighter">
              {data.currency === "PI" 
                ? (data.amount < 0.0001 
                    ? data.amount.toFixed(10).replace(/0+$/, '').replace(/\.$/, '') 
                    : data.amount.toFixed(8).replace(/0+$/, '').replace(/\.$/, ''))
                : data.amount.toLocaleString()}
            </span>
            <span className="text-xl font-bold text-blue-500 uppercase">{data.currency}</span>
          </div>
          <p className="mt-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            Solde disponible: {walletBalance !== null 
              ? `${data.currency === "PI" 
                  ? (walletBalance < 0.0001 
                      ? walletBalance.toFixed(10).replace(/0+$/, '').replace(/\.$/, '') 
                      : walletBalance.toFixed(8).replace(/0+$/, '').replace(/\.$/, ''))
                  : walletBalance.toLocaleString()} ${data.currency}` 
              : "—"}
          </p>
        </Card>
        <Card className="bg-white/[0.03] border border-white/5 rounded-3xl p-6">
          <div className="flex items-center gap-4">
            {data.avatar ? (
              <div className="w-14 h-14 rounded-full border-2 border-blue-500 p-0.5 shrink-0">
                <img
                  src={data.avatar}
                  alt="Avatar"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-900 rounded-full flex items-center justify-center text-xl font-black border-2 border-white/10 shrink-0">
                {data.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Bénéficiaire</p>
              <p className="text-white font-black text-lg truncate">{data.name}</p>
              <p className={`text-[9px] font-bold uppercase tracking-widest ${data.isExternal ? "text-amber-400" : "text-blue-400"}`}>
                {data.isExternal ? "Adresse externe" : "Compte PimPay"}
              </p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 space-y-5">
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Montant</span>
            <span className="text-white">
              {data.currency === "PI" 
                ? (data.amount < 0.0001 
                    ? data.amount.toFixed(10).replace(/0+$/, '').replace(/\.$/, '') 
                    : data.amount.toFixed(8).replace(/0+$/, '').replace(/\.$/, ''))
                : data.amount.toLocaleString()} {data.currency}
            </span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Frais de réseau</span>
            <span className="text-red-400">+{data.fee} {data.currency}</span>
          </div>
          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-slate-500">Description</span>
            <span className="text-white truncate max-w-[150px]">{data.description}</span>
          </div>
          <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
            <span className="text-blue-400">Total à débiter</span>
            <span className={`text-lg ${isInsufficient ? "text-red-500" : "text-white"}`}>
              {data.currency === "PI" 
                ? (totalRequired < 0.0001 
                    ? totalRequired.toFixed(10).replace(/0+$/, '').replace(/\.$/, '') 
                    : totalRequired.toFixed(8).replace(/0+$/, '').replace(/\.$/, ''))
                : totalRequired.toLocaleString(undefined, { minimumFractionDigits: 2 })} {data.currency}
            </span>
          </div>
        </Card>
        <Card className="bg-white/[0.03] border border-white/5 rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Wallet size={18} className="text-blue-500" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-500 uppercase">Portefeuille source</p>
                <p className="text-[11px] font-black uppercase text-white">{data.currency}</p>
              </div>
            </div>
            <span className="text-sm font-black text-white">
              {walletBalance !== null
                ? `${data.currency === "PI" 
                    ? (walletBalance < 0.0001 
                        ? walletBalance.toFixed(10).replace(/0+$/, '').replace(/\.$/, '') 
                        : walletBalance.toFixed(8).replace(/0+$/, '').replace(/\.$/, ''))
                    : walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${data.currency}`
                : "—"}
            </span>
          </div>
        </Card>
        {data.isExternal && (
          <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="text-amber-500" size={20} />
            </div>
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
              Vérifie attentivement l'adresse. Un envoi externe peut être irréversible.
            </p>
          </div>
        )}
        {isInsufficient && (
          <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-2xl flex gap-4">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="text-red-500" size={20} />
            </div>
            <p className="text-[9px] font-bold text-red-400 leading-relaxed uppercase">
              Solde insuffisant pour couvrir le montant + les frais.
            </p>
          </div>
        )}
        {!data.isExternal && !isInsufficient && (
          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl flex gap-4">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="text-blue-500" size={20} />
            </div>
            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase">
              Vérifiez les informations avant de confirmer. Cette action est définitive.
            </p>
          </div>
        )}
        <div className="space-y-4">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full h-16 rounded-2xl font-black uppercase text-[12px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
              !canConfirm
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white shadow-blue-600/20 active:scale-95"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Transfert en cours...</span>
              </>
            ) : (
              <>
                <span>Confirmer le transfert</span>
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 opacity-30 pt-4">
          <ShieldCheck size={14} />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white">Sécurisé par PimPay Flow Engine</span>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
export default function SummaryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center gap-4">
          <Loader2 className="animate-spin text-blue-500" size={48} />
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-500/50">Sécurisation du flux...</p>
        </div>
      }
    >
      <SummaryContent />
    </Suspense>
  );
}
