"use client";

import {
  X,
  Home,
  Wallet,
  ArrowDown,
  ArrowUp,
  Send,
  Settings,
  Smartphone,
  Search,
  ChevronRight,
  Phone,
  User,
  LogOut,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function SideMenu({ open, onClose }) {
  const router = useRouter();

  const items = [
    { label: "Accueil", icon: <Home size={22} />, path: "/" },
    { label: "Wallet", icon: <Wallet size={22} />, path: "/wallet" },
    { label: "Dépôt", icon: <ArrowDown size={22} />, path: "/deposit" },
    { label: "Retrait", icon: <ArrowUp size={22} />, path: "/withdraw" },
    { label: "Transfert", icon: <Send size={22} />, path: "/transfer" },
    { label: "MPay", icon: <Smartphone size={22} />, path: "/mpay" },
    { label: "Profil", icon: <User size={22} />, path: "/profile" },
    { label: "Contacts", icon: <Phone size={22} />, path: "/contacts" },
    { label: "Paramètres", icon: <Settings size={22} />, path: "/settings" },
  ];

  const logout = () => {
    // 👉 Ici tu mettras ta logique de déconnexion (clear token, cookies…)
    console.log("Déconnexion…");
    router.push("/login");
    onClose();
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 transition-all duration-300
        ${open ? "pointer-events-auto" : "pointer-events-none"}
      `}
    >
      {/* Overlay */}
      <div
        onClick={onClose}
        className={`
          absolute inset-0 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${open ? "opacity-100" : "opacity-0"}
        `}
      ></div>

      {/* Menu Panel */}
      <div
        className={`
          absolute top-0 left-0 h-full w-80 p-0 
          bg-white/70 dark:bg-[#0D0F14]/70 backdrop-blur-2xl 
          border-r border-white/30 dark:border-white/10
          shadow-[4px_0_25px_rgba(0,0,0,0.4)]

          transition-transform duration-300 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* HEADER */}
        <div className="px-6 pt-10 pb-6 bg-gradient-to-br 
          from-white/60 to-white/20 
          dark:from-[#1A1C23]/80 dark:to-[#0D0F14]/40
          border-b border-white/30 dark:border-white/10
        ">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/40 dark:bg-white/10"
          >
            <X size={22} className="text-gray-700 dark:text-white" />
          </button>

          {/* AVATAR */}
          <div className="flex items-center gap-4">
            <div
              className="
                w-14 h-14 rounded-full 
                bg-gradient-to-br 
                from-[#FFD68A] to-[#FFB73D] 
                dark:from-[#F1C27D] dark:to-[#A37738]
                flex items-center justify-center text-black font-bold text-xl
                shadow-[0_0_12px_rgba(255,190,90,0.5)]
              "
            >
              P
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Nom Utilisateur
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                user@email.com
              </p>
            </div>
          </div>
        </div>

        {/* RECHERCHE */}
        <div className="p-4">
          <div
            className="
              flex items-center gap-2 px-4 py-2 
              bg-white/60 dark:bg-white/10 
              rounded-xl shadow-sm
              border border-white/40 dark:border-white/10
            "
          >
            <Search size={20} className="text-gray-700 dark:text-gray-300" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="
                w-full bg-transparent outline-none 
                text-gray-800 dark:text-gray-200 placeholder-gray-500
              "
            />
          </div>
        </div>

        {/* ITEMS */}
        <div className="flex flex-col mt-2 px-3 overflow-y-auto max-h-[65%]">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                router.push(item.path);
                onClose();
              }}
              className="
                flex items-center justify-between p-4 mb-1
                rounded-xl transition
                hover:bg-white/50 dark:hover:bg-white/10
                text-gray-800 dark:text-gray-200
              "
            >
              <div className="flex items-center gap-3">
                {item.icon}
                <span className="text-lg">{item.label}</span>
              </div>

              <ChevronRight size={18} className="opacity-50" />
            </button>
          ))}
        </div>

        {/* 🔥 BOUTON DÉCONNEXION EN BAS */}
        <div className="absolute bottom-5 left-0 right-0 px-5">
          <button
            onClick={logout}
            className="
              w-full flex items-center justify-center gap-3 
              py-3 rounded-xl font-semibold

              bg-gradient-to-r from-red-500 to-red-600
              text-white shadow-lg
              hover:scale-[1.03]
              active:scale-[0.98]
              transition
            "
          >
            <LogOut size={20} />
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}
