"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Fingerprint, KeyRound,
  Mail, MessageCircle, ChevronRight,
  Lock, ArrowLeft, ShieldAlert, Monitor,
  Smartphone, Trash2, Zap, Shield, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface SessionData {
  id: string;
  deviceName: string;
  os: string;
  browser: string;
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

  useEffect(() => {
    setMounted(true);
    setOtpEmail(localStorage.getItem("otpEmail") === "true");
    setOtpSms(localStorage.getItem("otpSms") === "true");
    setBiometric(localStorage.getItem("biometric") === "true");
    fetchSessions();
  }, [fetchSessions]);

  const toggleSwitch = (key: string, value: boolean, setValue: (v: boolean) => void) => {
    const newVal = !value;
    if (!newVal) {
      if (!window.confirm(`Désactiver cette protection réduira la sécurité de votre protocole Pimpay. Continuer ?`)) return;
    }
    setValue(newVal);
    localStorage.setItem(key, newVal.toString());
    toast.success(`${key.replace('otp', 'OTP ')} ${newVal ? 'activé' : 'désactivé'}`);
  };

  if (!mounted) return null;

  const securityScore = [otpEmail, otpSms, biometric].filter(Boolean).length;
  const scorePercentage = Math.round((securityScore / 3) * 100);

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
            <h1 className="text-xl font-black uppercase tracking-tighter italic leading-none">Centre de Sécurité</h1>
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
              <span className="text-[9px] uppercase font-black text-blue-500 tracking-[0.2em]">État du Protocole</span>
              <h3 className={`text-2xl font-black uppercase tracking-tighter ${securityScore === 3 ? "text-emerald-400" : "text-white"}`}>
                {securityScore === 3 ? "Protection Maximale" : securityScore === 0 ? "Alerte Critique" : "Niveau Standard"}
              </h3>
            </div>
            <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${securityScore === 3 ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-blue-500/20 bg-blue-500/5'}`}>
              {securityScore === 3 ? <ShieldCheck className="text-emerald-500" size={28} /> : <ShieldAlert className="text-blue-500" size={28} />}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Fiabilité de l'accès</span>
                <span className={securityScore === 3 ? "text-emerald-500" : "text-blue-500"}>{scorePercentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                className={`h-full transition-all duration-1000 ease-in-out rounded-full ${securityScore === 3 ? 'bg-emerald-500' : 'bg-blue-600'}`}
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
            <SecurityToggle
              icon={<Mail size={20} />}
              label="Protection Email"
              description="Validation de session par code"
              value={otpEmail}
              onToggle={() => toggleSwitch("otpEmail", otpEmail, setOtpEmail)}
            />
            <SecurityToggle
              icon={<MessageCircle size={20} />}
              label="Validation SMS"
              description="OTP via Mobile Money"
              value={otpSms}
              onToggle={() => toggleSwitch("otpSms", otpSms, setOtpSms)}
            />
          </div>
        </section>

        {/* KEYS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Clés & Chiffrement</h3>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
            <SecurityAction
              icon={<Lock size={20} />}
              label="Mot de passe Maître"
              description="Dernière modification : Il y a 3 mois"
              path="/settings/security/change-password"
            />
            <div className="h-[1px] w-[90%] bg-white/5 mx-auto" />
            <SecurityAction
              icon={<KeyRound size={20} />}
              label="Code PIN Transactionnel"
              description="Requis pour chaque retrait π"
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
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={`flex items-center justify-between p-5 rounded-[2rem] transition-all ${
                    session.isCurrent
                      ? "bg-slate-900/40 border border-emerald-500/10"
                      : "bg-slate-900/20 border border-white/5 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-3.5 rounded-2xl ${
                        session.isCurrent
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {session.isMobile ? <Smartphone size={22} /> : <Monitor size={22} />}
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase tracking-tight">
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

                  {session.isCurrent ? (
                    <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                      <span className="text-[8px] font-black text-emerald-500 uppercase">
                        En ligne
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      disabled={deletingSessionId === session.id}
                      className="p-3 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90 disabled:opacity-50"
                    >
                      <Trash2
                        size={18}
                        className={deletingSessionId === session.id ? "animate-pulse" : ""}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* BIOMETRY SECTION */}
        <section className="pb-12">
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Accès Biométrique</h3>
          </div>
          <SecurityToggle
            icon={<Fingerprint size={20} />}
            label="Biométrie Native"
            description="Touch ID / Face ID"
            value={biometric}
            onToggle={() => toggleSwitch("biometric", biometric, setBiometric)}
          />
        </section>
      </div>
    </div>
  );
}

function SecurityToggle({ icon, label, description, value, onToggle }: any) {
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

function SecurityAction({ icon, label, description, path }: any) {
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
