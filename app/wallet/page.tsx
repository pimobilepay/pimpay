"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  RefreshCcw, 
  ArrowUpRight, 
  ArrowLeftRight, 
  History, 
  Plus, 
  Coins
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import { useRouter } from "next/navigation";

const PiLogo = () => <span className="text-purple-400 font-black text-lg">π</span>;
const BtcLogo = () => <span className="text-orange-500 font-black text-lg">₿</span>;
const UsdtLogo = () => <span className="text-emerald-500 font-black text-lg">$</span>;
const SdaLogo = () => <span className="text-emerald-400 font-black text-lg">S</span>;

export default function WalletPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [totalUSD, setTotalUSD] = useState<number>(0);

  const PI_CONSENSUS_USD = 314159;

  useEffect(() => {
    setMounted(true);
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/profile', { 
        method: 'GET',
        cache: 'no-store' 
      });

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (res.ok) {
        const result = await res.json();
        setData(result);
        const piBalance = parseFloat(result.balance || "0");
        setTotalUSD(piBalance * PI_CONSENSUS_USD);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="w-full pb-32 bg-[#020617] min-h-screen text-white font-sans">
      <div className="px-6 pt-12 max-w-md mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">
              Multi-Asset Node • GCV
            </p>
          </div>
          <button 
            onClick={() => loadWalletData()} 
            disabled={loading} 
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:rotate-180 transition-all"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* CARTE VIRTUELLE ÉPURÉE */}
        <div className="relative w-full aspect-[1.58/1] mb-8">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 rounded-[32px] p-8 border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
            
            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-blue-100/50 uppercase">Valeur Totale du Portefeuille</span>
                  <p className="text-3xl font-black text-white tracking-tighter mt-1">
                    {loading ? "..." : `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                  </p>
                </div>
                <div className="h-8 px-3 bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white border border-white/10">GCV</div>
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-6">
                <div>
                  <p className="text-[8px] text-blue-200/50 uppercase font-black tracking-widest mb-1">Propriétaire du Compte</p>
                  <p className="text-sm font-black uppercase tracking-widest text-white">{data?.name || "Pioneer User"}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-blue-200/50 uppercase font-black tracking-widest mb-1">Réseau</p>
                  <p className="text-xs font-bold text-emerald-400 uppercase italic">Mainnet Live</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS RAPIDES */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { icon: <Plus />, label: "Dépôt", color: "bg-blue-600", path: "/deposit" },
            { icon: <ArrowUpRight />, label: "Envoi", color: "bg-indigo-600", path: "/transfer" },
            { icon: <ArrowLeftRight />, label: "Swap", color: "bg-purple-600", path: "/swap" },
            { icon: <History />, label: "Logs", color: "bg-slate-700", path: "/transactions" },
          ].map((item, i) => (
            <button key={i} onClick={() => router.push(item.path)} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 ${item.color} rounded-[22px] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 22 })}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500">{item.label}</span>
            </button>
          ))}
        </div>

        {/* LISTE DES ACTIFS MULTI-CRYPTO */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Actifs Disponibles</h3>
            <Coins size={14} className="text-slate-600" />
          </div>

          <div className="space-y-3">
            {/* PI NETWORK */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-500/20 shadow-inner">
                  <PiLogo />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-white">Pi Network</p>
                  <p className="text-[8px] text-emerald-500 font-bold uppercase tracking-tighter">Connecté</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">
                  {loading ? "..." : parseFloat(data?.balance || "0").toLocaleString(undefined, { minimumFractionDigits: 4 })}
                </p>
                <p className="text-[8px] font-bold uppercase italic text-purple-400">PI</p>
              </div>
            </div>

            {/* USDT */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between opacity-80">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-400">
                  <UsdtLogo />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-white">Tether USDT</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">ERC-20</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">0.00</p>
                <p className="text-[8px] font-bold uppercase italic text-emerald-400">USDT</p>
              </div>
            </div>

            {/* BITCOIN */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between opacity-80">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-orange-500/20 text-orange-500">
                  <BtcLogo />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-white">Bitcoin</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">BTC Network</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">0.0000</p>
                <p className="text-[8px] font-bold uppercase italic text-orange-500">BTC</p>
              </div>
            </div>

            {/* SIDRA */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between opacity-80">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-400">
                  <SdaLogo />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase text-white">Sidra SDA</p>
                  <p className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">Sidra Chain</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-white">0.00</p>
                <p className="text-[8px] font-bold uppercase italic text-emerald-400">SDA</p>
              </div>
            </div>
          </div>
        </div>

      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
