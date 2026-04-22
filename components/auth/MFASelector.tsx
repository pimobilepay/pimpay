"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  Grid3X3,
  MessageSquare,
  Mail,
  ArrowLeft,
  Delete,
  Loader2,
  AlertTriangle,
  Lock,
  Smartphone,
  ChevronDown,
} from "lucide-react";
import { z } from "zod";

// Types
type MFAMethod = "authenticator" | "pin" | "sms" | "email";

interface MFASelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
  tempToken?: string;
  userEmail?: string;
  needsPinUpdate?: boolean;
  currentPinLength?: number; // 4 or 6
  twoFactorEnabled?: boolean;
}

interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

// African country codes for SMS
const africanCountries: CountryOption[] = [
  { code: "CG", name: "Congo", dialCode: "+242", flag: "🇨🇬" },
  { code: "CM", name: "Cameroun", dialCode: "+237", flag: "🇨🇲" },
  { code: "GA", name: "Gabon", dialCode: "+241", flag: "🇬🇦" },
  { code: "CI", name: "Cote d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
  { code: "SN", name: "Senegal", dialCode: "+221", flag: "🇸🇳" },
  { code: "ML", name: "Mali", dialCode: "+223", flag: "🇲🇱" },
  { code: "BF", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
  { code: "NE", name: "Niger", dialCode: "+227", flag: "🇳🇪" },
  { code: "TD", name: "Tchad", dialCode: "+235", flag: "🇹🇩" },
  { code: "CF", name: "Centrafrique", dialCode: "+236", flag: "🇨🇫" },
  { code: "GQ", name: "Guinee Equatoriale", dialCode: "+240", flag: "🇬🇶" },
  { code: "NG", name: "Nigeria", dialCode: "+234", flag: "🇳🇬" },
  { code: "GH", name: "Ghana", dialCode: "+233", flag: "🇬🇭" },
  { code: "KE", name: "Kenya", dialCode: "+254", flag: "🇰🇪" },
  { code: "TZ", name: "Tanzanie", dialCode: "+255", flag: "🇹🇿" },
  { code: "ZA", name: "Afrique du Sud", dialCode: "+27", flag: "🇿🇦" },
];

// Zod validation for 6-digit PIN
const pinSchema = z.string().length(6, "Le PIN doit contenir 6 chiffres").regex(/^\d+$/, "Le PIN ne doit contenir que des chiffres");

// MFA Method Cards data
const mfaMethods = [
  {
    id: "authenticator" as MFAMethod,
    name: "Google Authenticator",
    description: "Application TOTP securisee",
    icon: ShieldCheck,
    status: "active",
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
    status: "active",
    badge: null,
    gradient: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/30",
    iconColor: "text-blue-400",
    badgeColor: "",
  },
  {
    id: "sms" as MFAMethod,
    name: "SMS",
    description: "Code par message texte",
    icon: MessageSquare,
    status: "coming_soon",
    badge: "Bientot",
    gradient: "from-amber-500/10 to-amber-600/5",
    borderColor: "border-white/5",
    iconColor: "text-slate-500",
    badgeColor: "bg-amber-500/10 text-amber-400/60",
  },
  {
    id: "email" as MFAMethod,
    name: "Email",
    description: "Code par email",
    icon: Mail,
    status: "coming_soon",
    badge: "Bientot",
    gradient: "from-purple-500/10 to-purple-600/5",
    borderColor: "border-white/5",
    iconColor: "text-slate-500",
    badgeColor: "bg-purple-500/10 text-purple-400/60",
  },
];

export default function MFASelector({
  isOpen,
  onClose,
  onSuccess,
  userId,
  tempToken,
  userEmail,
  needsPinUpdate = false,
  currentPinLength = 4,
  twoFactorEnabled = false,
}: MFASelectorProps) {
  const [step, setStep] = useState<"select" | "verify">("select");
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod | null>(null);
  const [pin, setPin] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(africanCountries[0]);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  // Auto-select method based on user's configured MFA
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setTotpCode("");
      setPhoneNumber("");
      setError(null);
      
      // If user has Google 2FA enabled, go directly to TOTP verification
      if (twoFactorEnabled) {
        setSelectedMethod("authenticator");
        setStep("verify");
      } 
      // If user needs to update PIN (migration), go to PIN step
      else if (needsPinUpdate) {
        setSelectedMethod("pin");
        setStep("verify");
      }
      // Otherwise show selection screen
      else {
        setStep("select");
        setSelectedMethod(null);
      }
    }
  }, [isOpen, twoFactorEnabled, needsPinUpdate]);

  // PIN verification
  const verifyPin = useCallback(async (finalPin: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          pin: finalPin,
          tempToken,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
        setPin("");
      } else {
        triggerShake();
        setError(data.error || "Code PIN incorrect");
        setPin("");
      }
    } catch {
      triggerShake();
      setError("Erreur de connexion");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [userId, tempToken, onSuccess, onClose]);

  // TOTP verification
  const verifyTotp = useCallback(async (code: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/mfa/verify-totp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          code,
          tempToken,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
        setTotpCode("");
      } else {
        triggerShake();
        setError(data.error || "Code incorrect");
        setTotpCode("");
      }
    } catch {
      triggerShake();
      setError("Erreur de connexion");
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  }, [userId, tempToken, onSuccess, onClose]);

  // Update PIN to 6 digits
  const updatePinTo6Digits = useCallback(async (newPin: string) => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    // Validate with Zod
    const validation = pinSchema.safeParse(newPin);
    if (!validation.success) {
      setError(validation.error.errors[0].message);
      setLoading(false);
      triggerShake();
      return;
    }

    try {
      const res = await fetch("/api/auth/update-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          pin: newPin,
          tempToken,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        onSuccess();
        onClose();
        setPin("");
      } else {
        triggerShake();
        setError(data.error || "Erreur lors de la mise a jour");
        setPin("");
      }
    } catch {
      triggerShake();
      setError("Erreur de connexion");
      setPin("");
    } finally {
      setLoading(false);
    }
  }, [userId, tempToken, onSuccess, onClose]);

  // Trigger shake animation
  const triggerShake = () => {
    setShake(true);
    // Vibration simulation via visual feedback
    setTimeout(() => setShake(false), 500);
  };

  // Handle number press on custom keypad
  const handleNumberPress = (num: number) => {
    if (loading || shake) return;
    const maxLength = needsPinUpdate ? 6 : 6;
    
    if (selectedMethod === "pin" && pin.length < maxLength) {
      const newPin = pin + num;
      setPin(newPin);
      
      if (newPin.length === maxLength && !loading) {
        if (needsPinUpdate) {
          updatePinTo6Digits(newPin);
        } else {
          verifyPin(newPin);
        }
      }
    }
    
    if (selectedMethod === "authenticator" && totpCode.length < 6) {
      const newCode = totpCode + num;
      setTotpCode(newCode);
      
      if (newCode.length === 6 && !loading) {
        verifyTotp(newCode);
      }
    }
  };

  // Delete digit
  const deleteDigit = () => {
    if (loading) return;
    if (selectedMethod === "pin") {
      setPin((prev) => prev.slice(0, -1));
    }
    if (selectedMethod === "authenticator") {
      setTotpCode((prev) => prev.slice(0, -1));
    }
  };

  // Handle method selection
  const handleMethodSelect = (method: MFAMethod) => {
    if (mfaMethods.find((m) => m.id === method)?.status === "coming_soon") {
      return;
    }
    setSelectedMethod(method);
    setStep("verify");
    setError(null);
  };

  // Go back to method selection
  const goBack = () => {
    setStep("select");
    setSelectedMethod(null);
    setPin("");
    setTotpCode("");
    setPhoneNumber("");
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
              {step === "verify" && (
                <button
                  onClick={goBack}
                  className="absolute left-6 top-8 p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              
              <div className="text-center">
                <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 mb-4">
                  <Lock className="text-blue-400" size={28} />
                </div>
                <h2 className="text-xl font-black uppercase tracking-tight text-white">
                  {step === "select" ? "Authentification MFA" : selectedMethod === "pin" ? (needsPinUpdate ? "Migration PIN" : "Code PIN") : "Google Authenticator"}
                </h2>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">
                  {step === "select" ? "Choisissez votre methode" : "Securise par PimPay"}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 pb-8">
              <AnimatePresence mode="wait">
                {step === "select" && (
                  <motion.div
                    key="select"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="grid grid-cols-2 gap-3"
                  >
                    {mfaMethods.map((method) => {
                      const Icon = method.icon;
                      const isDisabled = method.status === "coming_soon";
                      
                      return (
                        <motion.button
                          key={method.id}
                          onClick={() => handleMethodSelect(method.id)}
                          disabled={isDisabled}
                          whileHover={!isDisabled ? { scale: 1.02, y: -2 } : {}}
                          whileTap={!isDisabled ? { scale: 0.98 } : {}}
                          className={`relative p-4 rounded-2xl bg-gradient-to-br ${method.gradient} border ${method.borderColor} transition-all ${
                            isDisabled ? "opacity-50 cursor-not-allowed" : "hover:border-white/20 cursor-pointer"
                          }`}
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
                )}

                {step === "verify" && selectedMethod === "pin" && (
                  <motion.div
                    key="pin"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* PIN Migration Banner */}
                    {needsPinUpdate && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
                      >
                        <AlertTriangle className="text-amber-400 flex-shrink-0 mt-0.5" size={18} />
                        <div>
                          <p className="text-xs font-bold text-amber-400">Migration securite requise</p>
                          <p className="text-[10px] text-amber-400/70 mt-1">
                            PimPay renforce votre securite. Passez au PIN a 6 chiffres.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {/* Error Message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                      >
                        <AlertTriangle className="text-red-400" size={16} />
                        <p className="text-xs text-red-400">{error}</p>
                      </motion.div>
                    )}

                    {/* PIN Indicators */}
                    <div className={`flex justify-center gap-3 py-4 ${shake ? "animate-shake" : ""}`}>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.8 }}
                          animate={{
                            scale: pin.length > i ? 1.1 : 1,
                            backgroundColor: pin.length > i ? "rgb(59, 130, 246)" : "rgb(30, 41, 59)",
                          }}
                          className={`w-4 h-4 rounded-full transition-all duration-200 ${
                            pin.length > i
                              ? "shadow-[0_0_15px_rgba(59,130,246,0.8)]"
                              : "border border-white/10"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Custom Keypad */}
                    <div className="grid grid-cols-3 gap-y-3 gap-x-4 max-w-[280px] mx-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <motion.button
                          key={num}
                          type="button"
                          onClick={() => handleNumberPress(num)}
                          whileTap={{ scale: 0.9 }}
                          className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white outline-none"
                        >
                          {num}
                        </motion.button>
                      ))}
                      <motion.button
                        type="button"
                        onClick={onClose}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
                      >
                        ANNULER
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleNumberPress(0)}
                        whileTap={{ scale: 0.9 }}
                        className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-blue-600/20 active:border-blue-500/30 transition-all text-white outline-none"
                      >
                        0
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={deleteDigit}
                        whileTap={{ scale: 0.9 }}
                        className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all outline-none"
                      >
                        <Delete size={22} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {step === "verify" && selectedMethod === "authenticator" && (
                  <motion.div
                    key="authenticator"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Instructions */}
                    <div className="text-center">
                      <p className="text-xs text-slate-400">
                        Entrez le code a 6 chiffres de votre application Google Authenticator
                      </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20"
                      >
                        <AlertTriangle className="text-red-400" size={16} />
                        <p className="text-xs text-red-400">{error}</p>
                      </motion.div>
                    )}

                    {/* TOTP Code Indicators */}
                    <div className={`flex justify-center gap-2 py-4 ${shake ? "animate-shake" : ""}`}>
                      {[...Array(6)].map((_, i) => (
                        <motion.div
                          key={i}
                          initial={{ scale: 0.8 }}
                          animate={{
                            scale: totpCode.length > i ? 1.1 : 1,
                          }}
                          className={`w-12 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all duration-200 ${
                            totpCode.length > i
                              ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                              : "bg-slate-800/50 border border-white/10 text-slate-500"
                          }`}
                        >
                          {totpCode[i] || ""}
                        </motion.div>
                      ))}
                    </div>

                    {/* Custom Keypad for TOTP */}
                    <div className="grid grid-cols-3 gap-y-3 gap-x-4 max-w-[280px] mx-auto">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                        <motion.button
                          key={num}
                          type="button"
                          onClick={() => handleNumberPress(num)}
                          whileTap={{ scale: 0.9 }}
                          className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-emerald-600/20 active:border-emerald-500/30 transition-all text-white outline-none"
                        >
                          {num}
                        </motion.button>
                      ))}
                      <motion.button
                        type="button"
                        onClick={onClose}
                        whileTap={{ scale: 0.9 }}
                        className="flex items-center justify-center text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-rose-500 transition-colors"
                      >
                        ANNULER
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={() => handleNumberPress(0)}
                        whileTap={{ scale: 0.9 }}
                        className="h-14 text-xl font-bold rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:bg-emerald-600/20 active:border-emerald-500/30 transition-all text-white outline-none"
                      >
                        0
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={deleteDigit}
                        whileTap={{ scale: 0.9 }}
                        className="h-14 flex items-center justify-center rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 active:scale-90 transition-all outline-none"
                      >
                        <Delete size={22} />
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {step === "verify" && selectedMethod === "sms" && (
                  <motion.div
                    key="sms"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    {/* Phone Number Input with Country Selector */}
                    <div className="space-y-3">
                      <label className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-1">
                        Numero de telephone
                      </label>
                      <div className="relative flex gap-2">
                        {/* Country Selector */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                            className="flex items-center gap-2 h-14 px-3 bg-slate-950/50 border border-white/10 rounded-2xl text-white hover:border-white/20 transition-all"
                          >
                            <span className="text-xl">{selectedCountry.flag}</span>
                            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
                            <ChevronDown size={14} className="text-slate-500" />
                          </button>
                          
                          <AnimatePresence>
                            {showCountryDropdown && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="absolute top-full left-0 mt-2 w-64 max-h-60 overflow-y-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl z-50"
                              >
                                {africanCountries.map((country) => (
                                  <button
                                    key={country.code}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCountry(country);
                                      setShowCountryDropdown(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-all text-left"
                                  >
                                    <span className="text-xl">{country.flag}</span>
                                    <span className="text-sm text-white">{country.name}</span>
                                    <span className="text-xs text-slate-500 ml-auto">{country.dialCode}</span>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Phone Number Input */}
                        <div className="relative flex-1">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                            placeholder="XX XXX XXXX"
                            className="w-full h-14 pl-12 pr-4 bg-slate-950/50 border border-white/10 rounded-2xl text-white placeholder-slate-600 focus:border-amber-500/50 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Coming Soon Notice */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20"
                    >
                      <AlertTriangle className="text-amber-400 flex-shrink-0" size={20} />
                      <div>
                        <p className="text-sm font-bold text-amber-400">Bientot disponible</p>
                        <p className="text-[10px] text-amber-400/70 mt-1">
                          L&apos;authentification par SMS sera disponible tres prochainement. Utilisez Google Authenticator ou le code PIN en attendant.
                        </p>
                      </div>
                    </motion.div>

                    <button
                      onClick={goBack}
                      className="w-full h-12 bg-white/5 border border-white/10 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                    >
                      Choisir une autre methode
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="bg-slate-950/50 py-4 border-t border-white/5">
              {loading ? (
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
                  <Loader2 className="animate-spin text-blue-500 mb-1" size={20} />
                  <p className="text-[9px] text-blue-500/70 uppercase font-black tracking-[0.2em]">
                    Verification...
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

        {/* Global Styles for shake animation */}
        <style jsx global>{`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            20%, 60% { transform: translateX(-10px); }
            40%, 80% { transform: translateX(10px); }
          }
          .animate-shake { 
            animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; 
          }
        `}</style>
      </div>
    </AnimatePresence>
  );
}
