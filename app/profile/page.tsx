"use client";

import { useState, useEffect } from "react";
import { 
  User, Mail, Shield, Bell, Smartphone, 
  ChevronRight, LogOut, Camera, CheckCircle2, 
  Wallet, Fingerprint, Globe, CreditCard
} from "lucide-react";
import { toast } from "sonner";

interface UserData {
  name: string;
  email: string;
  uid: string;
  joinedAt: string;
  isVerified: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("pimpay_user");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Simulation de données complémentaires FinTech
        setUser({
          name: parsed.name || parsed.username || "Utilisateur Pi",
          email: parsed.email || "non-configuré@pi.com",
          uid: parsed.uid || "ID_NON_DISPONIBLE",
          joinedAt: "Décembre 2025",
          isVerified: true
        });
      } catch (e) {
        console.error("Erreur chargement profil");
      }
    }
  }, []);

  const profileSections = [
    {
      title: "Sécurité & Accès",
      items: [
        { label: "Authentification Biométrique", icon: <Fingerprint size={20} />, active: true, toggle: true },
        { label: "Code PIN de Transaction", icon: <Shield size={20} />, active: true, value: "Activé" },
        { label: "Appareils Connectés", icon: <Smartphone size={20} />, value: "2 actifs" },
      ]
    },
    {
      title: "Préférences",
      items: [
        { label: "Notifications", icon: <Bell size={20} />, path: "/settings/notifications" },
        { label: "Langue", icon: <Globe size={20} />, value: "Français" },
        { label: "Devise d'affichage", icon: <CreditCard size={20} />, value: "USD ($)" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      {/* HEADER : Avatar et Infos de base */}
      <div className="relative pt-12 pb-8 px-6 bg-gradient-to-b from-blue-600/20 to-transparent">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-500 to-purple-600 p-1 shadow-2xl shadow-blue-500/20">
              <div className="w-full h-full rounded-[22px] bg-[#020617] flex items-center justify-center text-3xl font-bold">
                {user?.name?.[0]?.toUpperCase() || "P"}
              </div>
            </div>
            <button className="absolute -bottom-2 -right-2 p-2 bg-blue-600 rounded-xl border-4 border-[#020617] hover:bg-blue-500 transition-colors">
              <Camera size={16} />
            </button>
          </div>

          <h1 className="mt-4 text-2xl font-bold flex items-center gap-2">
            {user?.name}
            {user?.isVerified && <CheckCircle2 size={20} className="text-blue-400" />}
          </h1>
          <p className="text-slate-500 text-sm font-medium">Membre depuis {user?.joinedAt}</p>
        </div>
      </div>

      {/* DASHBOARD MINI-STATS */}
      <div className="grid grid-cols-2 gap-4 px-6 mb-8">
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Niveau KYC</p>
          <p className="text-sm font-bold text-emerald-400">Niveau 2 (Vérifié)</p>
        </div>
        <div className="p-4 rounded-3xl bg-white/5 border border-white/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mb-1">Limite 24h</p>
          <p className="text-sm font-bold text-white">5,000 Pi</p>
        </div>
      </div>

      {/* SECTIONS DE PARAMÈTRES */}
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
                  className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-none"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-2xl bg-slate-900 text-blue-400">
                      {item.icon}
                    </div>
                    <span className="font-semibold text-sm text-slate-200">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.value && <span className="text-xs text-slate-500 font-medium">{item.value}</span>}
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

        {/* LOGOUT */}
        <button 
          onClick={() => {
            localStorage.clear();
            window.location.href = "/auth/login";
          }}
          className="w-full flex items-center justify-center gap-3 p-5 rounded-[32px] bg-red-500/10 text-red-500 font-bold hover:bg-red-500/20 transition-all mb-8"
        >
          <LogOut size={20} />
          Déconnexion du compte
        </button>

        <p className="text-center text-[10px] text-slate-600 font-bold uppercase tracking-widest">
          ID Utilisateur: {user?.uid.substring(0, 15)}...
        </p>
      </div>
    </div>
  );
}
