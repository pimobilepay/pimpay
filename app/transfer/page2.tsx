"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/bottom-nav";
import { 
  ArrowLeft, Send, CircleDot, Zap, ShieldCheck, 
  Wallet, ArrowRightLeft, Info 
} from "lucide-react";
import Link from "next/link";

type TransferMode = "mpay" | "blockchain";

export default function TransferPage() {
  const [mode, setMode] = useState<TransferMode>("mpay");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const availableBalance = 1250.75;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-32 font-sans selection:bg-blue-500/30">
      
      {/* HEADER FINTECH */}
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white">TRANSFERT</h1>
            <div className="flex items-center gap-2 mt-1">
              <CircleDot size={10} className="text-blue-500 animate-pulse" />
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Asset Delivery</span>
            </div>
          </div>
        </div>

        {/* BALANCE CARD */}
        <Card className="bg-slate-900/60 border-white/5 rounded-[2rem] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Zap size={80} className="text-blue-500" />
          </div>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Available Ledger</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white tracking-tighter">π {availableBalance.toLocaleString()}</span>
            <span className="text-[10px] font-bold text-blue-400 uppercase">Verified</span>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-8">
        
        {/* SELECTEUR DE MODE (SANS ITALIQUE) */}
        <div className="flex gap-2 p-1.5 bg-slate-900/50 border border-white/5 rounded-[2rem]">
          <button 
            onClick={() => setMode("mpay")}
            className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === "mpay" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500"
            }`}
          >
            <ArrowRightLeft size={14} /> Mpay Transfer
          </button>
          <button 
            onClick={() => setMode("blockchain")}
            className={`flex-1 py-4 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              mode === "blockchain" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-slate-500"
            }`}
          >
            <Wallet size={14} /> Pi Wallet
          </button>
        </div>

        {/* FORMULAIRE */}
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2 px-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                {mode === "mpay" ? "Recipient ID / Email" : "Pi Wallet Address"}
              </label>
              <div className="relative">
                <Input
                  placeholder={mode === "mpay" ? "@username ou email" : "GDUO... (Mainnet Address)"}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="h-16 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-sm font-bold focus:border-blue-500/30 transition-all text-white placeholder:text-slate-700"
                />
                <ShieldCheck size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700" />
              </div>
            </div>

            <div className="space-y-2 px-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Amount to Send (π)</label>
              <div className="relative">
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-16 bg-slate-900/40 border-white/5 rounded-2xl px-6 text-xl font-black focus:border-blue-500/30 transition-all text-white placeholder:text-slate-700"
                />
                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xs">PI COIN</span>
              </div>
            </div>
          </div>

          {/* INFO CARD */}
          <Card className="bg-blue-600/5 border border-blue-500/10 rounded-[2rem] p-5 flex gap-4 items-start">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
              <Info size={18} />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white uppercase tracking-tight">Security Protocol</p>
              <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                {mode === "mpay" 
                  ? "Les transferts internes Mpay sont instantanés et sans frais." 
                  : "Les transferts vers le Portefeuille Pi (Mainnet) peuvent prendre quelques minutes."}
              </p>
            </div>
          </Card>

          {/* BOUTON D'ACTION */}
          <Button 
            className="w-full h-20 bg-blue-600 hover:bg-blue-500 text-white rounded-[2rem] shadow-xl shadow-blue-600/20 group transition-all"
          >
            <div className="flex flex-col items-center">
              <span className="text-xs font-black uppercase tracking-[4px]">Confirm Transfer</span>
              <span className="text-[9px] font-bold text-blue-200 uppercase opacity-60">Secured by Pimpay Core</span>
            </div>
          </Button>
        </div>
      </div>

      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
