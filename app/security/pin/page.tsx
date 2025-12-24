"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, ShieldCheck, Delete, Lock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
                                                  export default function ChangePinPage() {
  const router = useRouter();                       const [step, setStep] = useState(1); // 1: Ancien, 2: Nouveau, 3: Confirmation
  const [pins, setPins] = useState({ 1: "", 2: "", 3: "" });                                          const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  // Déclencher la validation automatique quand le PIN atteint 4 chiffres
  useEffect(() => {
    const currentPin = pins[step as keyof typeof pins];
    if (currentPin.length === 4) {
      validateStep();
    }
  }, [pins, step]);

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;

    setPins(prev => {
      const current = prev[step as keyof typeof prev];
      if (current.length < 4) {
        return { ...prev, [step]: current + num };
      }
      return prev;
    });
  };

  const deleteDigit = () => {
    setPins(prev => ({
      ...prev,
      [step]: prev[step as keyof typeof prev].slice(0, -1)
    }));
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const validateStep = async () => {
    const currentPin = pins[step as keyof typeof pins];
    const token = localStorage.getItem("pimpay_token");

    if (!token) {
      toast.error("Session expirée");
      return;
    }

    if (step === 1) {
      setLoading(true);
      try {
        const res = await fetch("/api/security/verify-pin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ pin: currentPin }),
        });

        if (res.ok) {
          setStep(2);
        } else {
          triggerShake();
          toast.error("Ancien code PIN incorrect");
          setPins(prev => ({ ...prev, 1: "" }));
        }
      } catch (err) {
        toast.error("Erreur de connexion");
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (pins[3] !== pins[2]) {
        triggerShake();
        toast.error("Les codes ne correspondent pas");
        setPins(prev => ({ ...prev, 3: "" }));
        return;
      }

      setLoading(true);
      try {
        const res = await fetch("/api/security/update-pin", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ newPin: pins[2] }),
        });

        if (res.ok) {
          toast.success("Code PIN mis à jour avec succès");
          router.back();
        } else {
          toast.error("Erreur lors de la mise à jour");
        }
      } catch (err) {
        toast.error("Erreur serveur");
      } finally {
        setLoading(false);
      }
    }
  };

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
      case 1: return "Veuillez entrer votre code de sécurité actuel";
      case 2: return "Choisissez un nouveau code à 4 chiffres";
      case 3: return "Répétez le code pour confirmer";
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
          <h1 className="text-xl font-bold tracking-tight">Sécurité</h1>
          <p className="text-[10px] text-blue-500 uppercase font-bold tracking-[0.2em]">FinTech Web3 Protocol</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className={`w-full max-w-md space-y-8 transition-transform ${shake ? "animate-shake" : ""}`}>

          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-4">
              {step === 3 ? <CheckCircle2 className="text-blue-500" size={32} /> : <Lock className="text-blue-500" size={32} />}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">{getStepTitle()}</h2>
            <p className="text-slate-400 text-sm">{getStepSubtitle()}</p>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-4 py-4">
            {[0, 1, 2, 3].map((i) => {
              const active = pins[step as keyof typeof pins].length > i;
              return (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    active
                    ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110"
                    : "bg-slate-800 border border-white/10"
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Custom Keypad */}
      <div className="bg-slate-900/50 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] px-10 pt-10 pb-12">
        <div className="grid grid-cols-3 gap-y-6 gap-x-8 max-w-sm mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPress(num)}
              className="h-16 text-2xl font-bold rounded-2xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center">
             <div className="w-2 h-2 rounded-full bg-slate-700" />
          </div>
          <button
            onClick={() => handleNumberPress(0)}
            className="h-16 text-2xl font-bold rounded-2xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all"
          >
            0
          </button>
          <button
            onClick={deleteDigit}
            className="h-16 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white active:scale-90 transition-all"
          >
            <Delete size={24} />
          </button>
        </div>

        {loading && (
          <div className="mt-8 text-center">
            <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent" />
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-2">Vérification sécurisée...</p>
          </div>
        )}
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
