"use client";

import {
  X, Home, Wallet, ArrowDown, ArrowUp, Send, Settings,
  Smartphone, Search, ChevronRight, User, LogOut, Clock,
  ShieldCheck
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface UserData {
  name: string;
  email: string;
}

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<UserData | null>(null);
  const [mounted, setMounted] = useState(false);

  // 1. Initialisation et chargement utilisateur
  useEffect(() => {
    setMounted(true);
    const storedUser = localStorage.getItem("pimpay_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (err) {
        console.error("Erreur parsing user:", err);
      }
    }
  }, []);

  // 2. Sécurité : Fermer le menu si le pathname change (navigation réussie)
  useEffect(() => {
    onClose();
  }, [pathname]);

  // 3. Bloquer le scroll du body quand le menu est ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  const menuGroups = [
    {
      title: "Principal",
      items: [
        { label: "Accueil", icon: <Home size={20} className="text-blue-400" />, path: "/" },
        { label: "Mon Wallet", icon: <Wallet size={20} className="text-emerald-400" />, path: "/wallet" },
        { label: "Historique", icon: <Clock size={20} className="text-purple-400" />, path: "/statements" },
      ]
    },
    {
      title: "Transactions",
      items: [
        { label: "Dépôt", icon: <ArrowDown size={20} className="text-green-400" />, path: "/deposit" },
        { label: "Retrait", icon: <ArrowUp size={20} className="text-red-400" />, path: "/withdraw" },
        { label: "Transfert", icon: <Send size={20} className="text-sky-400" />, path: "/transfer" },
        { label: "Recharge Mobile", icon: <Smartphone size={20} className="text-orange-400" />, path: "/mpay" },
      ]
    },
    {
      title: "Compte",
      items: [
        { label: "Mon Profil", icon: <User size={20} className="text-slate-400" />, path: "/profile" },
        { label: "Sécurité", icon: <ShieldCheck size={20} className="text-slate-400" />, path: "/settings" },
      ]
    }
  ];

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("pimpay_user");
      onClose();
      router.replace("/auth/login");
      router.refresh();
    } catch (err) {
      console.error("Erreur déconnexion:", err);
    }
  };

  // Empêcher le rendu flash pendant l'hydratation
  if (!mounted) return null;

  return (
    <div 
      className={`fixed inset-0 z-[100] transition-all duration-300 ${
        open ? "visible" : "invisible"
      }`}
    >
      {/* Overlay sombre */}
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panneau latéral */}
      <div
        className={`absolute top-0 left-0 h-full w-[280px] bg-[#020617] border-r border-white/10 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header Profil */}
          <div className="p-6 pt-12 pb-8 bg-gradient-to-br from-blue-600/10 to-transparent relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-500 to-purple-500 p-0.5">
                <div className="w-full h-full rounded-2xl bg-[#020617] flex items-center justify-center text-xl font-bold text-white uppercase">
                  {user?.name ? user.name[0] : <User size={24} />}
                </div>
              </div>
              <div className="flex flex-col overflow-hidden">
                <h2 className="text-lg font-bold text-white truncate">{user?.name || "Utilisateur"}</h2>
                <div className="flex items-center gap-1 text-blue-400 text-[10px] font-bold uppercase">
                  <ShieldCheck size={12} /> Compte Vérifié
                </div>
              </div>
            </div>
          </div>

          {/* Barre de Recherche */}
          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 focus-within:border-blue-500/50 transition-all">
              <Search size={18} className="text-slate-500" />
              <input
                type="text"
                placeholder="Chercher..."
                className="bg-transparent outline-none text-sm text-slate-200 w-full placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Menu principal */}
          <div className="flex-1 overflow-y-auto px-4 custom-scrollbar">
            {menuGroups.map((group, gIdx) => (
              <div key={`group-${gIdx}`} className="mb-6">
                <h3 className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  {group.title}
                </h3>
                <div className="flex flex-col gap-1">
                  {group.items.map((item, iIdx) => (
                    <button
                      key={`item-${iIdx}`}
                      onClick={() => {
                        router.push(item.path);
                        // onClose est géré par le useEffect sur pathname
                      }}
                      className="group flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 text-slate-300 transition-all active:scale-[0.98]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-900 group-hover:bg-slate-800 transition-colors">
                          {item.icon}
                        </div>
                        <span className="font-semibold text-sm">{item.label}</span>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer Déconnexion */}
          <div className="p-6 border-t border-white/5 bg-slate-950/50">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold bg-red-500/10 text-red-500 hover:bg-red-600 hover:text-white transition-all active:scale-95"
            >
              <LogOut size={18} />
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
