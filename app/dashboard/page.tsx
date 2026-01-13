"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight, ArrowDownLeft, RefreshCcw,
  Bell, Loader2, ArrowUpCircle, ArrowDownCircle,
  Eye, EyeOff, Globe, Zap, CreditCard, ChevronDown,
  LogOut, Smartphone, History
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { toast } from "sonner";

const RATES = {
  USD: 1,
  XFA: 615,
  CDF: 2800,
  EUR: 0.92
};

type CurrencyKey = keyof typeof RATES;

export default function UserDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currency, setCurrency] = useState<CurrencyKey>("USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const response = await fetch("/api/user/profile", { cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else if (response.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleLogout = () => {
    toast.success("Déconnexion réussie");
    router.push("/auth/login");
  };

  // --- LOGIQUE DE RENDU HISTORIQUE CORRIGÉE ---
  const getTransactionUI = (tx: any, currentUserId: string) => {
    // Une transaction est reçue si le type est DEPOSIT ou si le destinataire est moi
    const isReceived = tx.type === 'DEPOSIT' || tx.toUserId === currentUserId;
    
    // Détection des Swaps (EXCHANGE ou SWAP)
    if (tx.type === 'SWAP' || tx.type === 'EXCHANGE') {
      return {
        icon: <RefreshCcw size={22} />,
        bgColor: "bg-orange-500/10 text-orange-500",
        sign: "", // On laisse vide car le swap est un échange interne
        amountColor: "text-orange-400",
        label: "Swap GCV"
      };
    }

    if (tx.type === 'TOPUP' || tx.type === 'MOBILE_RECHARGE') {
      return {
        icon: <Smartphone size={22} />,
        bgColor: "bg-blue-500/10 text-blue-400",
        sign: "-",
        amountColor: "text-slate-300",
        label: "Recharge"
      };
    }

    return {
      icon: isReceived ? <ArrowDownCircle size={22} /> : <ArrowUpCircle size={22} />,
      bgColor: isReceived ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500",
      sign: isReceived ? "+" : "-",
      amountColor: isReceived ? "text-emerald-400" : "text-slate-300",
      label: isReceived ? "Reçu" : "Envoyé"
    };
  };

  if (!hasMounted || isLoading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">PIMPAY Sync...</p>
      </div>
    );
  }

  // Correction de l'extraction du solde PI
  const piWallet = data?.wallets?.find((w: any) => w.currency === "PI");
  const balance = piWallet ? piWallet.balance : (data?.balance || 0);
  
  const userName = data?.name || data?.username || "Pioneer";
  const transactions = data?.transactions || [];
  const convertedValue = (balance * PI_CONSENSUS_USD) * RATES[currency];

  const formatCurrency = (val: number) => {
    return val.toLocaleString(currency === 'XFA' || currency === 'CDF' ? 'fr-FR' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg text-white text-xl">
            P
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">PIMPAY</h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">Pi Mobile Pay</p>
          </div>
        </div>
        <div className="flex gap-2">
            <button onClick={handleLogout} className="p-3 rounded-2xl bg-white/5 text-slate-400 hover:text-rose-500 transition-colors">
              <LogOut size={20} />
            </button>
            <button onClick={() => router.push("/settings/notifications")} className="p-3 rounded-2xl bg-white/5 text-slate-400 relative">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full border-2 border-[#020617]"></span>
            </button>
        </div>
      </header>

      <main className="px-6 animate-in fade-in duration-700">
        {/* CARTE VIRTUELLE */}
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[32px] p-7 shadow-2xl border border-white/10 mb-8 mt-4 overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-wider">Active Card</span>
                </div>
                <button onClick={() => setShowBalance(!showBalance)} className="text-white/40 p-2">
                  {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>

            <div>
                <h2 className="text-4xl font-black tracking-tighter mt-1 flex items-center gap-2">
                    <span className="text-blue-200">π</span>
                    {showBalance ? balance.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : "••••••"}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Card Holder:</p>
                    <p className="text-[10px] text-white font-black uppercase tracking-widest">{userName}</p>
                </div>
            </div>

            <div className="flex justify-between items-end">
                <div className="relative">
                    <button onClick={() => setShowCurrencyPicker(!showCurrencyPicker)} className="bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 active:scale-95 transition-all">
                        <Globe size={12} className="text-blue-400" />
                        <p className="text-[11px] font-mono font-bold">≈ {showBalance ? `${formatCurrency(convertedValue)} ${currency}` : "Locked"}</p>
                        <ChevronDown size={12} className={`transition-transform ${showCurrencyPicker ? 'rotate-180' : ''}`} />
                    </button>
                    {showCurrencyPicker && (
                        <div className="absolute bottom-full left-0 mb-2 w-28 bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
                            {(['USD', 'XFA', 'CDF', 'EUR'] as CurrencyKey[]).map((curr) => (
                                <button key={curr} onClick={() => { setCurrency(curr); setShowCurrencyPicker(false); }} className={`w-full text-left px-4 py-2 text-[10px] font-bold hover:bg-blue-600 transition-colors ${currency === curr ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>
                                    {curr}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">Network</p>
                    <p className="text-[10px] font-bold text-white uppercase italic">Pi Mainnet</p>
                </div>
            </div>
          </div>
          <Zap size={240} className="absolute -right-10 -bottom-10 opacity-10" />
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-4 gap-4 mb-10">
            {[{ icon: <ArrowUpRight />, label: "Envoi", color: "bg-blue-600", link: "/transfer" },
              { icon: <ArrowDownLeft />, label: "Retrait", color: "bg-emerald-600", link: "/withdraw" },
              { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/swap" },
              { icon: <CreditCard />, label: "Carte", color: "bg-slate-800", link: "/dashboard/card" }
            ].map((action, i) => (
              <button key={i} onClick={() => router.push(action.link || "#")} className="flex flex-col items-center gap-2">
                <div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform`}>
                  {action.icon}
                </div>
                <span className="text-[9px] font-black text-slate-500 uppercase">{action.label}</span>
              </button>
            ))}
        </div>

        {/* SECTION HISTORIQUE */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Flux de transactions</h3>
            <History size={16} className="text-slate-600" />
          </div>

          <div className="space-y-4">
            {transactions.length > 0 ? transactions.map((tx: any) => {
              const ui = getTransactionUI(tx, data.id);
              const status = tx.status || "SUCCESS";

              return (
                <div key={tx.id} className="p-4 bg-slate-900/40 border border-white/5 rounded-[24px] flex justify-between items-center active:bg-slate-800/60 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${ui.bgColor}`}>
                      {ui.icon}
                    </div>
                    <div>
                      <p className="text-[13px] font-bold leading-tight uppercase">
                        {tx.description || ui.label}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md ${
                          status === 'SUCCESS' || status === 'COMPLETED' 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-amber-500/20 text-amber-400'
                        }`}>
                          {status}
                        </p>
                        <span className="text-[9px] text-slate-600 font-medium">
                          {new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-sm font-black ${ui.amountColor}`}>
                    {ui.sign}π {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              );
            }) : (
              <div className="text-center py-10 opacity-30 text-[10px] uppercase font-bold border border-dashed border-white/10 rounded-[32px]">Aucune activité récente</div>
            )}
          </div>
        </section>
      </main>

      <BottomNav onOpenMenu={() => setIsSidebarOpen(true)} />
    </div>
  );
}
