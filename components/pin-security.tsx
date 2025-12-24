"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Lock, ShieldAlert, Timer } from "lucide-react";

export default function PinSecurity({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  const MAX_ATTEMPTS = 3;
  const LOCK_TIME = 30; // 30 secondes de blocage

  // Gestion du compte à rebours de blocage
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isLocked && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsLocked(false);
      setAttempts(0);
    }
    return () => clearInterval(timer);
  }, [isLocked, timeLeft]);

  const verifyPin = async () => {
    if (pin.length !== 4) return;

    setLoading(true);
    try {
      const res = await fetch("/api/user/verify-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("pimpay_token")}`
        },
        body: JSON.stringify({ pin })
      });

      if (res.ok) {
        toast.success("Code PIN vérifié");
        onSuccess(); // On passe à l'étape suivante (modification)
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin("");

        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setTimeLeft(LOCK_TIME);
          toast.error(`Trop de tentatives. Bloqué pour ${LOCK_TIME}s`);
        } else {
          toast.error(`PIN incorrect. Tentative ${newAttempts}/${MAX_ATTEMPTS}`);
        }
      }
    } catch (error) {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-slate-900/80 rounded-[2.5rem] border border-white/10 backdrop-blur-md max-w-sm mx-auto text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-500">
        {isLocked ? <ShieldAlert size={32} className="text-red-500 animate-pulse" /> : <Lock size={32} />}
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-black uppercase italic tracking-tighter">Vérification de sécurité</h2>
        <p className="text-xs text-slate-500">Entrez votre code PIN actuel pour continuer</p>
      </div>

      {isLocked ? (
        <div className="py-4 space-y-2">
          <div className="flex items-center justify-center gap-2 text-red-500 font-black text-2xl">
            <Timer size={20} /> {timeLeft}s
          </div>
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Accès temporairement suspendu</p>
        </div>
      ) : (
        <div className="space-y-6">
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-black/40 border border-white/5 h-16 rounded-2xl text-center text-3xl tracking-[1.5em] font-black focus:border-blue-500/50 outline-none transition-all"
            placeholder="••••"
          />

          <button
            onClick={verifyPin}
            disabled={loading || pin.length < 4}
            className="w-full h-14 bg-blue-600 disabled:bg-slate-800 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            {loading ? "Vérification..." : "Confirmer"}
          </button>
        </div>
      )}
    </div>
  );
}
