"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  ArrowRight,
  Wallet,
  Loader2,
  Share2,
  Copy,
  BadgeCheck,
  Sparkles,
  TrendingUp,
  Banknote,
  Clock,
  Shield,
  User,
  RotateCcw,
  ArrowLeft,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const PI_GCV_PRICE = 314159;

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref = searchParams.get("ref");
  const urlAmount = searchParams.get("amount");
  const urlCurrency = searchParams.get("currency") || "XAF";
  const urlName = searchParams.get("name") || "Utilisateur";
  const modeParam = searchParams.get("mode");

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchTx = useCallback(async () => {
    if (!ref) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/transaction/details?ref=${ref}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        setTransaction(data);
      }
    } catch (e) {
      console.error("Erreur sync:", e);
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  const currency = transaction?.currency || urlCurrency;
  const amount = Number(transaction?.amount) || Number(urlAmount) || 0;
  const isExternalMode = modeParam === "external";
  const isPiPending = currency === "PI" && isExternalMode;

  const amountUSD =
    currency === "PI"
      ? amount * PI_GCV_PRICE
      : currency === "XAF"
      ? amount / 600
      : amount;

  const reference = transaction?.reference || ref || "PIMPAY-TR";
  const createdAt = transaction?.createdAt ? new Date(transaction.createdAt) : new Date();
  const recipientName = transaction?.recipientName || urlName;
  const recipientAvatar = (recipientName || "U")[0].toUpperCase();

  const fee = transaction?.fee ?? (currency === "PI" ? "0.01 PI" : "0.00");
  const network = currency === "PI" ? "Pi Network" : currency === "XAF" || currency === "XOF" ? "PimPay Fiat" : "PimPay";

  // Crypto currencies that display 8 decimal places
  const CRYPTO_CURRENCIES = ["PI", "BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP"];
  const isCrypto = (cur: string) => CRYPTO_CURRENCIES.includes(cur.toUpperCase());

  const formatAmount = (val: number, cur: string) => {
    if (isCrypto(cur))
      return val < 0.0001
        ? val.toFixed(10).replace(/0+$/, "").replace(/\.$/, "")
        : val.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    return val.toLocaleString("fr-FR");
  };

  const formatFee = (rawFee: string | number, cur: string): string => {
    if (rawFee === null || rawFee === undefined || rawFee === "") return "0.00";

    // If fee is already a formatted string with currency label (e.g. "0.01 PI"), parse it
    const strFee = String(rawFee).trim();
    const match = strFee.match(/^([\d.]+)\s*([A-Z]*)$/);

    if (match) {
      const numVal = parseFloat(match[1]);
      const feeCur = match[2] || cur;

      if (isNaN(numVal)) return strFee;

      if (isCrypto(feeCur)) {
        const formatted = numVal.toFixed(8).replace(/0+$/, "").replace(/\.$/, "0");
        return feeCur ? `${formatted} ${feeCur}` : formatted;
      }

      const formatted = numVal.toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      return feeCur && !["XAF", "XOF", "USD", "EUR"].includes(feeCur)
        ? `${formatted} ${feeCur}`
        : formatted;
    }

    // Numeric value without label
    const numVal = parseFloat(strFee);
    if (!isNaN(numVal)) {
      if (isCrypto(cur)) {
        return numVal.toFixed(8).replace(/0+$/, "").replace(/\.$/, "0") + ` ${cur}`;
      }
      return numVal.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    return strFee;
  };

  const copyRef = () => {
    navigator.clipboard.writeText(reference);
    setCopied(true);
    toast.success("Reference copiee !");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !urlAmount)
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-500 mb-4 mx-auto" size={40} />
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
            Chargement du recu...
          </p>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-[#020617] text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: isPiPending ? 0.2 : 0.3, scale: 1.2 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] ${
            isPiPending ? "bg-amber-500/20" : "bg-emerald-500/20"
          }`}
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 0.5, duration: 1 }}
          className={`absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t ${
            isPiPending ? "from-amber-500/10" : "from-emerald-500/10"
          } to-transparent`}
        />
        {!isPiPending &&
          [...Array(18)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 100, x: Math.random() * 400 - 200 }}
              animate={{ opacity: [0, 1, 0], y: -200, x: Math.random() * 400 - 200 }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: Math.random() * 2,
                repeat: Infinity,
                repeatDelay: Math.random() * 3,
              }}
              className="absolute bottom-0 left-1/2 w-1.5 h-1.5 bg-emerald-400/50 rounded-full"
            />
          ))}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center justify-between pt-4 mb-6"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isPiPending ? "bg-amber-500/10" : "bg-emerald-500/10"
              }`}
            >
              <BadgeCheck
                size={16}
                className={isPiPending ? "text-amber-400" : "text-emerald-400"}
              />
            </div>
            <span
              className={`text-[10px] font-black uppercase tracking-[0.15em] ${
                isPiPending ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {isPiPending ? "En Attente" : "Transaction Confirmee"}
            </span>
          </div>
          <button
            onClick={copyRef}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[9px] font-bold text-slate-400 hover:bg-white/10 transition-all"
          >
            {copied ? (
              <CheckCircle2 size={10} className="text-emerald-400" />
            ) : (
              <Copy size={10} />
            )}
            Copier Ref
          </button>
        </motion.div>

        {/* Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
          className="flex justify-center mb-6"
        >
          <div className="relative">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`absolute inset-0 rounded-full blur-2xl ${
                isPiPending ? "bg-amber-500/30" : "bg-emerald-500/30"
              }`}
            />
            <div
              className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
                isPiPending
                  ? "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30"
                  : "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
              }`}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
              >
                {isPiPending ? (
                  <Loader2 size={48} className="text-white animate-spin" strokeWidth={2.5} />
                ) : (
                  <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
                )}
              </motion.div>
            </div>
            {!isPiPending && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="absolute -right-1 -top-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
              >
                <Sparkles size={14} className="text-white" />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl font-black uppercase tracking-tight mb-2">
            {isPiPending ? (
              <>Retrait Pi <span className="text-amber-400">En Attente</span></>
            ) : isExternalMode ? (
              <>Retrait <span className="text-emerald-400">Enregistre</span></>
            ) : (
              <>Transfert <span className="text-emerald-400">Reussi</span></>
            )}
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            {isPiPending
              ? "Traitement sous 24-48h par notre equipe"
              : isExternalMode
              ? "Retrait blockchain en traitement"
              : `Envoye a ${recipientName}`}
          </p>
        </motion.div>

        {/* Pi Pending Notice */}
        <AnimatePresence>
          {isPiPending && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mb-4 text-center"
            >
              <p className="text-amber-400 text-xs font-bold">
                Les retraits Pi vers adresses externes sont traites manuellement. Vous recevrez une notification une fois le transfert effectue.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Transaction Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/10 rounded-[2rem] p-5 mb-4 backdrop-blur-xl"
        >
          {/* Sender -> Recipient */}
          <div className="flex items-center justify-between mb-6 gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Montant Envoye
              </p>
              <div className="flex items-center gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-white text-sm"
                  style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
                >
                  {currency === "PI" ? "PI" : currency === "XAF" ? "XA" : currency.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-black truncate text-white">
                    {formatAmount(amount, currency)}
                  </p>
                  <p className="text-xs text-slate-400 font-bold">{currency}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center shrink-0">
              <motion.div
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className={`w-9 h-9 rounded-full flex items-center justify-center border ${
                  isPiPending
                    ? "bg-amber-500/10 border-amber-500/20"
                    : "bg-emerald-500/10 border-emerald-500/20"
                }`}
              >
                <ArrowRight
                  size={16}
                  className={isPiPending ? "text-amber-400" : "text-emerald-400"}
                />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0 text-right">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
                Destinataire
              </p>
              <div className="flex items-center gap-2 justify-end">
                <div className="min-w-0">
                  <p
                    className={`text-lg font-black truncate ${
                      isPiPending ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {recipientName}
                  </p>
                  <p className="text-xs text-slate-400 font-bold">Beneficiaire</p>
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-black text-white text-sm border border-white/10"
                  style={{ background: "linear-gradient(135deg, #64748b, #334155)" }}
                >
                  <User size={16} />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

          {/* USD equivalent */}
          <div className="flex justify-center mb-4">
            <span
              className={`text-[11px] font-black uppercase tracking-widest py-1 px-4 rounded-full border inline-block ${
                isPiPending
                  ? "bg-amber-500/5 border-amber-500/10 text-amber-500/80"
                  : "bg-emerald-500/5 border-emerald-500/10 text-emerald-500/80"
              }`}
            >
              ≈ ${amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
            </span>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp size={10} className="text-blue-400" />
                <p className="text-[8px] font-black text-slate-500 uppercase">Reseau</p>
              </div>
              <p className="text-xs font-bold text-white">{network}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Banknote size={10} className="text-amber-400" />
                <p className="text-[8px] font-black text-slate-500 uppercase">Frais</p>
              </div>
              <p className="text-xs font-bold text-white">{formatFee(fee, currency)}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock size={10} className="text-purple-400" />
                <p className="text-[8px] font-black text-slate-500 uppercase">Date & Heure</p>
              </div>
              <p className="text-xs font-bold text-white">
                {createdAt.toLocaleDateString("fr-FR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
              <p className="text-[10px] text-slate-400">
                {createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Shield size={10} className={isPiPending ? "text-amber-400" : "text-emerald-400"} />
                <p className="text-[8px] font-black text-slate-500 uppercase">Statut</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isPiPending ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
                <p
                  className={`text-xs font-bold ${
                    isPiPending ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {isPiPending ? "En attente" : "Confirme"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Transaction Reference */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">
                Reference Transaction
              </p>
              <p className="text-xs font-mono font-bold text-white">{reference}</p>
            </div>
            <button
              onClick={copyRef}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 hover:bg-white/10 transition-all"
            >
              {copied ? (
                <CheckCircle2 size={14} className="text-emerald-400" />
              ) : (
                <Copy size={14} className="text-slate-400" />
              )}
            </button>
          </div>
        </motion.div>

        {/* Network Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex items-center justify-center gap-4 mb-8"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[9px] font-bold text-slate-400">PimPay</span>
          </div>
          <ArrowRight size={12} className="text-slate-600" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <div
              className={`w-2 h-2 rounded-full ${
                isPiPending ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            <span className="text-[9px] font-bold text-slate-400">{network}</span>
          </div>
        </motion.div>

        <div className="flex-1" />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="space-y-3 pb-4"
        >
          <div className="flex gap-3">
            <Link href="/transfer" className="flex-1">
              <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all">
                <RotateCcw size={14} /> Nouveau Transfert
              </button>
            </Link>
            <button
              onClick={() => {
                const shareText = `J'ai envoye ${formatAmount(amount, currency)} ${currency} a ${recipientName} via PimPay !`;
                if (navigator.share) {
                  navigator.share({ text: shareText });
                } else {
                  navigator.clipboard.writeText(shareText);
                  toast.success("Copie dans le presse-papier !");
                }
              }}
              className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-white/10 transition-all"
            >
              <Share2 size={18} />
            </button>
          </div>

          <Link
            href={`/transfer/receipt?ref=${encodeURIComponent(reference)}&amount=${amount}&currency=${currency}&name=${encodeURIComponent(recipientName)}`}
            className="block w-full"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <FileText size={15} className="text-blue-400" />
              <span>Voir le Recu Detaille</span>
              <ArrowRight size={14} className="text-slate-500" />
            </motion.button>
          </Link>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/dashboard")}
            className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl ${
              isPiPending
                ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/20"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-emerald-500/20"
            }`}
          >
            <Wallet size={18} /> Retour au Wallet <ArrowRight size={18} />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

export default function TransferSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#020617] flex items-center justify-center">
          <Loader2 className="animate-spin text-blue-500" size={40} />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
