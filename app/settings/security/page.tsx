"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck, Fingerprint, KeyRound,
  Mail, MessageCircle, ChevronRight,
  Lock, ArrowLeft, ShieldAlert, Monitor,
  Smartphone, Trash2, Zap
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function SecurityPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [otpEmail, setOtpEmail] = useState(false);
  const [otpSms, setOtpSms] = useState(false);
  const [biometric, setBiometric] = useState(false);

  useEffect(() => {
    setMounted(true);
    setOtpEmail(localStorage.getItem("otpEmail") === "true");
    setOtpSms(localStorage.getItem("otpSms") === "true");
    setBiometric(localStorage.getItem("biometric") === "true");
  }, []);

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

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      
      {/* HEADER */}
      <div className="px-6 pt-12">
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 active:scale-90 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">Security Center</h1>
            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.3em]">Pimpay Protocol v2.4.0</p>
          </div>
        </div>

        {/* SECURITY SCORE CARD DYNAMIQUE */}
        <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-[2.5rem] mb-10 backdrop-blur-md">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={80} className="text-blue-500" />
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest">Niveau de protection</p>
              <h3 className={`text-2xl font-black uppercase tracking-tighter ${securityScore === 3 ? "text-emerald-400" : "text-white"}`}>
                {securityScore === 3 ? "Maximum" : securityScore === 0 ? "Critique" : "Standard"}
              </h3>
            </div>
            <div className={`h-14 w-14 rounded-full border-2 flex items-center justify-center transition-colors ${securityScore === 3 ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-blue-500/30 bg-blue-500/5'}`}>
              <ShieldCheck className={securityScore === 3 ? "text-emerald-500" : "text-blue-500"} size={32} />
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>Score de confiance</span>
                <span>{Math.round((securityScore / 3) * 100)}%</span>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                className={`h-full transition-all duration-1000 ease-out ${securityScore === 3 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${(securityScore / 3) * 100}%` }}
                />
            </div>
          </div>
        </div>

        <div className="space-y-10">
          {/* DOUBLE AUTHENTIFICATION */}
          <section>
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.25em] mb-4 ml-4">Authentification (2FA)</h3>
            <div className="space-y-3">
              <SecurityToggle
                icon={<Mail size={20} />}
                label="Protection Email"
                description="Codes de validation par mail"
                value={otpEmail}
                onToggle={() => toggleSwitch("otpEmail", otpEmail, setOtpEmail)}
              />
              <SecurityToggle
                icon={<MessageCircle size={20} />}
                label="Sécurité SMS"
                description="Validation par mobile money"
                value={otpSms}
                onToggle={() => toggleSwitch("otpSms", otpSms, setOtpSms)}
              />
            </div>
          </section>

          {/* ACCÈS ET PIN */}
          <section>
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.25em] mb-4 ml-4">Clés de chiffrement</h3>
            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden backdrop-blur-sm">
              <SecurityAction
                icon={<Lock size={20} />}
                label="Mot de passe"
                description="Mettre à jour votre clé maître"
                path="/settings/security/change-password"
              />
              <div className="h-[1px] w-[85%] bg-white/5 mx-auto" />
              <SecurityAction
                icon={<KeyRound size={20} />}
                label="Code PIN de retrait"
                description="Code de transaction à 4 chiffres"
                path="/settings/security/pin"
              />
            </div>
          </section>

          {/* SESSIONS ACTIVES (AJOUTÉ POUR L'IMPACT FINTECH) */}
          <section>
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.25em] mb-4 ml-4">Sessions Actives</h3>
            <div className="space-y-3">
                <div className="flex items-center justify-between p-5 rounded-[2rem] bg-slate-900/40 border border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-tight">iPhone 15 Pro (Moi)</p>
                            <p className="text-[9px] text-emerald-500 font-bold uppercase">Actuel • Kinshasa, RDC</p>
                        </div>
                    </div>
                    <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                        <span className="text-[8px] font-black text-emerald-500 uppercase">Live</span>
                    </div>
                </div>

                <div className="flex items-center justify-between p-5 rounded-[2rem] bg-slate-900/20 border border-white/5 opacity-60">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-slate-800 text-slate-400">
                            <Monitor size={20} />
                        </div>
                        <div>
                            <p className="text-sm font-bold uppercase tracking-tight">MacBook Pro</p>
                            <p className="text-[9px] text-slate-500 font-bold uppercase">Dernière connexion: Hier</p>
                        </div>
                    </div>
                    <button className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-colors">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
          </section>

          {/* BIOMÉTRIE */}
          <section className="pb-10">
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.25em] mb-4 ml-4">Biométrie Avancée</h3>
            <SecurityToggle
              icon={<Fingerprint size={20} />}
              label="Accès Biométrique"
              description="Touch / Face ID"
              value={biometric}
              onToggle={() => toggleSwitch("biometric", biometric, setBiometric)}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function SecurityToggle({ icon, label, description, value, onToggle }: any) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 rounded-[2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/30 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-2xl transition-all duration-300 ${value ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'bg-slate-800 text-slate-500'}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-black uppercase tracking-tight">{label}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide opacity-70">{description}</p>
        </div>
      </div>

      <div className={`w-12 h-6 rounded-full p-1 flex items-center transition-all duration-500 ${value ? "bg-blue-600" : "bg-slate-800"}`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-xl transform transition-transform duration-500 ease-in-out ${value ? "translate-x-6 rotate-[360deg]" : ""}`} />
      </div>
    </button>
  );
}

function SecurityAction({ icon, label, description, path }: any) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(path)}
      className="w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/5 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-sm font-black uppercase tracking-tight">{label}</p>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide opacity-70">{description}</p>
        </div>
      </div>
      <ChevronRight className="text-slate-700 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" size={18} />
    </button>
  );
}
