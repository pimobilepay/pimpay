"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Grid3X3,
  ArrowDownLeft,
  ArrowUpRight,
  Delete,
  Loader2,
  AlertTriangle,
  Lock,
  X,
  CheckCircle2,
} from "lucide-react";

interface PendingTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  currency: string;
  agentName?: string;
  createdAt: string;
}

interface TransactionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: PendingTransaction | null;
  userId: string;
  twoFactorEnabled?: boolean;
}

export default function TransactionConfirmModal({
  isOpen,
  onClose,
  transaction,
  userId,
  twoFactorEnabled = false,
}: TransactionConfirmModalProps) {
  const [method, setMethod] = useState<"authenticator" | "pin">(
    twoFactorEnabled ? "authenticator" : "pin"
  );
  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset when modal opens
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setTotpCode("");
      setError(null);
      setSuccess(false);
      setMethod(twoFactorEnabled ? "authenticator" : "pin");
    }
  }, [isOpen, twoFactorEnabled]);

  // Trigger shake animation
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Confirm transaction with PIN
  const confirmWithPin = useCallback(
    async (finalPin: string) => {
      console.log("[v0] confirmWithPin called - userId:", userId, "transactionId:", transaction?.id);
      if (!userId || !transaction) {
        console.log("[v0] Missing userId or transaction - userId:", userId, "transaction:", transaction);
        return;
      }
      setLoading(true);
      setError(null);

      const payload = {
        transactionId: transaction.id,
        userId,
        pin: finalPin,
        method: "pin",
      };
      console.log("[v0] Sending confirm request with payload:", JSON.stringify(payload));

      try {
        const res = await fetch("/api/transaction/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("[v0] Confirm response:", res.status, data);

        if (res.ok && data.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          triggerShake();
          setError(data.error || "Code PIN incorrect");
          setPin("");
        }
      } catch {
        triggerShake();
        setError("Erreur de connexion");
        setPin("");
      } finally {
        setLoading(false);
      }
    },
    [userId, transaction, onClose]
  );

  // Confirm transaction with TOTP
  const confirmWithTotp = useCallback(
    async (code: string) => {
      if (!userId || !transaction) return;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/transaction/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: transaction.id,
            userId,
            code,
            method: "totp",
          }),
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setSuccess(true);
          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          triggerShake();
          setError(data.error || "Code incorrect");
          setTotpCode("");
        }
      } catch {
        triggerShake();
        setError("Erreur de connexion");
        setTotpCode("");
      } finally {
        setLoading(false);
      }
    },
    [userId, transaction, onClose]
  );

  // Reject transaction
  const rejectTransaction = async () => {
    if (!transaction) return;
    setLoading(true);

    try {
      await fetch("/api/transaction/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: transaction.id,
          userId,
          action: "reject",
        }),
      });
      onClose();
    } catch {
      setError("Erreur lors du refus");
    } finally {
      setLoading(false);
    }
  };

  // Handle number press
  const handleNumberPress = (num: number) => {
    if (loading || shake) return;

    if (method === "pin" && pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 6 && !loading) {
        confirmWithPin(newPin);
      }
    }

    if (method === "authenticator" && totpCode.length < 6) {
      const newCode = totpCode + num;
      setTotpCode(newCode);

      if (newCode.length === 6 && !loading) {
        confirmWithTotp(newCode);
      }
    }
  };

  // Delete digit
  const deleteDigit = () => {
    if (loading) return;
    if (method === "pin") {
      setPin((prev) => prev.slice(0, -1));
    }
    if (method === "authenticator") {
      setTotpCode((prev) => prev.slice(0, -1));
    }
  };

  if (!isOpen || !transaction) return null;

  const currentCode = method === "pin" ? pin : totpCode;
  const isDeposit = transaction.type === "DEPOSIT";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-[440px] overflow-hidden"
        >
          {/* Glassmorphism Card */}
          <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
            {/* Specular reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Close button */}
            <button
              onClick={rejectTransaction}
              className="absolute right-4 top-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10"
            >
              <X size={18} />
            </button>

            {/* Header */}
            <div className="relative px-6 pt-8 pb-4">
              <div className="text-center">
                {success ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 mb-4"
                  >
                    <CheckCircle2 className="text-emerald-400" size={28} />
                  </motion.div>
                ) : (
                  <div
                    className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${
                      isDeposit
                        ? "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20"
                        : "from-blue-500/20 to-blue-600/10 border-blue-500/20"
                    } border mb-4`}
                  >
                    {isDeposit ? (
                      <ArrowDownLeft
                        className={isDeposit ? "text-emerald-400" : "text-blue-400"}
                        size={28}
                      />
                    ) : (
                      <ArrowUpRight className="text-blue-400" size={28} />
                    )}
                  </div>
                )}

                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  {success
                    ? "Transaction confirmee"
                    : isDeposit
                    ? "Confirmer le depot"
                    : "Confirmer le retrait"}
                </h2>

                {!success && (
                  <>
                    <div className="mt-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                      <p className="text-3xl font-black text-white">
                        {transaction.amount.toLocaleString("fr-FR")} {transaction.currency}
                      </p>
                      {transaction.agentName && (
                        <p className="text-xs text-slate-400 mt-2">
                          Agent: {transaction.agentName}
                        </p>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-4">
                      {method === "authenticator"
                        ? "Entrez le code Google Authenticator"
                        : "Entrez votre code PIN"}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Content */}
            {!success && (
              <div className="px-6 pb-8">
                {/* Method Toggle - only if 2FA is enabled */}
                {twoFactorEnabled && (
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => {
                        setMethod("authenticator");
                        setPin("");
                        setTotpCode("");
                        setError(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        method === "authenticator"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <ShieldCheck size={16} />
                      Google 2FA
                    </button>
                    <button
                      onClick={() => {
                        setMethod("pin");
                        setPin("");
                        setTotpCode("");
                        setError(null);
                      }}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                        method === "pin"
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <Grid3X3 size={16} />
                      Code PIN
                    </button>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
                  >
                    <AlertTriangle className="text-red-400" size={16} />
                    <p className="text-xs text-red-400">{error}</p>
                  </motion.div>
                )}

                {/* Code Indicators */}
                <div
                  className={`flex justify-center gap-3 py-4 ${shake ? "animate-shake" : ""}`}
                >
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8 }}
                      animate={{
                        scale: currentCode.length > i ? 1.1 : 1,
                        backgroundColor:
                          currentCode.length > i
                            ? method === "authenticator"
                              ? "rgb(16, 185, 129)"
                              : "rgb(59, 130, 246)"
                            : "rgb(30, 41, 59)",
                      }}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        currentCode.length > i
                          ? method === "authenticator"
                            ? "shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                            : "shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                          : "border border-white/10"
                      }`}
                    />
                  ))}
                </div>

                {/* Custom Keypad */}
                <div className="grid grid-cols-3 gap-y-3 gap-x-4 max-w-[280px] mx-auto">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <motion.button
                      key={num}
                      type="button"
                      onClick={() => handleNumberPress(num)}
                      whileTap={{ scale: 0.9 }}
                      className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white outline-none"
                    >
                      {num}
                    </motion.button>
                  ))}
                  <motion.button
                    type="button"
                    onClick={rejectTransaction}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center justify-center text-[9px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors"
                  >
                    REFUSER
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => handleNumberPress(0)}
                    whileTap={{ scale: 0.9 }}
                    className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white outline-none"
                  >
                    0
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={deleteDigit}
                    whileTap={{ scale: 0.9 }}
                    className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all outline-none"
                  >
                    <Delete size={22} />
                  </motion.button>
                </div>

                {/* Loading indicator */}
                {loading && (
                  <div className="flex justify-center mt-4">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                )}
              </div>
            )}

            {/* Success Animation */}
            {success && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 pb-8 text-center"
              >
                <p className="text-emerald-400 font-medium">
                  Votre transaction a ete confirmee avec succes
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
