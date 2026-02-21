"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ArrowLeft, Camera, User, Mail, Phone, Lock,
  Check, Loader2, Home, Wallet, ArrowDownToLine,
  Smartphone, ArrowUpFromLine, Send, Menu, Globe, MapPin,
  Calendar, Fingerprint, Landmark, Briefcase, CreditCard,
  Shield, BadgeCheck, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

// --- BOTTOM NAV ---
function BottomNav() {
  const pathname = usePathname();
  const navItems = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/wallet", icon: Wallet, label: "Portefeuille" },
    { href: "/deposit", icon: ArrowDownToLine, label: "Depot" },
    { href: "/mpay", icon: Smartphone, label: "MPay", special: true },
    { href: "/withdraw", icon: ArrowUpFromLine, label: "Retrait" },
    { href: "/transfer", icon: Send, label: "Envoi" },
    { href: "#", icon: Menu, label: "Menu" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 h-20 flex justify-around items-center px-1">
      {navItems.map((item, idx) => (
        <Link key={idx} href={item.href} className="flex flex-col items-center">
          <item.icon size={20} className={pathname === item.href ? "text-blue-500" : "text-slate-500"} />
          <span className={`text-[9px] uppercase font-bold mt-1 ${pathname === item.href ? "text-blue-500" : "text-slate-500"}`}>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}

// --- SELECT FIELD ---
function SelectField({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all relative">
      <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
        <Icon size={12} /> {label}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent outline-none font-bold text-sm text-white appearance-none cursor-pointer pr-6"
        >
          {placeholder && <option value="" className="bg-slate-900 text-slate-400">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900 text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
      </div>
    </div>
  );
}

// --- INPUT FIELD ---
function InputField({
  label,
  icon: Icon,
  value,
  onChange,
  type = "text",
  placeholder,
  readOnly = false,
  mono = false,
  colSpan = false,
}: {
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  readOnly?: boolean;
  mono?: boolean;
  colSpan?: boolean;
}) {
  return (
    <div className={`p-4 bg-slate-900/40 border border-white/5 rounded-2xl focus-within:border-blue-500/50 transition-all ${readOnly ? "opacity-60" : ""} ${colSpan ? "col-span-2" : ""}`}>
      <label className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 mb-2">
        {Icon && <Icon size={12} />} {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-transparent outline-none font-bold text-sm ${mono ? "font-mono text-[11px] text-amber-500" : "text-white"} ${readOnly ? "cursor-not-allowed" : ""} ${type === "date" ? "[color-scheme:dark] text-slate-300" : ""}`}
        placeholder={placeholder}
        readOnly={readOnly}
      />
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    firstName: "",
    lastName: "",
    username: "",
    email: "",
    phone: "",
    birthDate: "",
    nationality: "",
    gender: "",
    country: "",
    city: "",
    address: "",
    postalCode: "",
    occupation: "",
    sourceOfFunds: "",
    idType: "",
    idNumber: "",
    walletAddress: "",
    avatar: "",
  });

  useEffect(() => {
    setMounted(true);
    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        if (res.ok && data.user) {
          setFormData({
            id: data.user.id || "",
            firstName: data.user.firstName || "",
            lastName: data.user.lastName || "",
            username: data.user.username || "",
            email: data.user.email || "",
            phone: data.user.phone || "",
            birthDate: data.user.birthDate ? data.user.birthDate.split('T')[0] : "",
            nationality: data.user.nationality || "",
            gender: data.user.gender || "",
            country: data.user.country || "",
            city: data.user.city || "",
            address: data.user.address || "",
            postalCode: data.user.postalCode || "",
            occupation: data.user.occupation || "",
            sourceOfFunds: data.user.sourceOfFunds || "",
            idType: data.user.idType || "",
            idNumber: data.user.idNumber || "",
            walletAddress: data.user.walletAddress || "",
            avatar: data.user.avatar || "",
          });
        }
      } catch {
        toast.error("Erreur de chargement du profil");
      } finally {
        setFetching(false);
      }
    };
    fetchUserData();
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append("avatar", file);
    uploadData.append("userId", formData.id);

    try {
      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: uploadData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du telechargement");

      setFormData(prev => ({ ...prev, avatar: data.avatar }));
      toast.success("Photo de profil mise a jour !");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Erreur lors de la mise a jour");
      toast.success("Profil mis a jour avec succes !");
      router.push("/profile");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateField = (key: string) => (value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  if (!mounted || fetching) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* EN-TETE */}
      <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 bg-[#020617]/80 backdrop-blur-md z-50">
        <button onClick={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center border border-white/10 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black italic uppercase tracking-tighter">Modifier le Profil</h1>
        <div className="w-10" />
      </header>

      <main className="px-6">
        {/* PHOTO DE PROFIL */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-900 flex items-center justify-center text-4xl font-black italic border-4 border-slate-900 shadow-2xl uppercase overflow-hidden">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Photo de profil" className="w-full h-full object-cover" />
              ) : (
                formData.username?.[0] || "P"
              )}
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={24} />
                </div>
              )}
            </div>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleAvatarChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center border-4 border-slate-900 shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={18} />
            </button>
          </div>
          <p className="text-[10px] text-blue-500 font-black uppercase mt-4 tracking-[3px]">Membre Verifie</p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* --- SECTION 1: IDENTITE PERSONNELLE --- */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <User size={12} /> Identite Personnelle
            </h3>

            <InputField label="Nom d'utilisateur (public)" icon={Fingerprint} value={formData.username} onChange={updateField("username")} placeholder="pionnier_123" />

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Prenom" value={formData.firstName} onChange={updateField("firstName")} placeholder="Jean" />
              <InputField label="Nom de famille" value={formData.lastName} onChange={updateField("lastName")} placeholder="Dupont" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Date de naissance" icon={Calendar} value={formData.birthDate} onChange={updateField("birthDate")} type="date" />
              <SelectField
                label="Genre"
                icon={User}
                value={formData.gender}
                onChange={updateField("gender")}
                placeholder="Selectionner..."
                options={[
                  { value: "M", label: "Masculin" },
                  { value: "F", label: "Feminin" },
                  { value: "OTHER", label: "Autre" },
                ]}
              />
            </div>

            <InputField label="Nationalite" icon={Globe} value={formData.nationality} onChange={updateField("nationality")} placeholder="Ex: Camerounais" />
          </section>

          {/* --- SECTION 2: COORDONNEES --- */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Mail size={12} /> Coordonnees
            </h3>

            <InputField label="Adresse e-mail" icon={Mail} value={formData.email} onChange={updateField("email")} type="email" placeholder="jean@exemple.com" />
            <InputField label="Numero de telephone" icon={Phone} value={formData.phone} onChange={updateField("phone")} type="tel" placeholder="+237 6XX XXX XXX" />
          </section>

          {/* --- SECTION 3: ADRESSE & LOCALISATION --- */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <MapPin size={12} /> Adresse et Localisation
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <InputField label="Pays" value={formData.country} onChange={updateField("country")} placeholder="Cameroun" />
              <InputField label="Ville" value={formData.city} onChange={updateField("city")} placeholder="Douala" />
            </div>
            <InputField label="Adresse de residence" icon={MapPin} value={formData.address} onChange={updateField("address")} placeholder="Rue, Quartier, Numero" colSpan />
            <InputField label="Code postal" value={formData.postalCode} onChange={updateField("postalCode")} placeholder="00000" />
          </section>

          {/* --- SECTION 4: INFORMATIONS FINANCIERES (FINTECH) --- */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Briefcase size={12} /> Informations Financieres
            </h3>

            <SelectField
              label="Profession / Activite"
              icon={Briefcase}
              value={formData.occupation}
              onChange={updateField("occupation")}
              placeholder="Selectionner votre activite..."
              options={[
                { value: "EMPLOYEE", label: "Employe(e)" },
                { value: "SELF_EMPLOYED", label: "Travailleur independant" },
                { value: "BUSINESS_OWNER", label: "Chef d'entreprise" },
                { value: "FREELANCE", label: "Freelance" },
                { value: "STUDENT", label: "Etudiant(e)" },
                { value: "RETIRED", label: "Retraite(e)" },
                { value: "UNEMPLOYED", label: "Sans emploi" },
                { value: "OTHER", label: "Autre" },
              ]}
            />

            <SelectField
              label="Source des fonds"
              icon={CreditCard}
              value={formData.sourceOfFunds}
              onChange={updateField("sourceOfFunds")}
              placeholder="D'ou proviennent vos fonds ?"
              options={[
                { value: "SALARY", label: "Salaire" },
                { value: "BUSINESS_INCOME", label: "Revenus d'entreprise" },
                { value: "INVESTMENTS", label: "Investissements" },
                { value: "SAVINGS", label: "Epargne" },
                { value: "CRYPTO_MINING", label: "Minage de cryptomonnaies" },
                { value: "FAMILY_SUPPORT", label: "Soutien familial" },
                { value: "OTHER", label: "Autre" },
              ]}
            />
          </section>

          {/* --- SECTION 5: PIECE D'IDENTITE --- */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Shield size={12} /> Piece d{"'"}Identite
            </h3>

            <SelectField
              label="Type de document"
              icon={BadgeCheck}
              value={formData.idType}
              onChange={updateField("idType")}
              placeholder="Selectionner le type..."
              options={[
                { value: "NATIONAL_ID", label: "Carte nationale d'identite" },
                { value: "PASSPORT", label: "Passeport" },
                { value: "DRIVERS_LICENSE", label: "Permis de conduire" },
                { value: "RESIDENCE_PERMIT", label: "Titre de sejour" },
              ]}
            />

            <InputField label="Numero du document" icon={Shield} value={formData.idNumber} onChange={updateField("idNumber")} placeholder="Ex: AB1234567" />
          </section>

          {/* --- SECTION 6: PORTEFEUILLE WEB3 --- */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
              <Wallet size={12} /> Portefeuille Web3
            </h3>

            <InputField label="Adresse Pi Wallet" icon={Landmark} value={formData.walletAddress} onChange={updateField("walletAddress")} placeholder="GD3A..." mono />
          </section>

          {/* --- ACTIONS --- */}
          <div className="pt-6 space-y-4">
            <Link href="/settings/security/change-password" className="flex items-center justify-between p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl group transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500"><Lock size={16} /></div>
                <span className="text-sm font-bold">Modifier le mot de passe</span>
              </div>
              <Check size={16} className="text-blue-500 opacity-50" />
            </Link>

            <button type="submit" disabled={loading} className="w-full bg-blue-600 h-16 rounded-[17px] font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
              {loading ? <Loader2 className="animate-spin" /> : "Enregistrer les modifications"}
            </button>
          </div>
        </form>
      </main>
      <BottomNav />
    </div>
  );
}
