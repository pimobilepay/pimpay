"use client";

import { useState, useEffect } from "react";
import { 
  ArrowLeft, ShieldCheck, Camera, FileText, 
  User, CheckCircle2, AlertCircle, Loader2,
  Upload, Smartphone, Globe, Info
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function KYCPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/user/profile");
        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        toast.error("Erreur de récupération des données");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUser();
  }, []);

  const handleCompleteKYC = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Documents envoyés pour vérification !");
      router.push("/settings");
    }, 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  const isVerified = user?.kycStatus === "VERIFIED";

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* HEADER */}
      <div className="px-6 pt-12 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="p-3 bg-white/5 border border-white/10 rounded-2xl"
          >
            <ArrowLeft size={22} />
          </button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tighter italic">Vérification KYC</h1>
            <p className="text-[11px] text-blue-500 font-bold uppercase tracking-[0.25em]">Identité & Conformité</p>
          </div>
        </div>
      </div>

      <main className="px-6 mt-8 space-y-6">
        
        {/* STATUT ACTUEL */}
        <div className={`p-6 rounded-[2.5rem] border ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
          <div className="flex items-center gap-4">
            <div className={`p-4 rounded-2xl ${isVerified ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
              {isVerified ? <ShieldCheck size={28} /> : <AlertCircle size={28} />}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-60">Statut actuel</p>
              <h3 className="text-xl font-black uppercase tracking-tight">
                {isVerified ? "Compte Vérifié" : "Action Requise"}
              </h3>
            </div>
          </div>
        </div>

        {/* PROGRESSION SI NON VÉRIFIÉ */}
        {!isVerified && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-end px-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Étape {step} sur 3</p>
                <p className="text-xs font-bold text-blue-500 uppercase italic">
                    {step === 1 ? "Informations Personnelles" : step === 2 ? "Document d'identité" : "Preuve de vie"}
                </p>
            </div>
            
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-blue-600 transition-all duration-500" 
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>

            {/* CONTENU DES ÉTAPES */}
            <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-6 backdrop-blur-sm">
                
                {step === 1 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User size={18} className="text-blue-500" />
                            <h4 className="text-sm font-black uppercase tracking-wider text-slate-300">Confirmez vos infos</h4>
                        </div>
                        <div className="space-y-3">
                            <InfoField label="Nom Complet" value={user?.name || "Non renseigné"} />
                            <InfoField label="Email" value={user?.email || "Non renseigné"} />
                            <InfoField label="ID Utilisateur" value={user?.id?.toUpperCase() || "..."} />
                            <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                                <p className="text-[10px] text-blue-400 font-bold uppercase leading-relaxed text-center">
                                    Ces informations doivent correspondre à votre pièce d'identité officielle.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 text-center py-4">
                        <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                            <FileText size={32} className="text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-black uppercase tracking-tight">Pièce d'Identité</h4>
                            <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed">
                                Téléchargez un scan clair de votre Passeport, Carte d'Électeur ou Permis de conduire.
                            </p>
                        </div>
                        <button className="w-full p-6 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center gap-3 hover:bg-white/5 transition-all">
                            <Upload className="text-slate-500" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Choisir un fichier</span>
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 text-center py-4">
                        <div className="w-20 h-20 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto border border-purple-500/20">
                            <Camera size={32} className="text-purple-500" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-lg font-black uppercase tracking-tight">Vérification Faciale</h4>
                            <p className="text-xs text-slate-500 font-medium px-4 leading-relaxed">
                                Nous devons confirmer que vous êtes bien le propriétaire de ce compte.
                            </p>
                        </div>
                        <div className="p-8 border border-white/5 bg-slate-800/30 rounded-3xl">
                            <Smartphone className="mx-auto mb-4 text-slate-600" size={40} />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prendre un selfie</p>
                        </div>
                    </div>
                )}

                {/* BOUTONS NAVIGATION */}
                <div className="flex gap-3 mt-8">
                    {step > 1 && (
                        <button 
                            onClick={() => setStep(step - 1)}
                            className="flex-1 p-5 bg-white/5 border border-white/10 rounded-2xl text-[13px] font-black uppercase tracking-widest"
                        >
                            Retour
                        </button>
                    )}
                    <button 
                        onClick={() => step < 3 ? setStep(step + 1) : handleCompleteKYC()}
                        disabled={isSubmitting}
                        className="flex-[2] p-5 bg-blue-600 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (step === 3 ? "Soumettre" : "Suivant")}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* SI DÉJÀ VÉRIFIÉ */}
        {isVerified && (
            <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-1000">
                 <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8 text-center space-y-4">
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 size={48} className="text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-xl font-black uppercase tracking-tight text-white">Validation Confirmée</h4>
                        <p className="text-xs text-slate-500 font-medium mt-2 px-6">
                            Votre identité a été vérifiée avec succès. Vous avez désormais accès à toutes les fonctionnalités de Pimpay.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Limite Envoi</p>
                            <p className="text-sm font-black text-white">$10,000</p>
                        </div>
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                            <p className="text-[9px] font-black text-slate-500 uppercase mb-1">Limite Retrait</p>
                            <p className="text-sm font-black text-white">Illimité</p>
                        </div>
                    </div>
                 </div>
            </div>
        )}

        {/* FOOTER INFO */}
        <div className="flex items-start gap-3 p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                Le protocole Pimpay traite vos données conformément au RGPD. Vos documents sont chiffrés et ne sont jamais partagés avec des tiers.
            </p>
        </div>
      </main>

      <div className="mt-8 text-center opacity-30">
        <p className="text-[10px] font-black uppercase tracking-[0.4em]">Secure Ledger System v2.4</p>
      </div>
    </div>
  );
}

function InfoField({ label, value }: { label: string, value: string }) {
    return (
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-sm font-bold text-white tracking-tight">{value}</p>
        </div>
    );
}
