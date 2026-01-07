"use client";

import React, { useEffect, useState } from "react";
import { 
  ShieldCheck, Wallet as WalletIcon, Eye, EyeOff, 
  ArrowUpRight, ArrowDownLeft, RefreshCcw, 
  ArrowLeftRight, ShieldAlert, History, Plus 
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/bottom-nav";
import Link from "next/link";

// Logos
const PiLogo = () => <span className="text-purple-400 font-black text-lg">π</span>;

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);
  const [showCardNumber, setShowCardNumber] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [totalUSD, setTotalUSD] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);

      // 1. RÉCUPÉRATION DU TOKEN (On cherche partout)
      const token = localStorage.getItem("token") || document.cookie.split('token=')[1]?.split(';')[0];

      if (!token) {
        toast.error("Session expirée. Redirection...");
        // window.location.href = "/login"; // Optionnel: décommenter pour rediriger
        setLoading(false);
        return;
      }

      // 2. APPEL API AVEC LE TOKEN DANS LE HEADER
      const res = await fetch('/api/user/wallet-info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (res.status === 401) {
        toast.error("Votre session a expiré (Erreur 401)");
        return;
      }

      if (res.ok) {
        const result = await res.json();
        // Ton API renvoie maintenant { success: true, userData: {...} }
        const walletInfo = result.userData;
        setData(walletInfo);

        // --- CALCUL GCV (314,159) ---
        // Ton API renvoie directement "balance" dans userData
        const piBalance = parseFloat(walletInfo.balance || "0");
        setTotalUSD(piBalance * 314159); 

      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Erreur de chargement");
      }
    } catch (err) {
      console.error("Erreur Fetch:", err);
      toast.error("Problème de connexion au serveur");
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
            <h1 className="text-2xl font-black uppercase italic tracking-tighter">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">
              Node Active • GCV Model
            </p>
          </div>
          <button onClick={loadWalletData} disabled={loading} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:rotate-180 transition-all">
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* CARTE VIRTUELLE (SOLDE GCV) */}
        <div className="group relative w-full aspect-[1.58/1] mb-6">
          <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-900 rounded-[32px] p-8 border border-white/20 shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-start relative z-10">
              <div className="space-y-1">
                <span className="text-[10px] font-black tracking-widest text-blue-100/50 uppercase">Solde Total (USD)</span>
                <p className="text-3xl font-black text-white tracking-tighter mt-1">
                  {loading ? "..." : `$${totalUSD.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                </p>
              </div>
              <div className="h-8 px-3 bg-white/10 rounded-lg flex items-center justify-center font-black text-[10px] text-white">GCV</div>
            </div>
            <div className="mt-8 relative z-10">
              <p className="text-lg font-mono tracking-[0.25em]">
                {showCardNumber ? (data?.cardNumber || "4215 8896 3211 4452") : `•••• •••• •••• ${data?.cardNumber?.slice(-4) || "4412"}`}
              </p>
            </div>
            <div className="flex justify-between items-end mt-auto relative z-10 border-t border-white/10 pt-4">
              <div>
                <p className="text-[8px] text-blue-200/50 uppercase font-bold">Titulaire</p>
                <p className="text-[10px] font-black uppercase tracking-widest">{data?.name || "Pioneer"}</p>
              </div>
              <div className="text-right">
                <p className="text-[8px] text-blue-200/50 uppercase font-bold">Expire</p>
                <p className="text-[10px] font-mono font-bold">{data?.expiry || "12/26"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* STATUT KYC */}
        <div className="flex items-center gap-2 mb-8 px-2">
            <ShieldCheck size={14} className={data?.kycStatus === "VERIFIED" ? "text-emerald-500" : "text-orange-500"} />
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                KYC: {data?.kycStatus || "PENDING"}
            </span>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-4 gap-3 mb-10">
          {[
            { icon: <Plus />, label: "Dépôt", color: "bg-blue-600", link: "/deposit" },
            { icon: <ArrowUpRight />, label: "Envoi", color: "bg-indigo-600", link: "/transfer" },
            { icon: <ArrowLeftRight />, label: "Swap", color: "bg-purple-600", link: "/swap" },
            { icon: <History />, label: "Logs", color: "bg-slate-700", link: "/transactions" },
          ].map((item, i) => (
            <Link key={i} href={item.link} className="flex flex-col items-center gap-2">
              <div className={`w-14 h-14 ${item.color} rounded-[22px] flex items-center justify-center text-white shadow-lg active:scale-90 transition-all`}>
                {React.cloneElement(item.icon as React.ReactElement, { size: 22 })}
              </div>
              <span className="text-[9px] font-black uppercase text-slate-500">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* ACTIFS (Uniquement Pi pour l'instant selon ton API) */}
        <div className="mb-10">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-4 px-2">Actifs Réels</h3>
          <div className="p-4 bg-white/5 border border-white/10 rounded-[24px] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-purple-500/20">
                <PiLogo />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase text-white tracking-tight">Pi Network</p>
                <p className="text-[8px] text-slate-500 font-bold uppercase">Mainnet Node</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-black text-white">
                {loading ? "..." : parseFloat(data?.balance || "0").toLocaleString(undefined, { minimumFractionDigits: 4 })}
              </p>
              <p className="text-[8px] font-bold uppercase italic text-purple-400">PI</p>
            </div>
          </div>
        </div>

      </div>
      <BottomNav onOpenMenu={() => {}} />
    </div>
  );
}
