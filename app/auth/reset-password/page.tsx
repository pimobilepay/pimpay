"use client";

import React, { useState, useEffect, Suspense } from "react";
import { ArrowLeft, Eye, EyeOff, Shield, Lock, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  // Récupération des preuves de validation du GCV Shield
  const username = searchParams.get("username") || "";
  const token = searchParams.get("token") || ""; // C'est l'OTP (ex: 448441)

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Sécurité : Si pas de token ou de username, on renvoie à la case départ
    if (mounted && (!token || !username)) {
      toast.error("Preuves de sécurité manquantes");
      router.push("/auth/forgot-password");
    }
  }, [mounted, token, username, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit faire au moins 6 caractères");
      return;
    }

    setLoading(true);

    try {
      // APPEL À L'API AVEC LES CLÉS ATTENDUES PAR LE SERVEUR
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.toLowerCase().trim(), // Identifiant (@juridique)
          code: token,                             // L'OTP (448441) envoyé sous le nom 'code'
          newPassword: newPassword.trim()          // Le nouveau pass
        }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Échec de la mise à jour");

      setIsSuccess(true);
      toast.success("Sécurité PimPay mise à jour !");

      setTimeout(() => {
        router.push("/auth/login");
      }, 3000);

    } catch (err: any) {
      // Diagnostic précis pour aider l'utilisateur
      toast.error(err.message || "Erreur de connexion");
      console.error("RESET_SUBMIT_ERROR:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* HEADER */}
      <div className="relative px-6 pt-12 flex items-center gap-4 z-10">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-3 rounded-2xl bg-slate-900 border border-white/10 active:scale-95 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter italic">Réinitialisation</h1>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">GCV Shield Protocol</p>
        </div>
      </div>

      <div className="relative flex-1 flex flex-col justify-center px-6 z-20 pb-12">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-4">
              <Shield className="text-blue-500" size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Nouveau Pass</h2>
            <p className="text-slate-400 text-sm">Définissez vos nouveaux accès pour <span className="text-blue-400">@{username}</span></p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Input Nouveau Password */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Nouveau mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirmation */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-blue-500 outline-none transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all mt-4 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : "Confirmer le changement"}
              </button>
            </form>
          ) : (
            <div className="text-center p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] space-y-4 animate-in zoom-in-95">
               <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
               <p className="text-sm font-bold text-emerald-200">Mot de passe modifié avec succès ! Redirection...</p>
            </div>
          )}

          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl flex items-center gap-3">
             <CheckCircle2 size={16} className="text-blue-500" />
             <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Validation cryptographique : OK ({token})</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}
