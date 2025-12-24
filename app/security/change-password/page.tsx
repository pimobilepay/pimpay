"use client";

import React, { useState, useEffect } from "react";
// Remplacement de ShieldLock par Shield et Lock pour éviter l'erreur undefined
import { ArrowLeft, Key, Eye, EyeOff, Shield, Lock, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Correction pour éviter les erreurs d'hydratation Next.js
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Champs incomplets");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Les nouveaux mots de passe ne correspondent pas");
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("pimpay_token");
      if (!token) {
        toast.error("Session expirée");
        router.push("/login");
        return;
      }

      const res = await fetch("/api/security/update-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Échec de la mise à jour");
        return;
      }

      toast.success("Mot de passe mis à jour !");
      router.back();

    } catch (err) {
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col">
      {/* BACKGROUND DECO */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      {/* HEADER */}
      <div className="relative px-6 pt-12 flex items-center gap-4 z-10">
        <button 
          onClick={() => router.back()} 
          className="p-3 rounded-2xl bg-slate-900 border border-white/10 active:scale-95"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black uppercase tracking-tighter">Sécurité</h1>
          <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Update Protocol</p>
        </div>
      </div>

      {/* FORM */}
      <div className="relative flex-1 flex flex-col justify-center px-6 z-10">
        <div className="w-full max-w-md mx-auto space-y-8">
          
          <div className="text-center">
            <div className="inline-flex p-4 rounded-3xl bg-blue-600/10 border border-blue-500/20 mb-4">
              <Shield className="text-blue-500" size={32} />
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tighter">Mot de passe</h2>
            <p className="text-slate-400 text-sm">Modifiez vos accès de sécurité</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Ancien mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm focus:border-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Nouveau mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm focus:border-blue-500 outline-none"
                  placeholder="••••••••"
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

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 ml-1">Confirmation</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm focus:border-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all mt-4"
            >
              {loading ? "Mise à jour..." : "Confirmer le changement"}
            </button>
          </form>

          <div className="p-4 bg-slate-900/30 border border-white/5 rounded-2xl flex items-center gap-3">
             <CheckCircle2 size={16} className="text-emerald-500" />
             <p className="text-[10px] text-slate-500 uppercase font-bold">Données chiffrées de bout en bout</p>
          </div>
        </div>
      </div>
    </div>
  );
}
