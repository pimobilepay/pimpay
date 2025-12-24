"use client";

import React, { useEffect, useState } from "react";
import { 
  CreditCard, ShieldCheck, Zap, Wallet as WalletIcon, 
  Smartphone, Home, ArrowDownToLine, ArrowUpFromLine, 
  Menu, Send, Eye, EyeOff, QrCode as QrIcon 
} from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

// --- BOTTOM NAV IDENTIQUE ---
function BottomNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const navItems = [
    { href: "/", icon: Home, label: "Accueil" },
    { href: "/wallet", icon: WalletIcon, label: "Wallet" },
    { href: "/deposit", icon: ArrowDownToLine, label: "Dépôt" },
    { href: "/mpay", icon: Smartphone, label: "MPay", special: true },
    { href: "/withdraw", icon: ArrowUpFromLine, label: "Retrait" },
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
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [user, setUser] = useState<any>(null);

  const cardNumber = "4509 1234 5678 4492";

  useEffect(() => { 
    setMounted(true); 
    const stored = localStorage.getItem("pimpay_user");
    if(stored) setUser(JSON.parse(stored));
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <div className="px-6 pt-12">
        {/* HEADER SANS ITALIQUE AVEC SOUS-TITRE */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tighter">Mon Portefeuille</h1>
          <p className="text-blue-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-1">finTech web3 complet</p>
        </div>

        {/* CARTE VIRTUELLE */}
        <div className="w-full aspect-[1.58/1] bg-gradient-to-tr from-slate-800 to-slate-950 rounded-[24px] p-8 border border-white/10 relative overflow-hidden mb-10 shadow-2xl">
          <div className="absolute top-0 right-0 p-8 opacity-20"><Zap size={100} /></div>
          
          <div className="flex justify-between items-start mb-10">
            <div className="flex flex-col gap-1">
                <CreditCard className="text-blue-500" size={32} />
                <span className="text-[10px] font-mono tracking-widest text-slate-500 mt-2 uppercase">PimPay Virtual</span>
            </div>
            
            <button 
                onClick={() => setShowCardNumber(!showCardNumber)}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400"
            >
                {showCardNumber ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="space-y-6">
            <p className="text-2xl font-mono tracking-[0.2em]">
              {showCardNumber ? cardNumber : "**** **** **** 4492"}
            </p>
            
            <div className="flex gap-12 mt-4">
              <div className="flex flex-col gap-1">
                <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Expire</p>
                <p className="text-sm font-mono font-bold tracking-tighter">12 / 28</p>
              </div>
              
              <div className="flex flex-col gap-1">
                <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">Titulaire</p>
                <p className="text-sm font-bold uppercase tracking-tight text-white/90">
                    {user?.name || "Pi Pioneer"}
                </p>
              </div>

              {showCardNumber && (
                <div className="flex flex-col gap-1 animate-in fade-in duration-300">
                    <p className="text-[9px] uppercase text-slate-500 font-bold tracking-widest">CVV</p>
                    <p className="text-sm font-mono font-bold text-blue-400">342</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION QR CODE (Version sans bibliothèque externe) */}
        <div className="mb-10 p-6 bg-slate-900/30 border border-white/10 rounded-[24px] flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 mb-2 w-full">
            <QrIcon className="text-blue-500" size={20} />
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Votre QR Code de Dépôt</p>
          </div>
          
          {/* Simulation visuelle du QR Code avec une icône si la lib n'est pas installée */}
          <div className="p-8 bg-white rounded-3xl shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <div className="w-32 h-32 border-4 border-slate-900 rounded-lg flex items-center justify-center relative">
                <div className="absolute inset-2 border-2 border-dashed border-slate-400 opacity-20" />
                <QrIcon size={80} className="text-slate-900" />
            </div>
          </div>
          
          <div className="text-center space-y-2">
            <p className="text-[11px] font-mono text-blue-400 break-all px-4 uppercase font-bold">
               {user?.walletAddress || "PI-PORTAL-ADDRESS-NOT-SET"}
            </p>
            <p className="text-[10px] text-slate-500 max-w-[220px] leading-relaxed mx-auto">
              Utilisez cette adresse ou le QR Code pour recharger votre compte.
            </p>
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
            <p className="text-sm font-black uppercase">PI NETWORK</p>
          </div>
        </div>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
