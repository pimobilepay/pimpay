"use client";

import { useState, useEffect } from "react";
import { 
  Wallet, ArrowUpRight, ArrowDownLeft, RefreshCcw, 
  ShieldCheck, TrendingUp, CreditCard, LayoutGrid,
  History, Settings, Bell, ChevronRight
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { PI_CONSENSUS_USD, formatLocalCurrency } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";

export default function UserDashboard() {
  const [balance, setBalance] = useState(124.50); // En PI
  const [fiatCurrency, setFiatCurrency] = useState("USD");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const totalFiatValue = balance * PI_CONSENSUS_USD;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans overflow-x-hidden">
      
      {/* --- TOP NAVIGATION / HEADER --- */}
      <header className="px-6 pt-10 pb-6 flex justify-between items-center bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-black text-white shadow-lg shadow-blue-600/20">
            P
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mainnet Balance</p>
            <h1 className="text-lg font-black text-white tracking-tighter uppercase italic">PimPay Ledger</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
          </button>
        </div>
      </header>

      {/* --- MAIN ASSET CARD --- */}
      <section className="px-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-600 to-indigo-900 border-none rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-blue-600/20">
          <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12">
            <Wallet size={240} />
          </div>
          
          <div className="relative z-10 space-y-6">
            <div className="flex justify-between items-start">
              <span className="px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-widest">
                GCV Protocol Active
              </span>
              <ShieldCheck className="text-blue-200 opacity-50" size={20} />
            </div>

            <div className="space-y-1">
              <p className="text-6xl font-black text-white tracking-tighter">
                {balance.toFixed(2)} <span className="text-2xl text-blue-200">π</span>
              </p>
              <p className="text-xl font-bold text-blue-100/70 tracking-tight">
                ≈ {totalFiatValue.toLocaleString()} {fiatCurrency}
              </p>
            </div>

            <div className="pt-4 flex gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-indigo-800 bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                    {i === 3 ? "+" : "U"}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-blue-100/60 font-medium">Trusted by 2.4M Pioneers</p>
            </div>
          </div>
        </Card>
      </section>

      {/* --- QUICK ACTIONS --- */}
      <section className="px-6 mb-10">
        <div className="grid grid-cols-4 gap-4">
          {[
            { icon: <ArrowUpRight />, label: "Envoi", color: "bg-blue-600", link: "/dashboard/send" },
            { icon: <ArrowDownLeft />, label: "Retrait", color: "bg-emerald-600", link: "/dashboard/withdraw" },
            { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/dashboard/exchange" },
            { icon: <LayoutGrid />, label: "Plus", color: "bg-slate-800", link: "/dashboard/services" },
          ].map((action, i) => (
            <div key={i} className="flex flex-col items-center gap-3">
              <button className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform active:scale-90`}>
                {action.icon}
              </button>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{action.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* --- SERVICES & VAULTS --- */}
      <section className="px-6 space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Web3 Ecosystem</h2>
          <span className="text-[10px] text-blue-500 font-bold uppercase">Voir tout</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* Staking Vault */}
          <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-slate-900/60 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="font-bold text-white">Staking GCV</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Earn up to 12% APY</p>
              </div>
            </div>
            <ChevronRight className="text-slate-700" size={20} />
          </div>

          {/* Virtual Card */}
          <div className="p-6 bg-slate-900/40 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-slate-900/60 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 flex items-center justify-center text-pink-500">
                <CreditCard size={24} />
              </div>
              <div>
                <h3 className="font-bold text-white">Carte Virtuelle</h3>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Dépensez vos Pi partout</p>
              </div>
            </div>
            <div className="px-3 py-1 bg-pink-500/10 rounded-full text-[8px] font-black text-pink-500 uppercase tracking-widest">
              Soon
            </div>
          </div>
        </div>
      </section>

      {/* --- RECENT ACTIVITY --- */}
      <section className="px-6 mt-10 space-y-6 pb-10">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-black uppercase tracking-widest text-white italic">Recent Activity</h2>
          <History className="text-slate-700" size={18} />
        </div>

        <div className="space-y-3">
          {[
            { type: "Conversion", amount: "+ 895,353 CDF", sub: "0.001 PI", status: "Success", time: "12:40" },
            { type: "Transfert", amount: "- 0.50 PI", sub: "À: @Pioneer_RDC", status: "Pending", time: "Hier" },
          ].map((tx, i) => (
            <div key={i} className="p-4 bg-slate-900/20 border border-white/5 rounded-2xl flex justify-between items-center">
              <div className="flex gap-3 items-center">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.amount.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                  {tx.amount.startsWith('+') ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white">{tx.type}</p>
                  <p className="text-[10px] text-slate-500 font-medium">{tx.sub} • {tx.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black ${tx.amount.startsWith('+') ? 'text-emerald-400' : 'text-slate-200'}`}>{tx.amount}</p>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${tx.status === 'Pending' ? 'text-orange-500' : 'text-slate-600'}`}>{tx.status}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* NAVIGATION BAS DE PAGE */}
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
