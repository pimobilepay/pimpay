"use client";

import { useState, useEffect, useRef } from "react";
import {
  User, Mail, Shield, Bell, ChevronRight, LogOut, Camera, CheckCircle2,
  Wallet, Fingerprint, Globe, CreditCard, Calendar, MapPin, UserPen, Loader2,
  Phone, Briefcase, BadgeCheck, FileText, Building2, Hash, Lock, X, Check, ChevronDown
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  joinedAt: string;
  isVerified: boolean;
  kycStatus: string;
  country: string;
  city: string;
  address: string;
  postalCode: string;
  nationality: string;
  gender: string;
  birthDate?: string;
  occupation: string;
  sourceOfFunds: string;
  idType: string;
  idNumber: string;
  walletAddress: string;
  role: string;
  avatar?: string;
}

interface ProfileItem {
  label: string;
  icon: React.ReactNode;
  value?: string;
  path?: string;
  toggle?: boolean;
  active?: boolean;
  accent?: string;
  fieldKey?: string;
  editable?: boolean;
  inputType?: "text" | "email" | "tel" | "date" | "select";
  options?: { value: string; label: string }[];
  readOnly?: boolean;
}

interface ProfileSection {
  title: string;
  icon: React.ReactNode;
  items: ProfileItem[];
}

function formatGender(g: string) {
  if (g === "M") return "Masculin";
  if (g === "F") return "Feminin";
  if (g === "OTHER") return "Autre";
  return "Non renseigne";
}

function formatOccupation(o: string) {
  const map: Record<string, string> = {
    EMPLOYEE: "Employe(e)",
    SELF_EMPLOYED: "Travailleur independant",
    BUSINESS_OWNER: "Chef d'entreprise",
    FREELANCE: "Freelance",
    STUDENT: "Etudiant(e)",
    RETIRED: "Retraite(e)",
    UNEMPLOYED: "Sans emploi",
    OTHER: "Autre",
  };
  return map[o] || o || "Non renseigne";
}

function formatSourceOfFunds(s: string) {
  const map: Record<string, string> = {
    SALARY: "Salaire",
    BUSINESS_INCOME: "Revenus d'entreprise",
    INVESTMENTS: "Investissements",
    SAVINGS: "Epargne",
    CRYPTO_MINING: "Minage crypto",
    FAMILY_SUPPORT: "Soutien familial",
    OTHER: "Autre",
  };
  return map[s] || s || "Non renseigne";
}

function formatIdType(t: string) {
  const map: Record<string, string> = {
    NATIONAL_ID: "Carte nationale d'identite",
    PASSPORT: "Passeport",
    DRIVERS_LICENSE: "Permis de conduire",
    RESIDENCE_PERMIT: "Titre de sejour",
  };
  return map[t] || t || "Non renseigne";
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);

  // Options pour les champs select
  const genderOptions = [
    { value: "M", label: "Masculin" },
    { value: "F", label: "Feminin" },
    { value: "OTHER", label: "Autre" },
  ];

  const occupationOptions = [
    { value: "EMPLOYEE", label: "Employe(e)" },
    { value: "SELF_EMPLOYED", label: "Travailleur independant" },
    { value: "BUSINESS_OWNER", label: "Chef d'entreprise" },
    { value: "FREELANCE", label: "Freelance" },
    { value: "STUDENT", label: "Etudiant(e)" },
    { value: "RETIRED", label: "Retraite(e)" },
    { value: "UNEMPLOYED", label: "Sans emploi" },
    { value: "OTHER", label: "Autre" },
  ];

  const sourceOfFundsOptions = [
    { value: "SALARY", label: "Salaire" },
    { value: "BUSINESS_INCOME", label: "Revenus d'entreprise" },
    { value: "INVESTMENTS", label: "Investissements" },
    { value: "SAVINGS", label: "Epargne" },
    { value: "CRYPTO_MINING", label: "Minage crypto" },
    { value: "FAMILY_SUPPORT", label: "Soutien familial" },
    { value: "OTHER", label: "Autre" },
  ];

  const idTypeOptions = [
    { value: "NATIONAL_ID", label: "Carte nationale d'identite" },
    { value: "PASSPORT", label: "Passeport" },
    { value: "DRIVERS_LICENSE", label: "Permis de conduire" },
    { value: "RESIDENCE_PERMIT", label: "Titre de sejour" },
  ];

  const handleStartEdit = (fieldKey: string, currentValue: string, inputType?: string) => {
    setEditingField(fieldKey);
    setEditValue(currentValue || "");
    setTimeout(() => {
      if (inputType === "select") {
        selectRef.current?.focus();
      } else {
        inputRef.current?.focus();
      }
    }, 50);
  };

  const handleCancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const handleSaveEdit = async () => {
    if (!editingField || !user) return;

    setSaving(true);
    try {
      const updateData: Record<string, string> = {
        id: user.id,
        [editingField]: editValue,
      };

      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!res.ok) throw new Error("Erreur lors de la mise a jour");

      // Mettre a jour l'utilisateur local
      setUser((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, [editingField]: editValue };
        // Mettre a jour le nom complet si firstName ou lastName change
        if (editingField === "firstName" || editingField === "lastName") {
          updated.name = `${updated.firstName || ""} ${updated.lastName || ""}`.trim();
        }
        return updated;
      });

      toast.success("Information mise a jour !");
      setEditingField(null);
      setEditValue("");
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();

        if (res.ok && data.user) {
          const fullName =
            data.user.name ||
            (data.user.firstName && data.user.lastName
              ? `${data.user.firstName} ${data.user.lastName}`
              : data.user.username || "Pioneer");

          setUser({
            ...data.user,
            name: fullName,
            joinedAt: new Date(data.user.createdAt || Date.now()).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            }),
            isVerified: data.user.kycStatus === "VERIFIED" || data.user.kycStatus === "APPROVED",
          });
        } else {
          toast.error("Session expiree");
          router.push("/auth/login");
        }
      } catch {
        toast.error("Erreur de synchronisation reseau");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const profileSections: ProfileSection[] = [
    {
      title: "Identite Personnelle",
      icon: <User size={12} />,
      items: [
        { label: "Nom d'utilisateur", icon: <Fingerprint size={18} />, value: user?.username ? `@${user.username}` : "Non renseigne", fieldKey: "username", editable: true, inputType: "text" },
        { label: "Prenom", icon: <User size={18} />, value: user?.firstName || "Non renseigne", fieldKey: "firstName", editable: true, inputType: "text" },
        { label: "Nom de famille", icon: <User size={18} />, value: user?.lastName || "Non renseigne", fieldKey: "lastName", editable: true, inputType: "text" },
        { label: "Genre", icon: <User size={18} />, value: formatGender(user?.gender || ""), fieldKey: "gender", editable: true, inputType: "select", options: genderOptions },
        { label: "Date de naissance", icon: <Calendar size={18} />, value: user?.birthDate ? new Date(user.birthDate).toLocaleDateString("fr-FR") : "Non renseignee", fieldKey: "birthDate", editable: true, inputType: "date" },
        { label: "Nationalite", icon: <Globe size={18} />, value: user?.nationality || "Non renseignee", fieldKey: "nationality", editable: true, inputType: "text" },
      ],
    },
    {
      title: "Coordonnees",
      icon: <Mail size={12} />,
      items: [
        { label: "Adresse e-mail", icon: <Mail size={18} />, value: user?.email || "Non renseigne", fieldKey: "email", editable: true, inputType: "email" },
        { label: "Telephone", icon: <Phone size={18} />, value: user?.phone || "Non renseigne", fieldKey: "phone", editable: true, inputType: "tel" },
      ],
    },
    {
      title: "Adresse et Localisation",
      icon: <MapPin size={12} />,
      items: [
        { label: "Pays", icon: <Globe size={18} />, value: user?.country || "Non renseigne", fieldKey: "country", editable: true, inputType: "text" },
        { label: "Ville", icon: <Building2 size={18} />, value: user?.city || "Non renseignee", fieldKey: "city", editable: true, inputType: "text" },
        { label: "Adresse de residence", icon: <MapPin size={18} />, value: user?.address || "Non renseignee", fieldKey: "address", editable: true, inputType: "text" },
        { label: "Code postal", icon: <Hash size={18} />, value: user?.postalCode || "Non renseigne", fieldKey: "postalCode", editable: true, inputType: "text" },
      ],
    },
    {
      title: "Informations Financieres",
      icon: <Briefcase size={12} />,
      items: [
        { label: "Profession / Activite", icon: <Briefcase size={18} />, value: formatOccupation(user?.occupation || ""), fieldKey: "occupation", editable: true, inputType: "select", options: occupationOptions },
        { label: "Source des fonds", icon: <CreditCard size={18} />, value: formatSourceOfFunds(user?.sourceOfFunds || ""), accent: "text-amber-400", fieldKey: "sourceOfFunds", editable: true, inputType: "select", options: sourceOfFundsOptions },
      ],
    },
    {
      title: "Piece d'identite",
      icon: <FileText size={12} />,
      items: [
        { label: "Type de document", icon: <BadgeCheck size={18} />, value: formatIdType(user?.idType || ""), fieldKey: "idType", editable: true, inputType: "select", options: idTypeOptions },
        { label: "Numero du document", icon: <Shield size={18} />, value: user?.idNumber ? `${user.idNumber.substring(0, 3)}****${user.idNumber.slice(-2)}` : "Non renseigne", fieldKey: "idNumber", editable: true, inputType: "text" },
      ],
    },
    {
      title: "Securite et Web3",
      icon: <Wallet size={12} />,
      items: [
        { label: "Adresse Pi Wallet", icon: <Wallet size={18} />, value: user?.walletAddress ? `${user.walletAddress.substring(0, 8)}...${user.walletAddress.slice(-6)}` : "Non liee", fieldKey: "walletAddress", editable: true, inputType: "text" },
        { label: "Code PIN Transaction", icon: <Shield size={18} />, value: "Securise", active: true, path: "/profile/change-pin" },
        { label: "Authentification biometrique", icon: <Fingerprint size={18} />, toggle: true, path: "/settings/security/biometrics" },
      ],
    },
    {
      title: "Preferences",
      icon: <Bell size={12} />,
      items: [
        { label: "Notifications", icon: <Bell size={18} />, path: "/settings/notifications" },
        { label: "Securite du compte", icon: <Lock size={18} />, path: "/settings/security" },
        { label: "Devise d'affichage", icon: <CreditCard size={18} />, value: "USD ($)", readOnly: true },
      ],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="text-blue-500 animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* En-tete du profil */}
      <div className="relative pt-12 pb-8 px-6 bg-gradient-to-b from-blue-600/20 to-transparent">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 p-1 shadow-2xl">
              <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center text-3xl font-black italic overflow-hidden">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  user?.name?.[0]?.toUpperCase() || "P"
                )}
              </div>
            </div>
            <Link
              href="/profile/edit"
              className="absolute -bottom-1 -right-1 p-2 bg-blue-600 rounded-full border-4 border-[#020617] shadow-lg active:scale-90 transition-transform"
            >
              <Camera size={14} className="text-white" />
            </Link>
          </div>

          <h1 className="mt-4 text-2xl font-bold flex items-center gap-2 text-balance text-center">
            {user?.name}
            {user?.isVerified && (
              <CheckCircle2
                size={20}
                fill="#60a5fa"
                className="text-[#020617] bg-white rounded-full border-none shrink-0"
              />
            )}
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            {user?.role === "ADMIN" ? "Administrateur" : `Pioneer depuis ${user?.joinedAt}`}
          </p>

          <Link
            href="/profile/edit"
            className="mt-4 flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all active:scale-95"
          >
            <UserPen size={14} className="text-blue-400" />
            Modifier mes informations
          </Link>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-3 gap-3 px-6 mb-8">
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Statut KYC</p>
          <p className={`text-sm font-bold ${user?.isVerified ? "text-emerald-400" : "text-amber-400"}`}>
            {user?.isVerified ? "Verifie" : user?.kycStatus || "Non verifie"}
          </p>
        </div>
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Reseau</p>
          <p className="text-sm font-bold text-white">Pi Mainnet</p>
        </div>
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10 text-center">
          <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mb-1">Compte</p>
          <p className="text-sm font-bold text-blue-400">
            {user?.role === "ADMIN" ? "Admin" : "Standard"}
          </p>
        </div>
      </div>

      {/* Sections du profil */}
      <div className="px-6 space-y-8">
        {profileSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2 flex items-center gap-2">
              {section.icon}
              {section.title}
            </h3>
            <div className="bg-white/5 rounded-[28px] border border-white/10 overflow-hidden">
              {section.items.map((item, iIdx) => {
                const isEditing = editingField === item.fieldKey;
                const rawValue = item.fieldKey ? (user as Record<string, string | undefined>)?.[item.fieldKey] || "" : "";
                
                return (
                  <div
                    key={iIdx}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-xl bg-slate-900 text-blue-400 shrink-0">{item.icon}</div>
                      <span className="font-semibold text-sm text-slate-300 shrink-0">{item.label}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                      {isEditing ? (
                        // Mode edition
                        <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                          {item.inputType === "select" && item.options ? (
                            <div className="relative flex-1">
                              <select
                                ref={selectRef}
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                className="w-full bg-slate-800 border border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none appearance-none cursor-pointer pr-8"
                              >
                                <option value="" className="bg-slate-900">Selectionner...</option>
                                {item.options.map((opt) => (
                                  <option key={opt.value} value={opt.value} className="bg-slate-900">
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                          ) : (
                            <input
                              ref={inputRef}
                              type={item.inputType || "text"}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className={`flex-1 bg-slate-800 border border-blue-500 rounded-lg px-3 py-2 text-sm text-white outline-none ${item.inputType === "date" ? "[color-scheme:dark]" : ""}`}
                              placeholder={item.label}
                            />
                          )}
                          <button
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="p-2 bg-emerald-600 rounded-lg hover:bg-emerald-500 transition-colors disabled:opacity-50"
                          >
                            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        // Mode affichage
                        <>
                          {item.value && (
                            <span className={`text-[11px] font-bold max-w-[140px] truncate ${item.accent || (item.active ? "text-emerald-400" : "text-slate-500")}`}>
                              {item.value}
                            </span>
                          )}
                          {item.toggle ? (
                            <button
                              onClick={() => item.path && router.push(item.path)}
                              className="w-10 h-5 bg-blue-600 rounded-full relative"
                            >
                              <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                            </button>
                          ) : item.editable && !item.readOnly ? (
                            <button
                              onClick={() => handleStartEdit(item.fieldKey!, rawValue, item.inputType)}
                              className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors active:scale-90"
                              title="Modifier"
                            >
                              <UserPen size={14} />
                            </button>
                          ) : item.path ? (
                            <button
                              onClick={() => router.push(item.path!)}
                              className="p-1.5"
                            >
                              <ChevronRight size={16} className="text-slate-700" />
                            </button>
                          ) : (
                            <ChevronRight size={16} className="text-slate-700" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bouton deconnexion */}
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.replace("/auth/login");
          }}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-[28px] bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all mb-8 active:scale-95"
        >
          <LogOut size={20} />
          Deconnexion Securisee
        </button>

        <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest pb-4">
          PimPay Version 2.4.0 - Pi Protocol
        </p>
      </div>
    </div>
  );
}
