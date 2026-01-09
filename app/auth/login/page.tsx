"use client";

import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // États pour la transition contrôlée
  const [showTransition, setShowTransition] = useState(false);
  const [transitionStep, setTransitionStep] = useState("init");
  const [dynamicMessage, setDynamicMessage] = useState("Initialisation en cours");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.error ?? "Identifiants invalides");
        setLoading(false);
        return;
      }

      // 1. Activer l'écran de transition
      setShowTransition(true);

      if (data?.user) {
        localStorage.setItem("pimpay_user", JSON.stringify(data.user));
        
        // --- MODIFICATION : REDIRECTION VERS DASHBOARD AU LIEU DE "/" ---
        const targetPath = data.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

        // --- SEQUENCE DES MESSAGES DYNAMIQUES (PHASE 1 : 7.5s) ---

        // Après 2.5s -> Sécurisation
        setTimeout(() => setDynamicMessage("Sécurisation"), 2500);

        // Après 5s -> Synchronisation
        setTimeout(() => setDynamicMessage("Synchronisation"), 5000);

        // --- PASSAGE À LA PHASE 2 (Après 7.5s) ---
        setTimeout(() => {
          setTransitionStep("success");

          // Redirection finale après encore 7.5s (Total 15s)
          setTimeout(() => {
            window.location.replace(targetPath);
          }, 7500);

        }, 7500);
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Le serveur ne répond pas");
      setLoading(false);
      setShowTransition(false);
    }
  };

  if (!mounted) {
    return <div className="min-h-screen bg-[#020617]" />;
  }

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden">

      {/* --- ÉCRAN DE TRANSITION DYNAMIQUE --- */}
      {showTransition && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#020617]">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full bg-blue-500/20 animate-ping scale-150 transition-colors duration-1000 ${transitionStep === "success" ? "bg-green-500/20" : ""}`} />

            <div className={`relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr transition-all duration-1000 shadow-2xl ${
              transitionStep === "success"
              ? "from-green-500 to-emerald-700 shadow-green-500/50"
              : "from-blue-500 to-blue-700 shadow-blue-500/50"
            }`}>
              {transitionStep === "success" ? (
                <CheckCircle2 className="w-12 h-12 text-white animate-in zoom-in duration-500" />
              ) : (
                <ShieldCheck className="w-12 h-12 text-white animate-pulse" />
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <h2 className="text-white text-xl font-bold tracking-tighter uppercase">
              PIMPAY<span className={transitionStep === "success" ? "text-green-500" : "text-blue-500"}>.</span>
            </h2>

            <div className="flex items-center gap-2 mt-2 text-slate-400 h-10">
              {transitionStep === "init" ? (
                <div className="flex items-center gap-2 animate-in fade-in duration-500">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span className="text-xs font-medium uppercase tracking-[0.2em]">{dynamicMessage}...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xs font-bold text-green-500 uppercase tracking-[0.2em] animate-in slide-in-from-bottom-2">
                    Connecté avec succès
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest animate-pulse">
                    Chargement de votre espace sécurisé...
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Background glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />

      <Card className="relative z-10 w-full max-w-[420px] p-6 sm:p-10 bg-slate-900/50 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[32px]">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-700 mb-6 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-10 h-10 text-white" />
          </div>

          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2 uppercase">
            PIMPAY<span className="text-blue-500 not-italic">.</span>
          </h1>

          <p className="text-slate-400 font-medium text-sm">
            Sécurisez vos actifs Pi Network
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300 ml-1 text-[10px] font-bold uppercase tracking-[0.2em]">
              Adresse Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@exemple.com"
                className="h-14 pl-12 bg-slate-950/50 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300 ml-1 text-[10px] font-bold uppercase tracking-[0.2em]">
              Mot de passe
            </Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="h-14 pl-12 pr-12 bg-slate-950/50 border-white/10 text-white rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Identification...</span>
              </div>
            ) : (
              "Accéder au compte"
            )}
          </Button>
        </form>

        {/* Footer */}
        <div className="mt-10 flex flex-col items-center space-y-4">
          <Link href="/auth/forgot-password" core-component="true" className="text-slate-400 hover:text-blue-400 text-xs font-semibold">
            Identifiants oubliés ?
          </Link>
          <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <p className="text-xs text-slate-500 font-medium">
            Pas encore de compte ?
            <Link href="/auth/signup" className="ml-1 text-blue-500 hover:text-blue-400 font-bold">
              Rejoindre PimPay
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
