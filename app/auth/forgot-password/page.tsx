"use client";

import { useState } from "react";
import { 
  ArrowLeft, 
  Mail, 
  ShieldCheck, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  User,
  Phone,
  ChevronRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // Étape 1: Username, Étape 2: Canal, Étape 3: Succès
  const [username, setUsername] = useState("");
  const [method, setMethod] = useState<"email" | "phone" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Simulation de vérification d'utilisateur
  const handleCheckUsername = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(2);
      toast.success("Utilisateur identifié");
    }, 1200);
  };

  // Simulation d'envoi du code
  const handleSendCode = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStep(3);
      toast.success(`Lien envoyé par ${method === 'email' ? 'Email' : 'SMS'}`);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      
      {/* HEADER */}
      <div className="px-6 pt-12">
        <button 
          onClick={() => step > 1 ? setStep(step - 1) : router.back()} 
          className="p-3 bg-white/5 border border-white/10 rounded-2xl active:scale-90 transition-all"
        >
          <ArrowLeft size={22} />
        </button>
      </div>

      <main className="flex-1 px-8 pt-10 pb-12 flex flex-col">
        
        {/* ICONE & TITRE */}
        <div className="mb-10 text-center">
            <div className="w-20 h-20 bg-blue-600/10 border border-blue-500/20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(37,99,235,0.1)]">
                <ShieldCheck size={36} className="text-blue-500" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-tighter leading-none italic">
                Récupération
            </h1>
            <p className="text-[11px] text-blue-500 font-bold uppercase tracking-[0.3em] mt-2">
                Pimpay Security Protocol
            </p>
        </div>

        {/* ÉTAPE 1 : NOM D'UTILISATEUR */}
        {step === 1 && (
          <form onSubmit={handleCheckUsername} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-4">
                <p className="text-sm text-slate-400 font-medium text-center px-4 leading-relaxed italic opacity-80">
                    Veuillez entrer votre identifiant unique Pimpay pour commencer la récupération.
                </p>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nom d'utilisateur</label>
                    <div className="relative">
                        <User className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input 
                            type="text"
                            required
                            placeholder="@USERNAME"
                            className="w-full bg-slate-900/50 border border-white/5 rounded-[2rem] pl-14 pr-6 py-5 text-sm font-bold focus:outline-none focus:border-blue-500/50 transition-all uppercase"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                    </div>
                </div>
            </div>
            <button 
                type="submit"
                disabled={isSubmitting || !username}
                className="w-full flex items-center justify-center gap-3 p-6 bg-blue-600 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Vérifier l'identifiant"}
            </button>
          </form>
        )}

        {/* ÉTAPE 2 : CHOIX DU CANAL */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <p className="text-sm text-slate-400 font-medium text-center px-4 leading-relaxed">
              Identifiant <span className="text-blue-500 font-black">@{username}</span> reconnu. Choisissez une méthode de réception.
            </p>

            <div className="space-y-3">
                <SelectionCard 
                    icon={<Mail size={20}/>}
                    title="Email"
                    description="Lien envoyé à votre adresse vérifiée"
                    selected={method === 'email'}
                    onClick={() => setMethod('email')}
                />
                <SelectionCard 
                    icon={<Phone size={20}/>}
                    title="Numéro de téléphone"
                    description="Code envoyé par SMS"
                    selected={method === 'phone'}
                    onClick={() => setMethod('phone')}
                />
            </div>

            <button 
                onClick={handleSendCode}
                disabled={isSubmitting || !method}
                className="w-full flex items-center justify-center gap-3 mt-4 p-6 bg-blue-600 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-lg shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
            >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Recevoir le code"}
            </button>
          </div>
        )}

        {/* ÉTAPE 3 : SUCCÈS */}
        {step === 3 && (
          <div className="space-y-10 animate-in zoom-in-95 duration-500">
            <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-[2.5rem] p-8 text-center space-y-4">
                <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
                <div className="space-y-2">
                    <h2 className="text-xl font-black uppercase tracking-tight">Transmission Réussie</h2>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                        Le protocole de récupération a été envoyé via <span className="text-white font-bold uppercase">{method}</span>.
                    </p>
                </div>
            </div>
            <button 
                onClick={() => router.push("/auth/login")}
                className="w-full p-6 bg-white/5 border border-white/10 rounded-[2rem] text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all"
            >
                Retour à la connexion
            </button>
          </div>
        )}

        <div className="mt-auto pt-8 text-center opacity-30">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest italic">
                Pimpay Secure Recovery Mode
            </p>
        </div>
      </main>
    </div>
  );
}

// Composant pour le choix Email/SMS
function SelectionCard({ icon, title, description, selected, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center justify-between p-5 rounded-[2rem] border transition-all duration-300 ${selected ? 'bg-blue-600/10 border-blue-500 shadow-[0_0_15px_rgba(37,99,235,0.1)]' : 'bg-slate-900/40 border-white/5 opacity-60'}`}
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                    {icon}
                </div>
                <div className="text-left">
                    <p className="text-sm font-black uppercase tracking-tight">{title}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{description}</p>
                </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${selected ? 'border-blue-500' : 'border-slate-700'}`}>
                {selected && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />}
            </div>
        </button>
    );
}
