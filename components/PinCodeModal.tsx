"use client";

import React, { useState, useEffect } from "react";
import { Lock, X, Delete, ShieldCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PinCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
}

export default function PinCodeModal({ isOpen, onClose, onSuccess, title = "Validation Requise" }: PinCodeModalProps) {
  const [pin, setPin] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pinLength = 4;

  // Gérer la saisie des chiffres
  const handlePress = (num: string) => {
    if (pin.length < pinLength) {
      setPin([...pin, num]);
      setError(null);
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
  };

  // Déclencher la vérification quand le PIN est complet
  useEffect(() => {
    if (pin.length === pinLength) {
      verifyPin();
    }
  }, [pin]);

  const verifyPin = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.join("") }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || "Code PIN incorrect");
        setPin([]); // Reset le code en cas d'erreur
      }
    } catch (err) {
      setError("Erreur de connexion");
      setPin([]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <motion.div 
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          className="w-full max-w-md bg-[#0f172a] border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] p-8 shadow-2xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
              <Lock className="text-blue-500" size={28} />
            </div>
            <h3 className="text-xl font-black uppercase tracking-tighter italic">{title}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
              Entrez votre code secret Pimpay
            </p>
          </div>

          {/* Pin Dots */}
          <div className="flex justify-center gap-4 mb-8">
            {[...Array(pinLength)].map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  pin[i] 
                    ? "bg-blue-500 border-blue-500 scale-110 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                    : "border-slate-700 bg-transparent"
                } ${error ? "border-rose-500 bg-rose-500/20" : ""}`}
              />
            ))}
          </div>

          {error && (
            <p className="text-center text-rose-500 text-[10px] font-black uppercase tracking-widest mb-6 animate-bounce">
              {error}
            </p>
          )}

          {/* NumPad */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0"].map((num, i) => (
              <button
                key={i}
                disabled={loading || num === ""}
                onClick={() => handlePress(num)}
                className={`h-16 flex items-center justify-center rounded-2xl text-xl font-black transition-all active:scale-90 ${
                  num === "" ? "opacity-0" : "bg-white/5 hover:bg-white/10 border border-white/5"
                }`}
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleDelete}
              className="h-16 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/10 active:scale-90"
            >
              <Delete size={24} />
            </button>
          </div>

          {/* Fermer */}
          <button
            onClick={onClose}
            className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors"
          >
            Annuler la transaction
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
