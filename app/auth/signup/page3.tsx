"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Phone, ShieldCheck, CheckCircle2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  // États pour le PIN
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [token, setToken] = useState("");

  const router = useRouter();

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
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Erreur d'inscription");
        return;
      }
      setToken(data.token);
      localStorage.setItem("pimpay_token", data.token);
      setStep(2);
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  // Logique de validation du PIN en deux étapes
  const handlePinAction = () => {
    if (!isConfirming) {
      if (pin.length === 4) {
        setIsConfirming(true);
      }
    } else {
      if (pin === confirmPin) {
        handleSetPin();
      } else {
        toast.error("Les codes PIN ne correspondent pas");
        setConfirmPin(""); // Reset seulement la confirmation
      }
    }
  };

  const handleSetPin = async () => {
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
      if (!res.ok) {
        toast.error("Erreur lors de la création du PIN");
      } else {
        setStep(3);
      }
    } catch (err) {
      toast.error("Erreur serveur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden text-white">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      <div className="mb-8 text-center relative z-10">
        <h1 className="text-4xl font-black italic tracking-tighter">PIMPAY<span className="text-blue-500 font-normal">.</span></h1>
      </div>

      <Card className="w-full max-w-md p-8 bg-slate-900/50 backdrop-blur-2xl border-white/10 shadow-2xl relative z-10 rounded-[32px]">
        <div className="flex justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${step === s ? "w-8 bg-blue-500" : "w-2 bg-slate-700"}`} />
            ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-1">Créer un compte</h2>
              <p className="text-slate-400 text-sm">Rejoignez la révolution PiMPay</p>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 ml-1 uppercase">Nom Complet</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
                  <Input
                    className="h-12 pl-12 bg-slate-950/50 border-white/10 rounded-xl focus:border-blue-500 text-white"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleChange("fullName", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 ml-1 uppercase">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
                  <Input
                    type="email"
                    className="h-12 pl-12 bg-slate-950/50 border-white/10 rounded-xl focus:border-blue-500 text-white"
                    placeholder="john@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-400 ml-1 uppercase">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 size-5" />
                  <Input
                    type="tel"
                    className="h-12 pl-12 bg-slate-950/50 border-white/10 rounded-xl focus:border-blue-500 text-white"
                    placeholder="+242 06 000 0000"
                    value={formData.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Mot de passe</Label>
                    <Input
                        type="password"
                        className="h-12 bg-slate-950/50 border-white/10 rounded-xl focus:border-blue-500 text-white"
                        value={formData.password}
                        onChange={(e) => handleChange("password", e.target.value)}
                        required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Confirmation</Label>
                    <Input
                        type="password"
                        className="h-12 bg-slate-950/50 border-white/10 rounded-xl focus:border-blue-500 text-white"
                        value={formData.confirmPassword}
                        onChange={(e) => handleChange("confirmPassword", e.target.value)}
                        required
                    />
                  </div>
              </div>

              <Button type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-500 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-[0.98]" disabled={loading}>
                {loading ? "Traitement..." : "S'inscrire"}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-500">
              Déjà inscrit ? <Link href="/auth/login" className="text-blue-500 font-bold hover:underline">Se connecter</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 py-4 text-center">
            <div>
              <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                 <ShieldCheck className="text-blue-500 size-8" />
              </div>
              <h2 className="text-2xl font-bold">{isConfirming ? "Confirmez votre PIN" : "Sécurisez votre compte"}</h2>
              <p className="text-slate-400 text-sm">{isConfirming ? "Saisissez à nouveau le code à 4 chiffres." : "Créez un code PIN à 4 chiffres pour vos transactions."}</p>
            </div>

            <div className="flex justify-center gap-4 relative">
               {[0, 1, 2, 3].map((i) => {
                 const currentVal = isConfirming ? confirmPin : pin;
                 return (
                   <div key={i} className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${currentVal[i] ? "border-blue-500 bg-blue-500/10 text-white" : "border-white/10 bg-slate-950/50 text-slate-700"}`}>
                     {currentVal[i] ? "•" : "0"}
                   </div>
                 );
               })}
               <input
                type="tel"
                value={isConfirming ? confirmPin : pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  isConfirming ? setConfirmPin(val) : setPin(val);
                }}
                className="absolute inset-0 opacity-0 cursor-default"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <Button onClick={handlePinAction} className="w-full h-14 bg-blue-600 rounded-2xl font-bold disabled:opacity-30" disabled={(isConfirming ? confirmPin.length !== 4 : pin.length !== 4) || loading}>
                {loading ? "Chargement..." : isConfirming ? "Confirmer et Créer" : "Suivant"}
              </Button>

              {isConfirming && (
                <button 
                  onClick={() => { setIsConfirming(false); setConfirmPin(""); }}
                  className="flex items-center justify-center gap-2 w-full text-slate-500 text-xs font-bold uppercase hover:text-white transition-colors"
                >
                  <ChevronLeft size={14} /> Retour
                </button>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 py-6 text-center">
             <div className="relative inline-block">
                <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse" />
                <CheckCircle2 className="text-green-500 size-24 relative z-10" />
             </div>
             <div>
                <h2 className="text-2xl font-bold mb-2">Bienvenue à bord !</h2>
                <p className="text-slate-400">Votre compte PiMPay est prêt. Vous pouvez commencer à gérer vos Pi en toute sécurité.</p>
             </div>
             <Button onClick={() => router.push("/auth/login")} className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-2xl font-bold">
               Aller à la connexion
             </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
