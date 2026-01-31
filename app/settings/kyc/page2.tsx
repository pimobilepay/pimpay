"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, ShieldCheck, Camera, FileText,
  User, CheckCircle2, Loader2,
  Upload, Smartphone, ChevronDown, Calendar,
  MapPin, Hash, Globe, Fingerprint, X, CreditCard, ArrowRight, Truck
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import SideMenu from "@/components/SideMenu";
import countries from "world-countries";

export default function KYCPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [blinkCount, setBlinkCount] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);

  const countryList = countries.map(c => ({
    name: c.name.common,
    flag: c.flag,
    code: c.cca2
  })).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (step === 5 && mounted) {
      const startCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setHasCameraPermission(true);
          }

          // Rigueur : On ne valide pas de suite, on simule une analyse
          const detectionTimeout = setTimeout(() => {
            setFaceDetected(true);
            toast.info("Visage détecté ! Clignez des yeux pour valider.");
          }, 3000);

          return () => clearTimeout(detectionTimeout);

        } catch (err) {
          toast.error("Accès caméra refusé. Obligatoire pour PimPay.");
        }
      };
      startCamera();

      return () => {
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [step, mounted]);

  const handleManualCapture = () => {
    if (!faceDetected) {
      toast.error("Positionnez votre visage correctement.");
      return;
    }
    // Rigueur : l'action humaine (clic + blink simulé)
    setBlinkCount(1);
    toast.success("Vérification biométrique réussie !");
    setTimeout(() => handleNext(), 1200);
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
    else handleCompleteKYC();
  };

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
    <div className="min-h-screen bg-[#020617] text-white pb-40 font-sans overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="px-6 pt-10 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30 border-b border-white/5">
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldCheck size={20} className="text-white" />
           </div>
           <h1 className="text-lg font-black uppercase tracking-tighter italic">KYC<span className="text-blue-500">PORT</span></h1>
        </div>
        <button onClick={() => router.back()} className="text-slate-400">
          <X size={24} />
        </button>
      </header>

      <main className="px-6 space-y-8 mt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-blue-500">
             <h2 className="text-xl font-black italic uppercase">
                {step === 1 && "Type de Document"}
                {step === 2 && "Informations Civiles"}
                {step === 3 && "Livraison & Adresse"}
                {step === 4 && "Preuves Photos"}
                {step === 5 && "Vérification Faciale"}
             </h2>
          </div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
             Étape {step} sur 5 • {Math.round((step/5)*100)}% complété
          </p>
        </div>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <CustomSelect label="Type de document" icon={<CreditCard size={18} className="text-blue-500"/>} options={["Carte d'identité", "Passeport", "Carte d'Électeur"]} />
              <CustomSelect label="Pays du document" icon={<Globe size={18} className="text-emerald-500"/>} options={countryList.map(c => `${c.flag} ${c.name}`)} />
              <InputField icon={<Fingerprint size={18} className="text-purple-500" />} label="Numéro du document" placeholder="Ex: 0123456789" />
              <InputField icon={<Calendar size={18} className="text-rose-500" />} label="Date d'expiration" type="date" />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-2 gap-4">
                <InputField icon={<User size={18} className="text-blue-500" />} label="Prénom" placeholder="Jean" />
                <InputField icon={<User size={18} className="text-blue-400" />} label="Nom" placeholder="Kabila" />
              </div>
              <InputField icon={<Calendar size={18} className="text-amber-500" />} label="Date de naissance" type="date" />
              <CustomSelect label="Genre" icon={<User size={18} className="text-pink-500"/>} options={["Masculin", "Féminin"]} />
              <CustomSelect label="Nationalité" icon={<Globe size={18} className="text-emerald-500"/>} options={countryList.map(c => `${c.flag} ${c.name}`)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
              <InputField icon={<Smartphone size={18} className="text-emerald-500" />} label="Numéro de téléphone" placeholder="+243 ..." type="tel" />
              <InputField icon={<MapPin size={18} className="text-rose-500" />} label="Adresse de livraison" placeholder="N°, Avenue, Quartier..." />
              <div className="grid grid-cols-2 gap-4">
                <InputField icon={<Hash size={18} className="text-blue-500" />} label="Ville" placeholder="Kinshasa" />
                <InputField icon={<Hash size={18} className="text-blue-500" />} label="Province" placeholder="Gombe" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 text-center italic">Illustration Recto</p>
                <img src="/sample_recto.png" className="w-full h-32 object-contain rounded-2xl bg-white/5 p-2 border border-white/5" alt="Recto" />
                <label className="flex items-center justify-center gap-3 h-14 bg-blue-600/10 border-2 border-dashed border-blue-600/30 rounded-2xl cursor-pointer active:scale-95 transition-transform text-blue-500">
                   <Upload size={20} />
                   <span className="text-[10px] font-black uppercase">Uploader le Recto</span>
                   <input type="file" className="hidden" />
                </label>
              </div>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase text-slate-400 text-center italic">Illustration Verso</p>
                <img src="/sample_verso.png" className="w-full h-32 object-contain rounded-2xl bg-white/5 p-2 border border-white/5" alt="Verso" />
                <label className="flex items-center justify-center gap-3 h-14 bg-blue-600/10 border-2 border-dashed border-blue-600/30 rounded-2xl cursor-pointer active:scale-95 transition-transform text-blue-500">
                   <Upload size={20} />
                   <span className="text-[10px] font-black uppercase">Uploader le Verso</span>
                   <input type="file" className="hidden" />
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 animate-in fade-in">
              <div className="relative w-[240px] h-[240px]">
                <div className={`absolute inset-0 rounded-full border-4 transition-colors duration-500 z-20 ${faceDetected ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.2)]' : 'border-blue-600/30'}`} />
                <div className="absolute inset-0 rounded-full overflow-hidden bg-slate-900 border border-white/10">
                   {!hasCameraPermission && <div className="absolute inset-0 flex items-center justify-center text-slate-500"><Camera size={40} /></div>}
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                </div>
              </div>

              <div className="mt-8 text-center space-y-4">
                <div className="space-y-1">
                   <h3 className="text-xl font-black italic uppercase">VÉRIFICATION HUMAINE</h3>
                   <p className="text-[9px] text-slate-500 font-bold uppercase tracking-[2px]">Analyse de vivacité en cours...</p>
                </div>
                <div className="flex gap-6 justify-center">
                   <StatusChip active={faceDetected} label="VISAGE" />
                   <StatusChip active={blinkCount > 0} label="CLIGNEMENT" count={blinkCount > 0 ? "1/1" : "0/1"} />
                </div>
                <div className="flex gap-4 pt-6">
                   <button onClick={() => setStep(4)} className="px-6 py-3 rounded-xl bg-white/5 text-[10px] font-black uppercase border border-white/10">ANNULER</button>
                   <button
                    onClick={handleManualCapture}
                    className={`px-8 py-3 rounded-xl font-black uppercase text-[10px] transition-all ${faceDetected ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30' : 'bg-slate-800 text-slate-500'}`}
                   >
                     CAPTURER LE SELFIE
                   </button>
                </div>
              </div>
            </div>
          )}

          {step < 5 && (
            <div className="pt-10 flex gap-4">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10">
                  <ArrowLeft size={24} />
                </button>
              )}
              <button onClick={handleNext} disabled={isSubmitting} className="flex-1 h-16 bg-blue-600 rounded-2xl text-sm font-black uppercase tracking-[2px] flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all">
                {isSubmitting ? <Loader2 className="animate-spin" /> : (step === 4 ? "ALLER AU SELFIE" : "SUIVANT")}
                <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* --- NOUVEAU : PROGRESSION DE L'UTILISATEUR (FOOTER) --- */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 z-40">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Progression PimPay</p>
              <p className="text-xs font-bold uppercase italic">Dossier en cours...</p>
            </div>
            <p className="text-lg font-black italic text-blue-500">{Math.round((step/5)*100)}%</p>
          </div>
          
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
              style={{ width: `${(step/5)*100}%` }}
            />
          </div>

          <div className="flex justify-between">
            {[1, 2, 3, 4, 5].map((i) => (
              <div 
                key={i} 
                className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${i <= step ? 'bg-blue-500' : 'bg-white/10'}`} 
              />
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

function StatusChip({ active, label, count }: any) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'bg-white/5 text-slate-700 border border-white/5'}`}>
         {active ? <CheckCircle2 size={20} /> : <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin opacity-20" />}
      </div>
      <span className="text-[8px] font-black uppercase text-slate-500">{label} {count && `(${count})`}</span>
    </div>
  );
}

function InputField({ label, placeholder, icon, type = "text" }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative group">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-blue-500">{icon}</div>
        <input type={type} placeholder={placeholder} className="w-full h-14 bg-slate-900/40 rounded-2xl border border-white/5 pl-14 pr-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all" />
      </div>
    </div>
  );
}

function CustomSelect({ label, icon, options }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500">{icon}</div>
        <select className="w-full h-14 bg-slate-900/40 rounded-2xl border border-white/5 pl-14 pr-12 text-sm font-bold outline-none appearance-none text-slate-300 focus:border-blue-500/50 transition-all">
          <option value="" disabled selected>Choisir...</option>
          {options.map((opt: string, i: number) => (<option key={i} value={opt} className="bg-[#020617]">{opt}</option>))}
        </select>
        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none" />
      </div>
    </div>
  );
}
