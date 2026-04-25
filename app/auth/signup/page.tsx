"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  User, ShieldCheck, CheckCircle2,
  Loader2, ArrowLeft, Delete, Lock,
  XCircle, AlertCircle, Gift, Building2,
  Grid3X3, ChevronDown, Search, Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { z } from "zod";
import worldCountries from "world-countries";

type SignupType = "user" | "business";
type MFAMethod = "authenticator" | "pin";

type Country = { code: string; name: string; dialCode: string };

// Build country list from world-countries with dial codes
const COUNTRIES: Country[] = worldCountries
  .map((country) => ({
    code: country.cca2,
    name: country.translations?.fra?.common || country.name.common,
    dialCode: country.idd?.root
      ? `${country.idd.root}${country.idd.suffixes?.[0] || ""}`
      : "",
  }))
  .filter((c) => c.dialCode) // Only countries with dial codes
  .sort((a, b) => a.name.localeCompare(b.name, "fr"));

// Priority countries to show at top (African French-speaking countries first)
const PRIORITY_CODES = [
  "CG", "CD", "CM", "GA", "SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GN",
  "MG", "TN", "MA", "DZ", "NG", "GH", "FR", "BE", "CH", "CA", "US", "GB"
];

function getSortedCountries(countries: Country[]): Country[] {
  const priorityCountries = PRIORITY_CODES
    .map((code) => countries.find((c) => c.code === code))
    .filter(Boolean) as Country[];
  
  const otherCountries = countries.filter(
    (c) => !PRIORITY_CODES.includes(c.code)
  );
  
  return [...priorityCountries, ...otherCountries];
}

// Zod validation for 6-digit PIN
const pinSchema = z.string().length(6, "Le PIN doit contenir 6 chiffres").regex(/^\d+$/, "Le PIN ne doit contenir que des chiffres");

// MFA Method Cards data
const mfaMethods = [
  {
    id: "authenticator" as MFAMethod,
    name: "Google Authenticator",
    description: "Application TOTP securisee",
    icon: ShieldCheck,
    badge: "Recommande",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-400",
    badgeColor: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "pin" as MFAMethod,
    name: "Code PIN",
    description: "PIN a 6 chiffres",
    icon: Grid3X3,
    badge: null,
    gradient: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400",
    badgeColor: "",
  },
];

export default function SignupPage() {
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [signupType, setSignupType] = useState<SignupType>("user");
  const [error, setError] = useState<string | null>(null);

  // MFA Selection state
  const [selectedMfaMethod, setSelectedMfaMethod] = useState<MFAMethod | null>(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    country: "CG",
  });

  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");

  // Memoize sorted countries list
  const sortedCountries = useMemo(() => getSortedCountries(COUNTRIES), []);
  
  const selectedCountry = sortedCountries.find(c => c.code === formData.country) || sortedCountries[0];
  const filteredCountries = sortedCountries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
    c.dialCode.includes(countrySearch) ||
    c.code.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // Close dropdown on outside click
  const countryDropdownRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!countryDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(e.target as Node)) {
        setCountryDropdownOpen(false);
        setCountrySearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [countryDropdownOpen]);

  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "checking" | "valid" | "invalid" | "disposable" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const emailCheckTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const { t } = useLanguage();

  const PIN_LENGTH = 6;

  useEffect(() => { setMounted(true); }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // If email field changed, reset status and debounce verification
    if (field === "email") {
      setEmailStatus("idle");
      setEmailMessage("");

      // Clear any pending timeout
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
        emailCheckTimeoutRef.current = null;
      }
    }
  };

  // Basic client-side email format check
  const isEmailFormatValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  // Email verification on blur with debounce
  const handleEmailBlur = () => {
    const email = formData.email.trim();

    if (!email) {
      setEmailStatus("idle");
      return;
    }

    if (!isEmailFormatValid(email)) {
      setEmailStatus("invalid");
      setEmailMessage(t("extra.emailVerificationInvalidFormat"));
      return;
    }

    // Debounce: wait 500ms before calling the API
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    setEmailStatus("checking");
    setEmailMessage(t("extra.emailVerificationChecking"));

    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.toLowerCase() }),
        });

        const data = await res.json();

        if (res.status === 429) {
          // Rate limited - don't block the user
          setEmailStatus("idle");
          setEmailMessage("");
          return;
        }

        if (data.isValid) {
          setEmailStatus("valid");
          setEmailMessage(t("extra.emailVerificationValid"));
        } else if (data.isDisposable) {
          setEmailStatus("disposable");
          setEmailMessage(t("extra.emailVerificationDisposable"));
        } else {
          setEmailStatus("invalid");
          setEmailMessage(t("extra.emailVerificationInvalid"));
        }
      } catch {
        // On error, don't block the user
        setEmailStatus("error");
        setEmailMessage(t("extra.emailVerificationError"));
      }
    }, 500);
  };

  // --- ETAPE 1 : INSCRIPTION ---
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error(t("extra.passwordsMismatch"));
      return;
    }
    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          username: formData.email.split('@')[0] + Math.floor(Math.random() * 100),
          referralCode: refCode || undefined,
          country: formData.country,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("auth.signup.signupError"));

      if (data.token) {
        setAuthToken(data.token);
        localStorage.setItem("pimpay_token", data.token);
        document.cookie = `pi_session_token=${data.token}; path=/; max-age=3600; SameSite=Lax`;
      }

      setStep(2); // Go to MFA selection
      toast.success(t("extra.accountCreated"));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // --- ETAPE 2: SELECTION MFA ---
  const handleMfaMethodSelect = async (method: MFAMethod) => {
    setSelectedMfaMethod(method);
    setError(null);
    setPin("");
    setTotpCode("");
    
    if (method === "authenticator") {
      // Generate TOTP secret and QR code
      setLoading(true);
      try {
        const currentToken = authToken || localStorage.getItem("pimpay_token");
        const res = await fetch("/api/auth/mfa/setup-totp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${currentToken}`
          },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erreur lors de la configuration TOTP");

        setTotpSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
        setStep(3); // Go to TOTP setup
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        toast.error(message);
        setSelectedMfaMethod(null);
      } finally {
        setLoading(false);
      }
    } else {
      setStep(3); // Go to PIN setup
    }
  };

  // --- ETAPE 3: CONFIGURATION PIN (6 chiffres) ---
  const handleSetPin = useCallback(async (finalPin: string) => {
    if (loading) return;
    
    // Validate PIN with Zod
    const validation = pinSchema.safeParse(finalPin);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin("");
      return;
    }

    setLoading(true);
    setError(null);

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
      if (!res.ok) throw new Error(data.error || t("auth.signup.pinError"));

      setStep(4); // Go to success
      toast.success(t("extra.securityConfigured"));
    } catch (err: unknown) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [authToken, loading, t]);

  // --- CONFIGURATION TOTP ---
  const handleVerifyTotp = useCallback(async (code: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);

    const currentToken = authToken || localStorage.getItem("pimpay_token");

    try {
      const res = await fetch("/api/auth/mfa/verify-setup-totp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentToken}`
        },
        body: JSON.stringify({ code, secret: totpSecret }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Code incorrect");

      setStep(4); // Go to success
      toast.success("Google Authenticator configure avec succes");
    } catch (err: unknown) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      setError(message);
      toast.error(message);
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }, [authToken, loading, totpSecret]);

  // Auto-submit when PIN reaches 6 digits
  useEffect(() => {
    if (pin.length === PIN_LENGTH && step === 3 && selectedMfaMethod === "pin" && !loading) {
      handleSetPin(pin);
    }
  }, [pin, step, selectedMfaMethod, handleSetPin, loading]);

  // Auto-submit when TOTP code reaches 6 digits
  useEffect(() => {
    if (totpCode.length === 6 && step === 3 && selectedMfaMethod === "authenticator" && !loading) {
      handleVerifyTotp(totpCode);
    }
  }, [totpCode, step, selectedMfaMethod, handleVerifyTotp, loading]);

  const handleNumberPress = (num: number) => {
    if (loading || shake) return;
    setError(null);
    
    if (selectedMfaMethod === "pin" && pin.length < PIN_LENGTH) {
      setPin(prev => prev + num);
    }
    
    if (selectedMfaMethod === "authenticator" && totpCode.length < 6) {
      setTotpCode(prev => prev + num);
    }
  };

  const deleteDigit = () => {
    if (loading) return;
    if (selectedMfaMethod === "pin") {
      setPin(prev => prev.slice(0, -1));
    }
    if (selectedMfaMethod === "authenticator") {
      setTotpCode(prev => prev.slice(0, -1));
    }
  };

  const goBackToMfaSelection = () => {
    setStep(2);
    setSelectedMfaMethod(null);
    setPin("");
    setTotpCode("");
    setError(null);
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="relative min-h-[100dvh] w-full bg-[#020617] flex items-center justify-center overflow-hidden font-sans p-4">
      {/* Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />

      {/* STEP 1: FORMULAIRE D'INSCRIPTION */}
      {step === 1 && (
        <Card className="relative z-10 w-full max-w-[440px] p-6 sm:p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 shadow-2xl rounded-[40px]">
          {refCode && (
            <div className="mb-6 p-4 bg-emerald-600/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
              <Gift className="text-emerald-400 flex-shrink-0" size={20} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Bonus Parrainage</p>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{"Inscrivez-vous et recevez 0.0000159π de bonus !"}</p>
              </div>
            </div>
          )}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 transition-all duration-300 ${
              signupType === "business" 
                ? "bg-amber-600/10 border border-amber-500/20"
                : "bg-blue-600/10 border border-blue-500/20"
            }`}>
              {signupType === "business" ? (
                <Building2 className="w-10 h-10 text-amber-500" />
              ) : (
                <ShieldCheck className="w-10 h-10 text-blue-500" />
              )}
            </div>
            <h1 className="text-4xl font-black text-white italic tracking-tighter mb-1 uppercase">
              PIMPAY<span className={`not-italic ${signupType === "business" ? "text-amber-500" : "text-blue-500"}`}>.</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
              {signupType === "business" ? "Inscription Entreprise" : t("extra.createAccount")}
            </p>
          </div>

          {/* Selecteur de type d'inscription */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-950/50 rounded-2xl">
            <button
              type="button"
              onClick={() => setSignupType("user")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                signupType === "user"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <User className="w-4 h-4" />
              <span>Utilisateur</span>
            </button>
            <button
              type="button"
              onClick={() => setSignupType("business")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all ${
                signupType === "business"
                  ? "bg-amber-600 text-white"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Business</span>
            </button>
          </div>

          {/* Redirection pour Business */}
          {signupType === "business" ? (
            <div className="space-y-6">
              <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                <p className="text-xs text-amber-400 mb-3">
                  L&apos;inscription entreprise necessite des informations supplementaires pour la verification de votre business.
                </p>
                <ul className="text-[10px] text-slate-400 space-y-1.5 mb-4">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" />
                    Informations de l&apos;entreprise
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" />
                    Documents legaux (RCCM, NIF)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-amber-500" />
                    Coordonnees du representant
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => router.push("/auth/business-signup")}
                className="w-full h-14 bg-amber-600 hover:bg-amber-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-amber-900/20 active:scale-95 transition-all"
              >
                Continuer l&apos;inscription Business
              </Button>
              <p className="text-center text-[11px] text-slate-500 uppercase font-bold tracking-widest">
                Deja inscrit? <Link href="/auth/login" className="text-amber-500 ml-1">Se connecter</Link>
              </p>
            </div>
          ) : (
            <>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">{t("extra.fullName")}</Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 size-4" />
                <input className="w-full h-12 pl-11 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" placeholder={t("extra.fullNamePlaceholder")} value={formData.fullName} onChange={e => handleChange("fullName", e.target.value)} required />
              </div>
            </div>

            {/* Country Selector */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Pays</Label>
              <div className="relative" ref={countryDropdownRef}>
                <button
                  type="button"
                  onClick={() => { setCountryDropdownOpen(prev => !prev); setCountrySearch(""); }}
                  className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl flex items-center gap-3 hover:border-blue-500/30 focus:border-blue-500/50 transition-all outline-none"
                >
                  <span className={`fi fi-${selectedCountry.code.toLowerCase()} text-sm`} />
                  <span className="flex-1 text-left text-sm font-medium">{selectedCountry.name}</span>
                  <span className="text-xs text-slate-500 font-mono">{selectedCountry.dialCode}</span>
                  <ChevronDown
                    size={16}
                    className={`text-slate-500 transition-transform duration-200 ${countryDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {countryDropdownOpen && (
                  <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
                    {/* Search */}
                    <div className="p-2 border-b border-white/5">
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Rechercher un pays..."
                          value={countrySearch}
                          onChange={e => setCountrySearch(e.target.value)}
                          className="w-full h-9 pl-9 pr-3 bg-slate-950/50 border border-white/5 text-white text-xs rounded-xl outline-none focus:border-blue-500/40 transition-all placeholder:text-slate-600"
                          autoFocus
                        />
                      </div>
                    </div>
                    {/* List */}
                    <ul className="max-h-52 overflow-y-auto py-1">
                      {filteredCountries.length === 0 ? (
                        <li className="px-4 py-3 text-xs text-slate-500 text-center">Aucun resultat</li>
                      ) : filteredCountries.map(country => (
                        <li key={country.code}>
                          <button
                            type="button"
                            onClick={() => {
                              handleChange("country", country.code);
                              setCountryDropdownOpen(false);
                              setCountrySearch("");
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/5 transition-colors ${
                              formData.country === country.code ? "bg-blue-500/10 text-blue-400" : "text-white"
                            }`}
                          >
                            <span className={`fi fi-${country.code.toLowerCase()} text-sm`} />
                            <span className="flex-1 text-left text-xs font-medium">{country.name}</span>
                            <span className="text-[10px] font-mono text-slate-500">{country.dialCode}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Email</Label>
                <div className="relative">
                  <input
                    type="email"
                    className={`w-full h-12 px-4 pr-10 bg-slate-950/50 border text-white rounded-2xl outline-none transition-all ${
                      emailStatus === "valid"
                        ? "border-green-500/50 focus:border-green-500/70"
                        : emailStatus === "invalid" || emailStatus === "disposable"
                        ? "border-red-500/50 focus:border-red-500/70"
                        : "border-white/5 focus:border-blue-500/50"
                    }`}
                    placeholder="mail@pimpay.com"
                    value={formData.email}
                    onChange={e => handleChange("email", e.target.value)}
                    onBlur={handleEmailBlur}
                    required
                  />
                  {/* Status icon */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailStatus === "checking" && (
                      <Loader2 className="size-4 animate-spin text-blue-400" />
                    )}
                    {emailStatus === "valid" && (
                      <CheckCircle2 className="size-4 text-green-500" />
                    )}
                    {(emailStatus === "invalid" || emailStatus === "disposable") && (
                      <XCircle className="size-4 text-red-500" />
                    )}
                    {emailStatus === "error" && (
                      <AlertCircle className="size-4 text-yellow-500" />
                    )}
                  </div>
                </div>
                {/* Status message */}
                {emailMessage && emailStatus !== "idle" && (
                  <p className={`text-[10px] ml-1 font-medium ${
                    emailStatus === "valid" ? "text-green-500" :
                    emailStatus === "checking" ? "text-blue-400" :
                    emailStatus === "error" ? "text-yellow-500" :
                    "text-red-500"
                  }`}>
                    {emailMessage}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">{t("extra.phone")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                    <span className={`fi fi-${selectedCountry.code.toLowerCase()} text-sm`} />
                    <span className="text-xs text-slate-500 font-mono border-r border-white/10 pr-2">{selectedCountry.dialCode}</span>
                  </span>
                  <input
                    type="tel"
                    className="w-full h-12 pl-[76px] pr-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all"
                    placeholder="XX XXX XXXX"
                    value={formData.phone}
                    onChange={e => handleChange("phone", e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Password</Label>
                <input type="password" title="password" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" value={formData.password} onChange={e => handleChange("password", e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 ml-1 text-[10px] font-bold uppercase tracking-widest">Confirm</Label>
                <input type="password" title="confirm" className="w-full h-12 px-4 bg-slate-950/50 border border-white/5 text-white rounded-2xl outline-none focus:border-blue-500/50 transition-all" value={formData.confirmPassword} onChange={e => handleChange("confirmPassword", e.target.value)} required />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || emailStatus === "invalid" || emailStatus === "disposable" || emailStatus === "checking"}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black tracking-widest shadow-lg shadow-blue-900/20 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="animate-spin" /> : t("extra.continueButton")}
            </Button>
          </form>
          <p className="text-center mt-6 text-[11px] text-slate-500 uppercase font-bold tracking-widest">
            {t("extra.alreadyRegistered")} <Link href="/auth/login" className="text-blue-500 ml-1">{t("extra.loginLink")}</Link>
          </p>
          </>
          )}
        </Card>
      )}

      {/* STEP 2: MFA METHOD SELECTION */}
      <AnimatePresence>
        {step === 2 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-[440px] overflow-hidden"
            >
              {/* Glassmorphism Card */}
              <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
                {/* Specular reflection effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Header */}
                <div className="relative px-6 pt-8 pb-4">
                  <div className="text-center">
                    <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-4">
                      <Lock className="text-blue-400" size={28} />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tight text-white">
                      Configuration MFA
                    </h2>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">
                      Choisissez votre methode de securite
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="px-6 pb-8">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {mfaMethods.map((method) => {
                      const Icon = method.icon;
                      
                      return (
                        <motion.button
                          key={method.id}
                          onClick={() => handleMfaMethodSelect(method.id)}
                          disabled={loading}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative p-4 rounded-2xl bg-gradient-to-br ${method.gradient} border ${method.borderColor} transition-all hover:border-white/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {/* Badge */}
                          {method.badge && (
                            <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${method.badgeColor}`}>
                              {method.badge}
                            </span>
                          )}
                          
                          <Icon className={`${method.iconColor} mb-3`} size={28} />
                          <h3 className="text-sm font-bold text-white text-left">{method.name}</h3>
                          <p className="text-[10px] text-slate-500 text-left mt-0.5">{method.description}</p>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>

                {/* Footer */}
                <div className="bg-slate-950/50 py-4 border-t border-white/5">
                  {loading ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                      <Loader2 className="animate-spin text-blue-500 mb-1" size={20} />
                      <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">
                        Configuration...
                      </p>
                    </div>
                  ) : (
                    <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest">
                      PimPay Protocol v2.0
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STEP 3: MFA CONFIGURATION (PIN or TOTP) */}
      <AnimatePresence>
        {step === 3 && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-[400px] bg-slate-900 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="relative px-6 pt-8 text-center">
                <button
                  onClick={goBackToMfaSelection}
                  className="absolute left-6 top-8 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowLeft size={18} />
                </button>

                <div className="inline-flex p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-3">
                  {selectedMfaMethod === "pin" ? (
                    <Grid3X3 className="text-blue-400" size={24} />
                  ) : (
                    <ShieldCheck className="text-emerald-400" size={24} />
                  )}
                </div>
                <h2 className="text-lg font-black uppercase tracking-tighter text-white">
                  {selectedMfaMethod === "pin" ? "Definir le Code PIN" : "Google Authenticator"}
                </h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">
                  {selectedMfaMethod === "pin" ? "6 chiffres requis" : "Scannez le QR code"}
                </p>
              </div>

              <div className={`px-8 py-6 ${shake ? "animate-shake" : ""}`}>
                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4"
                    >
                      <AlertCircle className="text-red-400" size={16} />
                      <p className="text-xs text-red-400">{error}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* TOTP QR Code (for authenticator method) */}
                {selectedMfaMethod === "authenticator" && qrCodeUrl && (
                  <div className="mb-6">
                    <div className="bg-white p-4 rounded-2xl mx-auto w-fit mb-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrCodeUrl} alt="QR Code TOTP" className="w-40 h-40" />
                    </div>
                    <p className="text-xs text-slate-400 text-center mb-2">
                      Scannez ce QR code avec Google Authenticator
                    </p>
                    <p className="text-[10px] text-slate-600 text-center">
                      Ou entrez manuellement: <span className="text-blue-400 font-mono">{totpSecret}</span>
                    </p>
                  </div>
                )}

                {/* Code Indicators */}
                <div className="flex justify-center gap-2 mb-6">
                  {[...Array(6)].map((_, i) => {
                    const currentCode = selectedMfaMethod === "pin" ? pin : totpCode;
                    const active = currentCode.length > i;
                    const isAuthenticator = selectedMfaMethod === "authenticator";
                    
                    return (
                      <motion.div
                        key={i}
                        initial={{ scale: 0.8 }}
                        animate={{
                          scale: active ? 1.1 : 1,
                        }}
                        className={`w-10 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all duration-200 ${
                          active
                            ? isAuthenticator 
                              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              : "bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                            : "bg-slate-800/50 border border-white/10 text-slate-500"
                        }`}
                      >
                        {currentCode[i] || ""}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-y-3 gap-x-4 max-w-[280px] mx-auto text-center">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <motion.button
                      key={num}
                      type="button"
                      onClick={() => handleNumberPress(num)}
                      whileTap={{ scale: 0.9 }}
                      className={`h-12 text-xl font-bold rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white outline-none ${
                        selectedMfaMethod === "authenticator" 
                          ? "active:bg-emerald-600/20 active:border-emerald-500/30" 
                          : "active:bg-blue-600/20 active:border-blue-500/30"
                      }`}
                    >
                      {num}
                    </motion.button>
                  ))}
                  <motion.button
                    type="button"
                    onClick={goBackToMfaSelection}
                    whileTap={{ scale: 0.9 }}
                    className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
                  >
                    RETOUR
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={() => handleNumberPress(0)}
                    whileTap={{ scale: 0.9 }}
                    className={`h-12 text-xl font-bold rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all text-white outline-none ${
                      selectedMfaMethod === "authenticator" 
                        ? "active:bg-emerald-600/20 active:border-emerald-500/30" 
                        : "active:bg-blue-600/20 active:border-blue-500/30"
                    }`}
                  >
                    0
                  </motion.button>
                  <motion.button
                    type="button"
                    onClick={deleteDigit}
                    whileTap={{ scale: 0.9 }}
                    className="h-12 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all outline-none"
                  >
                    <Delete size={20} />
                  </motion.button>
                </div>
              </div>

              {/* Footer Loading */}
              <div className="bg-slate-950/50 py-4 border-t border-white/5">
                {loading ? (
                  <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                    <Loader2 className="animate-spin text-blue-500 mb-1" size={20} />
                    <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">{t("extra.initializing")}</p>
                  </div>
                ) : (
                  <p className="text-center text-[9px] text-slate-600 uppercase font-bold tracking-widest">PimPay Protocol v2.0</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STEP 4: SUCCES FINAL */}
      {step === 4 && (
        <Card className="relative z-10 w-full max-w-[400px] p-10 bg-slate-900/40 backdrop-blur-3xl border-white/10 text-center rounded-[40px] animate-in zoom-in-95">
          <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-[30px] flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-green-500 size-10" />
          </div>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">{t("extra.accountActivated")}</h3>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 mb-2">
            {selectedMfaMethod === "authenticator" 
              ? "Google Authenticator configure" 
              : "Code PIN a 6 chiffres configure"}
          </p>
          <p className="text-slate-400 text-xs mb-8">{t("extra.protocolReady")}</p>
          <Button onClick={() => router.push("/auth/login")} className="w-full h-14 bg-white text-black hover:bg-slate-200 rounded-2xl font-black tracking-widest transition-all">
            {t("extra.loginButton")}
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
