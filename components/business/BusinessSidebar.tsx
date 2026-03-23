"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Wallet,
  ArrowRightLeft,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Building2,
  BadgeCheck,
  Banknote,
  PiggyBank,
} from "lucide-react";

const navItems = [
  { href: "/business", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/business/payroll", label: "Paie & Salaires", icon: Users },
  { href: "/business/treasury", label: "Tresorerie", icon: PiggyBank },
  { href: "/business/transactions", label: "Transactions", icon: ArrowRightLeft },
  { href: "/business/payments", label: "Paiements", icon: Banknote },
  { href: "/business/reports", label: "Rapports", icon: FileText },
  { href: "/business/settings", label: "Parametres", icon: Settings },
];

export function BusinessSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-white/5 bg-slate-950/90 backdrop-blur-xl transition-all duration-300",
        collapsed ? "w-[72px]" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex h-16 items-center justify-between border-b border-white/5 px-4">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">PIMPAY</h1>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Business</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
            <Building2 className="h-5 w-5 text-white" />
          </div>
        )}
      </div>

      {/* Company Badge */}
      {!collapsed && (
        <div className="mx-4 mt-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-sm font-black text-emerald-500 uppercase">
              EP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white">Entreprise Pro</p>
                <BadgeCheck className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-[9px] font-bold text-emerald-500/70 uppercase tracking-wider">Compte verifie</p>
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
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "text-slate-500 hover:bg-white/5 hover:text-white"
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

      {/* Balance Footer */}
      {!collapsed && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-white/5 p-4">
          <div className="rounded-2xl bg-slate-900/50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Solde Total</p>
                <p className="text-lg font-black text-white">$247,850.00</p>
              </div>
              <Wallet className="h-5 w-5 text-emerald-500" />
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
