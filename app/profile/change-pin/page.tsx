"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ShieldCheck, Delete, Lock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";

// Zod validation for 6-digit PIN
const pinSchema = z.string().length(6, "Le PIN doit contenir 6 chiffres").regex(/^\d+$/, "Le PIN ne doit contenir que des chiffres");

export default function ChangePinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Ancien, 2: Nouveau, 3: Confirmation
  const [pins, setPins] = useState({ 1: "", 2: "", 3: "" });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const PIN_LENGTH = 6;

  // Declencher la validation automatique quand le PIN atteint 6 chiffres
  useEffect(() => {
    const currentPin = pins[step as keyof typeof pins];
    if (currentPin.length === PIN_LENGTH && !loading) {
      validateStep();
    }
  }, [pins, step]);

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;
    setError(null);
    
    setPins(prev => {
      const current = prev[step as keyof typeof prev];
      if (current.length < PIN_LENGTH) {
        return { ...prev, [step]: current + num };
      }
      return prev;
    });
  };

  const deleteDigit = () => {
    if (loading) return;
    setPins(prev => ({
      ...prev,
      [step]: prev[step as keyof typeof prev].slice(0, -1)
    }));
    setError(null);
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validateStep = useCallback(async () => {
    const currentPin = pins[step as keyof typeof pins];
    const token = typeof window !== "undefined" 
      ? (localStorage.getItem("pimpay_token") || localStorage.getItem("token")) 
      : null;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Validate PIN format with Zod
    const validation = pinSchema.safeParse(currentPin);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      triggerShake();
      return;
    }

    if (step === 1) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/security/verify-pin", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ pin: currentPin }),
        });
        
        if (res.ok) {
          setStep(2);
          setError(null);
        } else {
          triggerShake();
          setError("Ancien code PIN incorrect");
          toast.error("Ancien code PIN incorrect");
          setPins(prev => ({ ...prev, 1: "" }));
        }
      } catch {
        setError("Erreur de connexion");
        toast.error("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setStep(3);
      setError(null);
    } else if (step === 3) {
      if (pins[3] !== pins[2]) {
        triggerShake();
        setError("Les codes ne correspondent pas");
        toast.error("Les codes ne correspondent pas");
        setPins(prev => ({ ...prev, 3: "" }));
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/security/update-pin", {
          method: "PUT",
          headers,
          credentials: "include",
          body: JSON.stringify({ newPin: pins[2] }),
        });

        if (res.ok) {
          toast.success("Code PIN mis a jour avec succes");
          router.back();
        } else {
          setError("Erreur lors de la mise a jour");
          toast.error("Erreur lors de la mise a jour");
        }
      } catch {
        setError("Erreur serveur");
        toast.error("Erreur serveur");
      } finally {
        setLoading(false);
      }
    }
  }, [pins, step, router]);

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Code PIN Actuel";
      case 2: return "Nouveau Code PIN";
      case 3: return "Confirmer le PIN";
      default: return "";
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1: return "Veuillez entrer votre code de securite actuel";
      case 2: return "Choisissez un nouveau code a 6 chiffres";
      case 3: return "Repetez le code pour confirmer";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 rounded-2xl bg-slate-900 border border-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Securite</h1>
          <p className="text-[10px] text-blue-500 uppercase font-bold tracking-[0.2em]">PimPay Protocol v2.0</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className={`w-full max-w-md space-y-6 transition-transform ${shake ? "animate-shake" : ""}`}>
          
          <div className="text-center space-y-2">
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-4"
            >
              {step === 3 ? <CheckCircle2 className="text-blue-400" size={32} /> : <Lock className="text-blue-400" size={32} />}
            </motion.div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">{getStepTitle()}</h2>
            <p className="text-slate-400 text-sm">{getStepSubtitle()}</p>
          </div>

          {/* Security Migration Banner - Only on step 2 */}
          <AnimatePresence>
            {step === 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
              >
                <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                <div>
                  <p className="text-xs font-bold text-amber-400">Securite renforcee</p>
                  <p className="text-[10px] text-amber-400/70 mt-1">
                    PimPay utilise desormais des codes PIN a 6 chiffres pour une meilleure protection.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertTriangle className="text-red-400" size={16} />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dots Indicator - 6 dots */}
          <div className="flex justify-center gap-3 py-4">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const active = pins[step as keyof typeof pins].length > i;
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8 }}
                  animate={{
                    scale: active ? 1.1 : 1,
                    backgroundColor: active ? "rgb(59, 130, 246)" : "rgb(30, 41, 59)",
                  }}
                  className={`w-4 h-4 rounded-full transition-all duration-200 ${
                    active 
                    ? "shadow-[0_0_15px_rgba(59,130,246,0.8)]" 
                    : "border border-white/10"
                  }`}
                />
              );
            })}
          </div>

          {/* Step Progress */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 w-8 rounded-full transition-all ${
                  s <= step ? "bg-blue-500" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Custom Keypad */}
      <div className="bg-slate-900/50 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] px-10 pt-10 pb-12">
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button
              key={num}
              onClick={() => handleNumberPress(num)}
              whileTap={{ scale: 0.9 }}
              className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white outline-none"
            >
              {num}
            </motion.button>
          ))}
          <motion.button
            onClick={() => router.back()}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
          >
            ANNULER
          </motion.button>
          <motion.button
            onClick={() => handleNumberPress(0)}
            whileTap={{ scale: 0.9 }}
            className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white outline-none"
          >
            0
          </motion.button>
          <motion.button
            onClick={deleteDigit}
            whileTap={{ scale: 0.9 }}
            className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all outline-none"
          >
            <Delete size={22} />
          </motion.button>
        </div>
        
        {/* Loading Footer */}
        <div className="mt-8">
          {loading ? (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <Loader2 className="animate-spin text-blue-500 mb-1" size={20} />
              <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">Verification...</p>
            </div>
          ) : (
            <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest">
              Securise par PimPay
            </p>
          )}
        </div>
      </div>

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
  );
}
