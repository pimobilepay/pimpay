"use client";

import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Wallet, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function BalanceCard() {
  const [data, setData] = useState({ balance: 0, gcvValue: 0, currency: "CFA" });
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchBalance = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const result = await res.json();
        setData({
          balance: result.balance,
          gcvValue: result.gcvValue,
          currency: result.currency || "CFA"
        });
      }
    } catch (err) {
      toast.error("Erreur d'actualisation du solde");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // Formatage des nombres
  const formatValue = (val: number) => {
    return new Intl.NumberFormat("fr-FR").format(val);
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 rounded-[32px] p-6 shadow-2xl">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-600/20 blur-[80px] rounded-full" />
      
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-2xl border border-blue-500/20">
              <Wallet className="text-blue-500" size={20} />
            </div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Solde Actuel</p>
              <p className="text-[10px] text-blue-500 font-mono">Mainnet Asset</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button 
              onClick={fetchBalance}
              className={`p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all ${isRefreshing ? "animate-spin" : ""}`}
            >
              <RefreshCw size={18} className="text-slate-400" />
            </button>
            <button 
              onClick={() => setIsVisible(!isVisible)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all"
            >
              {isVisible ? <Eye size={18} className="text-slate-400" /> : <EyeOff size={18} className="text-slate-400" />}
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black tracking-tighter text-white">
              {loading ? "••••" : isVisible ? formatValue(data.balance) : "****"}
            </h2>
            <span className="text-lg font-bold text-blue-500">{data.currency}</span>
          </div>
          
          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <TrendingUp size={12} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-500">GCV RATE</span>
            </div>
            <p className="text-slate-500 text-xs font-medium">
              ≈ {isVisible ? formatValue(data.gcvValue) : "****"} <span className="text-[10px]">USD (Est.)</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
