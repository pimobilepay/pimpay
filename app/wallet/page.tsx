"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCcw,
  ArrowUpRight,
  ArrowLeftRight,
  History,
  Plus,
  Coins,
  Settings,
  Zap,
  ChevronRight
} from "lucide-react";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { useRouter } from "next/navigation";

// Design des icônes utilisant tes fichiers PNG dans /public
const PiLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-800 flex items-center justify-center shadow-lg border border-white/20 relative overflow-hidden p-2">
    <img src="/pi-coin.png" alt="Pi" className="w-full h-full object-contain" />
  </div>
);

const SdaLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-[#d97706]/20 flex items-center justify-center shadow-lg border border-[#d97706]/30 p-2">
    <img src="/sidrachain.png" alt="SDA" className="w-full h-full object-contain" />
  </div>
);

const UsdtLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-[#0d9488]/20 flex items-center justify-center shadow-lg border border-[#0d9488]/30 p-2">
    <img src="/tether-usdt.png" alt="USDT" className="w-full h-full object-contain" />
  </div>
);

const BtcLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-[#f7931a]/20 flex items-center justify-center shadow-lg border border-[#f7931a]/30 p-2">
    <img src="/bitcoin.png" alt="BTC" className="w-full h-full object-contain" />
  </div>
);

export default function WalletPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [data, setData] = useState({ name: "Pioneer", balance: "0.0000" });
  const [totalUSD, setTotalUSD] = useState(0);

  const PI_CONSENSUS_USD = 314159;

  const loadWalletData = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (res.status === 401) {
        router.push("/auth/login");
        return;
      }

      if (res.ok) {
        const result = await res.json();
        setData({
          name: result.name || "Pioneer",
          balance: result.balance || "0.0000"
        });
        const piBalance = parseFloat(result.balance || "0");
        setTotalUSD(piBalance * PI_CONSENSUS_USD);
      }
    } catch (err) {
      console.error("Erreur Wallet:", err);
    } finally {
      setLoading(false);
    }
  }, [router, loading]);

  useEffect(() => {
    loadWalletData();
    const interval = setInterval(loadWalletData, 30000);
    return () => clearInterval(interval);
  }, [loadWalletData]);

  return (
    <div className="min-h-screen w-full pb-32 bg-[#020617] text-white font-sans">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="px-6 pt-10 max-w-md mx-auto">

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
          <div className="flex gap-3">
            <button
              onClick={() => loadWalletData()}
              disabled={loading}
              className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all"
            >
              <RefreshCcw size={18} className={`${loading ? "animate-spin text-blue-500" : "text-slate-400"}`} />
            </button>
            <button onClick={() => setIsMenuOpen(true)} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all text-slate-400">
               <Settings size={18} />
            </button>
          </div>
        </div>

        {/* CARTE GCV */}
        <div className="relative w-full aspect-[1.58/1] mb-8">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-950 rounded-[32px] p-8 border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-400/10 rounded-full blur-3xl" />
            <div className="flex flex-col h-full justify-between relative z-10">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-blue-100/50 uppercase">Valeur Totale Est.</span>
                  <p className="text-3xl font-black text-white tracking-tighter mt-1">
                    ${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-8 px-3 bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white border border-white/10 italic">GCV</div>
              </div>

              <div className="flex justify-between items-end border-t border-white/10 pt-6">
                <div className="max-w-[140px]">
                  <p className="text-[8px] text-blue-200/50 uppercase font-black tracking-widest mb-1">Propriétaire</p>
                  <p className="text-sm font-black uppercase tracking-widest text-white truncate">{data.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] text-blue-200/50 uppercase font-black tracking-widest mb-1">Status</p>
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
            { icon: <ArrowLeftRight />, label: "Swap", color: "bg-purple-600", path: "/wallet/swap" },
            { icon: <History />, label: "Logs", color: "bg-slate-700", path: "/transactions" },
          ].map((item, i) => (
            <button key={i} onClick={() => router.push(item.path)} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 ${item.color} rounded-[22px] flex items-center justify-center text-white shadow-lg active:scale-95 transition-all border border-white/10`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 22 })}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500 tracking-tighter">{item.label}</span>
            </button>
          ))}
        </div>

        {/* LISTE ACTIFS STYLE SIDRA */}
        <div className="mb-10 space-y-4">
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Actifs GCV</h3>
            <Coins size={14} className="text-slate-600" />
          </div>

          <div className="space-y-3">
            {/* PI NETWORK */}
            <AssetCard
                logo={<PiLogo />}
                name="Pi Network"
                subName="Pi Mainnet Node"
                balance={parseFloat(data.balance).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                symbol="PI"
                usdValue={totalUSD.toLocaleString()}
                isMain
            />

            {/* BITCOIN */}
            <AssetCard
                logo={<BtcLogo />}
                name="Bitcoin"
                subName="BTC Mainnet"
                balance="0.0000"
                symbol="BTC"
                usdValue="0.00"
            />

            {/* SDA */}
            <AssetCard
                logo={<SdaLogo />}
                name="Sidra Digital"
                subName="SDA Native"
                balance="1,250.00"
                symbol="SDA"
                usdValue="1,312.50"
            />

            {/* USDT */}
            <AssetCard
                logo={<UsdtLogo />}
                name="Tether USD"
                subName="ERC-20 Token"
                balance="0.00"
                symbol="USDT"
                usdValue="0.00"
            />
          </div>
        </div>

        {/* BANNIERE QUICK SWAP */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-600/10 to-transparent border border-blue-500/20 rounded-[2.5rem] flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-900/40">
                    <Zap size={20} className="text-white" fill="currentColor" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Quick Swap</p>
                    <p className="text-xs font-bold text-slate-300 italic">Échanger Pi vers USDT</p>
                </div>
            </div>
            <button onClick={() => router.push('/dashboard/swap-crypto')} className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 transition-all border border-white/5">
                <ChevronRight size={20} className="text-slate-500" />
            </button>
        </div>

      </div>

      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}

function AssetCard({ logo, name, subName, balance, symbol, usdValue, isMain }: any) {
  return (
    <div className={`p-4 rounded-[2.5rem] flex items-center justify-between border transition-all ${
      isMain ? 'bg-slate-900/40 border-blue-500/20 shadow-xl shadow-blue-900/10' : 'bg-white/5 border-white/5 opacity-80'
    }`}>
      <div className="flex items-center gap-4">
        {logo}
        <div>
          <p className={`text-[12px] font-black uppercase tracking-tight ${isMain ? 'text-white' : 'text-slate-300'}`}>{name}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">{subName}</p>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-baseline justify-end gap-1">
          <p className="text-sm font-black text-white">{balance}</p>
          <p className="text-[9px] font-black text-slate-500">{symbol}</p>
        </div>
        <p className={`text-[9px] font-bold mt-0.5 ${isMain ? 'text-blue-400' : 'text-slate-600'}`}>${usdValue} USD</p>
      </div>
    </div>
  );
}
