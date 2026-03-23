"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  Shield,
  ArrowLeftRight,
  FileBarChart,
  MessageSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Landmark,
  BadgeCheck,
  Lock,
  Building,
  Users,
  AlertTriangle,
} from "lucide-react";

const navItems = [
  { href: "/bank", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/bank/liquidity", label: "Liquidite", icon: TrendingUp },
  { href: "/bank/compliance", label: "Conformite", icon: Shield },
  { href: "/bank/interbank", label: "Flux Interbancaires", icon: ArrowLeftRight },
  { href: "/bank/reports", label: "Rapports", icon: FileBarChart },
  { href: "/bank/alerts", label: "Alertes", icon: AlertTriangle },
  { href: "/bank/users", label: "Utilisateurs", icon: Users },
  { href: "/bank/messages", label: "Messagerie", icon: MessageSquare },
  { href: "/bank/settings", label: "Parametres", icon: Settings },
];

export function BankSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-white/5 bg-slate-950/95 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
              <Landmark className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">PIMPAY</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Institution</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
            <Landmark className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Institution Badge */}
      {!collapsed && (
        <div className="mx-4 mt-4 rounded-2xl bg-slate-800/50 border border-white/5 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 text-sm font-black text-white uppercase border border-white/10">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white">Banque Centrale</p>
                <BadgeCheck className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Acces securise</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="mt-6 space-y-1 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                isActive
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:bg-white/5 hover:text-slate-300"
              )}
            >
              <item.icon className={cn("h-5 w-5 shrink-0", collapsed && "mx-auto")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-slate-900 text-slate-400 hover:text-white transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
      </button>

      {/* Security Footer */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 p-4">
          <div className="rounded-2xl bg-slate-900/50 p-4 border border-white/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Securite</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="text-xs font-bold text-emerald-500">Connexion chiffree</p>
                </div>
              </div>
              <Shield className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
