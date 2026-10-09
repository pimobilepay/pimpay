"use client";

import { useEffect, useState } from "react";
import { Monitor, Smartphone, PanelLeft, PanelLeftClose } from "lucide-react";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [desktopMode, setDesktopMode] = useState(false);

  useEffect(() => {
    setDesktopMode(window.matchMedia("(min-width: 1024px)").matches);
  }, []);

  return (
    <div className={`min-h-screen w-full bg-[#02040a] admin-layer ${desktopMode ? "admin-desktop-mode" : "admin-mobile-mode"}`}>
      <AdminSidebar desktopMode={desktopMode} />

      <div className={desktopMode ? "pl-64" : ""}>
        <div className="fixed right-4 top-4 z-[100] flex items-center gap-1 rounded-2xl border border-white/10 bg-[#0b1220]/95 p-1 shadow-2xl backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setDesktopMode(false)}
            aria-pressed={!desktopMode}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
              !desktopMode ? "bg-blue-500 text-white" : "text-slate-500 hover:text-white"
            }`}
          >
            <Smartphone size={14} />
            <span className="hidden sm:inline">Mobile</span>
          </button>
          <button
            type="button"
            onClick={() => setDesktopMode(true)}
            aria-pressed={desktopMode}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
              desktopMode ? "bg-blue-500 text-white" : "text-slate-500 hover:text-white"
            }`}
          >
            <Monitor size={14} />
            <span className="hidden sm:inline">Desktop</span>
          </button>
        </div>

        {children}
      </div>
      <AdminBottomNav desktopMode={desktopMode} />
    </div>
  );
}
