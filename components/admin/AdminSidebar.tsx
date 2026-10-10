"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronRight,
  Coins,
  LayoutDashboard,
  Landmark,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { label: "Utilisateurs", icon: Users, path: "/admin/users" },
  { label: "Trésorerie", icon: Landmark, path: "/admin/treasury" },
  { label: "Staking", icon: Coins, path: "/admin/staking" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Monitoring", icon: Activity, path: "/admin/monitoring" },
  { label: "Paramètres", icon: Settings, path: "/admin/settings" },
];

export function AdminSidebar({ desktopMode }: { desktopMode: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className={`fixed left-0 top-0 z-[80] h-screen w-64 flex-col border-r border-white/5 bg-[#070b18]/95 backdrop-blur-xl ${desktopMode ? "flex" : "pointer-events-none hidden opacity-0"}`}>
      <div className="flex h-20 items-center gap-3 border-b border-white/5 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10">
          <ShieldCheck className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <p className="text-sm font-black tracking-tight text-white">PIMOBIPAY</p>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">Administration</p>
        </div>
      </div>

      <div className="mx-4 mt-5 rounded-2xl border border-white/5 bg-slate-800/40 p-4">
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Accès sécurisé</p>
        <div className="mt-2 flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-bold text-emerald-400">Système opérationnel</span>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-1 px-3" aria-label="Navigation administration">
        {navItems.map((item) => {
          const isActive = item.path === "/admin" ? pathname === "/admin" : pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => router.push(item.path)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition-colors ${
                isActive ? "bg-blue-500/10 text-blue-300" : "text-slate-500 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-4 w-4" />}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">CORE LEDGER</p>
        <p className="mt-1 text-xs text-slate-500">Console de contrôle</p>
      </div>
    </aside>
  );
}
