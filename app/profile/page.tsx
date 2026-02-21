"use client";

import { useState, useEffect } from "react";
import {
  User, Mail, Shield, Bell, Smartphone, ChevronRight, LogOut, Camera, CheckCircle2,
  Wallet, Fingerprint, Globe, CreditCard, Calendar, MapPin, UserPen, Loader2,
  Phone, Briefcase, BadgeCheck, FileText, Building2, Hash, Lock
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
        { label: "Nom d'utilisateur", icon: <Fingerprint size={18} />, value: user?.username ? `@${user.username}` : "Non renseigne" },
        { label: "Prenom", icon: <User size={18} />, value: user?.firstName || "Non renseigne" },
        { label: "Nom de famille", icon: <User size={18} />, value: user?.lastName || "Non renseigne" },
        { label: "Genre", icon: <User size={18} />, value: formatGender(user?.gender || "") },
        { label: "Date de naissance", icon: <Calendar size={18} />, value: user?.birthDate ? new Date(user.birthDate).toLocaleDateString("fr-FR") : "Non renseignee" },
        { label: "Nationalite", icon: <Globe size={18} />, value: user?.nationality || "Non renseignee" },
      ],
    },
    {
      title: "Coordonnees",
      icon: <Mail size={12} />,
      items: [
        { label: "Adresse e-mail", icon: <Mail size={18} />, value: user?.email || "Non renseigne" },
        { label: "Telephone", icon: <Phone size={18} />, value: user?.phone || "Non renseigne" },
      ],
    },
    {
      title: "Adresse et Localisation",
      icon: <MapPin size={12} />,
      items: [
        { label: "Pays", icon: <Globe size={18} />, value: user?.country || "Non renseigne" },
        { label: "Ville", icon: <Building2 size={18} />, value: user?.city || "Non renseignee" },
        { label: "Adresse de residence", icon: <MapPin size={18} />, value: user?.address || "Non renseignee" },
        { label: "Code postal", icon: <Hash size={18} />, value: user?.postalCode || "Non renseigne" },
      ],
    },
    {
      title: "Informations Financieres",
      icon: <Briefcase size={12} />,
      items: [
        { label: "Profession / Activite", icon: <Briefcase size={18} />, value: formatOccupation(user?.occupation || "") },
        { label: "Source des fonds", icon: <CreditCard size={18} />, value: formatSourceOfFunds(user?.sourceOfFunds || ""), accent: "text-amber-400" },
      ],
    },
    {
      title: "Piece d'identite",
      icon: <FileText size={12} />,
      items: [
        { label: "Type de document", icon: <BadgeCheck size={18} />, value: formatIdType(user?.idType || "") },
        { label: "Numero du document", icon: <Shield size={18} />, value: user?.idNumber ? `${user.idNumber.substring(0, 3)}****${user.idNumber.slice(-2)}` : "Non renseigne" },
      ],
    },
    {
      title: "Securite et Web3",
      icon: <Wallet size={12} />,
      items: [
        { label: "Adresse Pi Wallet", icon: <Wallet size={18} />, value: user?.walletAddress ? `${user.walletAddress.substring(0, 8)}...${user.walletAddress.slice(-6)}` : "Non liee" },
        { label: "Code PIN Transaction", icon: <Shield size={18} />, value: "Securise", active: true },
        { label: "Authentification biometrique", icon: <Fingerprint size={18} />, toggle: true },
      ],
    },
    {
      title: "Preferences",
      icon: <Bell size={12} />,
      items: [
        { label: "Notifications", icon: <Bell size={18} />, path: "/settings/notifications" },
        { label: "Securite du compte", icon: <Lock size={18} />, path: "/settings/security" },
        { label: "Devise d'affichage", icon: <CreditCard size={18} />, value: "USD ($)" },
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
              {section.items.map((item, iIdx) => (
                <button
                  key={iIdx}
                  onClick={() => {
                    if (item.path) router.push(item.path);
                  }}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-slate-900 text-blue-400">{item.icon}</div>
                    <span className="font-semibold text-sm text-slate-300">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.value && (
                      <span className={`text-[11px] font-bold max-w-[140px] truncate ${item.accent || (item.active ? "text-emerald-400" : "text-slate-500")}`}>
                        {item.value}
                      </span>
                    )}
                    {item.toggle ? (
                      <div className="w-10 h-5 bg-blue-600 rounded-full relative">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                      </div>
                    ) : (
                      <ChevronRight size={16} className="text-slate-700" />
                    )}
                  </div>
                </button>
              ))}
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
