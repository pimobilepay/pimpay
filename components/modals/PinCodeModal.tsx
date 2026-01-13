"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Delete, Loader2, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string | null;
  title?: string;
}

export default function PinCodeModal({ isOpen, onClose, onSuccess, userId, title = "Code PIN de Connexion" }: PinCodeModalProps) {
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleVerify = useCallback(async (finalPin: string) => {
    if (!userId) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login/verify-pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, pin: finalPin }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin(""); 
      }
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  }, [userId, onSuccess, onClose]);

  useEffect(() => {
    if (pin.length === 4 && !loading) {
      handleVerify(pin);
    }
  }, [pin, loading, handleVerify]);

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const deleteDigit = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020617]/90 backdrop-blur-sm p-4">
        
        {/* Container réduit et centré */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-[400px] bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
        >
          {/* Header réduit */}
          <div className="px-6 pt-8 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-3">
              <ShieldCheck className="text-blue-500" size={24} />
            </div>
            <h2 className="text-lg font-black uppercase tracking-tighter text-white">{title}</h2>
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">Sécurisé par Elara</p>
          </div>

          <div className={`px-8 py-6 ${shake ? "animate-shake" : ""}`}>
            {/* Pin Dots */}
            <div className="flex justify-center gap-3 mb-8">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    pin.length > i
                    ? "bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)] scale-110"
                    : "bg-slate-800 border border-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Numpad compact */}
            <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto text-center">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleNumberPress(num)}
                  className="h-12 text-xl font-bold rounded-xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all text-white outline-none"
                >
                  {num}
                </button>
              ))}
              <button 
                onClick={onClose}
                className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
              >
                ANNULER
              </button>
              <button
                type="button"
                onClick={() => handleNumberPress(0)}
                className="h-12 text-xl font-bold rounded-xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all text-white outline-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={deleteDigit}
                className="h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all outline-none"
              >
                <Delete size={20} />
              </button>
            </div>
          </div>

          {/* Zone de chargement intégrée en bas */}
          <div className="bg-slate-950/50 py-4 border-t border-white/5">
            {loading ? (
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                <Loader2 className="animate-spin text-blue-500 mb-1" size={20} />
                <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">Vérification...</p>
              </div>
            ) : (
              <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest">PimPay Protocol v1.0</p>
            )}
          </div>
        </motion.div>

        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-8px); }
            40%, 80% { transform: translateX(8px); }
          }
          .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
        `}</style>
      </div>
    </AnimatePresence>
  );
}
