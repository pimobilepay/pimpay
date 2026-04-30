"use client";

import { getErrorMessage } from '@/lib/error-utils';
import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Building2, ShieldCheck, CheckCircle2,
  Loader2, Delete, User, Mail, Phone,
  MapPin, FileText, ArrowLeft, ArrowRight,
  XCircle, AlertCircle, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function BusinessSignupPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1); // 1: Business Info, 2: Representative Info, 3: PIN Setup, 4: Success
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Business Information
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessType: "",
    rccm: "",
    nif: "",
    address: "",
    city: "",
    country: "Congo",
  });

  // Representative Information
  const [representativeData, setRepresentativeData] = useState({
    fullName: "",
    email: "",
    phone: "",
    position: "",
    password: "",
    confirmPassword: "",
  });

  const [pin, setPin] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "valid" | "invalid" | "disposable" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const emailCheckTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => { setMounted(true); }, []);

  const handleBusinessChange = (field: string, value: string) => {
    setBusinessData((prev) => ({ ...prev, [field]: value }));
  };

  const handleRepresentativeChange = (field: string, value: string) => {
    setRepresentativeData((prev) => ({ ...prev, [field]: value }));

    if (field === "email") {
      setEmailStatus("idle");
      setEmailMessage("");
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
        emailCheckTimeoutRef.current = null;
      }
    }
  };

  const isEmailFormatValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleEmailBlur = () => {
    const email = representativeData.email.trim();

    if (!email) {
      setEmailStatus("idle");
      return;
    }

    if (!isEmailFormatValid(email)) {
      setEmailStatus("invalid");
      setEmailMessage("Format d'email invalide");
      return;
    }

    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    setEmailStatus("checking");
    setEmailMessage("Verification en cours...");

    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase() }),
        });

        const data = await res.json();

        if (res.status === 429) {
          setEmailStatus("idle");
          setEmailMessage("");
          return;
        }

        if (data.isValid) {
          setEmailStatus("valid");
          setEmailMessage("Email valide");
        } else if (data.isDisposable) {
          setEmailStatus("disposable");
          setEmailMessage("Les emails temporaires ne sont pas acceptes");
        } else {
          setEmailStatus("invalid");
          setEmailMessage("Email invalide ou inexistant");
        }
      } catch {
        setEmailStatus("error");
        setEmailMessage("Erreur de verification");
      }
    }, 500);
  };

  // Validation Step 1
  const validateBusinessInfo = () => {
    if (!businessData.businessName.trim()) {
      toast.error("Veuillez entrer le nom de l'entreprise");
      return false;
    }
    if (!businessData.businessType) {
      toast.error("Veuillez selectionner le type d'entreprise");
      return false;
    }
    if (!businessData.address.trim()) {
      toast.error("Veuillez entrer l'adresse de l'entreprise");
      return false;
    }
    if (!businessData.city.trim()) {
      toast.error("Veuillez entrer la ville");
      return false;
    }
    return true;
  };

  // Step 1 -> Step 2
  const handleContinueToRepresentative = () => {
    if (validateBusinessInfo()) {
      setStep(2);
    }
  };

  // Step 2: Submit Business Signup
  const handleBusinessSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (representativeData.password !== representativeData.confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (representativeData.password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: representativeData.fullName,
          email: representativeData.email,
          phone: representativeData.phone,
          password: representativeData.password,
          username: representativeData.email.split('@')[0] + Math.floor(Math.random() * 100),
          role: "BUSINESS_ADMIN",
          businessInfo: {
            businessName: businessData.businessName,
            businessType: businessData.businessType,
            rccm: businessData.rccm,
            nif: businessData.nif,
            address: businessData.address,
            city: businessData.city,
            country: businessData.country,
            representativePosition: representativeData.position,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'inscription");

      if (data.token) {
        setAuthToken(data.token);
        localStorage.setItem("pimpay_token", data.token);
        document.cookie = `pi_session_token=${data.token}; path=/; max-age=3600; SameSite=Lax`;
      }

      setStep(3);
      toast.success("Entreprise enregistree avec succes!");
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // PIN Setup
  const handleSetPin = useCallback(async (finalPin: string) => {
    if (loading) return;
    setLoading(true);

    const currentToken = authToken || localStorage.getItem("pimpay_token");

    try {
      const res = await fetch("/api/auth/set-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ pin: finalPin }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur de configuration PIN");

      setStep(4);
      toast.success("Securite configuree avec succes!");
    } catch (err: unknown) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(getErrorMessage(err));
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [authToken, loading]);

  useEffect(() => {
    if (pin.length === 4 && step === 3) {
      handleSetPin(pin);
    }
  }, [pin, step, handleSetPin]);

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;
    if (pin.length < 4) setPin(prev => prev + num);
  };

  const deleteDigit = () => {
    if (loading) return;
    setPin(prev => prev.slice(0, -1));
  };

  const businessTypes = [
    { value: "SARL", label: "SARL" },
    { value: "SA", label: "SA" },
    { value: "EI", label: "Entreprise Individuelle" },
    { value: "SAS", label: "SAS" },
    { value: "ASSOCIATION", label: "Association" },
    { value: "OTHER", label: "Autre" },
  ];

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center overflow-hidden font-sans p-4">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-600/10 rounded-full blur-[120px]" />

      {/* STEP 1: INFORMATIONS ENTREPRISE */}
      {step === 1 && (
        <Card className="relative z-10 w-full max-w-[480px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[40px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-600/10 border border-amber-500/20 mb-6">
              <Building2 className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase">PIMPAY<span className="text-amber-500 not-italic">.</span></h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Inscription Entreprise</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">1</div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Entreprise</span>
            </div>
            <div className="w-8 h-px bg-white/10" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-500 text-xs font-bold">2</div>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Representant</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Nom de l'entreprise *</Label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                <input 
                  className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="Ma Societe SARL" 
                  value={businessData.businessName} 
                  onChange={e => handleBusinessChange("businessName", e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Type d'entreprise *</Label>
              <select 
                className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                value={businessData.businessType}
                onChange={e => handleBusinessChange("businessType", e.target.value)}
              >
                <option value="" className="bg-slate-900">Selectionner...</option>
                {businessTypes.map(type => (
                  <option key={type.value} value={type.value} className="bg-slate-900">{type.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">RCCM</Label>
                <input 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="CG-BZV-..." 
                  value={businessData.rccm} 
                  onChange={e => handleBusinessChange("rccm", e.target.value)} 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">NIF</Label>
                <input 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="Numero NIF" 
                  value={businessData.nif} 
                  onChange={e => handleBusinessChange("nif", e.target.value)} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Adresse *</Label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                <input 
                  className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="123 Avenue de la Paix" 
                  value={businessData.address} 
                  onChange={e => handleBusinessChange("address", e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Ville *</Label>
                <input 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="Brazzaville" 
                  value={businessData.city} 
                  onChange={e => handleBusinessChange("city", e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Pays</Label>
                <input 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  value={businessData.country} 
                  onChange={e => handleBusinessChange("country", e.target.value)} 
                  disabled
                />
              </div>
            </div>

            <Button
              type="button"
              onClick={handleContinueToRepresentative}
              className="w-full h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-amber-900/20 active:scale-95 transition-all mt-4 flex items-center justify-center gap-2"
            >
              Continuer <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-center mt-6 text-[11px] text-slate-500 uppercase font-bold tracking-widest">
            <Link href="/auth/signup" className="text-amber-500 flex items-center justify-center gap-2">
              <ArrowLeft className="w-3 h-3" /> Retour a l'inscription standard
            </Link>
          </p>
        </Card>
      )}

      {/* STEP 2: INFORMATIONS REPRESENTANT */}
      {step === 2 && (
        <Card className="relative z-10 w-full max-w-[480px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[40px]">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-600/10 border border-amber-500/20 mb-6">
              <User className="w-10 h-10 text-amber-500" />
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase">PIMPAY<span className="text-amber-500 not-italic">.</span></h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Representant Legal</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-600/50 flex items-center justify-center text-white text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <span className="text-[10px] text-amber-500/50 font-bold uppercase tracking-widest">Entreprise</span>
            </div>
            <div className="w-8 h-px bg-amber-500/30" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-600 flex items-center justify-center text-white text-xs font-bold">2</div>
              <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">Representant</span>
            </div>
          </div>

          <form onSubmit={handleBusinessSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Nom complet *</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                <input 
                  className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="Jean Dupont" 
                  value={representativeData.fullName} 
                  onChange={e => handleRepresentativeChange("fullName", e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Fonction *</Label>
              <div className="relative">
                <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                <input 
                  className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="Directeur General" 
                  value={representativeData.position} 
                  onChange={e => handleRepresentativeChange("position", e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Email professionnel *</Label>
                <div className="relative">
                  <input
                    type="email"
                    className={`w-full h-12 px-4 pr-10 bg-slate-950/50 border text-white rounded-2xl outline-none transition-all ${
                      emailStatus === "valid"
                        ? "border-green-500/50 focus:border-green-500/70"
                        : emailStatus === "invalid" || emailStatus === "disposable"
                        ? "border-red-500/50 focus:border-red-500/70"
                        : "border-white/5 focus:border-amber-500/50"
                    }`}
                    placeholder="contact@entreprise.cg"
                    value={representativeData.email}
                    onChange={e => handleRepresentativeChange("email", e.target.value)}
                    onBlur={handleEmailBlur}
                    required
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailStatus === "checking" && <Loader2 className="size-4 animate-spin text-amber-400" />}
                    {emailStatus === "valid" && <CheckCircle2 className="size-4 text-green-500" />}
                    {(emailStatus === "invalid" || emailStatus === "disposable") && <XCircle className="size-4 text-red-500" />}
                    {emailStatus === "error" && <AlertCircle className="size-4 text-yellow-500" />}
                  </div>
                </div>
                {emailMessage && emailStatus !== "idle" && (
                  <p className={`text-[10px] ml-1 font-medium ${
                    emailStatus === "valid" ? "text-green-500" :
                    emailStatus === "checking" ? "text-amber-400" :
                    emailStatus === "error" ? "text-yellow-500" :
                    "text-red-500"
                  }`}>
                    {emailMessage}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Telephone *</Label>
                <input 
                  type="tel" 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  placeholder="+242..." 
                  value={representativeData.phone} 
                  onChange={e => handleRepresentativeChange("phone", e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Mot de passe *</Label>
                <input 
                  type="password" 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  value={representativeData.password} 
                  onChange={e => handleRepresentativeChange("password", e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Confirmer *</Label>
                <input 
                  type="password" 
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-amber-500/50 transition-all" 
                  value={representativeData.confirmPassword} 
                  onChange={e => handleRepresentativeChange("confirmPassword", e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                onClick={() => setStep(1)}
                className="h-14 px-6 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <Button
                type="submit"
                disabled={loading || emailStatus === "invalid" || emailStatus === "disposable" || emailStatus === "checking"}
                className="flex-1 h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-amber-900/20 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Creer le compte"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* STEP 3: PIN SETUP */}
      <AnimatePresence>
        {step === 3 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020617]/95 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[400px] bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="px-6 pt-8 text-center">
                <div className="inline-flex p-3 rounded-2xl bg-amber-600/10 border border-amber-500/20 mb-3">
                  <ShieldCheck className="text-amber-500" size={24} />
                </div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-white">Configurez votre PIN</h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">Securite renforcee</p>
              </div>

              <div className={`px-8 py-6 ${shake ? "animate-shake" : ""}`}>
                <div className="flex justify-center gap-3 mb-8">
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                        pin.length > i
                        ? "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] scale-110"
                        : "bg-slate-800 border border-white/10"
                      }`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-y-4 gap-x-6 max-w-[280px] mx-auto text-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleNumberPress(num)}
                      className="h-12 text-xl font-bold rounded-xl hover:bg-white/5 active:bg-amber-600/20 active:text-amber-500 transition-all text-white outline-none"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
                  >
                    Retour
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNumberPress(0)}
                    className="h-12 text-xl font-bold rounded-xl hover:bg-white/5 active:bg-amber-600/20 active:text-amber-500 transition-all text-white outline-none"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={deleteDigit}
                    className="h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all outline-none"
                  >
                    <Delete size={20} />
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/50 py-4 border-t border-white/5">
                {loading ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <Loader2 className="animate-spin text-amber-500 mb-1" size={20} />
                    <p className="text-[9px] text-amber-500/70 uppercase font-black tracking-[0.2em]">Configuration...</p>
                  </div>
                ) : (
                  <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest">PimPay Business v1.0</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STEP 4: SUCCESS */}
      {step === 4 && (
        <Card className="relative z-10 w-full max-w-[400px] p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 text-center rounded-[40px] animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[30px] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-500 size-10" />
          </div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Entreprise Enregistree!</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2">Votre compte business est actif</p>
          
          <div className="my-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-left">
            <p className="text-xs text-amber-400 mb-2 font-bold">Prochaines etapes:</p>
            <ul className="text-[10px] text-slate-400 space-y-1.5">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                Compte cree avec succes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-amber-500" />
                Verification des documents (1-3 jours)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-slate-600" />
                Activation complete du compte
              </li>
            </ul>
          </div>

          <Button 
            onClick={() => router.push("/auth/login")} 
            className="w-full h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black tracking-widest transition-all"
          >
            Se connecter
          </Button>
        </Card>
      )}

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
