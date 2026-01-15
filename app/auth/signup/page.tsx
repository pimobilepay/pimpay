"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User, Mail, ShieldCheck, CheckCircle2,
  Loader2, Phone, ArrowLeft, Delete, Lock
} from "lucide-react";
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
    country: "Congo",
    password: "",
    confirmPassword: "",
  });

  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // --- LOGIQUE INSCRIPTION (ÉTAPE 1) ---
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

      setToken(data.token);
      setStep(2);
      toast.success("Compte créé ! Définissez votre PIN.");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- LOGIQUE PIN NUMPAD (ÉTAPE 2) ---
  const handleSetPin = useCallback(async (finalPin: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ pin: finalPin }),
      });

      if (!res.ok) throw new Error("Erreur configuration PIN");

      // Redirection vers l'étape de confirmation finale au lieu du dashboard
      setStep(3);
    } catch (err: any) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(err.message);
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Déclenchement automatique quand 4 chiffres sont saisis
  useEffect(() => {
    if (pin.length === 4 && step === 2) {
      handleSetPin(pin);
    }
  }, [pin, step, handleSetPin]);

  const handleNumberPress = (num: number) => {
    if (loading || pin.length >= 4) return;
    setPin(prev => prev + num);
  };

  const deleteDigit = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center overflow-hidden font-sans">

      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      {step === 1 && (
        <Card className="relative z-10 w-full max-w-[440px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[40px] m-4">
            <div className="flex justify-center gap-2 mb-8">
                <div className="h-1 w-8 rounded-full bg-blue-500" />
                <div className="h-1 w-4 rounded-full bg-slate-800" />
                <div className="h-1 w-4 rounded-full bg-slate-800" />
            </div>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-6">
                <ShieldCheck className="w-10 h-10 text-blue-500" />
              </div>
              <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase">PIMPAY<span className="text-blue-500 not-italic">.</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Protocol Sécurisé Elara</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Nom Complet</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                  <input className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder="John Doe" value={formData.fullName} onChange={e => handleChange("fullName", e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Email</Label>
                    <input type="email" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder="john@mail.com" value={formData.email} onChange={e => handleChange("email", e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                    <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Téléphone</Label>
                    <input type="tel" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder="+242..." value={formData.phone} onChange={e => handleChange("phone", e.target.value)} required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Password</Label>
                    <input type="password" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" value={formData.password} onChange={e => handleChange("password", e.target.value)} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Confirm</Label>
                    <input type="password" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" value={formData.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} required />
                  </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all mt-4">
                {loading ? <Loader2 className="animate-spin" /> : "CRÉER MON COMPTE"}
              </Button>
            </form>
            <p className="text-center mt-6 text-[11px] text-slate-500">Déjà un compte ? <Link href="/auth/login" className="text-blue-500 font-black uppercase ml-1">Connexion</Link></p>
        </Card>
      )}

      {step === 2 && (
        <div className="fixed inset-0 w-full h-full flex flex-col text-white animate-in fade-in slide-in-from-bottom-4 duration-500 z-50 bg-[#020617]">
          <div className="px-6 pt-10 flex items-center gap-4">
            <button onClick={() => setStep(1)} className="p-3 rounded-2xl bg-slate-900 border border-white/10 active:scale-90 transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Sécurité PimPay</h1>
              <p className="text-[10px] text-blue-500 uppercase font-bold tracking-[0.2em]">Configuration du PIN</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8">
            <div className={`w-full max-w-md space-y-6 ${shake ? "animate-shake" : ""}`}>
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-2">
                  <Lock className="text-blue-500" size={32} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tighter">Creér un Code PIN</h2>
                <p className="text-slate-400 text-sm">Choisissez 4 chiffres pour vos transactions</p>
              </div>

              <div className="flex justify-center gap-4 py-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pin.length > i ? "bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] scale-110" : "bg-slate-800 border border-white/10"}`} />
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-3xl border-t border-white/5 rounded-t-[40px] px-10 pt-8 pb-10">
            <div className="grid grid-cols-3 gap-y-4 gap-x-8 max-w-sm mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button key={num} type="button" onClick={() => handleNumberPress(num)} className="h-14 text-2xl font-bold rounded-2xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all">{num}</button>
              ))}
              <div className="flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-slate-700" /></div>
              <button type="button" onClick={() => handleNumberPress(0)} className="h-14 text-2xl font-bold rounded-2xl hover:bg-white/5 active:bg-blue-600/20 active:text-blue-500 transition-all">0</button>
              <button type="button" onClick={deleteDigit} className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white active:scale-90 transition-all"><Delete size={24} /></button>
            </div>
            {loading && (
              <div className="mt-6 text-center flex flex-col items-center">
                <Loader2 className="animate-spin text-blue-500 mb-2" size={20} />
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Cryptage en cours...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <Card className="relative z-10 w-full max-w-[400px] p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 text-center rounded-[40px] m-4 animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[30px] flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="text-green-500 size-10" />
            </div>
            <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">L'inscription à réussi !</h3>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 mb-8">Votre protocole PimPay est désormais actif.</p>
            <Button onClick={() => router.push("/auth/login")} className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-2xl font-black tracking-widest transition-all">
               SE CONNECTER MAINTENANT
            </Button>
        </Card>
      )}

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
