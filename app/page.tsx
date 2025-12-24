"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowUpCircle,
  ArrowDownCircle,
  History,
  Smartphone,
  CreditCard,
  Home,
  ArrowDownToLine,
  ArrowUpFromLine,
  Menu,
  Wallet as WalletIcon,
  Send,
  LogOut,
  User as UserIcon
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
// Assure-toi que ce fichier existe bien dans hooks/usePiPayment.ts
import { usePiPayment } from "@/hooks/usePiPayment"; 

interface BottomNavProps {
  onOpenMenu: () => void;
}

function BottomNav({ onOpenMenu }: BottomNavProps) {
  const pathname = usePathname();
  const hiddenPaths = ["/auth/login", "/auth/signup"];
  if (hiddenPaths.includes(pathname)) return null;

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
      <div className="mx-0 bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[24px] shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-around items-center h-20 px-1">
          {navItems.map((item, idx) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            if (item.special) {
              return (
                <Link key={idx} href={item.href} className="flex flex-col items-center">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${isActive ? "bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.6)] border-2 border-white/20" : "bg-slate-800 border border-white/10"}`}>
                    <Icon className={`h-6 w-6 ${isActive ? "text-white" : "text-blue-400"}`} />
                  </div>
                  <span className={`text-[9px] font-bold mt-1 uppercase tracking-tighter ${isActive ? "text-blue-400" : "text-slate-500"}`}>{item.label}</span>
                </Link>
              );
            }
            if (item.isMenuButton) {
              return (
                <button key={idx} onClick={onOpenMenu} className="flex flex-col items-center justify-center gap-1 min-w-[50px]">
                  <Icon className="h-5 w-5 text-slate-500" />
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{item.label}</span>
                </button>
              );
            }
            return (
              <Link key={idx} href={item.href} className="flex flex-col items-center justify-center gap-1 min-w-[50px]">
                <Icon className={`h-5 w-5 ${isActive ? "text-blue-500" : "text-slate-500"}`} />
                <span className={`text-[9px] font-bold uppercase tracking-tighter ${isActive ? "text-blue-500" : "text-slate-500"}`}>{item.label}</span>
                {isActive && <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { handlePayment } = usePiPayment();

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem("pimpay_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Erreur parse user", e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("pimpay_user");
    setUser(null);
    toast.success("Déconnexion réussie");
    router.push("/auth/login");
  };

  if (!mounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold italic shadow-lg shadow-blue-500/20">P</div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">PIMPAY</h1>
            <p className="text-[10px] font-bold text-blue-400">Pi Mobile Money</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <button onClick={handleLogout} className="flex items-center gap-2 bg-slate-900 border border-white/10 px-4 py-2 rounded-full active:scale-95 transition-all">
              <LogOut size={14} className="text-rose-500" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-slate-300">Quitter</span>
            </button>
          ) : (
            <Link href="/auth/login" className="flex items-center gap-2 bg-blue-600 px-4 py-2 rounded-full active:scale-95 transition-all shadow-lg shadow-blue-500/20">
              <UserIcon size={14} className="text-white" />
              <span className="text-[10px] font-bold uppercase tracking-tight text-white">Connexion</span>
            </Link>
          )}
        </div>
      </header>

      <main className="px-6">
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[32px] p-6 shadow-2xl border border-white/10 mb-8 mt-4 overflow-hidden">
          <p className="text-white/60 text-xs uppercase font-bold tracking-widest mb-1">Solde Total (PI)</p>
          <h2 className="text-4xl font-black tracking-tighter mb-4">
             π {user?.balance?.toFixed(2) || "1,250.75"}
          </h2>
          <div className="flex items-center gap-2 bg-black/20 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
            <p className="text-[10px] font-mono font-medium">1 Pi = $314,159.00 USD</p>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <div>
              <p className="font-mono text-[10px] opacity-40 uppercase tracking-tighter">ID: {user?.id?.substring(0, 8) || "GUEST"}...</p>
              <p className="font-mono text-[10px] opacity-40 uppercase">Network: Mainnet</p>
            </div>
            <CreditCard size={24} className="opacity-30" />
          </div>
        </div>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Activités Récentes</h3>
            <History size={16} className="text-slate-600" />
          </div>

          <div className="space-y-4">
            <TransactionItem title="Recharge Mobile Money" type="DEPOSIT" amount="+π 50.00" status="SUCCESS" time="Il y a 2h" />
            <TransactionItem title="Transfert à @moussa" type="TRANSFER" amount="-π 25.50" status="SUCCESS" time="Hier" />
            <TransactionItem title="Retrait Wave CI" type="WITHDRAW" amount="-π 5.00" status="PENDING" time="Hier" />
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => toast.info(`Utilisateur: ${user?.name || "Non connecté"}`)} />
    </div>
  );
}

function TransactionItem({ title, type, amount, status, time }: { title: string, type: string, amount: string, status: string, time?: string }) {
  const isPositive = amount.startsWith('+');
  return (
    <div className="p-4 bg-slate-900/40 border border-white/5 rounded-[24px] flex justify-between items-center active:bg-slate-800/60 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {isPositive ? <ArrowDownCircle size={22} /> : <ArrowUpCircle size={22} />}
        </div>
        <div>
          <p className="text-[13px] font-bold leading-tight">{title}</p>
          <div className="flex items-center gap-2 mt-1">
            <p className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
              {status}
            </p>
            <span className="text-[9px] text-slate-600 font-medium">{time}</span>
          </div>
        </div>
      </div>
      <p className={`text-sm font-black ${isPositive ? 'text-emerald-400' : 'text-slate-300'}`}>{amount}</p>
    </div>
  );
}
