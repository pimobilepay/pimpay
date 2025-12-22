"use client";

import React, { useState, useEffect } from "react"; // Ajout de useEffect
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, ShieldCheck, Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false); // État pour corriger l'hydratation
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Empêche le mismatch d'hydratation
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.user) {
        toast.error(data.error || "Identifiants invalides");
        return;
      }

      toast.success("Connexion réussie !");
      
      const profileRes = await fetch("/api/auth/me", { credentials: "include" });
      const profileData = await profileRes.json();

      if (!profileRes.ok || !profileData.user) {
        window.location.href = "/auth/login";
        return;
      }

      localStorage.setItem("pimpay_user", JSON.stringify(profileData.user));

      if (profileData.user.role === "ADMIN") {
        window.location.href = "/admin/dashboard";
      } else {
        window.location.href = "/";
      }
    } catch (err) {
      console.error("Erreur login:", err);
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // Si le composant n'est pas encore monté côté client, on ne rend rien 
  // pour éviter que le HTML du serveur soit différent du client.
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Effets de lumière */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[120px]" />

      <Card className="w-full max-w-md p-8 bg-slate-900/50 backdrop-blur-2xl border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative z-10 rounded-[32px]">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500 to-blue-700 mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="text-white w-10 h-10" />
          </div>
          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-2">
            PIMPAY <span className="text-blue-500 not-italic">.</span>
          </h1>
          <p className="text-slate-400 font-medium">L'avenir de vos transactions Pi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2 text-left">
            <Label htmlFor="email" className="text-slate-300 ml-1 text-xs font-bold uppercase tracking-widest">Email</Label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input
                id="email"
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 pl-12 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2 text-left">
            <Label htmlFor="password" className="text-slate-300 ml-1 text-xs font-bold uppercase tracking-widest">Mot de passe</Label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 pl-12 pr-12 bg-slate-950/50 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Connexion...
              </div>
            ) : "Se connecter"}
          </Button>
        </form>

        <div className="mt-8 flex flex-col items-center space-y-4">
          <Link href="/forgot-password" size="sm" className="text-slate-400 hover:text-blue-400 text-sm font-medium transition-colors">
            Mot de passe oublié ?
          </Link>
          <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <p className="text-sm text-slate-500 font-medium">
            Nouveau ici ?{" "}
            <Link href="/auth/signup" className="text-blue-500 hover:text-blue-400 font-bold">
              Créer un compte
            </Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
