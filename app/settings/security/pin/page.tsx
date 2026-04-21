"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Delete, Lock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const PIN_LENGTH = 6;

export default function ChangePinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pins, setPins] = useState({ 1: "", 2: "", 3: "" });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Utilisation d'une ref pour eviter les appels API en double pendant le chargement
  const isProcessing = useRef(false);

  const handleUpdatePin = useCallback(async (finalPin: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);
    setError(null);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Envoyer le token Bearer en fallback si present dans localStorage
      const localToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (localToken) {
        headers["Authorization"] = `Bearer ${localToken}`;
      }

      const res = await fetch("/api/security/update-pin", {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({ newPin: finalPin }),
      });

      if (res.ok) {
        toast.success("Code PIN mis a jour !");
        router.push("/settings/security");
      } else {
        const data = await res.json();
        setError(data.error || "Echec de la mise a jour");
        toast.error(data.error || "Echec de la mise a jour");
        setPins({ 1: "", 2: "", 3: "" });
        setStep(1);
        isProcessing.current = false;
      }
    } catch {
      setError("Erreur serveur");
      toast.error("Erreur serveur");
      isProcessing.current = false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const validateStep = useCallback(async () => {
    const currentPin = pins[step as 1 | 2 | 3];

    // Securite : Ne rien faire si deja en cours ou si le PIN n'est pas complet
    if (currentPin.length !== PIN_LENGTH || isProcessing.current) return;

    if (step === 1) {
      isProcessing.current = true;
      setLoading(true);
      setError(null);
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        const localToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
        if (localToken) {
          headers["Authorization"] = `Bearer ${localToken}`;
        }

        const res = await fetch("/api/security/verify-pin", {
          method: "POST",
          headers,
          credentials: "include",
          body: JSON.stringify({ pin: currentPin }),
        });

        if (res.status === 401) {
          toast.error("Session expiree, reconnexion...");
          router.push("/auth/login");
          return;
        }

        const data = await res.json();

        if (res.ok) {
          setStep(2);
          isProcessing.current = false;
        } else {
          setShake(true);
          setTimeout(() => setShake(false), 500);
          setError(data.error || "Code PIN incorrect");
          toast.error(data.error || "Ancien code PIN incorrect");
          setPins(p => ({ ...p, 1: "" }));
          isProcessing.current = false;
        }
      } catch {
        setError("Erreur de connexion");
        toast.error("Erreur de connexion");
        isProcessing.current = false;
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setStep(3);
      setError(null);
    } else if (step === 3) {
      if (pins[3] !== pins[2]) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setError("Les codes ne correspondent pas");
        toast.error("Les codes ne correspondent pas");
        setPins(p => ({ ...p, 3: "" }));
        return;
      }
      handleUpdatePin(pins[3]);
    }
  }, [pins, step, router, handleUpdatePin]);

  // Surveillance du remplissage du PIN avec verrouillage
  useEffect(() => {
    const currentPin = pins[step as 1 | 2 | 3];
    if (currentPin.length === PIN_LENGTH && !isProcessing.current && !loading) {
      validateStep();
    }
  }, [pins, step, validateStep, loading]);

  const handleNumberPress = (num: number) => {
    if (loading || shake || isProcessing.current) return;
    setError(null);
    setPins((prev) => {
      const current = prev[step as 1 | 2 | 3];
      if (current.length < PIN_LENGTH) {
        return { ...prev, [step]: current + num };
      }
      return prev;
    });
  };

  const deleteDigit = () => {
    if (loading || isProcessing.current) return;
    setPins((prev) => ({
      ...prev,
      [step]: prev[step as 1 | 2 | 3].slice(0, -1),
    }));
  };

  const titles = ["", "Code PIN Actuel", "Nouveau Code PIN", "Confirmer le PIN"];
  const subtitles = ["", "Securise par PimPay", "Choisissez 6 chiffres", "Confirmez votre nouveau code"];

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      {/* Header */}
      <div className="px-6 pt-12 flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 rounded-2xl bg-slate-900 border border-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className={`w-full max-w-md space-y-6 ${shake ? "animate-shake" : ""}`}>
          {/* Icon */}
          <div className="text-center">
            <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-4">
              {step === 3 ? <CheckCircle2 className="text-blue-400" size={32} /> : <Lock className="text-blue-400" size={32} />}
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white">{titles[step]}</h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">{subtitles[step]}</p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <AlertTriangle className="text-red-400 flex-shrink-0" size={16} />
                <p className="text-xs text-red-400">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PIN Input Boxes - MFA Style */}
          <div className="flex justify-center gap-2 py-4">
            {[...Array(PIN_LENGTH)].map((_, i) => {
              const currentPin = pins[step as 1 | 2 | 3];
              const active = currentPin.length > i;
              
              return (
                <motion.div
                  key={i}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: active ? 1.05 : 1 }}
                  className={`w-12 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                    active
                      ? "bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : "bg-slate-800/50 border border-white/10 text-slate-500"
                  }`}
                >
                  {active ? (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  ) : null}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Numpad */}
      <div className="bg-slate-900/50 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] px-6 pt-8 pb-10">
        <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <motion.button 
              key={num} 
              type="button" 
              onClick={() => handleNumberPress(num)}
              whileTap={{ scale: 0.9 }}
              className="h-14 text-xl font-bold rounded-xl bg-slate-800/50 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white"
            >
              {num}
            </motion.button>
          ))}
          <motion.button
            type="button"
            onClick={() => router.back()}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
          >
            ANNULER
          </motion.button>
          <motion.button 
            type="button" 
            onClick={() => handleNumberPress(0)}
            whileTap={{ scale: 0.9 }}
            className="h-14 text-xl font-bold rounded-xl bg-slate-800/50 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white"
          >
            0
          </motion.button>
          <motion.button 
            type="button" 
            onClick={deleteDigit}
            whileTap={{ scale: 0.9 }}
            className="h-14 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all"
          >
            <Delete size={22} />
          </motion.button>
        </div>

        {loading && (
          <div className="mt-6 text-center flex flex-col items-center">
            <Loader2 className="animate-spin text-blue-500 mb-2" size={20} />
            <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">Traitement securise...</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest mt-6">
          PimPay Protocol v2.0
        </p>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
