"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, UploadCloud, UserCheck, Clock, XCircle, 
  CheckCircle2, Camera, ShieldCheck, FileText, MapPin 
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import useUser from "@/hooks/useUser";

type KycStatus = "not_started" | "pending" | "approved" | "rejected";

export default function KycPage() {
  const router = useRouter();
  const user = useUser();
  const [status, setStatus] = useState<KycStatus>("not_started");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Infos, 2: Documents

  const [formData, setFormData] = useState({
    fullName: "",
    firstName: "",
    address: "",
    dob: "",
    country: "",
    city: "",
    phone: "",
    email: "",
    // Nouveaux champs FinTech
    idType: "PASSPORT", // PASSPORT, NATIONAL_ID, DRIVING_LICENSE
    idNumber: "",
    nationality: "",
    sourceOfFunds: "SALARY", // SALARY, BUSINESS, INVESTMENTS, CRYPTO
  });

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    front: null,
    back: null,
    selfie: null,
  });

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || "",
        firstName: user.firstName || "",
        phone: user.phone || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (e.target.files?.[0]) {
      setFiles(prev => ({ ...prev, [key]: e.target.files![0] }));
    }
  };

  const submitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simuler API
    await new Promise((r) => setTimeout(r, 2500));
    setStatus("pending");
    setLoading(false);
    toast.success("Documents soumis pour analyse protocolée.");
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-20 font-sans">
      {/* GLOW DECORATION */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-blue-600/10 blur-[120px] pointer-events-none" />

      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-xl transition-all">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">Vérification KYC</h1>
            <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest">Protocol Level 3 Security</p>
          </div>
        </div>
        {status !== "not_started" && (
            <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                status === "pending" ? "bg-yellow-500/10 text-yellow-500 border border-yellow-500/20" :
                status === "approved" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                "bg-red-500/10 text-red-500 border border-red-500/20"
            }`}>
                {status}
            </div>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 pt-8">
        {/* STATUS MESSAGES */}
        <AnimatePresence>
          {status === "pending" && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-slate-900/50 border border-blue-500/20 p-8 rounded-[2.5rem] text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto">
                <Clock className="text-blue-500 animate-pulse" size={32} />
              </div>
              <h2 className="text-xl font-bold uppercase italic">Analyse en cours</h2>
              <p className="text-slate-400 text-sm leading-relaxed">Nos systèmes analysent vos documents. <br/>Délai estimé : 2 à 12 heures.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FORMULAIRE */}
        {status === "not_started" && (
          <form onSubmit={submitKyc} className="space-y-8">
            
            {/* PROGRESS STEPS */}
            <div className="flex items-center gap-4 mb-8">
                <div className={`flex-1 h-1 rounded-full transition-all ${step >= 1 ? 'bg-blue-600' : 'bg-slate-800'}`} />
                <div className={`flex-1 h-1 rounded-full transition-all ${step >= 2 ? 'bg-blue-600' : 'bg-slate-800'}`} />
            </div>

            {step === 1 ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <FileText className="text-blue-500" size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Informations Personnelles</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <KycInput label="Nom complet" value={formData.fullName} onChange={(v) => setFormData({...formData, fullName: v})} />
                  <KycInput label="Nationalité" value={formData.nationality} placeholder="Ex: Congolaise" onChange={(v) => setFormData({...formData, nationality: v})} />
                  <KycInput label="Date de Naissance" type="date" value={formData.dob} onChange={(v) => setFormData({...formData, dob: v})} />
                  <KycInput label="Source des fonds" type="select" options={["SALARY", "BUSINESS", "INVESTMENTS", "CRYPTO"]} value={formData.sourceOfFunds} onChange={(v) => setFormData({...formData, sourceOfFunds: v})} />
                </div>

                <div className="flex items-center gap-2 mt-8 mb-2">
                    <MapPin className="text-blue-500" size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Résidence</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <KycInput label="Pays" value={formData.country} onChange={(v) => setFormData({...formData, country: v})} />
                  <KycInput label="Ville" value={formData.city} onChange={(v) => setFormData({...formData, city: v})} />
                  <div className="md:col-span-2">
                    <KycInput label="Adresse résidentielle" value={formData.address} onChange={(v) => setFormData({...formData, address: v})} />
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={() => setStep(2)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-blue-600/20"
                >
                  Étape Suivante
                </button>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                 <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="text-blue-500" size={18} />
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Documents d'Identité</h3>
                </div>

                <KycInput label="Type de Document" type="select" options={["PASSPORT", "NATIONAL_ID", "DRIVING_LICENSE"]} value={formData.idType} onChange={(v) => setFormData({...formData, idType: v})} />
                <KycInput label="Numéro du document" value={formData.idNumber} onChange={(v) => setFormData({...formData, idNumber: v})} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    <FileUpload label="Recto du document" id="front" file={files.front} onChange={(e) => handleFileChange(e, 'front')} />
                    <FileUpload label="Verso du document" id="back" file={files.back} onChange={(e) => handleFileChange(e, 'back')} />
                    <div className="md:col-span-2">
                        <FileUpload label="Selfie avec document" id="selfie" file={files.selfie} isSelfie onChange={(e) => handleFileChange(e, 'selfie')} />
                    </div>
                </div>

                <div className="flex gap-4">
                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-900 border border-white/10 text-white rounded-2xl font-bold uppercase text-[10px]">Retour</button>
                    <button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-600/20">
                        {loading ? "Chiffrement..." : "Soumettre au protocole"}
                    </button>
                </div>
              </motion.div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

/* --- COMPONENTS INTERNES --- */

function KycInput({ label, value, onChange, type = "text", placeholder, options }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">{label}</label>
      {type === "select" ? (
        <select 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 px-4 text-sm focus:border-blue-500 outline-none transition-all appearance-none text-white"
        >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || label}
          className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 px-4 text-sm focus:border-blue-500 outline-none transition-all placeholder:text-slate-700"
        />
      )}
    </div>
  );
}

function FileUpload({ label, id, file, onChange, isSelfie }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] uppercase font-bold text-slate-500 ml-1 tracking-widest">{label}</label>
      <label htmlFor={id} className="relative group cursor-pointer block">
        <div className={`w-full aspect-video rounded-[2rem] border-2 border-dashed border-white/5 bg-slate-900/30 group-hover:bg-blue-600/5 group-hover:border-blue-600/30 transition-all flex flex-col items-center justify-center overflow-hidden`}>
          {file ? (
            <img src={URL.createObjectURL(file)} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <>
              <div className="p-3 bg-slate-800 rounded-2xl mb-2 text-slate-400 group-hover:text-blue-500 transition-colors">
                {isSelfie ? <Camera size={20} /> : <UploadCloud size={20} />}
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Cliquez pour uploader</p>
            </>
          )}
        </div>
        <input id={id} type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
    </div>
  );
}
