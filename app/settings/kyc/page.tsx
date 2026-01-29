"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ShieldCheck, Camera, FileText,
  User, CheckCircle2, AlertCircle, Loader2,
  Upload, Smartphone, Info, ChevronDown, Calendar, MapPin, Hash
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SideMenu from "@/components/SideMenu";

export default function KYCPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docType, setDocType] = useState("id_card");

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCompleteKYC = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Dossier PimPay envoyé pour analyse !");
      router.push("/dashboard");
    }, 2000);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      {/* HEADER */}
      <header className="px-6 pt-10 pb-6 flex items-center gap-4 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <button onClick={() => router.back()} className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">Vérification</h1>
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[2px] mt-1">Niveau 2 : Full Access</p>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* PROGRESS BAR */}
        <div className="space-y-3">
          <div className="flex justify-between items-end px-1">
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Étape {step}/4</span>
            <span className="text-[10px] font-bold text-blue-400 uppercase italic">
              {step === 1 ? "Identité Civile" : step === 2 ? "Contact & Adresse" : step === 3 ? "Infos Document" : "Preuve Visuelle"}
            </span>
          </div>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step / 4) * 100}%` }} />
          </div>
        </div>

        <div className="bg-slate-900/30 border border-white/5 rounded-[1.8rem] p-6">
          
          {/* STEP 1: IDENTITÉ CIVILE */}
          {step === 1 && (
            <div className="space-y-4">
              <SectionTitle icon={<User size={18}/>} title="État Civil" />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Prénom" placeholder="Ex: Jean" />
                <InputField label="Nom" placeholder="Ex: Kabila" />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Genre</label>
                <select className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white appearance-none">
                  <option>Masculin</option>
                  <option>Féminin</option>
                  <option>Autre</option>
                </select>
              </div>
              <InputField label="Nationalité" placeholder="Ex: Congolaise (RDC)" />
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Date de naissance</label>
                <div className="relative">
                  <input type="date" className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white appearance-none" />
                  <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: CONTACT & ADRESSE */}
          {step === 2 && (
            <div className="space-y-4">
              <SectionTitle icon={<MapPin size={18}/>} title="Localisation" />
              <InputField label="Numéro de Téléphone" placeholder="+243 ..." type="tel" />
              <InputField label="Adresse Résidentielle" placeholder="N°, Avenue, Quartier..." />
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Ville" placeholder="Ex: Kinshasa" />
                <InputField label="Province / État" placeholder="Ex: Gombe" />
              </div>
              <InputField label="Pays" placeholder="République Démocratique du Congo" />
            </div>
          )}

          {/* STEP 3: INFOS CARTE */}
          {step === 3 && (
            <div className="space-y-4">
              <SectionTitle icon={<Hash size={18}/>} title="Détails du Document" />
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Type de document</label>
                <select 
                  value={docType} onChange={(e) => setDocType(e.target.value)}
                  className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white appearance-none uppercase"
                >
                  <option value="id_card">Carte d'identité Nationale</option>
                  <option value="passport">Passeport</option>
                  <option value="voter_card">Carte d'Électeur</option>
                </select>
              </div>
              <InputField label="Numéro de la Carte" placeholder="Saisir le numéro officiel" />
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Date d'expiration</label>
                <div className="relative">
                  <input type="date" className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white appearance-none" />
                  <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: VISUELS */}
          {step === 4 && (
            <div className="space-y-6">
              <SectionTitle icon={<Camera size={18}/>} title="Preuves Photos" />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-500 uppercase text-center">Recto</p>
                   <div className="aspect-square bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                     <Upload size={20} className="text-blue-500" />
                     <span className="text-[9px] font-black uppercase text-slate-500">Upload</span>
                   </div>
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-black text-slate-500 uppercase text-center">Verso</p>
                   <div className="aspect-square bg-white/5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
                     <Upload size={20} className="text-blue-500" />
                     <span className="text-[9px] font-black uppercase text-slate-500">Upload</span>
                   </div>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase text-center tracking-[2px]">Selfie de vérification</p>
                <div className="w-32 h-32 mx-auto rounded-full border-2 border-blue-600/30 bg-blue-600/5 flex items-center justify-center">
                   <Camera size={32} className="text-blue-500" />
                </div>
              </div>
            </div>
          )}

          {/* NAVIGATION */}
          <div className="flex gap-3 mt-10">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 h-14 bg-white/5 border border-white/10 rounded-2xl text-[11px] font-black uppercase tracking-widest">
                Retour
              </button>
            )}
            <button 
              onClick={() => step < 4 ? setStep(step + 1) : handleCompleteKYC()}
              disabled={isSubmitting}
              className="flex-[2] h-14 bg-blue-600 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (step === 4 ? "Soumettre" : "Suivant")}
            </button>
          </div>
        </div>

        <div className="p-5 rounded-[1.8rem] bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
          <ShieldCheck size={20} className="text-blue-500 mt-1" />
          <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic uppercase tracking-tight">
            Les données sont sécurisées par le cryptage AES-256 de PimPay.
          </p>
        </div>
      </main>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: any, title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <span className="text-blue-500">{icon}</span>
      <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">{title}</h4>
    </div>
  );
}

function InputField({ label, placeholder, type = "text" }: { label: string, placeholder: string, type?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
      <input 
        type={type} placeholder={placeholder} 
        className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white placeholder:text-slate-800"
      />
    </div>
  );
}
