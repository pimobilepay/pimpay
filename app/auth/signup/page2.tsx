"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [step, setStep] = useState(1); // 1 = signup, 2 = PIN
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [pin, setPin] = useState("");
  const [userId, setUserId] = useState("");
  const [token, setToken] = useState("");

  const router = useRouter();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // -------------------
  // Étape 1 : Signup
  // -------------------
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de l'inscription");
        return;
      }

      // Stocker token et userId pour création PIN
      setToken(data.token);
      setUserId(data.user.id);
      localStorage.setItem("pimpay_token", data.token);

      // Passer à l'étape 2 (PIN)
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // -------------------
  // Étape 2 : Créer le PIN
  // -------------------
  const handleSetPin = async () => {
    if (pin.length !== 4) {
      toast.error("Le PIN doit contenir 4 chiffres");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Erreur lors de la création du PIN");
      } else {
        toast.success("Inscription réussie et PIN enregistré !");
        // Passer à l'étape 3 : message de confirmation
        setStep(3);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // -------------------
  // Étape 3 : Confirmation
  // -------------------
  const handleFinish = () => {
    router.push("/auth/login"); // Redirection vers login
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary via-accent to-secondary">
      <h1 className="text-4xl font-bold text-white mb-6">Pimpay</h1>

      <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur-xl shadow-2xl text-center">
        {step === 1 && (
          <>
            <h2 className="text-4xl font-bold text-primary mb-4">Créer un compte</h2>
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <Label>Nom complet</Label>
                <Input
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label>Téléphone</Label>
                <Input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <div>
                <Label>Mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleChange("password", e.target.value)}
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

              <div>
                <Label>Confirmer le mot de passe</Label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange("confirmPassword", e.target.value)}
                    required
                    className="h-12 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full h-12" disabled={loading}>
                {loading ? "Inscription..." : "S'inscrire"}
              </Button>

              <p className="mt-4 text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <Link href="/auth/login" className="text-primary font-semibold underline">
                  Connectez-vous
                </Link>
              </p>
            </form>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold mb-2">Créer un PIN (4 chiffres)</h1>
            <input
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              className="w-full p-3 text-center text-xl rounded-xl mb-4 bg-transparent border border-white/20"
            />
            <Button
              onClick={handleSetPin}
              className="w-full py-3"
              disabled={pin.length !== 4 || loading}
            >
              {loading ? "Enregistrement..." : "Enregistrer PIN"}
            </Button>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold mb-2">🎉 Inscription réussie !</h1>
            <p className="mb-4">Vous pouvez maintenant vous connecter avec votre compte et votre PIN.</p>
            <Button onClick={handleFinish} className="w-full py-3">
              Terminer
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
