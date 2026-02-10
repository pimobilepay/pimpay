"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, Mail, ShieldCheck, Loader2, CheckCircle2,
  User, Phone, Lock, EyeOff
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  // HoneyPot pour piéger les bots
  const [hp, setHp] = useState(""); 
  const [method, setMethod] = useState<"email" | "phone" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Gestion du cooldown pour éviter le spam
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleCheckUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hp) return; // Bot détecté

    setIsSubmitting(true);
    
    try {
      // Simulation d'appel API
      const res = await fetch("/api/auth/check-user", {
        method: "POST",
        body: JSON.stringify({ username: username.replace('@', '') }),
      });

      // SECURITÉ: Même si l'utilisateur n'existe pas, on passe parfois à l'étape 
      // suivante ou on affiche un message générique pour éviter l'énumération.
      setTimeout(() => {
        setIsSubmitting(false);
        setStep(2);
        toast.info("Protocole de vérification initialisé");
      }, 1500);
    } catch (error) {
      setIsSubmitting(false);
      toast.error("Erreur de connexion au protocole");
    }
  };

  const handleSendCode = () => {
    if (cooldown > 0) return;
    setIsSubmitting(true);
    
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(3);
      setCooldown(60); // Bloque pendant 60s
      toast.success(`Cryptogramme envoyé via ${method?.toUpperCase()}`);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      
      {/* CHAMP HONEYPOT (Invisible pour l'utilisateur) */}
      <input type="text" className="hidden" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} />

      <div className="px-6 pt-12">
        <button
          onClick={() => step > 1 ? setStep(step - 1) : router.back()}
          className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all text-slate-400"
        >
          <ArrowLeft size={22} />
        </button>
      </div>

      <main className="flex-1 px-8 pt-10 pb-12 flex flex-col">
        <div className="mb-10 text-center">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 relative">
                <ShieldCheck size={36} className="text-blue-500" />
                <div className="absolute -right-1 -top-1 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-20"></div>
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter italic">Sécurité</h1>
            <p className="text-[10px] text-blue-500 font-black uppercase tracking-[0.4em] mt-2">Recovery Protocol</p>
        </div>

        {step === 1 && (
          <form onSubmit={handleCheckUsername} className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-4">
                <div className="bg-blue-500/5 border border-blue-500/10 p-4 rounded-2xl">
                   <p className="text-[11px] text-slate-400 font-medium text-center leading-relaxed">
                    Pour protéger votre compte **PimPay**, nous devons valider votre identité avant toute modification.
                   </p>
                </div>
                
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Identifiant PimPay</label>
                    <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                        <input
                            type="text"
                            required
                            placeholder="Nom d'utilisateur"
                            className="w-full bg-slate-900/50 border border-white/5 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold focus:outline-none focus:border-blue-500/50 transition-all"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <button
                type="submit"
                disabled={isSubmitting || username.length < 3}
                className="w-full flex items-center justify-center gap-3 p-6 bg-blue-600 rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-30 transition-all"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Analyser le compte"}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="text-center space-y-2">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Compte détecté</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-black italic">{username.startsWith('@') ? username : `@${username}`}</span>
                </div>
            </div>

            <div className="space-y-3">
                <SelectionCard
                    icon={<Mail size={20}/>}
                    title="Email de secours"
                    description="p****@gmail.com"
                    selected={method === 'email'}
                    onClick={() => setMethod('email')}
                />
                <SelectionCard
                    icon={<Phone size={20}/>}
                    title="Mobile sécurisé"
                    description="+242 •••• 12"
                    selected={method === 'phone'}
                    onClick={() => setMethod('phone')}
                />
            </div>

            <button
                onClick={handleSendCode}
                disabled={isSubmitting || !method || cooldown > 0}
                className="w-full flex items-center justify-center gap-3 mt-4 p-6 bg-blue-600 rounded-[2rem] text-[12px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-30 transition-all"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : cooldown > 0 ? `Attendre ${cooldown}s` : "Envoyer l'OTP"}
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500 text-center">
            <div className="relative inline-block mx-auto">
                <CheckCircle2 size={64} className="text-emerald-500" />
                <div className="absolute inset-0 bg-emerald-500/20 blur-2xl -z-10"></div>
            </div>
            <div className="space-y-3">
                <h2 className="text-2xl font-black uppercase tracking-tighter">Code Expédié</h2>
                <p className="text-xs text-slate-400 font-medium px-6 leading-relaxed">
                    Un code de vérification à usage unique (OTP) a été transmis à votre adresse. Vérifiez vos spams.
                </p>
            </div>
            
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-left">
                <Lock size={16} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-[10px] text-amber-200/70 font-medium">
                    Ne partagez jamais ce code. Les agents PimPay ne vous demanderont jamais votre OTP ou votre PIN.
                </p>
            </div>

            <button
                onClick={() => router.push("/auth/verify-otp")}
                className="w-full p-6 bg-white text-black rounded-[2rem] text-[12px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
                Saisir le code
            </button>
          </div>
        )}

        <div className="mt-auto pt-8 text-center flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 rounded-full border border-white/5">
                <EyeOff size={10} className="text-slate-500" />
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">End-to-End Encrypted</span>
            </div>
        </div>
      </main>
    </div>
  );
}

function SelectionCard({ icon, title, description, selected, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`w-full flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 ${selected ? 'bg-blue-600/10 border-blue-500 ring-1 ring-blue-500/50' : 'bg-slate-900/40 border-white/5 opacity-60'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    {icon}
                </div>
                <div className="text-left">
                    <p className="text-xs font-black uppercase tracking-tight">{title}</p>
                    <p className="text-[9px] text-slate-500 font-bold tracking-widest">{description}</p>
                </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-blue-500' : 'border-slate-700'}`}>
                {selected && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
            </div>
        </button>
    );
}
