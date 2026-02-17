"use client";                                  
import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Lock, Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
// ✅ CORRECTION : On utilise le HOOK direct (comme le 15 Janvier)
import { usePiAuth } from "@/hooks/usePiAuth"; 
import PinCodeModal from "@/components/modals/PinCodeModal";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [tempUserId, setTempUserId] = useState<string | null>(null);
  const [tempRole, setTempRole] = useState<string | null>(null);

  // ✅ Utilisation du Hook Direct
  const { loginWithPi, loading: piLoading } = usePiAuth();

  const [showTransition, setShowTransition] = useState(false);
  const [transitionStep, setTransitionStep] = useState("init");
  const [dynamicMessage, setDynamicMessage] = useState("Initialisation");

  useEffect(() => {
    setMounted(true);
  }, []);

  const triggerSuccessTransition = (targetPath: string) => {
    setShowTransition(true);
    setTimeout(() => setDynamicMessage("Sécurisation"), 1000);
    setTimeout(() => setDynamicMessage("Synchronisation"), 2000);
    setTimeout(() => {
      setTransitionStep("success");
      setTimeout(() => {
        window.location.replace(targetPath);
      }, 1000);
    }, 3000);
  };

  // Login Classique (Email/Password)
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

      if (data.requirePin) {
        setTempUserId(data.userId);
        setTempRole(data.role);
        setShowPinModal(true);
        setLoading(false);
      } else if (data?.user) {
        localStorage.setItem("pimpay_user", JSON.stringify(data.user));
        triggerSuccessTransition(data.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
      }
    } catch (error) {
      toast.error("Le serveur ne répond pas");
      setLoading(false);
    }
  };

  // ✅ CORRECTION : Login Pi Browser utilisant le Hook stable
  const handlePiBrowserLogin = async () => {
    try {
      const result = await loginWithPi();
      
      if (result && result.success) {
        // Le cookie 'pi_session_token' est déjà posé par le hook !
        localStorage.setItem("pimpay_user", JSON.stringify(result.user));
        triggerSuccessTransition(result.user.role === "ADMIN" ? "/admin/dashboard" : "/dashboard");
      }
    } catch (error: any) {
      console.error("Erreur Pi Login:", error);
      toast.error("Erreur de communication avec le Pi Browser");
    }
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center p-4 overflow-hidden font-sans">
      
      <PinCodeModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={() => {
          const destination = tempRole === "ADMIN" ? "/admin/dashboard" : "/dashboard";
          triggerSuccessTransition(destination);
        }}
        userId={tempUserId}
      />

      {showTransition && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#020617]">
          <div className={`flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-tr transition-all duration-700 ${
            transitionStep === "success" ? "from-green-500 to-emerald-700 shadow-green-500/50" : "from-blue-600 to-blue-800 shadow-blue-500/50"
          }`}>
            {transitionStep === "success" ? <CheckCircle2 className="w-12 h-12 text-white" /> : <ShieldCheck className="w-12 h-12 text-white animate-pulse" />}
          </div>
          <h2 className="mt-6 text-white text-xl font-bold tracking-tighter uppercase">
            PIMPAY<span className={transitionStep === "success" ? "text-green-500" : "text-blue-500"}>.</span>
          </h2>
          <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-widest">{dynamicMessage}...</p>
        </div>
      )}

      <Card className="relative z-10 w-full max-w-[420px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[32px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 mb-6">
            <ShieldCheck className="w-10 h-10 text-blue-500" />
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1">PIMPAY<span className="text-blue-500 not-italic">.</span></h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Protocol Sécurisé Elara</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-400 ml-1 text-[10px] font-black uppercase tracking-widest">Identifiant</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input
                type="text" required value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="email ou username"
                className="w-full h-14 pl-12 bg-slate-950/50 border border-white/5 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none text-sm"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-slate-400 ml-1 text-[10px] font-black uppercase tracking-widest">Mot de passe</Label>
              <Link href="/auth/forgot-password" size="sm" className="text-blue-500 text-[9px] font-bold uppercase tracking-widest">Oublié ?</Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 w-5 h-5" />
              <input
                type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-14 pl-12 pr-12 bg-slate-950/50 border border-white/5 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-white">
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <Button type="submit" disabled={loading || piLoading} className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold active:scale-[0.98] transition-all">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONNEXION"}
          </Button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">OU</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>

        <Button
          onClick={handlePiBrowserLogin}
          disabled={loading || piLoading}
          type="button"
          className="w-full h-14 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
        >
          {piLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                <span className="text-white font-bold text-xs">π</span>
              </div>
              <span className="text-sm uppercase tracking-tight">Pi Browser Login</span>
            </>
          )}
        </Button>

        <div className="mt-8 text-center">
          <p className="text-[11px] text-slate-500 font-medium">
            Pas encore de compte ?
            <Link href="/auth/signup" className="ml-2 text-blue-500 font-bold uppercase tracking-widest hover:underline">
              Rejoindre PimPay
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
