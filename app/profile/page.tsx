"use client";
import { useState, useEffect } from "react";
import {
  User, Mail, Shield, Bell, Smartphone, ChevronRight, LogOut, Camera, CheckCircle2,
  Wallet, Fingerprint, Globe, CreditCard, Calendar, MapPin, UserPen
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

interface UserData {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  joinedAt: string;
  isVerified: boolean;
  kycStatus: string;
  country: string;
  city: string;
  walletAddress: string;
  birthDate?: string;
  role: string;
}

// Ajout d'une interface pour sécuriser les items de liste
interface ProfileItem {
  label: string;
  icon: React.ReactNode;
  value?: string;
  path?: string;
  toggle?: boolean;
  active?: boolean;
}

interface ProfileSection {
  title: string;
  items: ProfileItem[];
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
          const fullName = data.user.name ||
            (data.user.firstName && data.user.lastName
              ? `${data.user.firstName} ${data.user.lastName}`
              : data.user.username || "Pioneer");

          setUser({
            ...data.user,
            name: fullName,
            joinedAt: new Date(data.user.createdAt || Date.now()).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric'
            }),
            isVerified: data.user.kycStatus === "VERIFIED"
          });
        } else {
          toast.error("Session expirée");
          router.push("/auth/login");
        }
      } catch (e) {
        toast.error("Erreur de synchronisation réseau");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [router]);

  const profileSections: ProfileSection[] = [
    {
      title: "Informations Personnelles",
      items: [
        { label: "Nom d'utilisateur", icon: <User size={20} />, value: user?.username ? `@${user.username}` : 'pioneer' },
        { label: "Email", icon: <Mail size={20} />, value: user?.email || "Non renseigné" },
        { label: "Localisation", icon: <MapPin size={20} />, value: user?.city || user?.country ? `${user?.city || ''}, ${user?.country || ''}` : "Non définie" },
        { label: "Date de naissance", icon: <Calendar size={20} />, value: user?.birthDate ? new Date(user.birthDate).toLocaleDateString('fr-FR') : "Non configurée" },
      ]
    },
    {
      title: "Sécurité & Web3",
      items: [
        { label: "Pi Wallet Address", icon: <Wallet size={20} />, value: user?.walletAddress ? `${user.walletAddress.substring(0, 6)}...${user.walletAddress.slice(-4)}` : "Non liée" },
        { label: "Code PIN Transaction", icon: <Shield size={20} />, active: true, value: "Sécurisé" },
        { label: "Auth Biométrique", icon: <Fingerprint size={20} />, toggle: true },
      ]
    },
    {
      title: "Préférences",
      items: [
        { label: "Notifications", icon: <Bell size={20} />, path: "/settings/notifications" },
        { label: "Devise d'affichage", icon: <CreditCard size={20} />, value: "USD ($)" },
      ]
    }
  ];

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      {/* HEADER */}
      <div className="relative pt-12 pb-8 px-6 bg-gradient-to-b from-blue-600/20 to-transparent">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-500 to-purple-600 p-1 shadow-2xl">
              <div className="w-full h-full rounded-[22px] bg-[#020617] flex items-center justify-center text-3xl font-black italic">
                {user?.name?.[0]?.toUpperCase() || "P"}
              </div>
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl border-4 border-[#020617]">
              <Camera size={16} />
            </button>
          </div>

          <h1 className="mt-4 text-2xl font-bold flex items-center gap-2">
            {user?.name}
            {user?.isVerified && <CheckCircle2 size={20} className="text-blue-400" />}
          </h1>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
            {user?.role === 'ADMIN' ? 'Administrator' : `Pioneer depuis ${user?.joinedAt}`}
          </p>

          <Link href="/profile/edit" className="mt-4 flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-bold hover:bg-white/10 transition-all">
            <UserPen size={14} className="text-blue-400" />
            Modifier mes informations
          </Link>
        </div>
      </div>

      {/* STATS FINTECH */}
      <div className="grid grid-cols-2 gap-4 px-6 mb-8">
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Status KYC</p>
          <p className={`text-sm font-bold ${user?.isVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
            {user?.kycStatus || 'NON VÉRIFIÉ'}
          </p>
        </div>
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Réseau</p>
          <p className="text-sm font-bold text-white">Pi Mainnet</p>
        </div>
      </div>

      {/* SECTIONS */}
      <div className="px-6 space-y-8">
        {profileSections.map((section, idx) => (
          <div key={idx}>
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[2px] mb-4 ml-2">
              {section.title}
            </h3>
            <div className="bg-white/5 rounded-[32px] border border-white/10 overflow-hidden">
              {section.items.map((item, iIdx) => (
                <button
                  key={iIdx}
                  onClick={() => {
                    // Correction TypeScript : Vérification explicite du path
                    if (item.path) {
                      router.push(item.path);
                    }
                  }}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-2xl bg-slate-900 text-blue-400">
                      {item.icon}
                    </div>
                    <span className="font-semibold text-sm text-slate-200">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.value && <span className="text-[11px] text-slate-500 font-bold">{item.value}</span>}
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

        <button
          onClick={async () => {
             await fetch("/api/auth/logout", { method: "POST" });
             router.replace("/auth/login");
          }}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-[32px] bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all mb-8"
        >
          <LogOut size={20} />
          Déconnexion Sécurisée
        </button>

        <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          Version 2.0.1 - Pi Network Protocol
        </p>
      </div>
    </div>
  );
}
