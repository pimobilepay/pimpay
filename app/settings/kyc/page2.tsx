"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft, ShieldCheck, Camera, FileText,
  User, CheckCircle2, AlertCircle, Loader2,
  Upload, Smartphone, Info, ChevronDown, Calendar
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

  // Données simulées pour l'exemple
  const [user] = useState({
    name: "Alexandre Tremblay",
    email: "alex@pimpay.com",
    id: "PP-88291",
    kycStatus: "PENDING"
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCompleteKYC = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Documents envoyés au protocole PimPay !");
      router.push("/dashboard");
    }, 2000);
  };

  if (!mounted) return null;

  const isVerified = user?.kycStatus === "VERIFIED";

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
          <p className="text-[10px] font-bold text-blue-500 uppercase tracking-[2px] mt-1">Identité & KYC</p>
        </div>
      </header>

      <main className="px-6 space-y-6">
        {/* PROGRESS BAR */}
        {!isVerified && (
          <div className="space-y-3">
            <div className="flex justify-between items-end px-1">
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Étape {step}/3</span>
              <span className="text-[10px] font-bold text-blue-400 uppercase italic">
                {step === 1 ? "Infos Personnelles" : step === 2 ? "Pièce d'Identité" : "Preuve de vie"}
              </span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>
        )}

        {/* CONTENU DYNAMIQUE */}
        <div className="bg-slate-900/30 border border-white/5 rounded-[1.8rem] p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 mb-2">
                <User size={18} className="text-blue-500" />
                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-300">Vérification des informations</h4>
              </div>
              <InfoField label="Nom Complet" value={user.name} />
              <InfoField label="Email" value={user.email} />
              
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Date de naissance</label>
                <div className="relative">
                  <input type="date" className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white appearance-none" />
                  <Calendar size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* SÉLECTEUR TYPE DE DOCUMENT */}
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">Type de document</label>
                <div className="relative">
                  <select 
                    value={docType} 
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/10 px-5 text-sm font-black outline-none text-white appearance-none uppercase"
                  >
                    <option value="id_card">Carte d'identité Nationale</option>
                    <option value="passport">Passeport International</option>
                    <option value="voter_card">Carte d'Électeur</option>
                    <option value="driver_license">Permis de Conduire</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* RECTO */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">1. Face Avant (Recto)</p>
                <div className="relative aspect-[1.6/1] w-full bg-black/40 rounded-2xl border border-white/5 overflow-hidden group">
                  <img src="https://images.unsplash.com/photo-1621839673705-6837adae6301?auto=format&fit=crop&q=80&w=400" alt="Exemple Recto" className="w-full h-full object-cover opacity-20 grayscale" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Upload size={24} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white transition-colors">Scanner le Recto</span>
                  </div>
                </div>
              </div>

              {/* VERSO */}
              <div className="space-y-3">
                <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">2. Face Arrière (Verso)</p>
                <div className="relative aspect-[1.6/1] w-full bg-black/40 rounded-2xl border border-white/5 overflow-hidden group">
                  <img src="https://images.unsplash.com/photo-1554224155-1696413565d3?auto=format&fit=crop&q=80&w=400" alt="Exemple Verso" className="w-full h-full object-cover opacity-20 grayscale" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <Upload size={24} className="text-blue-500" />
                    <span className="text-[10px] font-black uppercase text-slate-400 group-hover:text-white transition-colors">Scanner le Verso</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 text-center py-4">
              <div className="w-20 h-20 bg-blue-600/10 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                <Camera size={32} className="text-blue-500" />
              </div>
              <div className="space-y-2">
                <h4 className="text-lg font-black uppercase italic tracking-tighter">Vérification Faciale</h4>
                <p className="text-[11px] text-slate-500 font-bold px-4 leading-relaxed uppercase tracking-tight">
                  Prenez un selfie en tenant votre pièce d'identité à côté de votre visage.
                </p>
              </div>
              <button className="w-full aspect-square max-w-[200px] mx-auto border-2 border-dashed border-white/10 rounded-[1.8rem] flex flex-col items-center justify-center gap-3 bg-white/5 active:scale-95 transition-all">
                <Smartphone size={32} className="text-slate-600" />
                <span className="text-[10px] font-black uppercase text-slate-500">Ouvrir Caméra</span>
              </button>
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
              onClick={() => step < 3 ? setStep(step + 1) : handleCompleteKYC()}
              disabled={isSubmitting}
              className="flex-[2] h-14 bg-blue-600 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (step === 3 ? "Soumettre" : "Suivant")}
            </button>
          </div>
        </div>

        {/* INFO PROTOCOLE */}
        <div className="p-5 rounded-[1.8rem] bg-blue-500/5 border border-blue-500/10 flex items-start gap-4">
          <ShieldCheck size={20} className="text-blue-500 mt-1" />
          <div>
            <p className="text-[11px] font-black text-blue-500 uppercase tracking-widest mb-1">Protection PimPay</p>
            <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
              Vos documents sont chiffrés par le protocole PimPay. Aucune donnée n'est stockée en clair sur nos serveurs.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoField({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
      <div className="w-full h-14 bg-slate-900/80 rounded-2xl border border-white/5 px-5 flex items-center text-sm font-black text-white/40">
        {value}
      </div>
    </div>
  );
}
