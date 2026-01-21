"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User, ShieldCheck, CheckCircle2,
  Loader2, ArrowLeft, Delete, Lock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [pin, setPin] = useState("");
  const [authToken, setAuthToken] = useState("");
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- ÉTAPE 1 : INSCRIPTION ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          username: formData.email.split('@')[0] + Math.floor(Math.random() * 100)
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'inscription");

      if (data.token) {
        setAuthToken(data.token);
        localStorage.setItem("pimpay_token", data.token);
        document.cookie = `pi_session_token=${data.token}; path=/; max-age=3600; SameSite=Lax`;
      }

      setStep(2);
      toast.success("Compte créé !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ÉTAPE 2 : CONFIGURATION PIN (Logique) ---
  const handleSetPin = useCallback(async (finalPin: string) => {
    if (loading) return;
    setLoading(true);

    const currentToken = authToken || localStorage.getItem("pimpay_token");

    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ pin: finalPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur PIN");

      setStep(3);
      toast.success("Sécurité configurée !");
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [authToken, loading]);

  useEffect(() => {
    if (pin.length === 4 && step === 2) {
      handleSetPin(pin);
    }
  }, [pin, step, handleSetPin]);

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const deleteDigit = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center overflow-hidden font-sans p-4">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      {/* STEP 1: FORMULAIRE D'INSCRIPTION */}
      {step === 1 && (
        <Card className="relative z-10 w-full max-w-[440px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[40px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-6">
              <ShieldCheck className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase">PIMPAY<span className="text-blue-500 not-italic">.</span></h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Créer un compte pimpay</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Nom Complet</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                <input className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder="Nom Prénom" value={formData.fullName} onChange={e => handleChange("fullName", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Email</Label>
                <input type="email" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder="mail@pimpay.com" value={formData.email} onChange={e => handleChange("email", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Téléphone</Label>
                <input type="tel" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder="+242..." value={formData.phone} onChange={e => handleChange("phone", e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Password</Label>
                <input type="password" title="password" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" value={formData.password} onChange={e => handleChange("password", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Confirm</Label>
                <input type="password" title="confirm" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" value={formData.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} required />
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all mt-4">
              {loading ? <Loader2 className="animate-spin" /> : "CONTINUER"}
            </Button>
          </form>
          <p className="text-center mt-6 text-[11px] text-slate-500 uppercase font-bold tracking-widest">
            Déjà inscrit ? <Link href="/auth/login" className="text-blue-500 ml-1">Connexion</Link>
          </p>
        </Card>
      )}

      {/* STEP 2: CONFIG PIN (Design identique au PinCodeModal) */}
      <AnimatePresence>
        {step === 2 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020617]/95 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[400px] bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="px-6 pt-8 text-center">
                <div className="inline-flex p-3 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-3">
                  <ShieldCheck className="text-blue-500" size={24} />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-white">Définir un PIN</h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">Sécurisé par Elara</p>
              </div>

              <div className={`px-8 py-6 ${shake ? "animate-shake" : ""}`}>
                {/* Dots */}
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

                {/* Numpad */}
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
                    type="button"
                    onClick={() => setStep(1)}
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

              {/* Footer Loading */}
              <div className="bg-slate-950/50 py-4 border-t border-white/5">
                {loading ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <Loader2 className="animate-spin text-blue-500 mb-1" size={20} />
                    <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">Initialisation...</p>
                  </div>
                ) : (
                  <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest">PimPay Protocol v1.0</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STEP 3: SUCCÈS FINAL */}
      {step === 3 && (
        <Card className="relative z-10 w-full max-w-[400px] p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 text-center rounded-[40px] animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[30px] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-500 size-10" />
          </div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Compte Activé !</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 mb-8">Votre protocole PimPay est prêt.</p>
          <Button onClick={() => router.push("/auth/login")} className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-2xl font-black tracking-widest transition-all">
            SE CONNECTER
          </Button>
        </Card>
      )}

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
