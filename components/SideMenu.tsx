"use client";

import {
  X, Home, Wallet, ArrowDown, ArrowUp, Send, Settings,
  Smartphone, Search, ChevronRight, User, LogOut, Clock,
  ShieldCheck, Repeat, CreditCard, HelpCircle, Facebook, Youtube, Twitter,
  Users2, LifeBuoy, Lock, FileText, Globe, Info, Sparkles
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface UserData {
  name: string;
  username: string;
  email: string;
  kycStatus?: string;
  avatar?: string;
}

export default function SideMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, setLocale, t } = useLanguage();
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("pimpay_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const userData = {
          name: data.user?.name || data.user?.username || "Pioneer",
          username: data.user?.username || "",
          email: data.user?.email || "",
          kycStatus: data.user?.kycStatus || "NON VÉRIFIÉ",
          avatar: data.user?.avatar
        };
        setUser(userData);
        localStorage.setItem("pimpay_user", JSON.stringify(userData));
      }
    } catch (err) {
      console.error("Erreur Sync SideMenu:", err);
    }
  }, []);

  useEffect(() => {
    if (open) fetchUserData();
  }, [open, fetchUserData]);

  useEffect(() => {
    if (open) {
      onClose();
    }
  }, [pathname]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [open]);

  const handleNavigation = (path: string) => {
    onClose();
    document.body.style.overflow = "unset";
    router.push(path);
  };

  const toggleLanguage = () => {
    const next = locale === "fr" ? "en" : "fr";
    setLocale(next);
  };

  const menuGroups = [
    {
      title: t("sideMenu.main"),
      items: [
        { label: t("sideMenu.home"), icon: <Home size={20} className="text-blue-400" />, path: "/dashboard" },
        { label: t("sideMenu.myWallet"), icon: <Wallet size={20} className="text-emerald-400" />, path: "/wallet" },
        { label: t("sideMenu.history"), icon: <Clock size={20} className="text-purple-400" />, path: "/statements" },
      ]
    },
    {
      title: t("sideMenu.pimpayServices"),
      items: [
        { label: t("sideMenu.mpay"), icon: <Smartphone size={20} className="text-blue-500" />, path: "/mpay" },
        { label: t("sideMenu.swap"), icon: <Repeat size={20} className="text-indigo-400" />, path: "/swap" },
        { label: t("sideMenu.virtualCard"), icon: <CreditCard size={20} className="text-pink-400" />, path: "/dashboard/card" },
        { label: t("sideMenu.mobileRecharge"), icon: <Smartphone size={20} className="text-orange-400" />, path: "/airtime" },
      ]
    },
    {
      title: t("sideMenu.transactions"),
      items: [
        { label: t("sideMenu.deposit"), icon: <ArrowDown size={20} className="text-green-400" />, path: "/deposit" },
        { label: t("sideMenu.withdraw"), icon: <ArrowUp size={20} className="text-red-400" />, path: "/withdraw" },
        { label: t("sideMenu.transfer"), icon: <Send size={20} className="text-sky-400" />, path: "/transfer" },
      ]
    },
    {
      title: t("sideMenu.supportHelp"),
      items: [
        { label: "Elara AI", icon: <Sparkles size={20} className="text-blue-400" />, path: "/chat" },
        { label: t("sideMenu.helpCenter"), icon: <LifeBuoy size={20} className="text-cyan-400" />, path: "/support" },
        { label: t("sideMenu.about"), icon: <Info size={20} className="text-blue-400" />, path: "/about" },
        { label: t("sideMenu.privacy"), icon: <Lock size={20} className="text-amber-400" />, path: "/legal/privacy" },
        { label: t("sideMenu.terms"), icon: <FileText size={20} className="text-violet-400" />, path: "/legal/terms" },
        { label: t("sideMenu.contact"), icon: <Users2 size={20} className="text-teal-400" />, path: "/contacts" },
      ]
    },
    {
      title: t("sideMenu.account"),
      items: [
        { label: t("sideMenu.myProfile"), icon: <User size={20} className="text-slate-400" />, path: "/profile" },
        { label: t("sideMenu.settings"), icon: <Settings size={20} className="text-slate-400" />, path: "/settings" },
      ]
    }
  ];

  const logout = async () => {
    try {
      onClose();

      // 1. Appel API d'abord pour invalider la session en DB et supprimer les cookies httpOnly
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });

      // 2. Nettoyer le stockage local
      localStorage.removeItem("pimpay_user");

      // 3. Supprimer tous les cookies cote client (fallback pour les cookies non-httpOnly)
      const cookieNames = ["token", "pimpay_token", "session", "pi_session_token"];
      for (const name of cookieNames) {
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`;
        document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=None; Secure`;
      }

      // 4. Rediriger vers la page de login
      window.location.href = "/auth/login";
    } catch (err) {
      // En cas d'erreur reseau, forcer quand meme la deconnexion locale
      localStorage.removeItem("pimpay_user");
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "pimpay_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      document.cookie = "pi_session_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
      window.location.href = "/auth/login";
    }
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[9998] bg-black/70 backdrop-blur-md transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      <div className={`fixed top-0 left-0 h-full w-[280px] z-[9999] bg-[#020617] border-r border-white/5 shadow-[20px_0_50px_rgba(0,0,0,0.5)] transition-transform duration-500 ease-&lsqb;cubic-bezier(0.32,0.72,0,1)&rsqb; ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex flex-col h-full">

          <div className="p-6 pt-14 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent relative">
            <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-white/5 text-slate-400 active:scale-90 transition-all">
              <X size={20} />
            </button>

            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 p-[2px] shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                  <div className="w-full h-full rounded-full bg-[#020617] flex items-center justify-center overflow-hidden border-2 border-[#020617]">
                    {user?.avatar ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-black italic text-white">
                        {user?.username ? user.username[0].toUpperCase() : (user?.name?.[0] || "P")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-[3px] border-[#020617] rounded-full"></div>
              </div>

              <div className="flex flex-col min-w-0">
                <h2 className="text-lg font-black text-white truncate tracking-tight">
                  {user?.name || "Pioneer"}
                </h2>
                {user?.username && (
                  <p className="text-[10px] font-bold text-blue-400 lowercase opacity-70 truncate -mt-1">
                    @{user.username}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-1.5">
                   <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${user?.kycStatus === 'VERIFIED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'}`}>
                    <ShieldCheck size={10} />
                    {user?.kycStatus === 'VERIFIED' ? t("sideMenu.accountVerified") : t("sideMenu.verifying")}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 mb-6">
            <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-2xl border border-white/5 focus-within:border-blue-500/30 transition-all">
              <Search size={18} className="text-slate-500" />
              <input type="text" placeholder={t("sideMenu.search")} className="bg-transparent outline-none text-sm text-slate-200 w-full placeholder:text-slate-600 font-medium" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 space-y-6 pb-6 custom-scrollbar">
            {menuGroups.map((group, gIdx) => (
              <div key={gIdx}>
                <h3 className="px-4 text-[10px] font-bold text-slate-600 uppercase tracking-[2px] mb-3">{group.title}</h3>
                <div className="space-y-1">
                  {group.items.map((item, iIdx) => (
                    <button key={iIdx} onClick={() => handleNavigation(item.path)} className="w-full flex items-center justify-between p-3.5 rounded-2xl hover:bg-white/5 text-slate-300 active:bg-white/10 transition-all group">
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
          </div>

          <div className="p-6 bg-[#020617] border-t border-white/5 space-y-4">
            {/* Social Links */}
            <div className="flex items-center justify-center gap-4 px-2">
              <a href="https://www.facebook.com/profile.php?id=61583243122633" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all active:scale-90">
                <Facebook size={20} />
              </a>
              <a href="https://x.com/pimobilepay" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all active:scale-90">
                <Twitter size={20} />
              </a>
              <a href="https://youtube.com/@pimobilepay" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all active:scale-90">
                <Youtube size={20} />
              </a>
            </div>

            <button onClick={logout} className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-sm uppercase tracking-widest bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95">
              <LogOut size={18} />
              {t("sideMenu.logout")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
