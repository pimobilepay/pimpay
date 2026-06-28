"use client";

import { useState } from "react";
import {
  X, Coins, Wallet, ArrowRight, Loader2, CheckCircle2,
  XCircle, Gift, ShieldCheck, RefreshCw,
} from "lucide-react";
import { usePimCoinPurchase, type PimPackage } from "@/hooks/usePimCoinPurchase";
import { useLanguage } from "@/context/LanguageContext";

type CheckoutView = "summary" | "processing" | "success" | "failed";

interface PimCheckoutOverlayProps {
  pkg: PimPackage;
  pimBalance: number;
  piBalance: number;
  onClose: () => void;
  onPurchaseComplete: (pimCoins: number) => void;
}

export function PimCheckoutOverlay({
  pkg,
  pimBalance,
  piBalance,
  onClose,
  onPurchaseComplete,
}: PimCheckoutOverlayProps) {
  const { t } = useLanguage();
  const { purchasePimCoins } = usePimCoinPurchase();
  const [view, setView] = useState<CheckoutView>("summary");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [txid, setTxid] = useState<string>("");

  const baseCoins = pkg.pimCoins - pkg.bonus;
  const totalCoins = pkg.pimCoins;
  const hasEnoughPi = piBalance >= pkg.piCost;

  const handleConfirm = async () => {
    setView("processing");
    setErrorMsg("");
    const result = await purchasePimCoins(pkg.id);
    if (result.success) {
      setTxid(result.txid || "");
      setView("success");
      onPurchaseComplete(result.pimCoins || pkg.pimCoins);
    } else {
      setErrorMsg(result.error || t("pimCheckout.defaultError"));
      setView("failed");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={view === "processing" ? undefined : onClose}
      />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-[#0b1220] border border-white/10 rounded-t-3xl sm:rounded-3xl p-6 pb-8 animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-300">
        {/* Close (hidden while processing) */}
        {view !== "processing" && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
            aria-label={t("pimCheckout.close")}
          >
            <X size={18} className="text-slate-400" />
          </button>
        )}

        {/* ---- SUMMARY ---- */}
        {view === "summary" && (
          <div className="space-y-5">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">{t("pimCheckout.summaryTag")}</p>
              <h2 className="text-xl font-black text-white mt-1">{t("pimCheckout.confirmTitle")}</h2>
            </div>

            {/* Package card */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/5 border border-amber-500/20 p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-black text-white leading-none">
                    {totalCoins.toLocaleString()} <span className="text-base text-amber-400">PIM</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">{t("pimCheckout.pack")} {pkg.label}</p>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-white/5 pt-4">
                <Row label={t("pimCheckout.baseCoins")} value={`${baseCoins.toLocaleString()} PIM`} />
                {pkg.bonus > 0 && (
                  <Row
                    label={
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Gift size={13} /> {t("pimCheckout.bonusIncluded")}
                      </span>
                    }
                    value={`+${pkg.bonus.toLocaleString()} PIM`}
                    valueClass="text-emerald-400"
                  />
                )}
                <Row label={t("pimCheckout.totalCredited")} value={`${totalCoins.toLocaleString()} PIM`} bold />
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-slate-300">
                  <Wallet size={16} className="text-blue-400" /> {t("pimCheckout.amountToPay")}
                </span>
                <span className="text-lg font-black text-white">{pkg.piCost} Pi</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{t("pimCheckout.currentPiBalance")}</span>
                <span className={hasEnoughPi ? "text-slate-300" : "text-red-400 font-bold"}>
                  {piBalance.toFixed(4)} Pi
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">{t("pimCheckout.pimBalanceAfter")}</span>
                <span className="text-amber-400 font-bold">
                  {(pimBalance + totalCoins).toLocaleString()} PIM
                </span>
              </div>
            </div>

            {!hasEnoughPi && (
              <p className="text-xs text-red-400 text-center">
                {t("pimCheckout.insufficientPi")}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500">
              <ShieldCheck size={13} className="text-emerald-500" />
              {t("pimCheckout.securePayment")}
            </div>

            <button
              onClick={handleConfirm}
              disabled={!hasEnoughPi}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {t("pimCheckout.pay")} {pkg.piCost} Pi <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ---- PROCESSING ---- */}
        {view === "processing" && (
          <div className="py-10 flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-5" />
            <h2 className="text-lg font-black text-white">{t("pimCheckout.processingTitle")}</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">
              {t("pimCheckout.processingDesc")}
            </p>
          </div>
        )}

        {/* ---- SUCCESS ---- */}
        {view === "success" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-5">
              <CheckCircle2 size={44} className="text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-white">{t("pimCheckout.successTitle")}</h2>
            <p className="text-sm text-slate-400 mt-2">
              <span className="text-amber-400 font-bold">+{totalCoins.toLocaleString()} PIM</span>{" "}
              {t("pimCheckout.successDesc")}
            </p>

            <div className="w-full rounded-2xl bg-white/[0.03] border border-white/5 p-4 mt-6 space-y-2.5">
              <Row label={t("pimCheckout.coinsReceived")} value={`${totalCoins.toLocaleString()} PIM`} />
              <Row label={t("pimCheckout.amountPaid")} value={`${pkg.piCost} Pi`} />
              <Row label={t("pimCheckout.newBalance")} value={`${(pimBalance + totalCoins).toLocaleString()} PIM`} bold />
              {txid && (
                <Row label={t("pimCheckout.txId")} value={`${txid.slice(0, 10)}...`} valueClass="text-slate-500 font-mono" />
              )}
            </div>

            <button
              onClick={onClose}
              className="w-full py-4 mt-6 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all"
            >
              {t("pimCheckout.finish")}
            </button>
          </div>
        )}

        {/* ---- FAILED ---- */}
        {view === "failed" && (
          <div className="py-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
              <XCircle size={44} className="text-red-500" />
            </div>
            <h2 className="text-xl font-black text-white">{t("pimCheckout.failedTitle")}</h2>
            <p className="text-sm text-slate-400 mt-2 max-w-xs">{errorMsg}</p>

            <div className="flex gap-3 w-full mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl bg-white/5 border border-white/10 text-slate-300 text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all"
              >
                {t("pimCheckout.cancel")}
              </button>
              <button
                onClick={() => setView("summary")}
                className="flex-1 py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> {t("pimCheckout.retry")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  valueClass,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  bold?: boolean;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-sm ${bold ? "font-black text-white" : "font-semibold text-slate-200"} ${valueClass || ""}`}>
        {value}
      </span>
    </div>
  );
}
