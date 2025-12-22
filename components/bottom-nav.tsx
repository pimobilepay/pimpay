"use client";

import { usePathname } from "next/navigation";
import { Home, ArrowDownToLine, ArrowUpFromLine, Smartphone, Menu, Wallet, Send } from "lucide-react";
import Link from "next/link";

interface BottomNavProps {
  onOpenMenu: () => void;
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = usePathname();

  const hiddenPaths = ["/auth/login", "/auth/signup", "/login", "/signup"];
  if (hiddenPaths.includes(pathname)) return null;

  const navItems = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/deposit", icon: ArrowDownToLine, label: "Dépôt" },
    { href: "/mpay", icon: Smartphone, label: "MPay", special: true },
    { href: "/withdraw", icon: ArrowUpFromLine, label: "Retrait" },
    { href: "/transfer", icon: Send, label: "Envoi" },
    { href: "#", icon: Menu, label: "Menu", isMenuButton: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90]">
      <div className="mx-0 bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center h-20 px-1">
          {navItems.map((item, idx) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.special) {
              return (
                <Link key={idx} href={item.href} className="flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${isActive ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)] border-2 border-white/20" : "bg-slate-800 border border-white/10 hover:bg-slate-700"}`}>
                    <Icon className={`h-6 w-6 ${isActive ? "text-white" : "text-blue-400"}`} />
                  </div>
                  <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter ${isActive ? "text-blue-400" : "text-slate-500"}`}>{item.label}</span>
                </Link>
              );
            }

            if (item.isMenuButton) {
              return (
                <button key={idx} type="button" onClick={(e) => { e.preventDefault(); onOpenMenu(); }} className="flex flex-col items-center justify-center gap-1 min-w-[50px] transition-all active:scale-95 group">
                  <Icon className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter group-hover:text-blue-400">{item.label}</span>
                </button>
              );
            }

            return (
              <Link key={idx} href={item.href} className="flex flex-col items-center justify-center gap-1 min-w-[50px] transition-all active:scale-95 relative">
                <Icon className={`h-5 w-5 transition-colors ${isActive ? "text-blue-500" : "text-slate-500"}`} />
                <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${isActive ? "text-blue-500" : "text-slate-500"}`}>{item.label}</span>
                {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_5px_#3b82f6]" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
