"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Wallet,
  Zap,
  Loader2,
  CheckCircle2,
  Shield,
  CircleDot,
  Info,
  Sparkles,
  RefreshCcw,
  ChevronRight,
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import { usePiPrice } from "@/hooks/usePiPrice";
import { usePiPayment } from "@/hooks/usePiPayment";

// Preset amounts for quick selection
const PRESET_AMOUNTS = [5, 10, 25, 50, 100, 250];

export default function RechargeBalancePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { price: piPrice, loading: isPriceLoading } = usePiPrice();
  const { createBalanceTopUp, loading: isPaymentLoading } = usePiPayment();

  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<"input" | "confirm" | "success">("input");
  const [txid, setTxid] = useState<string | null>(null);

  // Calculate fees and totals
  const calculation = useMemo(() => {
    const piAmount = parseFloat(amount) || 0;
    const fee = piAmount * 0.01; // 1% fee
    const netAmount = piAmount - fee;
    const usdEquivalent = piAmount > 0 && piPrice > 0 ? (piAmount * piPrice).toFixed(2) : "0.00";
    const netUsdEquivalent = netAmount > 0 && piPrice > 0 ? (netAmount * piPrice).toFixed(2) : "0.00";

    return {
      piAmount,
      fee: fee.toFixed(7),
      netAmount: netAmount.toFixed(7),
      usdEquivalent,
      netUsdEquivalent,
    };
  }, [amount, piPrice]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle preset amount selection
  const handlePresetSelect = (preset: number) => {
    setAmount(preset.toString());
  };

  // Handle continue to confirm
  const handleContinue = () => {
    const piAmount = parseFloat(amount);
    if (!piAmount || piAmount <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }
    if (piAmount < 0.1) {
      toast.error("Le montant minimum est de 0.1 Pi");
      return;
    }
    setStep("confirm");
  };

  // Handle payment initiation
  const handlePayment = async () => {
    const piAmount = parseFloat(amount);
    if (!piAmount || piAmount <= 0) {
      toast.error("Montant invalide");
      return;
    }

    const result = await createBalanceTopUp(piAmount);

    if (result.success && result.txid) {
      setTxid(result.txid);
      setStep("success");
    }
  };

  // Reset and start over
  const handleNewRecharge = () => {
    setAmount("");
    setTxid(null);
    setStep("input");
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans pb-32 overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* Header */}
      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/90 backdrop-blur-xl z-30 border-b border-white/5">
        <div className="flex items-center gap-4">
          <button
            onClick={() => (step === "input" ? router.back() : setStep("input"))}
            className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
              Recharge Pi
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={8} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">
                Balance Top-Up
              </span>
            </div>
          </div>
        </div>
        <button onClick={() => window.location.reload()}>
          <RefreshCcw size={18} className="text-slate-500 hover:text-blue-400 transition-colors" />
        </button>
      </header>

      <main className="px-6 mt-6 space-y-6">
        <AnimatePresence mode="wait">
          {/* STEP 1: Amount Input */}
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              {/* Info Banner */}
              <section className="relative p-6 rounded-3xl bg-gradient-to-br from-blue-600/15 via-blue-800/10 to-transparent border border-white/5 overflow-hidden">
                <div className="absolute right-[-10px] bottom-[-10px] opacity-[0.04]">
                  <Zap size={120} className="text-blue-500" />
                </div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="p-3 bg-blue-600/20 rounded-2xl text-blue-400 border border-blue-500/20 shrink-0">
                    <Wallet size={24} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-widest text-blue-400">
                      Recharge de Solde Pi
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium leading-relaxed">
                      Payez en Pi pour crediter votre compte PimPay. Le montant sera ajoute instantanement a votre solde.
                    </p>
                  </div>
                </div>
              </section>

              {/* Amount Input Card */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-6">
                {/* Pi Price Display */}
                <div className="flex items-center justify-between p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                      <Sparkles size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">Taux Pi actuel</p>
                      <p className="text-sm font-black text-white">
                        {isPriceLoading ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          `1 Pi = $${piPrice.toFixed(4)} USD`
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Montant a recharger
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-20 bg-slate-900/80 rounded-2xl border border-white/10 px-6 pr-20 text-3xl font-black text-blue-500 outline-none focus:border-blue-500/50 transition-colors placeholder:text-slate-800"
                      disabled={isPriceLoading}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-lg font-black text-slate-500">
                      Pi
                    </span>
                  </div>
                  {parseFloat(amount) > 0 && piPrice > 0 && (
                    <p className="text-[10px] text-slate-500 ml-1">
                      ≈ <span className="text-blue-400 font-bold">${calculation.usdEquivalent} USD</span> au taux actuel
                    </p>
                  )}
                </div>

                {/* Preset Amounts */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Montants rapides
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PRESET_AMOUNTS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handlePresetSelect(preset)}
                        className={`py-4 rounded-xl border font-black text-sm transition-all active:scale-95 ${
                          amount === preset.toString()
                            ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                            : "bg-white/[0.03] border-white/5 text-slate-400 hover:border-white/10"
                        }`}
                      >
                        {preset} Pi
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fee Preview */}
                {parseFloat(amount) > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-3"
                  >
                    <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                      <span>Montant saisi</span>
                      <span className="text-white">{calculation.piAmount.toFixed(7)} Pi</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold uppercase text-rose-500">
                      <span>Frais PimPay (1%)</span>
                      <span>- {calculation.fee} Pi</span>
                    </div>
                    <div className="border-t border-white/5 pt-3 space-y-2">
                      <div className="flex justify-between text-[12px] font-black uppercase">
                        <span className="text-emerald-500">Vous recevrez</span>
                        <span className="text-emerald-400">{calculation.netAmount} Pi</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold uppercase text-slate-500">
                        <span>Equivalent USD</span>
                        <span className="text-slate-400">≈ ${calculation.netUsdEquivalent}</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Continue Button */}
                <button
                  onClick={handleContinue}
                  disabled={!amount || parseFloat(amount) <= 0 || isPriceLoading}
                  className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer
                  <ChevronRight size={20} />
                </button>
              </div>

              {/* Security Notice */}
              <div className="flex items-center justify-center gap-2 py-4">
                <Shield size={14} className="text-emerald-500" />
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  Paiement securise via Pi Network
                </span>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Confirmation */}
          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Summary Card */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-6 space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                    <Wallet size={32} className="text-blue-400" />
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight">Confirmer la Recharge</h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Verifiez les details avant de proceder au paiement
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-4 p-5 bg-black/40 rounded-2xl border border-white/5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Montant</span>
                    <span className="text-lg font-black text-white">{calculation.piAmount} Pi</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Frais (1%)</span>
                    <span className="text-sm font-bold text-rose-400">- {calculation.fee} Pi</span>
                  </div>
                  <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Credit final</span>
                    <span className="text-xl font-black text-emerald-400">{calculation.netAmount} Pi</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span className="text-[9px] font-bold uppercase">Valeur USD</span>
                    <span className="text-sm font-bold">≈ ${calculation.netUsdEquivalent}</span>
                  </div>
                </div>

                {/* Info Notice */}
                <div className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/10 rounded-xl">
                  <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-400/80 font-medium leading-relaxed">
                    En cliquant sur &quot;Payer avec Pi&quot;, une fenetre Pi Browser s&apos;ouvrira pour confirmer la transaction. Le montant sera credite instantanement apres validation.
                  </p>
                </div>

                {/* Payment Button */}
                <button
                  onClick={handlePayment}
                  disabled={isPaymentLoading}
                  className="w-full h-16 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaymentLoading ? (
                    <>
                      <Loader2 className="animate-spin" />
                      Traitement en cours...
                    </>
                  ) : (
                    <>
                      <Wallet size={20} />
                      Payer {calculation.piAmount} Pi
                    </>
                  )}
                </button>

                {/* Cancel Button */}
                <button
                  onClick={() => setStep("input")}
                  disabled={isPaymentLoading}
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-sm text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Modifier le montant
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Success */}
          {step === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] p-8 text-center space-y-6">
                {/* Success Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
                  className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30"
                >
                  <CheckCircle2 size={48} className="text-emerald-400" />
                </motion.div>

                {/* Success Message */}
                <div className="space-y-2">
                  <h2 className="text-2xl font-black uppercase tracking-tight text-emerald-400">
                    Recharge Reussie !
                  </h2>
                  <p className="text-slate-400 text-sm font-medium">
                    Votre compte a ete credite de {calculation.netAmount} Pi
                  </p>
                </div>

                {/* Transaction Details */}
                <div className="p-5 bg-black/40 rounded-2xl border border-white/5 space-y-3 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Montant credite</span>
                    <span className="font-black text-emerald-400">{calculation.netAmount} Pi</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Valeur USD</span>
                    <span className="font-bold text-slate-300">≈ ${calculation.netUsdEquivalent}</span>
                  </div>
                  {txid && (
                    <div className="pt-3 border-t border-white/5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase block mb-1">
                        Transaction ID
                      </span>
                      <span className="text-[10px] font-mono text-blue-400 break-all">{txid}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={() => router.push("/wallet")}
                    className="w-full h-14 bg-blue-600 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
                  >
                    <Wallet size={18} />
                    Voir mon Portefeuille
                  </button>
                  <button
                    onClick={handleNewRecharge}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl font-bold text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    Nouvelle Recharge
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}
