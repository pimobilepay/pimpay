"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, ShieldCheck, Camera, FileText,
  User, CheckCircle2, Loader2,
  Upload, Smartphone, ChevronDown, Calendar,
  MapPin, Hash, Globe, Fingerprint, X, CreditCard, ArrowRight
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
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    idType: "", idCountry: "", idNumber: "", idExpiryDate: "",
    firstName: "", lastName: "", birthDate: "", gender: "",
    nationality: "", phone: "", address: "", city: "",
    provinceState: "", kycFrontUrl: "", kycBackUrl: "", kycSelfieUrl: ""
  });

  useEffect(() => {
    setMounted(true);
    fetchUserSession();
  }, []);

  // LOGIQUE DE SESSION IDENTIQUE AU DASHBOARD (Correction du bug)
  async function fetchUserSession() {
    try {
      const res = await fetch("/api/user/profile", { cache: 'no-store' });
      if (res.ok) {
        const userData = await res.json();
        setUserId(userData.id);
      } else if (res.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("Session Error:", err);
    } finally {
      setIsLoadingSession(false);
    }
  }

  const updateField = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const countryList = countries.map(c => ({
    name: c.name.common,
    flag: c.flag
  })).sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    if (step === 5 && mounted && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
        .catch(() => toast.error("Caméra introuvable"));
    }
  }, [step, mounted]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (!userId) {
        toast.error("Session expirée, reconnectez-vous");
        return;
    }
    if (!file) return;

    const toastId = toast.loading("Upload du document...");
    const data = new FormData();
    data.append("file", file);
    data.append("userId", userId);
    data.append("type", field);

    try {
      const res = await fetch("/api/kyc/upload", { method: "POST", body: data });
      const result = await res.json();
      if (result.url) {
        updateField(field, result.url);
        toast.success("Image validée", { id: toastId });
      }
    } catch (error) { toast.error("Erreur d'envoi", { id: toastId }); }
  };

  const finishKYC = async () => {
    if (!userId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, userId: userId })
      });
      if (res.ok) {
        toast.success("Dossier PimPay en cours de révision !");
        router.push("/dashboard");
      }
    } catch (e) { toast.error("Erreur de soumission"); }
    finally { setIsSubmitting(false); }
  };

  // On attend que la session soit vérifiée pour éviter le bug useSession
  if (!mounted || isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">PIMPAY Sync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 font-sans overflow-x-hidden">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <header className="px-6 pt-10 pb-4 sticky top-0 bg-[#020617]/90 backdrop-blur-md z-30 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                <ShieldCheck size={20} className="text-white" />
             </div>
             <h1 className="text-lg font-black uppercase italic">KYC<span className="text-blue-500">PORT</span></h1>
          </div>
          <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-full"><X size={20} /></button>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-[8px] font-black text-blue-500 uppercase tracking-widest">
            <span>Étape {step} / 5</span>
            <span>{Math.round((step/5)*100)}%</span>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${(step/5)*100}%` }} />
          </div>
        </div>
      </header>

      <main className="px-6 space-y-8 mt-6">
        <h2 className="text-xl font-black italic uppercase text-blue-500 tracking-tighter">
          {step === 1 && "Type de Document"}
          {step === 2 && "Informations Civiles"}
          {step === 3 && "Livraison & Adresse"}
          {step === 4 && "Preuves Photos"}
          {step === 5 && "Vérification Faciale"}
        </h2>

        <div className="space-y-6">
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in">
              <CustomSelect label="Type de document" icon={<CreditCard size={18}/>} options={["Carte d'identité", "Passeport", "Carte d'Électeur"]} value={formData.idType} onChange={(v) => updateField("idType", v)} />
              <CustomSelect label="Pays du document" icon={<Globe size={18}/>} options={countryList.map(c => `${c.flag} ${c.name}`)} value={formData.idCountry} onChange={(v) => updateField("idCountry", v)} />
              <InputField icon={<Fingerprint size={18}/>} label="Numéro du document" placeholder="N° du titre" value={formData.idNumber} onChange={(v) => updateField("idNumber", v)} />
              <InputField icon={<Calendar size={18}/>} label="Date d'expiration" type="date" value={formData.idExpiryDate} onChange={(v) => updateField("idExpiryDate", v)} />
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid grid-cols-2 gap-4">
                <InputField icon={<User size={18}/>} label="Prénom" value={formData.firstName} onChange={(v) => updateField("firstName", v)} />
                <InputField icon={<User size={18}/>} label="Nom" value={formData.lastName} onChange={(v) => updateField("lastName", v)} />
              </div>
              <InputField icon={<Calendar size={18}/>} label="Date de naissance" type="date" value={formData.birthDate} onChange={(v) => updateField("birthDate", v)} />
              <CustomSelect label="Genre" icon={<User size={18}/>} options={["Masculin", "Féminin"]} value={formData.gender} onChange={(v) => updateField("gender", v)} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 animate-in fade-in">
              <InputField icon={<Smartphone size={18}/>} label="Téléphone" type="tel" value={formData.phone} onChange={(v) => updateField("phone", v)} />
              <InputField icon={<MapPin size={18}/>} label="Adresse" value={formData.address} onChange={(v) => updateField("address", v)} />
              <div className="grid grid-cols-2 gap-4">
                <InputField icon={<Hash size={18}/>} label="Ville" value={formData.city} onChange={(v) => updateField("city", v)} />
                <InputField icon={<Hash size={18}/>} label="Province" value={formData.provinceState} onChange={(v) => updateField("provinceState", v)} />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-10 animate-in fade-in">
              <div className="space-y-4 text-center">
                <p className="text-[10px] font-black uppercase text-blue-500 italic">Modèle Recto</p>
                <div className="w-full max-w-[280px] mx-auto aspect-[1.6/1] bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <img src="/sample_recto.png" alt="Recto" className="w-full h-full object-contain opacity-80" />
                </div>
                <label className={`flex items-center justify-center gap-3 h-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${formData.kycFrontUrl ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-blue-600/5 border-blue-600/30 text-blue-500'}`}>
                   <Upload size={20} />
                   <span className="text-[10px] font-black uppercase">{formData.kycFrontUrl ? "Recto Chargé" : "Uploader Recto"}</span>
                   <input type="file" className="hidden" onChange={(e) => handleUpload(e, "kycFrontUrl")} />
                </label>
              </div>

              <div className="space-y-4 text-center">
                <p className="text-[10px] font-black uppercase text-blue-500 italic">Modèle Verso</p>
                <div className="w-full max-w-[280px] mx-auto aspect-[1.6/1] bg-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                    <img src="/sample_verso.png" alt="Verso" className="w-full h-full object-contain opacity-80" />
                </div>
                <label className={`flex items-center justify-center gap-3 h-16 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${formData.kycBackUrl ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' : 'bg-blue-600/5 border-blue-600/30 text-blue-500'}`}>
                   <Upload size={20} />
                   <span className="text-[10px] font-black uppercase">{formData.kycBackUrl ? "Verso Chargé" : "Uploader Verso"}</span>
                   <input type="file" className="hidden" onChange={(e) => handleUpload(e, "kycBackUrl")} />
                </label>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="fixed inset-0 z-50 bg-[#020617] flex flex-col items-center justify-center p-6 animate-in fade-in">
              <div className="relative w-64 h-64">
                <div className="absolute inset-0 rounded-full border-4 border-blue-600/20" />
                <div className="absolute inset-2 rounded-full overflow-hidden bg-slate-900 border border-white/10">
                   <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
              </div>
              <div className="mt-8 text-center space-y-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter">Scan Facial</h3>
                <div className="flex gap-4">
                   <button onClick={() => setStep(4)} className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase">Retour</button>
                   <button onClick={finishKYC} className="px-8 py-3 bg-blue-600 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-blue-600/30">
                      {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : "Confirmer"}
                   </button>
                </div>
              </div>
            </div>
          )}

          {step < 5 && (
            <div className="pt-10 flex gap-4">
              {step > 1 && (
                <button onClick={() => setStep(step - 1)} className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center border border-white/10 active:scale-95 transition-all"><ArrowLeft size={24} /></button>
              )}
              <button 
                onClick={() => {
                   if (step === 4 && (!formData.kycFrontUrl || !formData.kycBackUrl)) {
                     toast.error("Veuillez envoyer les deux faces");
                     return;
                   }
                   setStep(step + 1);
                }} 
                className="flex-1 h-16 bg-blue-600 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all"
              >
                Suivant <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// COMPOSANTS INPUT ORIGINAUX
function InputField({ label, placeholder, icon, type = "text", value, onChange }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600">{icon}</div>
        <input 
          type={type} value={value} onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder} 
          className="w-full h-14 bg-white/5 rounded-2xl border border-white/5 pl-14 pr-5 text-sm font-bold text-white outline-none focus:border-blue-500/50 transition-all" 
        />
      </div>
    </div>
  );
}

function CustomSelect({ label, icon, options, value, onChange }: any) {
  return (
    <div className="space-y-1.5 text-left">
      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <div className="relative">
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-blue-500/50">{icon}</div>
        <select 
          value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full h-14 bg-white/5 rounded-2xl border border-white/5 pl-14 pr-12 text-sm font-bold outline-none appearance-none text-slate-200"
        >
          <option value="" disabled>Choisir...</option>
          {options.map((opt: string, i: number) => (<option key={i} value={opt} className="bg-[#020617]">{opt}</option>))}
        </select>
        <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none" />
      </div>
    </div>
  );
}
