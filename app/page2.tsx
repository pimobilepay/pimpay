"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Send, 
  Wallet, 
  Plus, 
  History, 
  Smartphone, 
  LayoutGrid, 
  CreditCard 
} from "lucide-react";

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32">
      {/* HEADER */}
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold italic shadow-lg shadow-blue-500/20">P</div>
          <div>
            <h1 className="text-lg font-black italic uppercase tracking-tighter leading-none">PIMPAY</h1>
            <p className="text-[10px] font-bold text-blue-400">Pi Mobile Money</p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center">
          <Smartphone size={18} className="text-slate-400" />
        </div>
      </header>

      <main className="px-6">
        {/* CARTE DE SOLDE */}
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[32px] p-6 shadow-2xl overflow-hidden border border-white/10 mb-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
          <p className="text-white/60 text-xs uppercase font-bold tracking-widest mb-1">Solde Total</p>
          <h2 className="text-4xl font-black tracking-tighter mb-4">π 1,250.75</h2>
          <div className="flex items-center gap-2 bg-black/20 w-fit px-3 py-1 rounded-full backdrop-blur-md border border-white/5">
            <p className="text-[10px] font-mono font-medium">1 Pi = $314,159.00 USD</p>
          </div>
          <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
            <p className="font-mono text-[10px] opacity-40">MAINNET ACTIVE</p>
            <CreditCard size={24} className="opacity-30" />
          </div>
        </div>

        {/* BOUTONS D'ACTION RAPIDE */}
        <div className="grid grid-cols-4 gap-4 mb-10">
          {[
            { icon: <Plus size={20} />, label: "Dépôt" },
            { icon: <ArrowUpCircle size={20} />, label: "Retrait" },
            { icon: <LayoutGrid size={20} />, label: "MPay" },
            { icon: <Send size={20} />, label: "Transfert" },
          ].map((item, idx) => (
            <div key={idx} className="flex flex-col items-center gap-2">
              <button className="w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-blue-400 hover:bg-blue-600 hover:text-white transition-all shadow-xl">
                {item.icon}
              </button>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>

        {/* TRANSACTIONS RÉCENTES */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Transactions Récentes</h3>
            <History size={16} className="text-slate-600" />
          </div>

          <div className="space-y-4">
            <TransactionItem 
              title="Dépôt Mobile Money" 
              time="Il y a 2 heures" 
              amount="+π 50.00" 
              isPositive 
            />
            <TransactionItem 
              title="Retrait vers MTN" 
              time="Hier" 
              amount="-π 25.50" 
              isPositive={false} 
            />
            <TransactionItem 
              title="Recharge Mobile" 
              time="Il y a 3 jours" 
              amount="-π 5.00" 
              isPositive={false} 
            />
          </div>
        </section>
      </main>

      {/* NAVIGATION BASSE */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-[24px] flex items-center justify-around px-2 z-[100] shadow-2xl">
        <NavItem icon={<Wallet size={22} />} label="Wallet" active />
        <NavItem icon={<Plus size={22} />} label="Dépôt" />
        <NavItem icon={<LayoutGrid size={22} />} label="MPay" />
        <NavItem icon={<ArrowUpCircle size={22} />} label="Retrait" />
        <NavItem icon={<Send size={22} />} label="Envoi" />
      </nav>
    </div>
  );
}

function TransactionItem({ title, time, amount, isPositive }: { title: string, time: string, amount: string, isPositive: boolean }) {
  return (
    <div className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {isPositive ? <ArrowDownCircle size={20} /> : <ArrowUpCircle size={20} />}
        </div>
        <div>
          <p className="text-sm font-bold">{title}</p>
          <p className="text-[10px] text-slate-500 font-medium uppercase tracking-tight">{time}</p>
        </div>
      </div>
      <p className={`font-black ${isPositive ? 'text-emerald-400' : 'text-slate-300'}`}>{amount}</p>
    </div>
  );
}

function NavItem({ icon, label, active = false }: { icon: any, label: string, active?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-1 cursor-pointer transition-all ${active ? 'text-blue-500' : 'text-slate-500 hover:text-white'}`}>
      {icon}
      <span className="text-[8px] font-black uppercase tracking-tighter">{label}</span>
      {active && <div className="w-1 h-1 bg-blue-500 rounded-full mt-0.5" />}
    </div>
  );
}
