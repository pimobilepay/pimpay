"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Delete, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ChangePinPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [pins, setPins] = useState({ 1: "", 2: "", 3: "" });
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);

  // Utilisation d'une ref pour éviter les appels API en double pendant le chargement
  const isProcessing = useRef(false);

  const handleUpdatePin = useCallback(async (finalPin: string) => {
    if (isProcessing.current) return;
    isProcessing.current = true;
    setLoading(true);

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      // Envoyer le token Bearer en fallback si présent dans localStorage
      const localToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (localToken) {
        headers["Authorization"] = `Bearer ${localToken}`;
      }

      const res = await fetch("/api/security/update-pin", {
        method: "PUT",
        headers,
        credentials: "include", // Envoie automatiquement les cookies
        body: JSON.stringify({ newPin: finalPin }),
      });

      if (res.ok) {
        toast.success("Code PIN mis à jour !");
        // Redirection vers le nouveau chemin spécifié
        router.push("/settings/security");
      } else {
        const data = await res.json();
        toast.error(data.error || "Échec de la mise à jour");
        setPins({ 1: "", 2: "", 3: "" });
        setStep(1);
        isProcessing.current = false; // Libérer le verrou pour permettre une nouvelle tentative
      }
    } catch (err) {
      toast.error("Erreur serveur");
      isProcessing.current = false;
    } finally {
      setLoading(false);
    }
  }, [router]);

  const validateStep = useCallback(async () => {
    const currentPin = pins[step as 1 | 2 | 3];

    // Sécurité : Ne rien faire si déjà en cours ou si le PIN n'est pas complet
    if (currentPin.length !== 4 || isProcessing.current) return;

    if (step === 1) {
      isProcessing.current = true;
      setLoading(true);
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

        // Si le serveur renvoie 401, c'est une expiration de session
        if (res.status === 401) {
          toast.error("Session expirée, reconnexion...");
          router.push("/auth/login");
          return;
        }

        const data = await res.json();

        if (res.ok) {
          setStep(2);
          isProcessing.current = false; // Prêt pour l'étape suivante
        } else {
          setShake(true);
          setTimeout(() => setShake(false), 500);
          toast.error(data.error || "Ancien code PIN incorrect");
          setPins(p => ({ ...p, 1: "" }));
          isProcessing.current = false; // Permettre de retaper le PIN
        }
      } catch (err) {
        toast.error("Erreur de connexion");
        isProcessing.current = false;
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (pins[3] !== pins[2]) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        toast.error("Les codes ne correspondent pas");
        setPins(p => ({ ...p, 3: "" }));
        return;
      }
      // On passe le PIN directement
      handleUpdatePin(pins[3]);
    }
  }, [pins, step, router, handleUpdatePin]);

  // Surveillance du remplissage du PIN avec verrouillage
  useEffect(() => {
    const currentPin = pins[step as 1 | 2 | 3];
    if (currentPin.length === 4 && !isProcessing.current && !loading) {
      validateStep();
    }
  }, [pins, step, validateStep, loading]);

  const handleNumberPress = (num: number) => {
    if (loading || shake || isProcessing.current) return;
    setPins((prev) => {
      const current = prev[step as 1 | 2 | 3];
      if (current.length < 4) {
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
  const subtitles = ["", "Vérification de sécurité", "Choisissez 4 chiffres", "Confirmez votre nouveau code"];

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans">
      <div className="px-6 pt-12 flex items-center gap-4">
        <button 
          onClick={() => router.back()} 
          className="p-3 rounded-2xl bg-slate-900 border border-white/10 active:scale-90 transition-all"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sécurité PimPay</h1>
          <p className="text-[10px] text-blue-500 uppercase font-bold tracking-[0.2em]">FinTech Web3 Protocol</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className={`w-full max-w-md space-y-8 ${shake ? "animate-shake" : ""}`}>
          <div className="text-center space-y-2">
            <div className="inline-flex p-4 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-4">
              {step === 3 ? <CheckCircle2 className="text-blue-500" size={32} /> : <Lock className="text-blue-500" size={32} />}
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">{titles[step]}</h2>
            <p className="text-slate-400 text-sm">{subtitles[step]}</p>
          </div>

          <div className="flex justify-center gap-4 py-4">
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  pins[step as 1|2|3].length > i 
                  ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110" 
                  : "bg-slate-800 border border-white/10"
                }`} 
              />
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] px-10 pt-10 pb-12">
        <div className="grid grid-cols-3 gap-y-6 gap-x-8 max-w-sm mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button 
              key={num} 
              type="button" 
              onClick={() => handleNumberPress(num)} 
              className="h-16 text-2xl font-bold rounded-2xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all text-white"
            >
              {num}
            </button>
          ))}
          <div className="flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-slate-700" /></div>
          <button 
            type="button" 
            onClick={() => handleNumberPress(0)} 
            className="h-16 text-2xl font-bold rounded-2xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all text-white"
          >
            0
          </button>
          <button 
            type="button" 
            onClick={deleteDigit} 
            className="h-16 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white active:scale-90 transition-all"
          >
            <Delete size={24} />
          </button>
        </div>

        {loading && (
          <div className="mt-8 text-center flex flex-col items-center">
            <Loader2 className="animate-spin text-blue-500 mb-2" size={24} />
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Traitement sécurisé Elara...</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
