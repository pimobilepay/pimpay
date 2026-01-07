"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck, Wallet as WalletIcon, Eye, EyeOff,
  ArrowUpRight, ArrowDownLeft, RefreshCcw,
  ArrowLeftRight, ShieldAlert, History, Plus
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { BottomNav } from "@/components/bottom-nav";

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const assetConfig: Record<string, { name: string, color: string, bg: string }> = {
    "PI": { name: "Pi Network", color: "text-purple-400", bg: "bg-purple-500/20" },
    "BTC": { name: "Bitcoin", color: "text-orange-400", bg: "bg-orange-500/20" },
    "SDA": { name: "Sidra Chain", color: "text-emerald-400", bg: "bg-emerald-500/20" },
    "USD": { name: "US Dollar", color: "text-blue-400", bg: "bg-blue-500/20" },
  };

  useEffect(() => {
    setMounted(true);
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/wallet');
      if (res.ok) {
        const walletData = await res.json();
        setData(walletData);
      } else {
        toast.error("Erreur de synchronisation");
      }
    } catch (err) {
      toast.error("Connexion au nœud impossible");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const cryptoAssets = ["PI", "BTC", "SDA"];

  return (
    /* Changement : Utilisation de w-full et suppression du fond fixe pour laisser le ClientLayout gérer le scroll */
    <div className="w-full pb-32 font-sans selection:bg-blue-500/30">
      
      {/* Container ajusté : max-w-md reste pour le look "Mobile First", mais on centre dans l'espace disponible */}
      <div className="px-6 pt-12 max-w-md mx-auto lg:ml-auto lg:mr-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tighter text-white">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
                Multi-Asset Node v4.5
              </p>
            </div>
          </div>
          <button
            onClick={loadWalletData}
            disabled={loading}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:rotate-180 transition-all duration-500 disabled:opacity-50"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* CARTE VIRTUELLE */}
        <div className="group relative w-full aspect-[1.58/1] mb-4">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 rounded-[32px] p-8 border border-white/20 shadow-2xl relative overflow-hidden transition-all duration-500 group-hover:scale-[1.01]">
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                 <div className="flex items-center gap-2">
                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
                        <WalletIcon size={20} className="text-white" />
                    </div>
                    <span className="text-[10px] font-black tracking-widest text-blue-100/50 uppercase">Virtual Card</span>
                 </div>
                 <p className="text-3xl font-black text-white tracking-tighter mt-2">
                   {loading ? "..." : `$${data?.balances?.USD?.balance?.toLocaleString() || "0.00"}`}
                 </p>
              </div>
              <div className="h-10 w-14 bg-white/10 rounded-lg backdrop-blur-md border border-white/10 flex items-center justify-center italic font-black text-xs text-blue-200 uppercase">
                USD
              </div>
            </div>
            <div className="mt-8 relative z-10">
              <p className="text-lg font-mono tracking-[0.25em] text-white drop-shadow-md">
                {showCardNumber ? data?.virtualCard?.number : `•••• •••• •••• ${data?.virtualCard?.number?.slice(-4) || "0000"}`}
              </p>
            </div>
            <div className="flex justify-between items-end mt-auto relative z-10 border-t border-white/10 pt-4">
              <div>
                <p className="text-[7px] uppercase text-blue-300/50 font-black tracking-widest mb-1">Card Holder</p>
                <p className="text-xs font-black uppercase tracking-widest text-white">{data?.profile?.name || "Pioneer"}</p>
              </div>
              <div className="text-right">
                <p className="text-[7px] uppercase text-blue-300/50 font-black tracking-widest mb-1">Expiry</p>
                <p className="text-xs font-mono font-bold text-white">{data?.virtualCard?.exp || "--/--"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* KYC & SECURITY */}
        <div className="flex justify-between items-center mb-8 px-2">
            <div className="flex items-center gap-2">
                 <ShieldCheck size={14} className={data?.profile?.kycStatus === "VERIFIED" ? "text-emerald-500" : "text-orange-500"} />
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    KYC {data?.profile?.kycStatus || "PENDING"}
                 </span>
            </div>
            <button
                onClick={() => setShowCardNumber(!showCardNumber)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full hover:bg-white/10 transition-all"
            >
                {showCardNumber ? <EyeOff size={12} className="text-slate-400" /> : <Eye size={12} className="text-blue-400" />}
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400">Security View</span>
            </button>
        </div>

        {/* WEB3 ACTIONS */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { icon: <Plus />, label: "Deposit", color: "bg-blue-500", link: "/deposit" },
            { icon: <ArrowUpRight />, label: "Send", color: "bg-indigo-600", link: "/transfer" },
            { icon: <ArrowLeftRight />, label: "Swap", color: "bg-purple-600", link: "/swap" },
            { icon: <History />, label: "Logs", color: "bg-slate-700", link: "/transactions" },
          ].map((action, i) => (
            <Link key={`action-${i}`} href={action.link} className="flex flex-col items-center gap-2 group">
              <div className={`w-14 h-14 ${action.color} rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-black/40 group-active:scale-90 transition-all`}>
                {React.cloneElement(action.icon as React.ReactElement, { size: 20 })}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">{action.label}</span>
            </Link>
          ))}
        </div>

        {/* MES CRYPTOS */}
        <div className="mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Mes Actifs Crypto</h3>
          <div className="space-y-3">
            {cryptoAssets.map((cur) => {
              const config = assetConfig[cur];
              const balance = data?.balances?.[cur]?.balance;
              return (
                <div key={`asset-${cur}`} className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${config.bg} ${config.color}`}>
                      {cur}
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase text-white tracking-tight">{config.name}</p>
                      <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Network Node Active</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">
                       {loading ? "..." : (balance?.toLocaleString() || "0.00")}
                    </p>
                    <p className={`text-[8px] font-bold mt-1 uppercase italic ${config.color}`}>{cur}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* HISTORY */}
        <div className="space-y-5">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">History</h3>
            <Link href="/transactions" className="p-2 bg-white/5 rounded-xl border border-white/5">
                <ArrowUpRight size={14} className="text-blue-500" />
            </Link>
          </div>
          <div className="space-y-3">
            {data?.history?.length > 0 ? (
              data.history.map((tx: any) => (
                <div key={tx.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border ${
                        tx.direction === "IN"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                        : "bg-blue-500/10 border-blue-500/20 text-blue-400"
                      }`}>
                        {tx.direction === "IN" ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase text-white tracking-tight">{tx.label}</p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter mt-0.5">{tx.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                        <p className={`text-xs font-black ${tx.direction === "IN" ? "text-emerald-400" : "text-white"}`}>
                        {tx.direction === "IN" ? "+" : "-"} {tx.amount.toFixed(2)} {tx.currency}
                        </p>
                        <p className="text-[8px] font-bold text-slate-600 mt-1 uppercase italic">{tx.status}</p>
                    </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 bg-white/5 rounded-3xl border border-dashed border-white/10 opacity-40">
                 <ShieldAlert size={30} className="mb-2" />
                 <p className="text-[9px] font-black uppercase tracking-[0.3em]">No Ledger Entries</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* BottomNav reste pour le mobile, mais le SideMenu prendra le relais sur Desktop via le ClientLayout */}
      <div className="lg:hidden">
        <BottomNav onOpenMenu={() => {}} />
      </div>
    </div>
  );
}
