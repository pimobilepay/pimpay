"use client";                                     
import React, { useEffect, useState } from "react";
import { CreditCard, ShieldCheck, Zap, Wallet as WalletIcon, Smartphone, Home, ArrowDownToLine, ArrowUpFromLine, Menu, Send } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// --- BOTTOM NAV IDENTIQUE ---
function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();                   const navItems = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/wallet", icon: WalletIcon, label: "Wallet" },
    { href: "/deposit", icon: ArrowDownToLine, label: "Dépôt" },                                        { href: "/mpay", icon: Smartphone, label: "MPay", special: true },                                  { href: "/withdraw", icon: ArrowUpFromLine, label: "Retrait" },
    { href: "/transfer", icon: Send, label: "Envoi" },
    { href: "#", icon: Menu, label: "Menu", isMenuButton: true },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90]">
      <div className="mx-0 bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[24px] h-20 flex justify-around items-center px-1">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          if (item.special) return (
            <Link key={idx} href={item.href} className="flex flex-col items-center">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isActive ? "bg-blue-600" : "bg-slate-800"}`}><Icon className="h-6 w-6 text-white"/></div>
              <span className="text-[9px] text-slate-500 mt-1 uppercase">{item.label}</span>
            </Link>
          );
          return (
            <Link key={idx} href={item.href} className="flex flex-col items-center">
              <Icon className={`h-5 w-5 ${isActive ? "text-blue-500" : "text-slate-500"}`} />
              <span className={`text-[9px] uppercase ${isActive ? "text-blue-500" : "text-slate-500"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <div className="px-6 pt-12">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter mb-8">Mon Portefeuille</h1>

        {/* CARTE VIRTUELLE (VirtualCard Model) */}
        <div className="w-full aspect-[1.58/1] bg-gradient-to-tr from-slate-800 to-slate-950 rounded-[24px] p-8 border border-white/10 relative overflow-hidden mb-10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20"><Zap size={100} /></div>
          <div className="flex justify-between items-start mb-12">
            <CreditCard className="text-blue-500" size={32} />
            <span className="text-xs font-mono tracking-widest text-slate-500">PIMPAY VIRTUAL</span>
          </div>
          <div className="space-y-4">
            <p className="text-2xl font-mono tracking-[0.2em]">**** **** **** 4492</p>
            <div className="flex gap-8">
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold">Expire</p>
                <p className="text-sm font-mono">12/28</p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-slate-500 font-bold">Titulaire</p>
                <p className="text-sm font-bold uppercase tracking-tight">Pi Pioneer</p>
              </div>
            </div>
          </div>
        </div>

        {/* STATISTIQUES RAPIDES */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 bg-slate-900/50 border border-white/10 rounded-[24px]">
            <ShieldCheck className="text-emerald-500 mb-2" size={20} />
            <p className="text-[10px] text-slate-500 uppercase font-bold">KYC Status</p>
            <p className="text-sm font-black text-emerald-400">VERIFIED</p>
          </div>
          <div className="p-6 bg-slate-900/50 border border-white/10 rounded-[24px]">
            <WalletIcon className="text-blue-500 mb-2" size={20} />
            <p className="text-[10px] text-slate-500 uppercase font-bold">Wallet Type</p>
            <p className="text-sm font-black">PI NETWORK</p>
          </div>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
