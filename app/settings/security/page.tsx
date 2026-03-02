"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Fingerprint, KeyRound,
  Mail, MessageCircle, ChevronRight,
  Lock, ArrowLeft, ShieldAlert, Monitor,
  Smartphone, Trash2, Shield, Loader2,
  Globe, Cpu, Wifi, ChevronDown, ChevronUp,
  X, Copy, Check, Tablet, Scan, Mic, Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";

interface SessionData {
  id: string;
  deviceName: string;
  os: string;
  osName: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  deviceVendor: string | null;
  deviceModel: string | null;
  deviceType: string;
  engineName: string | null;
  cpuArch: string | null;
  ip: string;
  city: string | null;
  country: string | null;
  isMobile: boolean;
  lastActiveAt: string;
  isCurrent: boolean;
}

export default function SecurityPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [otpEmail, setOtpEmail] = useState(false);
  const [otpSms, setOtpSms] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Email 2FA states
  const [showEmail2faModal, setShowEmail2faModal] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // SMS 2FA states
  const [showSms2faModal, setShowSms2faModal] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  // Biometric states
  const [faceId, setFaceId] = useState(false);
  const [fingerprint, setFingerprint] = useState(false);
  const [voiceAuth, setVoiceAuth] = useState(false);

  // Google Authenticator states
  const [google2faEnabled, setGoogle2faEnabled] = useState(false);
  const [google2faLoading, setGoogle2faLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify">("qr");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetch2faStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/2fa/status");
      if (res.ok) {
        const data = await res.json();
        setGoogle2faEnabled(data.enabled);
      }
    } catch {
      // silently fail
    } finally {
      setGoogle2faLoading(false);
    }
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Voulez-vous vraiment deconnecter cet appareil ?")) return;
    setDeletingSessionId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success("Session revoquee avec succes");
      } else {
        toast.error("Erreur lors de la revocation");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleSetup2fa = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSetupData(data);
        setSetupStep("qr");
        setVerifyCode("");
        setShowSetupModal(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'initialisation");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2fa = async () => {
    if (verifyCode.length !== 6) {
      toast.error("Entrez un code a 6 chiffres");
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (res.ok) {
        setGoogle2faEnabled(true);
        setShowSetupModal(false);
        setSetupData(null);
        setVerifyCode("");
        toast.success("Google Authenticator active avec succes");
      } else {
        const data = await res.json();
        toast.error(data.error || "Code incorrect");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    if (disableCode.length !== 6) {
      toast.error("Entrez un code a 6 chiffres");
      return;
    }
    setDisableLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      if (res.ok) {
        setGoogle2faEnabled(false);
        setShowDisableModal(false);
        setDisableCode("");
        toast.success("Google Authenticator desactive");
      } else {
        const data = await res.json();
        toast.error(data.error || "Code incorrect");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setDisableLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  useEffect(() => {
    setMounted(true);
    setOtpEmail(localStorage.getItem("otpEmail") === "true");
    setOtpSms(localStorage.getItem("otpSms") === "true");
    setBiometric(localStorage.getItem("biometric") === "true");
    setFaceId(localStorage.getItem("faceId") === "true");
    setFingerprint(localStorage.getItem("fingerprint") === "true");
    setVoiceAuth(localStorage.getItem("voiceAuth") === "true");
    fetchSessions();
    fetch2faStatus();
  }, [fetchSessions, fetch2faStatus]);

  const toggleSwitch = (key: string, value: boolean, setValue: (v: boolean) => void) => {
    const newVal = !value;
    if (!newVal) {
      if (!window.confirm(`Desactiver cette protection reduira la securite de votre protocole Pimpay. Continuer ?`)) return;
    }
    setValue(newVal);
    localStorage.setItem(key, newVal.toString());
    toast.success(`${key.replace('otp', 'OTP ')} ${newVal ? 'active' : 'desactive'}`);
  };

  if (!mounted) return null;

  const securityScore = [otpEmail, otpSms, biometric, google2faEnabled, faceId, fingerprint, voiceAuth].filter(Boolean).length;
  const scorePercentage = Math.round((securityScore / 7) * 100);

  const getDeviceIcon = (session: SessionData) => {
    const type = session.deviceType?.toLowerCase();
    if (type === "tablet") return <Tablet size={22} />;
    if (session.isMobile) return <Smartphone size={22} />;
    return <Monitor size={22} />;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 selection:bg-blue-500/30">
      
      {/* TOP HEADER - STICKY */}
      <div className="sticky top-0 z-50 px-6 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 active:scale-90 transition-all hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">Centre de Securite</h1>
            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.3em] mt-1">Pimpay Protocol v4.0</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8 mt-4">
        
        {/* DYNAMIC SECURITY SCORE CARD */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-white/5 p-7 rounded-[2.5rem] shadow-2xl">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 p-6 opacity-[0.03] rotate-12">
            <Shield size={160} className="text-white" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black text-blue-500 tracking-[0.2em]">{"Etat du Protocole"}</span>
              <h3 className={`text-2xl font-black uppercase tracking-tighter ${securityScore === 4 ? "text-emerald-400" : "text-white"}`}>
                {securityScore === 4 ? "Protection Maximale" : securityScore === 0 ? "Alerte Critique" : "Niveau Standard"}
              </h3>
            </div>
            <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${securityScore === 4 ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-blue-500/20 bg-blue-500/5'}`}>
              {securityScore === 4 ? <ShieldCheck className="text-emerald-500" size={28} /> : <ShieldAlert className="text-blue-500" size={28} />}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>{"Fiabilite de l'acces"}</span>
                <span className={securityScore === 4 ? "text-emerald-500" : "text-blue-500"}>{scorePercentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                className={`h-full transition-all duration-1000 ease-in-out rounded-full ${securityScore === 4 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${scorePercentage}%` }}
                />
            </div>
          </div>
        </div>

        {/* 2FA SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Double Authentification (2FA)</h3>
          </div>
          <div className="grid gap-3">
            {/* Email 2FA */}
            <button
              onClick={() => {
                if (otpEmail) {
                  if (!window.confirm("Desactiver la protection email reduira la securite de votre compte. Continuer ?")) return;
                  setOtpEmail(false);
                  localStorage.setItem("otpEmail", "false");
                  toast.success("Protection Email desactivee");
                } else {
                  setEmailCode("");
                  setEmailCodeSent(false);
                  setShowEmail2faModal(true);
                }
              }}
              className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl transition-all duration-500 ${otpEmail ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                  <Mail size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Protection Email</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                    {otpEmail ? "Verification active par email" : "Validation de session par code"}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${otpEmail ? "bg-blue-600" : "bg-slate-800"}`}>
                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${otpEmail ? "translate-x-5.5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* SMS 2FA */}
            <button
              onClick={() => {
                if (otpSms) {
                  if (!window.confirm("Desactiver la validation SMS reduira la securite de votre compte. Continuer ?")) return;
                  setOtpSms(false);
                  localStorage.setItem("otpSms", "false");
                  toast.success("Validation SMS desactivee");
                } else {
                  setSmsCode("");
                  setSmsCodeSent(false);
                  setShowSms2faModal(true);
                }
              }}
              className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl transition-all duration-500 ${otpSms ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                  <MessageCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Validation SMS</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                    {otpSms ? "OTP via Mobile Money active" : "OTP via Mobile Money"}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${otpSms ? "bg-emerald-600" : "bg-slate-800"}`}>
                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${otpSms ? "translate-x-5.5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Google Authenticator */}
            {google2faLoading ? (
              <div className="flex items-center justify-center p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chargement...</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (google2faEnabled) {
                    setDisableCode("");
                    setShowDisableModal(true);
                  } else {
                    handleSetup2fa();
                  }
                }}
                disabled={setupLoading}
                className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl transition-all duration-500 ${google2faEnabled ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                    {setupLoading ? <Loader2 size={20} className="animate-spin" /> : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.3"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M17 12a5 5 0 11-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Google Authenticator</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                      {google2faEnabled ? "Protection TOTP active" : "Code temporaire a 6 chiffres"}
                    </p>
                  </div>
                </div>

                <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${google2faEnabled ? "bg-blue-600" : "bg-slate-800"}`}>
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${google2faEnabled ? "translate-x-5.5" : "translate-x-0"}`} />
                </div>
              </button>
            )}
          </div>
        </section>

        {/* KEYS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{"Cles & Chiffrement"}</h3>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
            <SecurityAction
              icon={<Lock size={20} />}
              label="Mot de passe Maitre"
              description="Derniere modification : Il y a 3 mois"
              path="/settings/security/change-password"
            />
            <div className="h-[1px] w-[90%] bg-white/5 mx-auto" />
            <SecurityAction
              icon={<KeyRound size={20} />}
              label="Code PIN Transactionnel"
              description="Requis pour chaque retrait"
              path="/settings/security/pin"
            />
          </div>
        </section>

        {/* SESSIONS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
              Sessions Actives
              {!loadingSessions && sessions.length > 0 && (
                <span className="ml-2 text-emerald-500">{sessions.length}</span>
              )}
            </h3>
          </div>

          {loadingSessions ? (
            <div className="flex items-center justify-center p-8 rounded-[2rem] bg-slate-900/40 border border-white/5">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Chargement des sessions...
              </span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center rounded-[2rem] bg-slate-900/40 border border-dashed border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Aucune session active
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`rounded-[2rem] transition-all overflow-hidden ${
                      session.isCurrent
                        ? "bg-slate-900/40 border border-emerald-500/10"
                        : "bg-slate-900/20 border border-white/5 opacity-80"
                    }`}
                  >
                    {/* Session header */}
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`p-3.5 rounded-2xl shrink-0 ${
                            session.isCurrent
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {getDeviceIcon(session)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-tight truncate">
                            {session.deviceName}
                          </p>
                          {session.isCurrent ? (
                            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                              {"Actuel"}
                              {session.country ? ` \u2022 ${session.city ? `${session.city}, ` : ""}${session.country}` : ""}
                            </p>
                          ) : (
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                              {formatDistanceToNow(new Date(session.lastActiveAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                              {session.country ? ` \u2022 ${session.city ? `${session.city}, ` : ""}${session.country}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {session.isCurrent ? (
                          <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <span className="text-[8px] font-black text-emerald-500 uppercase">
                              En ligne
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            disabled={deletingSessionId === session.id}
                            className="p-3 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90 disabled:opacity-50"
                          >
                            <Trash2
                              size={18}
                              className={deletingSessionId === session.id ? "animate-pulse" : ""}
                            />
                          </button>
                        )}

                        {/* Expand/collapse button */}
                        <button
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/5 rounded-xl transition-all"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded system info */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0">
                        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Cpu size={12} className="text-blue-500" />
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.15em]">
                              Informations Systeme
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* OS */}
                            <SystemInfoItem
                              label="Systeme"
                              value={session.os || "Inconnu"}
                              icon={<Monitor size={12} />}
                            />
                            {/* Browser */}
                            <SystemInfoItem
                              label="Navigateur"
                              value={`${session.browser}${session.browserVersion ? ` ${session.browserVersion}` : ""}`}
                              icon={<Globe size={12} />}
                            />
                            {/* Device */}
                            <SystemInfoItem
                              label="Appareil"
                              value={
                                session.deviceVendor || session.deviceModel
                                  ? `${session.deviceVendor || ""} ${session.deviceModel || ""}`.trim()
                                  : session.isMobile ? "Mobile" : "Desktop"
                              }
                              icon={session.isMobile ? <Smartphone size={12} /> : <Monitor size={12} />}
                            />
                            {/* Type */}
                            <SystemInfoItem
                              label="Type"
                              value={
                                session.deviceType === "mobile" ? "Mobile"
                                : session.deviceType === "tablet" ? "Tablette"
                                : "Ordinateur"
                              }
                              icon={getDeviceIcon(session)}
                            />
                            {/* IP */}
                            <SystemInfoItem
                              label="Adresse IP"
                              value={session.ip}
                              icon={<Wifi size={12} />}
                            />
                            {/* Engine */}
                            {session.engineName && (
                              <SystemInfoItem
                                label="Moteur"
                                value={session.engineName}
                                icon={<Cpu size={12} />}
                              />
                            )}
                            {/* CPU Architecture */}
                            {session.cpuArch && (
                              <SystemInfoItem
                                label="Architecture"
                                value={session.cpuArch}
                                icon={<Cpu size={12} />}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* BIOMETRY SECTION */}
        <section className="pb-12">
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{"Acces Biometrique"}</h3>
          </div>
          <div className="grid gap-3">
            <SecurityToggle
              icon={<Fingerprint size={20} />}
              label="Biometrie Native"
              description="Touch ID / Face ID"
              value={biometric}
              onToggle={() => toggleSwitch("biometric", biometric, setBiometric)}
            />
            <SecurityToggle
              icon={<Scan size={20} />}
              label="Reconnaissance Faciale"
              description="Deverrouillage par visage"
              value={faceId}
              onToggle={() => toggleSwitch("faceId", faceId, setFaceId)}
            />
            <SecurityToggle
              icon={<Eye size={20} />}
              label="Empreinte Digitale"
              description="Capteur biometrique avance"
              value={fingerprint}
              onToggle={() => toggleSwitch("fingerprint", fingerprint, setFingerprint)}
            />
            <SecurityToggle
              icon={<Mic size={20} />}
              label="Verification Vocale"
              description="Empreinte vocale unique"
              value={voiceAuth}
              onToggle={() => toggleSwitch("voiceAuth", voiceAuth, setVoiceAuth)}
            />
          </div>
        </section>
      </div>

      {/* GOOGLE AUTHENTICATOR SETUP MODAL */}
      {showSetupModal && setupData && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Google Authenticator</h2>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em] mt-1">Configuration TOTP</p>
              </div>
              <button
                onClick={() => {
                  setShowSetupModal(false);
                  setSetupData(null);
                  setVerifyCode("");
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {setupStep === "qr" ? (
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-5">
                    Scannez ce QR code avec Google Authenticator
                  </p>
                  <div className="inline-flex p-4 bg-white rounded-2xl">
                    <QRCodeSVG
                      value={setupData.otpAuthUri}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>

                {/* Secret key for manual entry */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                    {"Cle secrete (saisie manuelle)"}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-blue-400 bg-slate-950 rounded-xl px-3 py-2.5 break-all select-all">
                      {setupData.secret}
                    </code>
                    <button
                      onClick={copySecret}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 shrink-0"
                    >
                      {secretCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSetupStep("verify")}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                >
                  Continuer
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                    Entrez le code affiche dans Google Authenticator
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSetupStep("qr")}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleVerify2fa}
                    disabled={verifyLoading || verifyCode.length !== 6}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Activer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISABLE 2FA MODAL */}
      {showDisableModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Desactiver 2FA</h2>
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-[0.2em] mt-1">Cela reduira votre securite</p>
              </div>
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableCode("");
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Entrez le code Google Authenticator pour confirmer
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisableCode("");
                  }}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDisable2fa}
                  disabled={disableLoading || disableCode.length !== 6}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {disableLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Desactiver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL 2FA ACTIVATION MODAL */}
      {showEmail2faModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Protection Email</h2>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em] mt-1">Activation 2FA par Email</p>
              </div>
              <button
                onClick={() => setShowEmail2faModal(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-xl shrink-0">
                  <Mail size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Comment ca marche</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    Un code de verification sera envoye a votre adresse email a chaque nouvelle connexion.
                  </p>
                </div>
              </div>

              {!emailCodeSent ? (
                <button
                  onClick={async () => {
                    setEmailLoading(true);
                    await new Promise(r => setTimeout(r, 1500));
                    setEmailCodeSent(true);
                    setEmailLoading(false);
                    toast.success("Code envoye a votre adresse email");
                  }}
                  disabled={emailLoading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Envoyer le code de verification
                </button>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-4">
                      Entrez le code recu par email
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEmail2faModal(false)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        if (emailCode.length !== 6) { toast.error("Entrez un code a 6 chiffres"); return; }
                        setEmailLoading(true);
                        await new Promise(r => setTimeout(r, 1000));
                        setOtpEmail(true);
                        localStorage.setItem("otpEmail", "true");
                        setShowEmail2faModal(false);
                        setEmailLoading(false);
                        toast.success("Protection Email activee avec succes");
                      }}
                      disabled={emailLoading || emailCode.length !== 6}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {emailLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Activer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMS 2FA ACTIVATION MODAL */}
      {showSms2faModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Validation SMS</h2>
                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-1">Activation OTP Mobile</p>
              </div>
              <button
                onClick={() => setShowSms2faModal(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 rounded-xl shrink-0">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Verification Mobile</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    Un code OTP sera envoye par SMS a votre numero Mobile Money pour chaque transaction sensible.
                  </p>
                </div>
              </div>

              {!smsCodeSent ? (
                <button
                  onClick={async () => {
                    setSmsLoading(true);
                    await new Promise(r => setTimeout(r, 1500));
                    setSmsCodeSent(true);
                    setSmsLoading(false);
                    toast.success("Code OTP envoye par SMS");
                  }}
                  disabled={smsLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {smsLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  Envoyer le code SMS
                </button>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-4">
                      Entrez le code recu par SMS
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSms2faModal(false)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        if (smsCode.length !== 6) { toast.error("Entrez un code a 6 chiffres"); return; }
                        setSmsLoading(true);
                        await new Promise(r => setTimeout(r, 1000));
                        setOtpSms(true);
                        localStorage.setItem("otpSms", "true");
                        setShowSms2faModal(false);
                        setSmsLoading(false);
                        toast.success("Validation SMS activee avec succes");
                      }}
                      disabled={smsLoading || smsCode.length !== 6}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {smsLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Activer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemInfoItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-600">{icon}</span>
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[11px] font-bold text-slate-300 truncate">{value}</p>
    </div>
  );
}

function SecurityToggle({ icon, label, description, value, onToggle }: { icon: React.ReactNode; label: string; description: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl transition-all duration-500 ${value ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{label}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{description}</p>
        </div>
      </div>

      <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${value ? "bg-blue-600" : "bg-slate-800"}`}>
        <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${value ? "translate-x-5.5" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

function SecurityAction({ icon, label, description, path }: { icon: React.ReactNode; label: string; description: string; path: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(path)}
      className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] active:bg-white/[0.05] transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-white/5 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 border border-transparent transition-all">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{label}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{description}</p>
        </div>
      </div>
      <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
        <ChevronRight size={18} />
      </div>
    </button>
  );
}
