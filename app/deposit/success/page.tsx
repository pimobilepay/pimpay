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
  ExternalLink,
  FileText,
  ArrowDownToLine,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { getBlockchainTxUrl, getExplorerName, hasBlockchainExplorer } from "@/lib/blockchain-explorer";

const PI_GCV_PRICE = 314159;

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const ref = searchParams.get("ref");
  const txid = searchParams.get("txid");
  const urlAmount = searchParams.get("amount");
  const urlCurrency = searchParams.get("currency") || "PI";

  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchTx = useCallback(async () => {
    if (!ref && !txid) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (txid) params.set("txid", txid);
      if (ref) params.set("ref", ref);

      const res = await fetch(`/api/transaction/details?${params.toString()}`, {
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
  }, [ref, txid]);

  useEffect(() => {
    fetchTx();
  }, [fetchTx]);

  const currency = transaction?.currency || urlCurrency;
  const amount = Number(transaction?.amount) || Number(urlAmount) || 0;
  const blockchainTxHash = transaction?.blockchainTxId || transaction?.txid || txid;

  const amountUSD =
    currency === "PI"
      ? amount * PI_GCV_PRICE
      : currency === "XAF"
      ? amount / 600
      : amount;

  const reference = transaction?.reference || ref || txid || "PIMPAY-TX";
  const createdAt = transaction?.createdAt ? new Date(transaction.createdAt) : new Date();

  const fee = transaction?.fee ?? (currency === "PI" ? 0.01 : 0);
  const network = currency === "PI" ? "Pi Network" : currency === "XAF" || currency === "XOF" ? "PimPay Fiat" : "PimPay";

  // Crypto currencies that display 8 decimal places
  const CRYPTO_CURRENCIES = ["PI", "BTC", "ETH", "USDT", "USDC", "BNB", "SOL", "XRP", "SDA", "XLM", "TRX", "TON", "ADA", "DOGE"];
  const isCrypto = (cur: string) => CRYPTO_CURRENCIES.includes(cur.toUpperCase());

  const formatAmount = (val: number, cur: string) => {
    if (isCrypto(cur))
      return val < 0.0001
        ? val.toFixed(10).replace(/0+$/, "").replace(/\.$/, "")
        : val.toFixed(8).replace(/0+$/, "").replace(/\.$/, "");
    return val.toLocaleString("fr-FR");
  };

  const formatFee = (rawFee: string | number, cur: string): string => {
    if (rawFee === null || rawFee === undefined || rawFee === "") {
      // Valeur par defaut avec 8 decimales pour crypto
      return isCrypto(cur) ? `0.00000000 ${cur}` : "0.00";
    }

    const strFee = String(rawFee).trim();
    const match = strFee.match(/^([\d.]+)\s*([A-Z]*)$/i);

    if (match) {
      const numVal = parseFloat(match[1]);
      const feeCur = match[2]?.toUpperCase() || cur;

      if (isNaN(numVal)) return strFee;

      if (isCrypto(feeCur)) {
        // Toujours afficher 8 decimales pour les cryptos
        const formatted = numVal.toFixed(8);
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

    const numVal = parseFloat(strFee);
    if (!isNaN(numVal)) {
      if (isCrypto(cur)) {
        // Toujours afficher 8 decimales pour les cryptos
        return numVal.toFixed(8) + ` ${cur}`;
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

  // Get blockchain explorer URL if available
  const blockchainUrl = blockchainTxHash ? getBlockchainTxUrl(currency, blockchainTxHash) : null;
  const explorerName = getExplorerName(currency);
  const hasExplorer = hasBlockchainExplorer(currency);

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
          animate={{ opacity: 0.3, scale: 1.2 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-[120px] bg-emerald-500/20"
        />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.15 }}
          transition={{ delay: 0.5, duration: 1 }}
          className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-emerald-500/10 to-transparent"
        />
        {[...Array(18)].map((_, i) => (
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
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-500/10">
              <BadgeCheck size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-400">
              Depot Confirme
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
              className="absolute inset-0 rounded-full blur-2xl bg-emerald-500/30"
            />
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 300 }}
              >
                <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
              </motion.div>
            </div>
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="absolute -right-1 -top-1 w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shadow-lg"
            >
              <Sparkles size={14} className="text-white" />
            </motion.div>
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
            Depot <span className="text-emerald-400">Reussi</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Transfert confirme par PimPay
          </p>
        </motion.div>

        {/* Main Transaction Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-slate-900/80 to-slate-800/50 border border-white/10 rounded-[2rem] p-5 mb-4 backdrop-blur-xl"
        >
          {/* Amount Display */}
          <div className="flex flex-col items-center mb-6">
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">
              Montant Depose
            </p>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-white text-sm"
                style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}
              >
                <ArrowDownToLine size={20} />
              </div>
              <div className="text-center">
                <p className="text-4xl font-black text-white">
                  {formatAmount(amount, currency)}
                </p>
                <p className="text-lg text-blue-500 font-bold">{currency}</p>
              </div>
            </div>
          </div>

          {/* USD equivalent */}
          <div className="flex justify-center mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest py-1 px-4 rounded-full border inline-block bg-emerald-500/5 border-emerald-500/10 text-emerald-500/80">
              ≈ ${amountUSD.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
            </span>
          </div>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4" />

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
                <Shield size={10} className="text-emerald-400" />
                <p className="text-[8px] font-black text-slate-500 uppercase">Statut</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full animate-pulse bg-emerald-500" />
                <p className="text-xs font-bold text-emerald-400">Confirme</p>
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
                ID Transaction
              </p>
              <p className="text-xs font-mono font-bold text-white truncate max-w-[220px]">{reference}</p>
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
            <span className="text-[9px] font-bold text-slate-400">{network}</span>
          </div>
          <ArrowRight size={12} className="text-slate-600" />
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-bold text-slate-400">PimPay Wallet</span>
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
          {/* View Receipt Button */}
          <Link
            href={`/deposit/receipt?ref=${encodeURIComponent(reference)}&amount=${amount}&currency=${currency}`}
            className="block w-full"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-4 bg-white text-[#020617] rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-between px-6 hover:bg-slate-100 transition-all"
            >
              <div className="flex items-center gap-2">
                <FileText size={16} />
                <span>Voir le Recu</span>
              </div>
              <ArrowRight size={16} />
            </motion.button>
          </Link>

          {/* Blockchain Explorer Button - Only show if crypto with explorer */}
          <AnimatePresence>
            {hasExplorer && blockchainUrl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                <a
                  href={blockchainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-between px-6 hover:bg-white/10 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <ExternalLink size={16} className="text-blue-400" />
                      <span>Voir sur {explorerName}</span>
                    </div>
                    <ArrowRight size={16} className="text-slate-500" />
                  </motion.button>
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Return to Wallet + Share buttons */}
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-5 rounded-2xl font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-2xl bg-gradient-to-r from-blue-500 to-blue-600 shadow-blue-500/20"
            >
              <Wallet size={18} /> Retour au Wallet
            </motion.button>
            <button
              onClick={() => {
                const shareText = `J'ai depose ${formatAmount(amount, currency)} ${currency} sur PimPay !`;
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
        </motion.div>
      </div>
    </div>
  );
}

export default function DepositSuccessPage() {
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
