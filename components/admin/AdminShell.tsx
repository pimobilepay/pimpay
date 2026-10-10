"use client";

import { useEffect, useState } from "react";
import { Bell, Gauge, LogOut, Monitor, Settings, Smartphone, UserCircle } from "lucide-react";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [desktopMode, setDesktopMode] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const syncMode = () => setDesktopMode(media.matches);
    syncMode();
    media.addEventListener("change", syncMode);
    return () => media.removeEventListener("change", syncMode);
  }, []);

  return (
    <div className={`min-h-screen w-full bg-[#02040a] admin-layer ${desktopMode ? "admin-desktop-mode" : "admin-mobile-mode"}`}>
      <AdminSidebar desktopMode={desktopMode} />

      <div className={desktopMode ? "pl-64" : ""}>
        {desktopMode && (
          <header className="fixed right-6 top-4 z-[100] flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0b1220]/95 px-2 py-2 shadow-2xl backdrop-blur-xl" aria-label="Navigation administrateur">
            <div className="hidden items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 xl:flex">
              <Gauge className="size-4 text-emerald-400" />
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300">Performance 98%</span>
            </div>
            <button type="button" aria-label="Notifications" className="relative rounded-xl p-2.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
              <Bell className="size-4" />
              <span className="absolute right-2 top-2 size-1.5 rounded-full bg-blue-400" />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setProfileOpen((open) => !open)} aria-expanded={profileOpen} aria-label="Menu profil" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors hover:bg-white/10">
                <UserCircle className="size-7 text-blue-400" />
                <span className="hidden text-xs font-bold text-white lg:block">Administrateur</span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-12 w-48 rounded-2xl border border-white/10 bg-[#101827] p-2 shadow-2xl">
                  <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-slate-300 hover:bg-white/10"><Settings className="size-4" /> Paramètres</button>
                  <button type="button" className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs text-rose-300 hover:bg-white/10"><LogOut className="size-4" /> Déconnexion</button>
                </div>
              )}
            </div>
          </header>
        )}

        <div className="group fixed bottom-6 right-6 z-[100]">
          <div className="pointer-events-none absolute bottom-0 right-0 flex translate-y-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#0b1220]/95 p-1 opacity-0 shadow-2xl transition-all duration-300 group-hover:pointer-events-auto group-hover:-translate-x-12 group-hover:translate-y-0 group-hover:opacity-100">
            <button type="button" onClick={() => setDesktopMode(false)} aria-label="Activer le mode mobile" aria-pressed={!desktopMode} className={`rounded-full p-2 transition-colors ${!desktopMode ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}><Smartphone className="size-4" /></button>
            <button type="button" onClick={() => setDesktopMode(true)} aria-label="Activer le mode desktop" aria-pressed={desktopMode} className={`rounded-full p-2 transition-colors ${desktopMode ? "bg-blue-500 text-white" : "text-slate-400 hover:bg-white/10 hover:text-white"}`}><Monitor className="size-4" /></button>
          </div>
          <button type="button" aria-label="Basculer entre les modes d'affichage" className="flex size-12 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-transform duration-300 group-hover:scale-110"><Monitor className="size-5" /></button>
        </div>

        {children}
      </div>
      <AdminBottomNav desktopMode={desktopMode} />
    </div>
  );
}
