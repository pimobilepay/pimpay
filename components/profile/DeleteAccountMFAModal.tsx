"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Grid3X3,
  Delete,
  Loader2,
  AlertTriangle,
  Trash2,
  X,
} from "lucide-react";

interface DeleteAccountMFAModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Le compte est parti : le parent redirige vers /auth/login. */
  onConfirmed: () => void;
  twoFactorEnabled: boolean;
}

export function DeleteAccountMFAModal({
  isOpen,
  onClose,
  onConfirmed,
  twoFactorEnabled,
}: DeleteAccountMFAModalProps) {
  const [method, setMethod] = useState<"authenticator" | "pin">(
    twoFactorEnabled ? "authenticator" : "pin"
  );
  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setTotpCode("");
      setError(null);
      setLoading(false);
      setMethod(twoFactorEnabled ? "authenticator" : "pin");
    }
  }, [isOpen, twoFactorEnabled]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const submitDeletion = useCallback(
    async (payload: { method: "pin" | "totp"; pin?: string; code?: string }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/user/delete-account", {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Impossible de supprimer le compte.");
        onConfirmed();
      } catch (err) {
        triggerShake();
        setError(err instanceof Error ? err.message : "Impossible de supprimer le compte.");
        setPin("");
        setTotpCode("");
        setLoading(false);
      }
    },
    [onConfirmed]
  );

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;

    if (method === "pin" && pin.length < 6) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 6 && !loading) {
        submitDeletion({ method: "pin", pin: newPin });
      }
    }

    if (method === "authenticator" && totpCode.length < 6) {
      const newCode = totpCode + num;
      setTotpCode(newCode);
      if (newCode.length === 6 && !loading) {
        submitDeletion({ method: "totp", code: newCode });
      }
    }
  };

  const deleteDigit = () => {
    if (loading) return;
    if (method === "pin") setPin((prev) => prev.slice(0, -1));
    if (method === "authenticator") setTotpCode((prev) => prev.slice(0, -1));
  };

  if (!isOpen) return null;

  const currentCode = method === "pin" ? pin : totpCode;

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
          <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-red-500/20 rounded-[32px] shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            <button
              onClick={onClose}
              disabled={loading}
              className="absolute right-4 top-4 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all z-10 disabled:opacity-40"
            >
              <X size={18} />
            </button>

            <div className="relative px-6 pt-8 pb-4">
              <div className="text-center">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/20 mb-4">
                  <Trash2 className="text-red-400" size={28} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  Confirmer la suppression
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Cette action est définitive et irréversible. Confirmez votre identité pour supprimer votre compte.
                </p>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-4">
                  {method === "authenticator"
                    ? "Entrez le code Google Authenticator"
                    : "Entrez votre code PIN"}
                </p>
              </div>
            </div>

            <div className="px-6 pb-8">
              {twoFactorEnabled && (
                <div className="flex gap-2 mb-6">
                  <button
                    type="button"
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
                    type="button"
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

              <div className={`flex justify-center gap-3 py-4 ${shake ? "animate-shake" : ""}`}>
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

              <div className="grid grid-cols-3 gap-y-3 gap-x-4 max-w-[280px] mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <motion.button
                    key={num}
                    type="button"
                    onClick={() => handleNumberPress(num)}
                    whileTap={{ scale: 0.9 }}
                    className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-red-600/20 active:border-red-500/30 transition-all text-white outline-none"
                  >
                    {num}
                  </motion.button>
                ))}
                <motion.button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  whileTap={{ scale: 0.9 }}
                  className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors disabled:opacity-40"
                >
                  ANNULER
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => handleNumberPress(0)}
                  whileTap={{ scale: 0.9 }}
                  className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-red-600/20 active:border-red-500/30 transition-all text-white outline-none"
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

              {loading && (
                <div className="flex justify-center mt-4">
                  <Loader2 className="h-6 w-6 animate-spin text-red-400" />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-10px); }
            40%, 80% { transform: translateX(10px); }
          }
          .animate-shake {
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
}
