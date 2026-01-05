"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, UploadCloud, UserCheck, Clock, XCircle,
  CheckCircle2, Camera, ShieldCheck, FileText, MapPin, Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";

type KycStatusType = "NONE" | "PENDING" | "VERIFIED" | "REJECTED";

export default function KycPage() {
  const router = useRouter();
  const userData = useUser(); 
  const user = userData?.user;

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [mounted, setMounted] = useState(false);
  const [showError, setShowError] = useState(false);

  // 1. Correction Hydratation et Sécurité de chargement
  useEffect(() => {
    setMounted(true);
    
    // Si après 5 secondes on n'a toujours pas de userData, on affiche un message d'erreur
    const timer = setTimeout(() => {
      if (!userData) setShowError(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, [userData]);

  // 2. Remplissage des données quand le user est chargé
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || "",
        country: user.country || "",
        city: user.city || "",
        address: user.address || "",
      }));
    }
  }, [user]);

  const [formData, setFormData] = useState({
    fullName: "",
    nationality: "",
    dob: "",
    sourceOfFunds: "SALARY",
    country: "",
    city: "",
    address: "",
    idType: "PASSPORT",
    idNumber: "",
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    front: null,
    back: null,
    selfie: null,
  });

  // Empêche le rendu serveur pour éviter les erreurs de désynchronisation Node
  if (!mounted) return null;

  // GESTION DU LOADER BLOQUÉ
  if (!userData) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center">
        {!showError ? (
          <>
            <Loader2 className="text-blue-500 animate-spin mb-4" size={40} />
            <p className="text-slate-400 animate-pulse">Initialisation du protocole Pimpay...</p>
          </>
        ) : (
          <div className="space-y-4">
            <XCircle className="text-rose-500 mx-auto" size={48} />
            <p className="text-white font-bold">Session introuvable</p>
            <p className="text-slate-400 text-sm">Nous n'avons pas pu récupérer vos informations.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 rounded-xl text-xs font-bold uppercase"
            >
              Réessayer
            </button>
          </div>
        )}
      </div>
    );
  }

  const currentKycStatus = (user?.kycStatus as KycStatusType) || "NONE";

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Fichier trop volumineux (max 5MB)");
        return;
      }
      setFiles(prev => ({ ...prev, [key]: file }));
    }
  };

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!files.front || !files.selfie) {
      toast.error("Veuillez uploader les documents requis");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/user/kyc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData })
      });

      if (response.ok) {
        toast.success("Documents soumis avec succès");
        router.refresh(); 
      } else {
        toast.error("Erreur lors de la soumission");
      }
    } catch (err) {
      toast.error("Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 font-sans selection:bg-blue-500/30">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter italic">PimPay<span className="text-blue-500">.ID</span></h1>
            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-widest">Identity Protocol v2.0</p>
          </div>
        </div>

        {currentKycStatus !== "NONE" && (
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                currentKycStatus === "PENDING" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" :
                currentKycStatus === "VERIFIED" ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" :
                "bg-rose-500/10 text-rose-500 border-rose-500/20"
            }`}>
                {currentKycStatus}
            </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        <AnimatePresence mode="wait">
          {currentKycStatus === "PENDING" ? (
            <motion.div
              key="pending-screen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/40 border border-white/5 p-10 rounded-[3rem] text-center space-y-6 backdrop-blur-md"
            >
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto border border-blue-500/20">
                <Clock className="text-blue-500 animate-pulse" size={40} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-black uppercase italic">Vérification en cours</h2>
                <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
                  Votre dossier Pimpay est en file d'attente. <br/>
                  <span className="text-blue-500 font-bold">Délai estimé : 12h - 24h</span>
                </p>
              </div>
              <button onClick={() => router.push('/wallet')} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10">
                Retour au Tableau de bord
              </button>
            </motion.div>
          ) : (
            <form onSubmit={submitKyc} className="space-y-8">
              <div className="flex items-center gap-3 px-2">
                  <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? 'bg-blue-600 shadow-[0_0_10px_#2563eb]' : 'bg-slate-800'}`} />
                  <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? 'bg-blue-600 shadow-[0_0_10px_#2563eb]' : 'bg-slate-800'}`} />
              </div>

              {step === 1 ? (
                <motion.div key="step1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                  <SectionTitle icon={<FileText size={18}/>} title="Profil Civil" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <KycInput label="Nom complet" value={formData.fullName} onChange={(v: string) => setFormData({...formData, fullName: v})} />
                    <KycInput label="Nationalité" value={formData.nationality} placeholder="Ex: Congolaise" onChange={(v: string) => setFormData({...formData, nationality: v})} />
                    <KycInput label="Date de Naissance" type="date" value={formData.dob} onChange={(v: string) => setFormData({...formData, dob: v})} />
                    <KycInput label="Origine des fonds" type="select" options={["SALARY", "BUSINESS", "INVESTMENTS", "CRYPTO"]} value={formData.sourceOfFunds} onChange={(v: string) => setFormData({...formData, sourceOfFunds: v})} />
                  </div>

                  <SectionTitle icon={<MapPin size={18}/>} title="Localisation" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <KycInput label="Pays" value={formData.country} onChange={(v: string) => setFormData({...formData, country: v})} />
                    <KycInput label="Ville" value={formData.city} onChange={(v: string) => setFormData({...formData, city: v})} />
                    <div className="md:col-span-2">
                      <KycInput label="Adresse résidentielle" value={formData.address} onChange={(v: string) => setFormData({...formData, address: v})} />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-full py-5 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all shadow-xl shadow-blue-600/20"
                  >
                    Suivant : Documents
                  </button>
                </motion.div>
              ) : (
                <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                   <SectionTitle icon={<ShieldCheck size={18}/>} title="Certification Documentaire" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <KycInput label="Type de Document" type="select" options={["PASSPORT", "NATIONAL_ID", "DRIVING_LICENSE"]} value={formData.idType} onChange={(v: string) => setFormData({...formData, idType: v})} />
                    <KycInput label="Numéro ID" value={formData.idNumber} onChange={(v: string) => setFormData({...formData, idNumber: v})} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-2">
                      <FileUpload label="Recto (ID)" id="front" file={files.front} onChange={(e: any) => handleFileChange(e, 'front')} />
                      <FileUpload label="Verso (ID)" id="back" file={files.back} onChange={(e: any) => handleFileChange(e, 'back')} />
                      <div className="md:col-span-2">
                          <FileUpload label="Selfie avec document tenu en main" id="selfie" file={files.selfie} isSelfie onChange={(e: any) => handleFileChange(e, 'selfie')} />
                      </div>
                  </div>

                  <div className="flex gap-4">
                      <button type="button" onClick={() => setStep(1)} className="flex-1 py-5 bg-slate-900 border border-white/10 rounded-2xl font-bold uppercase text-[10px] tracking-widest">Retour</button>
                      <button type="submit" disabled={loading} className="flex-[2] py-5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                          {loading ? <Loader2 className="animate-spin" size={16} /> : <UserCheck size={16} />}
                          {loading ? "Chiffrement..." : "Soumettre au protocole"}
                      </button>
                  </div>
                </motion.div>
              )}
            </form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// -- SOUS COMPOSANTS --
function SectionTitle({ icon, title }: any) {
  return (
    <div className="flex items-center gap-3 border-l-2 border-blue-600 pl-4 py-1">
      <span className="text-blue-500">{icon}</span>
      <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
    </div>
  );
}

function KycInput({ label, value, onChange, type = "text", placeholder, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">{label}</label>
      {type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold focus:border-blue-500 outline-none transition-all text-white appearance-none"
        >
          {options.map((opt: string) => <option key={opt} value={opt} className="bg-slate-900 text-white">{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-4 px-5 text-sm font-bold focus:border-blue-500 outline-none transition-all placeholder:text-slate-700 text-white"
        />
      )}
    </div>
  );
}

function FileUpload({ label, id, file, onChange, isSelfie }: any) {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div className="space-y-2">
      <label className="text-[9px] uppercase font-black text-slate-500 ml-1 tracking-widest">{label}</label>
      <label htmlFor={id} className="relative group cursor-pointer block">
        <div className="w-full aspect-[4/3] rounded-[2.5rem] border-2 border-dashed border-white/5 bg-slate-900/40 group-hover:bg-blue-600/5 group-hover:border-blue-500/30 transition-all flex flex-col items-center justify-center overflow-hidden">
          {preview ? (
            <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center p-4">
              <div className="p-4 bg-slate-800/50 rounded-2xl mb-3 text-slate-500 group-hover:text-blue-500 group-hover:scale-110 transition-all inline-block">
                {isSelfie ? <Camera size={24} /> : <UploadCloud size={24} />}
              </div>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tighter">Sélectionner un fichier</p>
            </div>
          )}
        </div>
        <input id={id} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}
