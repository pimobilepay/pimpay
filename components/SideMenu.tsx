"use client";

import {
  X, Home, Wallet, ArrowDown, ArrowUp, Send, Settings,
  Smartphone, Search, ChevronRight, User, LogOut, Clock,
  ShieldCheck, Repeat, CreditCard, HelpCircle, Facebook, Youtube, Twitter, Loader2
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";      

interface UserData {                              
  name: string;
  email: string;
  kycStatus?: string;
  avatar?: string;
}

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {       
  const router = useRouter();
  const pathname = usePathname();                 
  const [user, setUser] = useState<UserData | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem("pimpay_user");
    if (savedUser) setUser(JSON.parse(savedUser));

    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            const userData = {
              name: data.user.name || `${data.user.firstName} ${data.user.lastName}` || "Utilisateur",
              email: data.user.email,
              kycStatus: data.user.kycStatus,
              avatar: data.user.avatar
            };
            setUser(userData);
            localStorage.setItem("pimpay_user", JSON.stringify(userData));
          }
        }
      } catch (err) {
        console.error("Erreur SideMenu:", err);
      }
    };

    if (open) fetchUserData();
  }, [open]);

  useEffect(() => { onClose(); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { label: "Accueil", icon: <Home size={20} className="text-blue-400" />, path: "/dashboard" },
        { label: "Mon Wallet", icon: <Wallet size={20} className="text-emerald-400" />, path: "/wallet" },
        { label: "Historique", icon: <Clock size={20} className="text-purple-400" />, path: "/statements" },
      ]
    },
    {
      title: "Services Pimpay",
      items: [
        { label: "Mpay", icon: <Smartphone size={20} className="text-blue-500" />, path: "/mpay" },
        { label: "Swap", icon: <Repeat size={20} className="text-indigo-400" />, path: "/swap" },
        { label: "Carte virtuelle", icon: <CreditCard size={20} className="text-pink-400" />, path: "/dashboard/card" },
        { label: "Recharge Mobile", icon: <Smartphone size={20} className="text-orange-400" />, path: "/airtime" },
      ]
    },
    {
      title: "Transactions",
      items: [
        { label: "Dépôt", icon: <ArrowDown size={20} className="text-green-400" />, path: "/deposit" },
        { label: "Retrait", icon: <ArrowUp size={20} className="text-red-400" />, path: "/withdraw" },
        { label: "Transfert", icon: <Send size={20} className="text-sky-400" />, path: "/transfer" },
      ]
    },
    {
      title: "Support & Aide",
      items: [
        { label: "Contact", icon: <HelpCircle size={20} className="text-teal-400" />, path: "/contacts" },
      ]
    },
    {
      title: "Compte",
      items: [
        { label: "Mon Profil", icon: <User size={20} className="text-slate-400" />, path: "/profile" },
        { label: "Paramètres", icon: <Settings size={20} className="text-slate-400" />, path: "/settings" },
      ]
    }
  ];

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("pimpay_user");
      onClose();
      router.replace("/auth/login");
    } catch (err) {
      console.error("Déconnexion:", err);
    }
  };

  if (!mounted) return null;

  return (
    <div className={`fixed inset-0 z-[9999] ${open ? "visible" : "invisible"}`}>
      <div onClick={onClose} className={`fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity duration-300 ${open ? "opacity-100" : "opacity-0"}`} />

      <div className={`absolute top-0 left-0 h-full w-[280px] bg-[#020617] border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">

          {/* HEADER PROFILE AJUSTÉ */}
          <div className="p-6 pt-14 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent relative">
            <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-white/5 text-slate-400 active:scale-90 transition-all">
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              {/* Avatar avec effet Glow */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center overflow-hidden border-2 border-[#020617]">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black italic text-white">{user?.name?.[0] || "P"}</span>
                    )}
                  </div>
                </div>
                {/* Petit point indicateur en ligne */}
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-[#020617] rounded-full"></div>
              </div>

              <div className="flex flex-col min-w-0">
                <h2 className="text-lg font-black text-white truncate tracking-tight">
                  {user?.name || "Pioneer"}
                </h2>
                <div className={`flex items-center gap-1.5 mt-0.5`}>
                   <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${user?.kycStatus === 'VERIFIED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    <ShieldCheck size={10} />
                    {user?.kycStatus === 'VERIFIED' ? 'Compte Vérifié' : 'Vérification...'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RECHERCHE */}
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 focus-within:border-blue-500/30 transition-all">
              <Search size={18} className="text-slate-500" />
              <input type="text" placeholder="Rechercher..." className="bg-transparent outline-none text-sm text-slate-200 w-full placeholder:text-slate-600 font-medium" />
            </div>
          </div>

          {/* MENU ITEMS */}
          <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-10">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <h3 className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[2px] mb-3">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map((item, iIdx) => (
                    <button key={iIdx} onClick={() => router.push(item.path)} className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 text-slate-300 active:bg-white/10 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-slate-900/50 group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                        <span className="font-bold text-[13px]">{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-700 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {/* SOCIALS */}
            <div className="px-4 pt-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <a href="https://facebook.com" className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-blue-500 hover:bg-blue-500/10 transition-all"><Facebook size={20} /></a>
                <a href="https://twitter.com" className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all"><Twitter size={20} /></a>
                <a href="https://youtube.com" className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"><Youtube size={20} /></a>
              </div>
            </div>
          </div>

          {/* DECONNEXION */}
          <div className="p-6 bg-[#020617] border-t border-white/5">
            <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95">
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
