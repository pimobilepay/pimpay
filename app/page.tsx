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
  User as UserIcon,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const router = useRouter();
  const { handlePayment } = usePiPayment();

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else if (res.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      toast.error("Erreur de synchronisation");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchUserData();
  }, []);

  const handleLogout = () => {
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    localStorage.removeItem("token");
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
            <h1 className="text-lg font-black uppercase tracking-tighter leading-none">PIMPAY</h1>
            <p className="text-[10px] font-bold text-blue-400">Pi Mobile Pay</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => fetchUserData()} className={`p-2 text-slate-400 ${loading ? 'animate-spin' : ''}`}>
            <RefreshCw size={18} />
          </button>
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
          <div className="flex justify-between items-start">
            <div>
               <p className="text-white/60 text-[10px] uppercase font-bold tracking-widest mb-1">Solde Disponible</p>
               <div className="flex items-center gap-3">
                  <h2 className="text-4xl font-black tracking-tighter">
                    π {loading ? "..." : (showBalance ? (user?.balance?.toLocaleString() || "0.00") : "****")}
                  </h2>
                  <button onClick={() => setShowBalance(!showBalance)} className="opacity-60">
                    {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
               </div>
            </div>
            <CreditCard size={24} className="opacity-30" />
          </div>

          <div className="mt-6 flex items-center gap-2 bg-black/20 w-fit px-3 py-1.5 rounded-xl backdrop-blur-md border border-white/5">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <p className="text-[10px] font-mono font-medium text-emerald-400">
              GCV: ${showBalance ? (user?.balance * 314159)?.toLocaleString() : "****"} USD
            </p>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <div>
              <p className="font-mono text-[9px] text-white/40 uppercase">Propriétaire: {user?.name || "Pioneer"}</p>
              <p className="font-mono text-[9px] text-white/40 uppercase">Network: Pi Mainnet</p>
            </div>
            <div className="text-[10px] font-black italic bg-white/10 px-2 py-1 rounded">VIP</div>
          </div>
        </div>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Flux de transactions</h3>
            <History size={16} className="text-slate-600" />
          </div>

          <div className="space-y-4">
            {/* On pourrait mapper ici user?.transactions si l'API les renvoyait */}
            <TransactionItem title="Recharge Mobile Money" type="DEPOSIT" amount="+π 50.00" status="SUCCESS" time="Il y a 2h" />
            <TransactionItem title="Transfert à @moussa" type="TRANSFER" amount="-π 25.50" status="SUCCESS" time="Hier" />
            <TransactionItem title="Retrait Wave CI" type="WITHDRAW" amount="-π 5.00" status="PENDING" time="Hier" />
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => toast.info(`Session active: ${user?.email || "Invité"}`)} />
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
