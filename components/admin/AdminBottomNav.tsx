"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGrid, Users, ArrowRightLeft, Headphones, Settings, Shield, BarChart3
} from "lucide-react";

const navItems = [
  { label: "Accueil", icon: LayoutGrid, path: "/admin" },
  { label: "Users", icon: Users, path: "/admin/users" },
  { label: "Flux", icon: ArrowRightLeft, path: "/admin/transactions" },
  { label: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { label: "Config", icon: Settings, path: "/admin/settings" },
];

export function AdminBottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] bg-[#070b18]/95 backdrop-blur-2xl border-t border-white/5">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.path || 
            (item.path !== "/admin" && pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-2xl transition-all active:scale-90 ${
                isActive
                  ? "text-blue-400"
                  : "text-slate-600 hover:text-slate-400"
              }`}
            >
              <div className={`p-2 rounded-xl transition-all ${isActive ? "bg-blue-500/10" : ""}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.5} />
              </div>
              <span className={`text-[7px] font-black uppercase tracking-widest ${isActive ? "text-blue-400" : "text-slate-600"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
