"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, CheckCircle2, Wallet, Smartphone, 
  ArrowRight, ShieldCheck, Info, Clock, Receipt
} from "lucide-react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";

// On simule ici la data qui viendrait d'un fetch sur le modèle Wallet
const userWallet = {
  balance: 1250.45, // Correspond au champ 'balance' de ton modèle Wallet
  currency: "USD",
  type: "FIAT"
};

export default function DepositSummaryPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 pb-40 font-sans">
      <div className="px-6 pt-12 pb-8 bg-gradient-to-b from-blue-600/10 to-transparent">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/deposit">
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white">
              <ArrowLeft size={20} />
            </div>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase">Résumé</h1>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[2px]">Vérification finale</span>
          </div>
        </div>

        {/* SOLDE RÉEL (Modèle Wallet) */}
        <Card className="bg-blue-600 border-none rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10">
            <Wallet size={100} />
          </div>
          <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest opacity-80">Ton Solde {userWallet.currency}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black text-white tracking-tighter">${userWallet.balance.toLocaleString()}</span>
          </div>
        </Card>
      </div>

      <div className="px-6 space-y-6">
        <Card className="bg-slate-900/60 border border-white/10 rounded-[2.5rem] p-8 shadow-xl">
          <div className="flex flex-col items-center border-b border-white/5 pb-6 mb-6">
            <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center border border-blue-500/20 mb-4">
              <Receipt className="text-blue-500" size={28} />
            </div>
            <h2 className="text-4xl font-black text-white">$50.00</h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">Montant à créditer</p>
          </div>

          <div className="space-y-5">
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase">Méthode</span>
              <span className="text-sm font-bold text-white">Mobile Money (Airtel)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase">Téléphone</span>
              <span className="text-sm font-bold text-white">+243 812 345 678</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase">Frais (SystemConfig)</span>
              <span className="text-sm font-bold text-green-400">0.00 USD</span>
            </div>
          </div>
        </Card>

        <Button className="w-full h-18 bg-blue-600 hover:bg-blue-700 text-white rounded-[2rem] font-black uppercase tracking-[0.2em] py-8 shadow-xl group">
          Confirmer le dépôt
          <ArrowRight size={20} className="ml-3 group-hover:translate-x-1 transition-all" />
        </Button>
      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
