"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  QrCode,
  Key,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Fingerprint,
  Clock,
  Activity,
  History,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

// --- TYPES ---
type SecurityStatus = {
  twoFactorEnabled: boolean;
  lastVerified: string | null;
  backupCodesRemaining: number;
  trustedDevices: number;
};

type SetupStep = "intro" | "qr" | "verify" | "complete";

// --- HELPERS ---
function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Jamais";
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// --- PAGE ---
export default function SecurityConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    twoFactorEnabled: false,
    lastVerified: null,
    backupCodesRemaining: 0,
    trustedDevices: 0,
  });

  // Setup flow state
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>("intro");
  const [totpSecret, setTotpSecret] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showSecret, setShowSecret] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Verification state
  const [verificationCode, setVerificationCode] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Fetch security status
  const fetchSecurityStatus = async () => {
    try {
      setLoading(true);
      // Simulated API call - in production, fetch from /api/auth/2fa/status
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // Simulate status
      setSecurityStatus({
        twoFactorEnabled: false,
        lastVerified: null,
        backupCodesRemaining: 0,
        trustedDevices: 0,
      });
    } catch {
      toast.error("Erreur lors du chargement du statut de securite");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityStatus();
  }, []);

  // Start 2FA setup
  const startSetup = async () => {
    setIsSettingUp(true);
    setSetupStep("qr");
    
    // Generate a fake TOTP secret for demo
    // In production: call /api/auth/mfa/setup-totp
    const fakeSecret = "JBSWY3DPEHPK3PXP";
    const accountName = "admin@pimpay.com";
    const issuer = "PimPay";
    const otpAuthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${fakeSecret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    
    setTotpSecret(fakeSecret);
    setQrCodeUrl(otpAuthUri);
  };

  // Copy secret to clipboard
  const copySecret = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedSecret(true);
    toast.success("Secret copie dans le presse-papier");
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Handle code input
  const handleCodeChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);
    setVerifyError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newCode = [...verificationCode];
    pastedData.split("").forEach((char, i) => {
      if (i < 6) newCode[i] = char;
    });
    setVerificationCode(newCode);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const resetVerificationCode = useCallback(() => {
    setVerificationCode(["", "", "", "", "", ""]);
    setVerifyError(null);
  }, []);

  // Verify code and complete setup
  const verifyAndComplete = async () => {
    const fullCode = verificationCode.join("");
    if (fullCode.length !== 6) {
      setVerifyError("Veuillez entrer le code complet a 6 chiffres");
      return;
    }

    setIsVerifying(true);
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Simulated validation: "123456" is the valid code
    if (fullCode === "123456") {
      setSetupStep("complete");
      setSecurityStatus((prev) => ({
        ...prev,
        twoFactorEnabled: true,
        lastVerified: new Date().toISOString(),
        backupCodesRemaining: 10,
      }));
      toast.success("Google Authenticator active avec succes!");
    } else {
      setVerifyError("Code incorrect. Verifiez votre application Google Authenticator.");
    }

    setIsVerifying(false);
  };

  // Reset setup
  const resetSetup = () => {
    setIsSettingUp(false);
    setSetupStep("intro");
    setTotpSecret("");
    setQrCodeUrl("");
    resetVerificationCode();
  };

  // Disable 2FA
  const disable2FA = async () => {
    // In production, this would require MFA verification first
    setSecurityStatus((prev) => ({
      ...prev,
      twoFactorEnabled: false,
      backupCodesRemaining: 0,
    }));
    toast.success("2FA desactive");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
        <p className="text-cyan-500/50 text-[10px] font-black uppercase tracking-[5px]">
          Chargement Securite...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32" translate="no">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-cyan-500/10">
        <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
          <button
            onClick={() => router.push("/admin/treasury")}
            className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className="text-[9px] font-black text-cyan-500 uppercase tracking-[4px]">
              PimPay
            </p>
            <h1 className="text-sm font-black text-white uppercase tracking-wider">
              Configuration Securite
            </h1>
          </div>
          <div className="w-10" /> {/* Spacer */}
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto mt-6 space-y-6">
        {/* SECURITY STATUS CARD */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-6 border ${
            securityStatus.twoFactorEnabled
              ? "bg-gradient-to-br from-emerald-900/20 to-cyan-900/20 border-emerald-500/30"
              : "bg-gradient-to-br from-amber-900/20 to-red-900/20 border-amber-500/30"
          }`}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                securityStatus.twoFactorEnabled
                  ? "bg-emerald-500/20 border border-emerald-500/40"
                  : "bg-amber-500/20 border border-amber-500/40"
              }`}
            >
              {securityStatus.twoFactorEnabled ? (
                <ShieldCheck size={32} className="text-emerald-400" />
              ) : (
                <ShieldAlert size={32} className="text-amber-400" />
              )}
            </div>
            <div>
              <h2
                className={`text-lg font-black ${
                  securityStatus.twoFactorEnabled ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {securityStatus.twoFactorEnabled
                  ? "Protection 2FA Active"
                  : "Protection 2FA Inactive"}
              </h2>
              <p className="text-[10px] text-slate-500">
                {securityStatus.twoFactorEnabled
                  ? "Votre compte est protege par Google Authenticator"
                  : "Activez Google Authenticator pour securiser vos actions"}
              </p>
            </div>
          </div>

          {securityStatus.twoFactorEnabled && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock size={12} className="text-slate-500" />
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                    Derniere Verification
                  </p>
                </div>
                <p className="text-xs font-bold text-white">
                  {formatDate(securityStatus.lastVerified)}
                </p>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Key size={12} className="text-slate-500" />
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                    Codes de Secours
                  </p>
                </div>
                <p className="text-xs font-bold text-white">
                  {securityStatus.backupCodesRemaining} restants
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* SETUP FLOW OR STATUS */}
        <AnimatePresence mode="wait">
          {!isSettingUp && !securityStatus.twoFactorEnabled && (
            <motion.div
              key="setup-cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Why 2FA Section */}
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-3xl p-5">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">
                  Pourquoi Activer le 2FA?
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      icon: Shield,
                      title: "Protection Renforcee",
                      desc: "Double verification pour toutes les actions sensibles",
                    },
                    {
                      icon: Lock,
                      title: "Securite Bancaire",
                      desc: "Norme de securite utilisee par les plus grandes banques",
                    },
                    {
                      icon: Fingerprint,
                      title: "Controle Total",
                      desc: "Seul vous pouvez valider les transactions critiques",
                    },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <item.icon size={18} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{item.title}</p>
                        <p className="text-[10px] text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Start Setup Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={startSetup}
                className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl font-bold text-sm uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/20"
              >
                <Smartphone size={20} />
                Configurer Google Authenticator
              </motion.button>
            </motion.div>
          )}

          {isSettingUp && setupStep === "qr" && (
            <motion.div
              key="qr-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/60 border border-cyan-500/20 rounded-3xl p-6"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                  <QrCode size={28} className="text-cyan-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  Scannez le QR Code
                </h3>
                <p className="text-[10px] text-slate-500">
                  Ouvrez Google Authenticator et scannez ce QR code
                </p>
              </div>

              {/* QR Code */}
              <div className="bg-white rounded-2xl p-4 mx-auto w-fit mb-6">
                <QRCodeSVG
                  value={qrCodeUrl}
                  size={180}
                  level="H"
                  includeMargin={false}
                />
              </div>

              {/* Manual Entry */}
              <div className="bg-slate-800/50 rounded-2xl p-4 mb-6">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Ou entrez manuellement cette cle
                </p>
                <div className="flex items-center gap-2">
                  <code
                    className={`flex-1 text-sm font-mono ${
                      showSecret ? "text-cyan-400" : "text-slate-600"
                    } bg-slate-900 rounded-xl px-4 py-3`}
                  >
                    {showSecret ? totpSecret : "••••••••••••••••"}
                  </code>
                  <button
                    onClick={() => setShowSecret(!showSecret)}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors"
                  >
                    {showSecret ? (
                      <EyeOff size={16} className="text-slate-400" />
                    ) : (
                      <Eye size={16} className="text-slate-400" />
                    )}
                  </button>
                  <button
                    onClick={copySecret}
                    className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 transition-colors"
                  >
                    {copiedSecret ? (
                      <CheckCircle2 size={16} className="text-emerald-400" />
                    ) : (
                      <Copy size={16} className="text-slate-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Next Step */}
              <div className="flex gap-3">
                <button
                  onClick={resetSetup}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    setSetupStep("verify");
                    setTimeout(() => inputRefs.current[0]?.focus(), 100);
                  }}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-[10px] uppercase tracking-wider hover:from-cyan-500 hover:to-blue-500 transition-all"
                >
                  Continuer
                </button>
              </div>
            </motion.div>
          )}

          {isSettingUp && setupStep === "verify" && (
            <motion.div
              key="verify-step"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-slate-900/60 border border-cyan-500/20 rounded-3xl p-6"
            >
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4">
                  <Key size={28} className="text-cyan-400" />
                </div>
                <h3 className="text-lg font-black text-white mb-2">
                  Verifiez la Configuration
                </h3>
                <p className="text-[10px] text-slate-500">
                  Entrez le code a 6 chiffres affiche dans Google Authenticator
                </p>
              </div>

              {/* Code Input */}
              <div className="mb-6">
                <div
                  className="flex justify-center gap-2"
                  onPaste={handleCodePaste}
                >
                  {verificationCode.map((digit, index) => (
                    <motion.input
                      key={index}
                      ref={(el) => {
                        inputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(index, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(index, e)}
                      className={`w-12 h-14 text-center text-xl font-black rounded-xl border-2 bg-slate-800/50 text-white outline-none transition-all
                        ${
                          verifyError
                            ? "border-red-500/50 animate-shake"
                            : digit
                            ? "border-cyan-500/50"
                            : "border-white/10"
                        }
                        focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20`}
                      whileFocus={{ scale: 1.05 }}
                    />
                  ))}
                </div>
                {verifyError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[10px] text-red-400 text-center mt-3"
                  >
                    {verifyError}
                  </motion.p>
                )}
              </div>

              {/* Test Code Hint */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">
                    Mode Demo
                  </p>
                </div>
                <p className="text-[10px] text-amber-400/80">
                  Pour tester, utilisez le code: <span className="font-mono font-bold">123456</span>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSetupStep("qr");
                    resetVerificationCode();
                  }}
                  disabled={isVerifying}
                  className="flex-1 py-4 rounded-2xl bg-white/5 text-slate-400 font-bold text-[10px] uppercase tracking-wider hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  Retour
                </button>
                <button
                  onClick={verifyAndComplete}
                  disabled={isVerifying || verificationCode.some((d) => !d)}
                  className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-[10px] uppercase tracking-wider hover:from-cyan-500 hover:to-blue-500 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Verification...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={14} />
                      Activer le 2FA
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {isSettingUp && setupStep === "complete" && (
            <motion.div
              key="complete-step"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 border border-emerald-500/30 rounded-3xl p-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle2 size={40} className="text-emerald-400" />
              </motion.div>
              <h3 className="text-xl font-black text-emerald-400 mb-2">
                2FA Active avec Succes!
              </h3>
              <p className="text-[10px] text-slate-400 mb-6">
                Votre compte est maintenant protege par Google Authenticator.
                Toutes les actions sensibles requerront une verification 2FA.
              </p>

              <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 text-left">
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Prochaines Etapes Recommandees
                </p>
                <div className="space-y-2">
                  {[
                    "Conservez vos codes de secours en lieu sur",
                    "Ne partagez jamais votre secret 2FA",
                    "Configurez un appareil de secours si possible",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-emerald-400" />
                      <p className="text-[10px] text-slate-400">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  resetSetup();
                  fetchSecurityStatus();
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold text-sm uppercase tracking-wider hover:from-emerald-500 hover:to-cyan-500 transition-all"
              >
                Terminer
              </button>
            </motion.div>
          )}

          {securityStatus.twoFactorEnabled && !isSettingUp && (
            <motion.div
              key="enabled-status"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Security Actions */}
              <div className="bg-slate-900/60 border border-white/[0.06] rounded-3xl p-5">
                <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-[3px] mb-4">
                  Gestion de la Securite
                </h3>
                <div className="space-y-3">
                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Key size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">
                        Codes de Secours
                      </p>
                      <p className="text-[9px] text-slate-500">
                        Generer de nouveaux codes de recuperation
                      </p>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Smartphone size={18} className="text-purple-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">
                        Changer d{"'"}Appareil
                      </p>
                      <p className="text-[9px] text-slate-500">
                        Transferer le 2FA vers un nouvel appareil
                      </p>
                    </div>
                  </button>

                  <button className="w-full flex items-center gap-4 p-4 rounded-2xl bg-slate-800/50 border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-11 h-11 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                      <History size={18} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-bold text-white">
                        Historique de Connexion
                      </p>
                      <p className="text-[9px] text-slate-500">
                        Voir les verifications 2FA recentes
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-red-900/10 border border-red-500/20 rounded-3xl p-5">
                <h3 className="text-[10px] font-black text-red-500 uppercase tracking-[3px] mb-4">
                  Zone Dangereuse
                </h3>
                <button
                  onClick={disable2FA}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 hover:border-red-500/50 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-red-500/20 flex items-center justify-center">
                    <ShieldAlert size={18} className="text-red-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-red-400">
                      Desactiver le 2FA
                    </p>
                    <p className="text-[9px] text-red-400/70">
                      Retire la protection par Google Authenticator
                    </p>
                  </div>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Security Tips */}
        <div className="bg-slate-900/60 border border-white/[0.06] rounded-3xl p-5">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[3px] mb-4">
            Conseils de Securite
          </h3>
          <div className="space-y-2 text-[10px] text-slate-500">
            <p>
              - Ne partagez jamais votre code 2FA ou votre secret
            </p>
            <p>
              - Gardez vos codes de secours dans un endroit sur
            </p>
            <p>
              - Verifiez regulierement vos appareils connectes
            </p>
            <p>
              - En cas de doute, desactivez et reconfigurez le 2FA
            </p>
          </div>
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-2 py-4 text-[9px] text-slate-600">
          <Shield size={12} />
          <span>Securite de niveau bancaire - Chiffrement E2E</span>
        </div>
      </div>
    </div>
  );
}
