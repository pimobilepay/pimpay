"use client";

import { useState, useEffect } from "react";
import {
  User, ShieldCheck, Bell, Smartphone,
  Lock, Globe, HelpCircle, LogOut,
  ChevronRight, Fingerprint, CreditCard, Palette,
  Loader2, ArrowLeft
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Récupération des informations réelles de l'utilisateur
  useEffect(() => {
    async function fetchUserData() {
      try {
        const response = await fetch("/api/user/profile", { cache: 'no-store' });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else if (response.status === 401) {
          router.push("/auth/login");
        }
      } catch (err) {
        toast.error("Erreur de synchronisation des paramètres");
      } finally {
        setIsLoading(false);
      }
    }
    fetchUserData();
  }, [router]);

  const user = data?.user || {};
  const userName = user?.name || "Pioneer";

  // 2. Gestion de la déconnexion réelle
  const handleLogout = async () => {
    try {
      // Optionnel: Appeler une route API de logout si tu gères les sessions côté serveur
      // await fetch('/api/auth/logout', { method: 'POST' });
      
      toast.loading("Fermeture de la session sécurisée...");
      setTimeout(() => {
        // Nettoyage local (LocalStorage, Cookies si géré côté client)
        document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
        router.push("/auth/login");
        toast.dismiss();
        toast.success("Déconnecté avec succès");
      }, 1500);
    } catch (error) {
      toast.error("Erreur lors de la déconnexion");
    }
  };

  const menuItems = [
    {
      title: "Compte & Sécurité",
      items: [
        { icon: <User size={18} />, label: "Profil Utilisateur", desc: user?.email || "Gérer vos informations", color: "text-blue-400", path: "/profile" },
        { 
          icon: <ShieldCheck size={18} />, 
          label: "Vérification KYC", 
          desc: `Statut: ${user?.kycStatus || 'NON VÉRIFIÉ'}`, 
          badge: user?.kycStatus === 'VERIFIED' ? "OK" : "REQUIS", 
          color: user?.kycStatus === 'VERIFIED' ? "text-emerald-400" : "text-amber-400",
          path: "/settings/kyc" 
        },
        { icon: <Fingerprint size={18} />, label: "Biométrie / PIN", desc: "Sécurité renforcée", color: "text-purple-400", path: "/settings/security" },
      ]
    },
    {
      title: "Préférences",
      items: [
        { icon: <Bell size={18} />, label: "Notifications", desc: "Alertes de transaction", color: "text-orange-400", path: "/settings/notifications" },
        { icon: <Globe size={18} />, label: "Langue & Région", desc: "Français (FR) • USD", color: "text-cyan-400", path: "/settings/language" },
        { icon: <CreditCard size={18} />, label: "Mes Cartes PIMPAY", desc: "Gérer vos cartes virtuelles", color: "text-pink-400", path: "/cards" },
      ]
    },
    {
      title: "Légal & Support",
      items: [
        { icon: <HelpCircle size={18} />, label: "Centre d'aide", desc: "Support technique 24/7", color: "text-slate-400", path: "/support" },
        { icon: <Lock size={18} />, label: "Confidentialité", desc: "RGPD & Sécurité des données", color: "text-slate-400", path: "/legal" },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      {/* Header avec bouton retour */}
      <div className="px-6 pt-8 flex items-center gap-4">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-transform">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-black uppercase tracking-tighter">Paramètres</h1>
      </div>

      <header className="p-8 pb-4 text-center">
        <div className="relative inline-block">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-[32px] mx-auto flex items-center justify-center text-3xl font-black shadow-2xl shadow-blue-500/20 border border-white/10 uppercase">
            {userName.charAt(0)}
          </div>
          {user?.kycStatus === 'VERIFIED' && (
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 p-2 rounded-full border-4 border-[#020617] shadow-lg">
               <ShieldCheck size={16} className="text-white" />
            </div>
          )}
        </div>
        <h2 className="mt-4 text-xl font-black uppercase tracking-tighter">{userName}</h2>
        <p className="text-[10px] font-bold text-blue-500 tracking-widest uppercase mt-1">
          {user?.role || 'PIONEER'} MEMBER • ID: {user?.id?.substring(0, 8).toUpperCase()}
        </p>
      </header>

      <main className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {menuItems.map((section, idx) => (
          <div key={idx} className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">
              {section.title}
            </h3>
            <div className="bg-slate-900/40 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-sm">
              {section.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => router.push(item.path)}
                  className="w-full flex items-center justify-between p-5 hover:bg-white/5 active:bg-white/10 transition-all border-b border-white/5 last:border-0 group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`${item.color} bg-white/5 p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black uppercase tracking-tight text-white">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md ${item.badge === 'OK' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-slate-700 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 p-6 bg-rose-500/5 border border-rose-500/20 rounded-[32px] text-rose-500 font-black uppercase text-xs tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all duration-300 shadow-lg active:scale-95"
        >
          <LogOut size={18} />
          Fermer la session sécurisée
        </button>

        <div className="text-center space-y-1 pb-10">
          <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest">
            PIMPAY PROTOCOL v2.4.0-STABLE
          </p>
          <p className="text-[8px] text-slate-800 font-bold uppercase tracking-tighter">
            Distributed Ledger Technology • GCV Verified
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
