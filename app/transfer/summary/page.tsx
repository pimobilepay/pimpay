"use client";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  AlertTriangle,
  Wallet,
  ShieldCheck,
  Send,
  Copy,
  Check,
  Globe,
  Users,
  Clock,
  Network,
  FileText,
  Lock,
  Banknote,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import { usePiPrice } from "@/hooks/usePiPrice";
import { toast } from "sonner";
import { KycRequiredModal, isKycPolicyError } from "@/components/kyc-required-modal";
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
// Détecte le réseau blockchain à partir de l'adresse pour afficher plus de détails
function detectNetwork(identifier: string, currency: string): string {
  const clean = (identifier || "").trim();
  if (/^G[A-Z2-7]{55}$/.test(clean)) return "Pi Network";
  if (/^0x[a-fA-F0-9]{40}$/.test(clean)) return "Ethereum (EVM)";
  if (/^T[a-zA-Z0-9]{33}$/.test(clean)) return "Tron (TRC20)";
  if (/^r[a-zA-Z0-9]{24,33}$/.test(clean)) return "XRP Ledger";
  if (/^bc1[a-zA-HJ-NP-Z0-9]{39,59}$/.test(clean)) return "Bitcoin (SegWit)";
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean)) return "Bitcoin";
  if (/^[LM][a-km-zA-HJ-NP-Z1-9]{26,33}$/.test(clean)) return "Litecoin";
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(clean)) return "Solana";
  return currency === "PI" ? "Réseau PimPay" : `Réseau ${currency}`;
}
// Formate un montant Pi proprement (sans zéros superflus)
function fmtPi(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return value < 0.0001
    ? value.toFixed(10).replace(/0+$/, "").replace(/\.$/, "")
    : value.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
}
// Fiat currencies list
const FIAT_CURRENCIES = ["XAF", "EUR", "USD", "XOF", "GHS", "NGN", "KES", "ZAR"];

// Mapping devise fiat -> code drapeau (comme la page swap)
const CURRENCY_FLAG: Record<string, string> = {
  USD: "us",
  EUR: "eu",
  XAF: "cm",
  XOF: "sn",
  CDF: "cd",
  NGN: "ng",
  AED: "ae",
  MGA: "mg",
  GHS: "gh",
  KES: "ke",
  ZAR: "za",
};

// Mapping crypto -> logo
const CRYPTO_LOGO: Record<string, string> = {
  PI: "/pi.png",
  SDA: "/sda.png",
  BTC: "/btc.png",
  ETH: "/eth.png",
  USDT: "/usdt.png",
  USDC: "/usdc.png",
};

// Icône de devise : drapeau fiat (flagcdn) ou logo crypto, comme sur la page swap
function CurrencyIcon({ currency, size = 40 }: { currency: string; size?: number }) {
  const cur = (currency || "").toUpperCase();
  const logo = CRYPTO_LOGO[cur];
  if (logo) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10"
        style={{ width: size, height: size }}
      >
        <img src={logo} alt={cur} className="w-3/4 h-3/4 object-contain" />
      </div>
    );
  }
  const flag = CURRENCY_FLAG[cur];
  if (flag) {
    return (
      <div
        className="rounded-full flex items-center justify-center shrink-0 overflow-hidden bg-white/5 border border-white/10"
        style={{ width: size, height: size }}
      >
        <img
          src={`https://flagcdn.com/w80/${flag}.png`}
          srcSet={`https://flagcdn.com/w160/${flag}.png 2x`}
          alt={`${cur} flag`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-black text-white bg-blue-600"
      style={{ width: size, height: size, fontSize: size * 0.35 }}
    >
      {cur.slice(0, 2)}
    </div>
  );
}

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
  const [copied, setCopied] = useState(false);
  // KYC / limites — message professionnel
  const [kycModal, setKycModal] = useState<{ open: boolean; message?: string; code?: string }>({ open: false });
  // Prix Pi configuré par l'admin (Réglages → Politique Monétaire)
  const { price: piPrice } = usePiPrice();

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
  const network = useMemo(
    () => detectNetwork(data.recipientId, data.currency),
    [data.recipientId, data.currency]
  );
  // Estimation de la valeur en USD pour les transferts Pi (détail supplémentaire)
  const usdValue = useMemo(() => {
    if (data.currency !== "PI" || !piPrice || piPrice <= 0) return null;
    return data.amount * piPrice;
  }, [data.currency, data.amount, piPrice]);
  const estimatedTime = data.isExternal ? "1 - 5 min" : "Instantané";
  const copyAddress = () => {
    if (!data.recipientId) return;
    navigator.clipboard.writeText(data.recipientId);
    setCopied(true);
    toast.success("Adresse copiée");
    setTimeout(() => setCopied(false), 1500);
  };
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
    data.amount >= 0.00000001 &&
    !!data.currency;
  const handleConfirm = async () => {
    if (!canConfirm) {
      if (!data.recipientId) toast.error("Destinataire manquant.");
      else if (data.amount < 0.00000001) toast.error("Montant minimum: 0.00000001");
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
          if (isKycPolicyError(result)) {
            setKycModal({ open: true, message: result.error, code: result.code });
            setIsLoading(false);
            return;
          }
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
        toast.success(isExt ? "Retrait externe enregistre !" : "Transfert reussi !");
        
        // Mettre a jour le solde local immediatement
        if (typeof result.newBalance === 'number') {
          setWalletBalance(result.newBalance);
        }
        
        const ref = result?.transaction?.reference;
        const qs = new URLSearchParams({
          amount: String(data.amount),
          currency: data.currency,
          name: data.name,
        });
        if (ref) qs.set("ref", ref);
        if (isExt) qs.set("mode", "external");
        if (typeof result.newBalance === 'number') qs.set("newBalance", String(result.newBalance));
        router.push(`/transfer/success?${qs.toString()}`);
      } else {
        if (isKycPolicyError(result)) {
          setKycModal({ open: true, message: result.error, code: result.code });
          setIsLoading(false);
          return;
        }
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
  if (!data.recipientId || data.amount < 0.00000001) {
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
  const amountDisplay = data.currency === "PI" ? fmtPi(data.amount) : data.amount.toLocaleString();
  const balanceDisplay =
    walletBalance !== null
      ? data.currency === "PI"
        ? fmtPi(walletBalance)
        : walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })
      : "—";
  const totalDisplay =
    data.currency === "PI"
      ? fmtPi(totalRequired)
      : totalRequired.toLocaleString(undefined, { minimumFractionDigits: 2 });
  const shortAddress = data.isExternal
    ? `${data.recipientId.slice(0, 8)}…${data.recipientId.slice(-6)}`
    : data.recipientId;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-40 font-sans overflow-x-hidden">
      <KycRequiredModal
        open={kycModal.open}
        message={kycModal.message}
        code={kycModal.code}
        onClose={() => setKycModal({ open: false })}
      />
      {/* Glow décoratif */}
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-72 bg-blue-600/10 blur-3xl rounded-full" />

      {/* Header */}
      <header className="relative px-6 pt-10 pb-4 flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-3 rounded-2xl bg-white/5 border border-white/10 active:scale-95 transition-transform"
          aria-label="Retour"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-black tracking-tight leading-none">Récapitulatif</h1>
          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.25em] mt-1.5">
            Validation de transfert
          </p>
        </div>
        <span
          className={`px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${
            data.isExternal
              ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
          }`}
        >
          {data.isExternal ? "Externe" : "Interne"}
        </span>
      </header>

      <main className="relative px-6 space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* BLOC UNIQUE : MONTANT + SOLDE + BÉNÉFICIAIRE + DÉTAILS */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-b from-blue-600/15 via-slate-900/60 to-slate-900/80 p-6 shadow-2xl">
          <div className="absolute -top-6 -right-6 opacity-[0.07] pointer-events-none">
            <Send size={140} />
          </div>

          {/* Montant avec icône de devise */}
          <p className="text-[10px] font-black text-blue-300 uppercase tracking-[0.25em] text-center">
            Montant à envoyer
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <CurrencyIcon currency={data.currency} size={44} />
            <span className="text-5xl font-black tracking-tighter leading-none break-all">
              {amountDisplay}
            </span>
            <span className="text-2xl font-black text-blue-400 uppercase mb-0.5">{data.currency}</span>
          </div>
          {usdValue !== null && (
            <p className="mt-3 text-center text-[11px] font-bold text-slate-300">
              {"\u2248"} ${usdValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} USD
            </p>
          )}

          {/* Solde disponible */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-black/30 border border-white/5 py-2.5">
            <Wallet size={13} className="text-slate-400" />
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              Solde disponible : {balanceDisplay} {data.currency}
            </span>
          </div>

          <div className="my-6 h-px bg-white/10" />

          {/* Bénéficiaire */}
          <div className="flex items-center gap-4">
            {data.avatar ? (
              <div className="w-14 h-14 rounded-2xl border-2 border-blue-500 p-0.5 shrink-0">
                <img src={data.avatar} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
              </div>
            ) : (
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black border-2 border-white/10 shrink-0 ${
                  data.isExternal
                    ? "bg-gradient-to-br from-amber-600 to-amber-900"
                    : "bg-gradient-to-br from-blue-600 to-blue-900"
                }`}
              >
                {data.isExternal ? <Globe size={22} /> : data.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Bénéficiaire
              </p>
              <p className="text-white font-black text-base truncate">{data.name}</p>
              <p
                className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                  data.isExternal ? "text-amber-400" : "text-blue-400"
                }`}
              >
                {data.isExternal ? <Globe size={10} /> : <Users size={10} />}
                {data.isExternal ? "Adresse externe" : "Compte PimPay"}
              </p>
            </div>
          </div>
          {data.isExternal && (
            <button
              onClick={copyAddress}
              className="mt-4 w-full flex items-center justify-between gap-2 rounded-xl bg-black/30 border border-white/5 px-4 py-3 active:scale-[0.98] transition-transform"
            >
              <span className="text-[11px] font-mono text-slate-300 truncate">{shortAddress}</span>
              {copied ? (
                <Check size={14} className="text-emerald-400 shrink-0" />
              ) : (
                <Copy size={14} className="text-slate-500 shrink-0" />
              )}
            </button>
          )}

          <div className="my-6 h-px bg-white/10" />

          {/* Détails de l'opération */}
          <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
            Détails de l'opération
          </p>
          <div className="space-y-1">
            <DetailLine
              icon={<ArrowRight size={15} />}
              label="Montant"
              value={`${amountDisplay} ${data.currency}`}
            />
            <DetailLine
              icon={<Banknote size={15} />}
              label="Frais de réseau"
              value={`+${data.fee} ${data.currency}`}
              valueClass="text-red-400"
            />
            <DetailLine
              icon={<Network size={15} />}
              label="Réseau"
              value={network}
            />
            <DetailLine
              icon={<Clock size={15} />}
              label="Délai estimé"
              value={estimatedTime}
            />
            <DetailLine
              icon={<FileText size={15} />}
              label="Description"
              value={data.description}
              truncate
            />
          </div>
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
              Total à débiter
            </span>
            <span className={`text-xl font-black ${isInsufficient ? "text-red-500" : "text-white"}`}>
              {totalDisplay} {data.currency}
            </span>
          </div>
        </section>

        {/* ALERTES */}
        {data.isExternal && (
          <NoticeBox tone="amber">
            Vérifie attentivement l'adresse et le réseau. Un envoi externe est irréversible.
          </NoticeBox>
        )}
        {isInsufficient && (
          <NoticeBox tone="red">Solde insuffisant pour couvrir le montant + les frais.</NoticeBox>
        )}
        {!data.isExternal && !isInsufficient && (
          <NoticeBox tone="blue">
            Vérifiez les informations avant de confirmer. Cette action est définitive.
          </NoticeBox>
        )}

        <div className="flex items-center justify-center gap-2 opacity-30 pt-2">
          <Lock size={12} />
          <span className="text-[8px] font-bold uppercase tracking-widest text-white">
            Sécurisé par PimPay Flow Engine
          </span>
        </div>
      </main>

      {/* CTA STICKY */}
      <div className="fixed bottom-20 inset-x-0 px-6 z-40">
        <div className="max-w-md mx-auto rounded-[1.5rem] bg-[#020617]/80 backdrop-blur-xl border border-white/10 p-2 shadow-2xl">
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`w-full h-15 py-4 rounded-[1.1rem] font-black uppercase text-[12px] tracking-widest transition-all flex items-center justify-center gap-3 ${
              !canConfirm
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-[0.98]"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Transfert en cours...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Confirmer le transfert</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}

function DetailLine({
  icon,
  label,
  value,
  valueClass,
  truncate,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-blue-400 shrink-0">
          {icon}
        </div>
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      </div>
      <span
        className={`text-[12px] font-bold ${valueClass || "text-white"} ${
          truncate ? "truncate max-w-[140px]" : "text-right"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function NoticeBox({ tone, children }: { tone: "amber" | "red" | "blue"; children: React.ReactNode }) {
  const tones = {
    amber: { bg: "bg-amber-500/5", border: "border-amber-500/20", icon: "text-amber-500", text: "text-slate-400" },
    red: { bg: "bg-red-500/5", border: "border-red-500/20", icon: "text-red-500", text: "text-red-400" },
    blue: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: "text-blue-500", text: "text-slate-400" },
  }[tone];
  return (
    <div className={`p-4 ${tones.bg} border ${tones.border} rounded-2xl flex gap-4 items-center`}>
      <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
        <AlertTriangle className={tones.icon} size={18} />
      </div>
      <p className={`text-[9px] font-bold ${tones.text} leading-relaxed uppercase`}>{children}</p>
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
