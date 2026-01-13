"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Mail, Phone, Lock, ShieldCheck, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [pin, setPin] = useState("");
  const [token, setToken] = useState("");

  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      // Génération automatique d'un username si non fourni
      const finalUsername = formData.username || formData.email.split('@')[0] + Math.floor(Math.random() * 1000);

      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, username: finalUsername }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur d'inscription");
        return;
      }

      if (data.token) {
        setToken(data.token);
        localStorage.setItem("pimpay_token", data.token);
      }
      setStep(2);
      toast.success("Compte créé ! Configurez votre PIN de sécurité.");
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  const handleSetPin = async () => {
    if (pin.length !== 4) return;
    setLoading(true);

    const activeToken = token || localStorage.getItem("pimpay_token");

    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeToken}`,
        },
        body: JSON.stringify({ pin }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        toast.error(errorData.error || "Erreur lors de la création du PIN");
      } else {
        setStep(3);
        localStorage.removeItem("pimpay_token");
      }
    } catch (err) {
      toast.error("Erreur serveur lors du PIN");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <Card className="relative z-10 w-full max-w-[440px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[40px]">
        
        {/* Progress bar compact */}
        <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1 rounded-full transition-all duration-500 ${step >= s ? "w-8 bg-blue-500" : "w-4 bg-slate-800"}`} />
            ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1">PIMPAY<span className="text-blue-500 not-italic">.</span></h1>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Créer un compte sécurisé</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Nom Complet</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-5" />
                  <input
                    className="w-full h-12 pl-12 bg-slate-950/50 border border-white/5 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-5" />
                  <input
                    type="email"
                    className="w-full h-12 pl-12 bg-slate-950/50 border border-white/5 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Password</Label>
                    <input
                        type="password"
                        className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Confirm</Label>
                    <input
                        type="password"
                        className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange("confirmPassword", e.target.value)}
                        required
                    />
                  </div>
              </div>

              <Button type="submit" disabled={loading} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all">
                {loading ? <Loader2 className="animate-spin" /> : "CONTINUER"}
              </Button>
            </form>

            <div className="text-center pt-4">
               <p className="text-[11px] text-slate-500 font-medium">
                Déjà un compte ? 
                <Link href="/auth/login" className="ml-2 text-blue-500 font-black hover:underline uppercase tracking-widest">Se connecter</Link>
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 py-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mb-6">
                 <ShieldCheck className="text-blue-500 size-8" />
              </div>
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Code PIN Elara</h2>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Créez votre code secret à 4 chiffres</p>
            </div>

            <div className="flex justify-center gap-3 relative py-4">
               {[0, 1, 2, 3].map((i) => (
                 <div key={i} className={`w-12 h-16 rounded-2xl border flex items-center justify-center text-2xl font-bold transition-all duration-300 ${pin[i] ? "border-blue-500 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.3)] text-white" : "border-white/5 bg-slate-950/50 text-slate-800"}`}>
                   {pin[i] ? "•" : ""}
                 </div>
               ))}
               <input
                type="tel"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="absolute inset-0 opacity-0 cursor-default"
                autoFocus
              />
            </div>

            <Button onClick={handleSetPin} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black tracking-widest disabled:opacity-30" disabled={pin.length !== 4 || loading}>
              {loading ? <Loader2 className="animate-spin" /> : "ACTIVER MON PIN"}
            </Button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 py-6 text-center animate-in fade-in zoom-in duration-500">
             <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500 blur-3xl opacity-20 animate-pulse" />
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[30px] flex items-center justify-center relative z-10 mx-auto">
                    <CheckCircle2 className="text-green-500 size-10" />
                </div>
             </div>
             <div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Félicitations !</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 px-6">Votre protocole PimPay est désormais actif.</p>
             </div>
             <Button onClick={() => router.push("/auth/login")} className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-2xl font-black tracking-widest active:scale-[0.98] transition-all">
               ACCÉDER AU DASHBOARD
             </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
