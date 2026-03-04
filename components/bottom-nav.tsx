"use client";

import { usePathname } from "next/navigation";
import {
  Home,
  ArrowDownToLine,
  ArrowUpFromLine,
  Smartphone,
  Menu,
  Wallet,
  Send
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

interface BottomNavProps {
  onOpenMenu: () => void;
}

export function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Precise exclusion path correction
  const isAuthPage = 
    pathname === "/auth/login" || 
    pathname === "/auth/signup" || 
    pathname?.startsWith("/auth/");

  if (!mounted || isAuthPage) return null;

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Home" },
    { href: "/wallet", icon: Wallet, label: "Wallet" },
    { href: "/deposit", icon: ArrowDownToLine, label: "Deposit" },
    { href: "/mpay", icon: Smartphone, label: "MPay", special: true },
    { href: "/withdraw", icon: ArrowUpFromLine, label: "Withdraw" },
    { href: "/transfer", icon: Send, label: "Send" },
    { href: "#", icon: Menu, label: "Menu", isMenuButton: true },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] safe-area-bottom">
      <div className={`mx-0 backdrop-blur-2xl border-t rounded-t-[24px] ${isDark ? "bg-[#0f172a]/95 border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]" : "bg-white/95 border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.08)]"}`}>
        <div className="flex justify-around items-center h-20 px-1 max-w-lg mx-auto">
          {navItems.map((item, idx) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (item.special) {
              return (
                <Link key={`nav-${idx}`} href={item.href} className="flex flex-col items-center -mt-8">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${isActive ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)] border-2 border-white/20" : isDark ? "bg-slate-800 border border-white/10 hover:bg-slate-700" : "bg-slate-100 border border-slate-200 hover:bg-slate-200"}`}>
                    <Icon className={`h-6 w-6 ${isActive ? "text-white" : "text-blue-500"}`} />
                  </div>
                  <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter ${isActive ? "text-blue-500" : isDark ? "text-slate-500" : "text-slate-400"}`}>{item.label}</span>
                </Link>
              );
            }

            if (item.isMenuButton) {
              return (
                <button
                  key={`nav-${idx}`}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    if (onOpenMenu) onOpenMenu();
                  }}
                  className="flex flex-col items-center justify-center gap-1 min-w-[50px] outline-none"
                >
                  <Icon className={`h-5 w-5 ${isDark ? "text-slate-500" : "text-slate-400"}`} />
                  <span className={`text-[9px] font-bold uppercase tracking-tighter ${isDark ? "text-slate-500" : "text-slate-400"}`}>{item.label}</span>
                </button>
              );
            }

            return (
              <Link
                key={`nav-${idx}`}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 min-w-[50px] relative"
              >
                <Icon className={`h-5 w-5 ${isActive ? "text-blue-500" : isDark ? "text-slate-500" : "text-slate-400"}`} />
                <span className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? "text-blue-500" : isDark ? "text-slate-500" : "text-slate-400"}`}>{item.label}</span>
                {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-blue-500 rounded-full" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
