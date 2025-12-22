"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ Connexion
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include", // important pour le cookie HttpOnly
      });

      const data = await res.json();

      if (!res.ok || !data.user) {
        toast.error(data.error || "Identifiants invalides");
        return;
      }

      toast.success("Connexion réussie !");

      // 2️⃣ Récupérer le profil complet depuis /api/auth/me
      const profileRes = await fetch("/api/auth/me", { credentials: "include" });
      const profileData = await profileRes.json();

      if (!profileRes.ok || !profileData.user) {
        window.location.href = "/auth/login";
        return;
      }

      // 🔹 Stockage local pour SideMenu et affichage utilisateur
      localStorage.setItem("pimpay_user", JSON.stringify(profileData.user));

      // 3️⃣ Redirection selon le rôle
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-accent to-secondary flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur-xl shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">Pimpay</h1>
          <p className="text-muted-foreground">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="votre@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 pr-12"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1 h-10 w-10"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
            {loading ? "Connexion..." : "Se connecter"}
          </Button>
        </form>

        <div className="mt-4 flex flex-col items-center space-y-2 text-sm text-muted-foreground">
          <Link href="/forgot-password" className="text-primary hover:underline">
            Mot de passe oublié ?
          </Link>
          <span>
            Pas de compte ?{" "}
            <Link href="/auth/signup" className="text-primary hover:underline">
              S’inscrire
            </Link>
          </span>
        </div>
      </Card>
    </div>
  );
}
