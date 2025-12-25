"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Ajout du router
import {
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ShieldCheck, TrendingUp, LayoutGrid,
  History, Bell, ChevronRight, Loader2, ArrowUpCircle, ArrowDownCircle
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";

export default function UserDashboard() {
  const router = useRouter(); // Initialisation du router
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const savedUser = localStorage.getItem("pimpay_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }

        const token = localStorage.getItem("token");
        const response = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const result = await response.json();
          setUser((prev: any) => ({
            ...prev,
            id: result.profile?.id ?? prev?.id, // Assure-toi d'avoir l'ID pour les détails
            balance: result.stats?.piBalance ?? prev?.balance,
            fullName: result.profile?.fullName ?? prev?.name,
            timeline: result.timeline ?? []
          }));
        }
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  const balance = user?.balance || 0;
  const userName = user?.fullName || user?.name || "Pioneer";
  const timeline = user?.timeline || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">PIMPAY Sync...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans overflow-x-hidden">
      
      {/* HEADER */}
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold italic shadow-lg shadow-blue-500/20">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">{userName}</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Mainnet Balance</p>
          </div>
        </div>
        <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
        </button>
      </header>

      <main className="px-6">
        {/* MAIN CARD */}
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[32px] p-6 shadow-2xl border border-white/10 mb-8 mt-4 overflow-hidden">
          <div className="relative z-10">
            <p className="text-white/60 text-xs uppercase font-bold tracking-widest mb-1">Solde Total (PI)</p>
            <h2 className="text-4xl font-black tracking-tighter mb-4">
               π {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
            </h2>

            <div className="flex items-center gap-2 bg-black/20 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
              <p className="text-[10px] font-mono font-medium tracking-tight">
                ≈ ${(balance * PI_CONSENSUS_USD).toLocaleString()} USD
              </p>
            </div>
          </div>

          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <div>
              <p className="font-mono text-[10px] opacity-40 uppercase tracking-tighter">ID: {user?.id?.substring(0, 8) || "GUEST"}...</p>
              <p className="font-mono text-[10px] opacity-40 uppercase">Status: GCV Active</p>
            </div>
            <ShieldCheck size={24} className="opacity-30 text-blue-200" />
          </div>

          <div className="absolute -right-6 -top-6 opacity-10 rotate-12">
            <Wallet size={180} />
          </div>
        </div>

        {/* QUICK ACTIONS - LIEN VERS /send MIS À JOUR */}
        <section className="mb-10">
          <div className="grid grid-cols-4 gap-4">
            {[
              { icon: <ArrowUpRight />, label: "Envoi", color: "bg-blue-600", link: "/send" },
              { icon: <ArrowDownLeft />, label: "Retrait", color: "bg-emerald-600", link: "/withdraw" },
              { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/dashboard/exchange" },
              { icon: <LayoutGrid />, label: "Plus", color: "bg-slate-800", link: "/dashboard/services" },
            ].map((action, i) => (
              <div key={i} className="flex flex-col items-center gap-3">
                <button
                  onClick={() => router.push(action.link)}
                  className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-90`}
                >
                  {action.icon}
                </button>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{action.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* RECENT ACTIVITY - REDIRECTION VERS DÉTAILS */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Activités Récentes</h3>
            <History size={16} className="text-slate-600" />
          </div>

          <div className="space-y-4">
            {timeline.length > 0 ? timeline.map((tx: any, i: number) => (
              <div 
                key={i} 
                onClick={() => router.push(`/transactions/${tx.id}`)} // Navigation vers la page détails
                className="p-4 bg-slate-900/40 border border-white/5 rounded-[24px] flex justify-between items-center active:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${tx.type === 'RECEIVED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                    {tx.type === 'RECEIVED' ? <ArrowDownCircle size={22} /> : <ArrowUpCircle size={22} />}
                  </div>
                  <div>
                    <p className="text-[13px] font-bold leading-tight">
                      {tx.type === 'RECEIVED' ? 'Reçu de ' : 'Envoyé à '} {tx.contact?.firstName || 'Pioneer'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${tx.status === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {tx.status}
                      </p>
                      <span className="text-[9px] text-slate-600 font-medium">
                        {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                   <p className={`text-sm font-black ${tx.type === 'RECEIVED' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {tx.type === 'RECEIVED' ? '+' : '-'}π {tx.amount}
                  </p>
                  <ChevronRight size={14} className="text-slate-700" />
                </div>
              </div>
            )) : (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-[24px]">
                 <p className="text-[10px] font-bold uppercase text-slate-600 tracking-widest">Aucune transaction</p>
              </div>
            )}
          </div>
        </section>

        {/* ECOSYSTEME */}
        <section className="space-y-4 pb-10">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-500">Ecosystème Web3</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="p-5 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between cursor-pointer active:scale-[0.98] transition-transform">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Staking GCV</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Earn up to 12% APY</p>
                </div>
              </div>
              <ChevronRight className="text-slate-700" size={20} />
            </div>
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
