"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
  Bell,
  Loader2,
  ArrowUpCircle,
  ArrowDownCircle,
  Eye,
  EyeOff,
  Globe,
  Zap,
  CreditCard,
  ChevronDown,
  LogOut,
  History,
  User,
  Settings,
  LayoutGrid,
  Facebook,
  Twitter,
  Youtube,
  Wallet as WalletIcon,
  Users as UsersIcon,
} from "lucide-react";
import { PI_CONSENSUS_USD } from "@/lib/exchange";
import { formatCryptoBalance } from "@/lib/formatters";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { ReferralProgram } from "@/components/ReferralProgram";
import { useCurrency, CURRENCIES as CURRENCY_LIST } from "@/context/CurrencyContext";

const RATES: Record<string, number> = {
  USD: 1,
  XAF: 603,
  XOF: 603,
  EUR: 0.92,
  GBP: 0.79,
  CDF: 2800,
  AED: 3.67,
  NGN: 1580,
  MGA: 4500,
};
type CurrencyKey = keyof typeof RATES;

const PIE_COLOR_BY_NAME: Record<string, string> = {
  Sortant: "#3b82f6",
  Entrant: "#10b981",
  Swaps: "#6366f1",
  Autres: "#f59e0b",
  Total: "#94a3b8",
  Aucune: "#1e293b",
};

const pieColor = (name: string) => PIE_COLOR_BY_NAME[name] ?? "#64748b";

// Fonction pour tronquer les adresses blockchain
const truncateAddress = (address: string, startLen = 6, endLen = 4): string => {
  if (!address || address.length <= startLen + endLen + 3) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
};

// Fonction pour formater la description avec adresses tronquées
const formatDescription = (description: string): string => {
  if (!description) return description;
  
  let result = description;
  
  // Détecte les adresses Ethereum/Sidra (0x...) et les tronque
  result = result.replace(/0x[a-fA-F0-9]{40}/g, (addr) => truncateAddress(addr, 6, 4));
  
  // Détecte les adresses Stellar/Pi Network (G..., 56 caractères) et les tronque
  result = result.replace(/G[A-Z2-7]{55}/g, (addr) => truncateAddress(addr, 6, 4));
  
  // Détecte aussi les longues chaines alphanumeriques (>20 chars) qui ressemblent a des adresses
  result = result.replace(/[A-Za-z0-9]{30,}/g, (addr) => truncateAddress(addr, 6, 4));
  
  return result;
};

export default function UserDashboard() {
  const router = useRouter();
  const { locale, setLocale } = useLanguage();
  const { currency: ctxCurrency, setCurrency: setCtxCurrency, currencyInfo } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCurrencySwitcher, setShowCurrencySwitcher] = useState(false);
  const currencySwitcherRef = useRef<HTMLDivElement>(null);
  const currency = ctxCurrency as CurrencyKey;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [showWalletSelector, setShowWalletSelector] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLDivElement>(null);
  const [activeWalletIndex, setActiveWalletIndex] = useState(0);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>({
    PI: PI_CONSENSUS_USD,
    SDA: 1.2,
    USDT: 1.0,
    BTC: 0,
    XRP: 0,
    XLM: 0,
    USDC: 1.0,
    DAI: 1.0,
    BUSD: 1.0,
    XAF: 1 / 615,
  });
  const [unreadCount, setUnreadCount] = useState(0);

  // KYC toast notification - show only once per status change, persisted in localStorage
  useEffect(() => {
    if (!data?.kycStatus || !data?.id) return;

    const kycStatus = data.kycStatus;
    // Clé unique par utilisateur + statut KYC pour ne jamais rejouer le même message
    const storageKey = `kyc_toast_${data.id}_${kycStatus}`;

    if (localStorage.getItem(storageKey)) return;

    if (kycStatus === "VERIFIED") {
      toast.success("Votre KYC a ete valide avec succes !", {
        duration: 5000,
        style: {
          background: "rgba(22, 163, 74, 0.9)",
          border: "1px solid rgba(34, 197, 94, 0.3)",
          color: "#fff",
        },
      });
    } else if (kycStatus === "APPROVED") {
      toast.info("Votre KYC est approuve et en cours de traitement.", {
        duration: 5000,
        style: {
          background: "rgba(59, 130, 246, 0.9)",
          border: "1px solid rgba(96, 165, 250, 0.3)",
          color: "#fff",
        },
      });
    } else if (kycStatus === "REJECTED") {
      toast.error("Votre KYC a ete rejete. Veuillez soumettre de nouveaux documents.", {
        duration: 6000,
        style: {
          background: "rgba(220, 38, 38, 0.9)",
          border: "1px solid rgba(248, 113, 113, 0.3)",
          color: "#fff",
        },
      });
    }

    localStorage.setItem(storageKey, "1");
  }, [data?.kycStatus, data?.id]);

  useEffect(() => {
    setHasMounted(true);
    fetchDashboardData();
    fetchMarketPrices();
    fetchUnreadNotifications();
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setShowProfileMenu(false);
      if (walletRef.current && !walletRef.current.contains(event.target as Node)) setShowWalletSelector(false);
      if (currencySwitcherRef.current && !currencySwitcherRef.current.contains(event.target as Node)) setShowCurrencySwitcher(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time notification polling with toast and balance refresh (like mpay page)
  useEffect(() => {
    let lastNotifId = sessionStorage.getItem("dashboard_last_notif_id") || "";
    let lastSupportMsgId = sessionStorage.getItem("dashboard_last_support_msg_id") || "";
    let lastTxCount = parseInt(sessionStorage.getItem("dashboard_last_tx_count") || "0", 10);
    
    const checkNotifications = async () => {
      try {
        // Check for new notifications
        const res = await fetch("/api/transaction/notifications", { cache: "no-store" });
        if (res.ok) {
          const result = await res.json();
          
          if (result.notifications && result.notifications.length > 0) {
            const unreadPayments = result.notifications.filter(
              (n: any) => !n.read && (n.type === "PAYMENT_RECEIVED" || n.type === "success" || n.type === "DEPOSIT" || n.type === "TRANSFER")
            );
            
            // Check for new SUPPORT_MESSAGE from admin
            const supportMessages = result.notifications.filter(
              (n: any) => !n.read && n.type === "SUPPORT_MESSAGE"
            );
            
            setUnreadCount(result.unreadCount || 0);
            
            // Show toast for new support message from admin
            if (supportMessages.length > 0 && supportMessages[0].id !== lastSupportMsgId) {
              const supportMsg = supportMessages[0];
              lastSupportMsgId = supportMsg.id;
              sessionStorage.setItem("dashboard_last_support_msg_id", supportMsg.id);
              
              toast("Message du Support", {
                description: supportMsg.message || "Vous avez recu un message du support PimPay",
                duration: 8000,
                icon: "📧",
                style: {
                  background: "rgba(59, 130, 246, 0.95)",
                  border: "1px solid rgba(96, 165, 250, 0.3)",
                  color: "#fff",
                },
                action: {
                  label: "Voir",
                  onClick: () => router.push("/settings/notifications"),
                },
              });
            }
            
            // Show toast for new payment received
            if (unreadPayments.length > 0 && unreadPayments[0].id !== lastNotifId) {
              const latest = unreadPayments[0];
              lastNotifId = latest.id;
              sessionStorage.setItem("dashboard_last_notif_id", latest.id);
              
              // Extract amount from notification if available
              const amount = latest.amount ? ` de ${latest.amount}` : "";
              const currency = latest.currency || "PI";
              
              toast.success("Transaction recue !", {
                description: latest.message || `Vous avez recu un nouveau paiement${amount} ${currency}`,
                duration: 6000,
                style: {
                  background: "rgba(16, 185, 129, 0.95)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  color: "#fff",
                },
              });
              
              // Refresh dashboard data to update balance
              fetchDashboardData();
            }
          }
        }
        
        // Also check main notifications API for support messages
        const notifRes = await fetch("/api/notifications", { cache: "no-store" });
        if (notifRes.ok) {
          const notifData = await notifRes.json();
          const allNotifs = Array.isArray(notifData) ? notifData : (notifData.notifications || []);
          
          const newSupportMsgs = allNotifs.filter(
            (n: any) => !n.read && n.type === "SUPPORT_MESSAGE" && n.id !== lastSupportMsgId
          );
          
          if (newSupportMsgs.length > 0) {
            const supportMsg = newSupportMsgs[0];
            lastSupportMsgId = supportMsg.id;
            sessionStorage.setItem("dashboard_last_support_msg_id", supportMsg.id);
            
            toast("Message du Support", {
              description: supportMsg.message || "Vous avez recu un message du support PimPay",
              duration: 8000,
              icon: "📧",
              style: {
                background: "rgba(59, 130, 246, 0.95)",
                border: "1px solid rgba(96, 165, 250, 0.3)",
                color: "#fff",
              },
              action: {
                label: "Voir",
                onClick: () => router.push("/settings/notifications"),
              },
            });
          }
        }
        
        // Also check transaction history for new incoming transactions
        const historyRes = await fetch("/api/wallet/history?limit=5", { cache: "no-store" });
        if (historyRes.ok) {
          const historyData = await historyRes.json();
          const transactions = historyData.transactions || [];
          
          if (transactions.length > lastTxCount && lastTxCount > 0) {
            // New transaction detected - find incoming ones
            const newIncoming = transactions.find((tx: any) => 
              !tx.isDebit && 
              (tx.type === "DEPOSIT" || tx.type === "TRANSFER" || tx.type === "PAYMENT_RECEIVED")
            );
            
            if (newIncoming && !sessionStorage.getItem(`tx_toast_${newIncoming.id}`)) {
              sessionStorage.setItem(`tx_toast_${newIncoming.id}`, "1");
              
              const txCurrency = newIncoming.currency || "PI";
              const txAmount = newIncoming.amount || 0;
              
              toast.success(`+${txAmount.toFixed(8)} ${txCurrency} recu !`, {
                description: newIncoming.description || "Nouvelle transaction entrante",
                duration: 6000,
                style: {
                  background: "rgba(16, 185, 129, 0.95)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  color: "#fff",
                },
              });
              
              // Refresh dashboard to update balance
              fetchDashboardData();
            }
          }
          
          sessionStorage.setItem("dashboard_last_tx_count", transactions.length.toString());
          lastTxCount = transactions.length;
        }
      } catch (error) {
        console.error("Notification check error:", error);
      }
    };
    
    // Check immediately on mount
    checkNotifications();
    
    // Poll every 8 seconds for real-time updates
    const interval = setInterval(checkNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  async function fetchUnreadNotifications() {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (res.ok) {
        const result = await res.json();
        setUnreadCount(result.unreadCount || 0);
      }
    } catch { }
  }

  async function fetchMarketPrices() {
    try {
      const res = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether,usd-coin,dai,binance-usd,ripple,stellar&vs_currencies=usd");
      if (res.ok) {
        const result = await res.json();
        setMarketPrices((prev) => ({ ...prev, BTC: result.bitcoin?.usd || prev.BTC, USDT: result.tether?.usd || prev.USDT, USDC: result["usd-coin"]?.usd || prev.USDC, DAI: result.dai?.usd || prev.DAI, BUSD: result["binance-usd"]?.usd || prev.BUSD, XRP: result.ripple?.usd || prev.XRP, XLM: result.stellar?.usd || prev.XLM }));
      }
    } catch { }
  }

  async function fetchDashboardData() {
    try {
      // ✅ Correction Sidra Sync : appel simplifié pour éviter l'erreur 400 si le body est vide ou mal formé
      fetch("/api/wallet/sidra/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => null);
      const [profileRes, historyRes] = await Promise.all([
        fetch("/api/user/profile", { cache: "no-store" }),
        fetch("/api/wallet/history", { cache: "no-store" }),
      ]);
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const historyData = historyRes.ok ? await historyRes.json() : { transactions: [] };
        setData({ ...profileJson.user, transactions: historyData.transactions || [] });
        const piIdx = profileJson.user.wallets?.findIndex((w: any) => w.currency === "PI");
        if (typeof piIdx === "number" && piIdx >= 0) setActiveWalletIndex(piIdx);
      } else if (profileRes.status === 401) {
        router.push("/auth/login");
      }
    } catch (err) {
      toast.error("Sync error");
    } finally {
      setIsLoading(false);
    }
  }

  const wallets = data?.wallets || [];
  const currentWallet = wallets[activeWalletIndex] || { balance: 0, currency: "PI" };
  const balance = currentWallet.balance || 0;
  const currentCurrency = (currentWallet.currency || "PI").toUpperCase();
  const displayName = data?.name || "PIONEER";
  const rateToUse = marketPrices[currentCurrency] ?? 1;
  // Convert wallet balance -> USD -> selected fiat currency
  const fiatRate = RATES[currency as string] ?? RATES["USD"];
  const convertedValue = balance * rateToUse * fiatRate;

  const computeStats = (txsRaw: any[], walletCurrency: string) => {
    const filtered = (txsRaw || []).filter(t => t.status === "SUCCESS" || !t.status);
    
    // Swap types
    const swapTypes = ["EXCHANGE", "SWAP"];
    const swaps = filtered.filter(t => swapTypes.includes(t.type)).length;
    
    // Others = MPAY transfers, airtime purchases, payments, staking, deposits, withdrawals, etc.
    const othersTypes = [
      "PAYMENT", "CARD_PURCHASE", "AIRDROP", "STAKING_REWARD", "STAKING",
      "MPAY", "AIRTIME", "BILL_PAYMENT", "MERCHANT_PAYMENT", "FEE",
      "BONUS", "REFERRAL", "CASHBACK", "REWARD"
    ];
    
    const othersTx = filtered.filter(t => 
      othersTypes.includes(t.type) || 
      (t.description && (
        t.description.toLowerCase().includes("mpay") || 
        t.description.toLowerCase().includes("airtime") ||
        t.description.toLowerCase().includes("staking") ||
        t.description.toLowerCase().includes("bonus") ||
        t.description.toLowerCase().includes("parrainage")
      ))
    );
    const others = othersTx.length;
    
    // Main transaction types (excluding swaps and others)
    const mainTypes = ["TRANSFER", "DEPOSIT", "WITHDRAW"];
    const sent = filtered.filter(t => 
      (t.isDebit || t.type === "WITHDRAW" || t.type === "TRANSFER") && 
      !swapTypes.includes(t.type) && 
      !othersTypes.includes(t.type) &&
      (mainTypes.includes(t.type) || t.isDebit)
    ).length;
    
    const received = filtered.filter(t => 
      (!t.isDebit || t.type === "DEPOSIT") && 
      !swapTypes.includes(t.type) && 
      !othersTypes.includes(t.type) &&
      (mainTypes.includes(t.type) || !t.isDebit)
    ).length;
    
    const total = sent + received + swaps + others;
    const pie = [
      { name: "Sortant", value: sent },
      { name: "Entrant", value: received },
      { name: "Swaps", value: swaps },
      { name: "Autres", value: others },
    ];
    return { pie, list: [...pie, { name: "Total", value: total }], total };
  };

  const stats = computeStats(data?.transactions, currentCurrency);
  const pieData = stats.total > 0 ? stats.pie.filter(s => s.value > 0) : [{ name: "Aucune", value: 1 }];

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
  };

  const getTxIcon = (tx: any) => {
    if (tx.type === "EXCHANGE") return { icon: <RefreshCcw size={18} />, color: "bg-orange-500/10 text-orange-500" };
    return tx.isDebit ? { icon: <ArrowUpCircle size={18} />, color: "bg-blue-500/10 text-blue-500" } : { icon: <ArrowDownCircle size={18} />, color: "bg-emerald-500/10 text-emerald-500" };
  };

  if (!hasMounted || isLoading) return <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-blue-500"><Loader2 className="animate-spin mb-4" size={40} /><p className="text-[10px] font-black uppercase tracking-[0.2em]">PIMPAY Sync...</p></div>;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-[100] border-b border-white/5">
        <div className="flex items-center gap-3"><div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg text-white text-xl">P</div><div><h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">PIMPAY</h1><p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">Virtual Bank</p></div></div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setIsLoading(true); fetchDashboardData(); }} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all"><RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} /></button>
          <button onClick={() => router.push("/settings/notifications")} className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all relative">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <div className="relative" ref={menuRef}><button onClick={() => setShowProfileMenu(!showProfileMenu)} className="w-11 h-11 rounded-2xl bg-white/5 text-slate-400 overflow-hidden flex items-center justify-center">{data?.avatar ? <img src={data.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" /> : <User size={20} />}</button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-slate-900 border border-white/10 rounded-[24px] shadow-2xl p-2 z-[110]">
                <div className="p-4 border-b border-white/5 mb-2"><p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">PimPay Account</p><p className="text-sm font-bold truncate">@{data?.username}</p></div>
                <button onClick={() => router.push("/profile")} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left"><Settings size={16} /> Profile</button>
                <button onClick={() => { setShowReferral(true); setShowProfileMenu(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left"><div className="flex items-center gap-3"><UsersIcon size={16} className="text-blue-400" /><span>Parrainage</span></div><span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{data?.referralCount || 0}</span></button>
                <button onClick={() => setLocale(locale === "fr" ? "en" : "fr")} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left"><div className="flex items-center gap-3"><Globe size={16} className="text-cyan-400" /><span>{locale === "fr" ? "Francais" : "English"}</span></div><span className="text-[10px] font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">{locale === "fr" ? "EN" : "FR"}</span></button>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-500 text-xs font-bold uppercase text-left"><LogOut size={16} /> Logout</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="px-6 flex-grow pb-10">
        <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[32px] p-7 shadow-2xl border border-white/10 mb-6 mt-4 overflow-hidden">
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start"><div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[9px] font-black uppercase tracking-wider">PIMPAY CARD</span></div>
              <div className="flex items-center gap-2"><button onClick={() => setShowBalance(!showBalance)} className="text-white/40 p-1">{showBalance ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                <div className="relative" ref={walletRef}><button onClick={() => setShowWalletSelector(!showWalletSelector)} className="bg-white/10 hover:bg-white/20 p-2 rounded-xl border border-white/10 transition-all flex items-center gap-2"><WalletIcon size={16} /><ChevronDown size={14} className={`transition-transform ${showWalletSelector ? "rotate-180" : ""}`} /></button>
                  {showWalletSelector && (
                    <div className="absolute right-0 mt-2 w-40 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-1 z-[120]">
                      {wallets.map((w: any, idx: number) => (
                        <button key={idx} onClick={() => { setActiveWalletIndex(idx); setShowWalletSelector(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeWalletIndex === idx ? "bg-blue-600 text-white" : "hover:bg-white/5 text-slate-400"}`}>{w.currency}<span className="opacity-60 text-[8px]">{showBalance ? formatCryptoBalance(w.balance, w.currency) : "••"}</span></button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div><h2 className="text-4xl font-black tracking-tighter flex items-center gap-2"><span className="text-blue-200">{currentCurrency === "PI" ? "π" : currentCurrency === "XAF" ? "" : "$"}</span>{showBalance ? formatCryptoBalance(balance, currentCurrency) : "••••••"}</h2><p className="text-[10px] text-white/60 font-black uppercase tracking-[0.2em] mt-1">{displayName}</p></div>
            <div className="flex justify-between items-end">
              <div className="relative" ref={currencySwitcherRef}>
                <button
                  onClick={() => setShowCurrencySwitcher(!showCurrencySwitcher)}
                  className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/10 flex items-center gap-2 hover:border-white/20 transition-colors"
                >
                  <Globe size={12} className="text-blue-400" />
                  <p className="text-[11px] font-mono font-bold">
                    ≈ {showBalance ? `${convertedValue.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${currencyInfo.symbol}` : "Locked"}
                  </p>
                  <ChevronDown size={10} className={`text-white/40 transition-transform ${showCurrencySwitcher ? "rotate-180" : ""}`} />
                </button>
                {showCurrencySwitcher && (
                  <div className="absolute bottom-full mb-2 left-0 w-52 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[130]">
                    <div className="px-3 py-2 border-b border-white/5">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Devise d&apos;affichage</p>
                    </div>
                    <div className="max-h-48 overflow-y-auto py-1">
                      {(Object.keys(CURRENCY_LIST) as Array<keyof typeof CURRENCY_LIST>).map((code) => {
                        const info = CURRENCY_LIST[code];
                        const isSelected = code === currency;
                        return (
                          <button
                            key={code}
                            onClick={() => {
                              setCtxCurrency(code);
                              setShowCurrencySwitcher(false);
                              toast.success(`Devise: ${info.name}`);
                            }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? "bg-blue-600/20 text-blue-400" : "hover:bg-white/5 text-white"}`}
                          >
                            <span className="text-base">{info.flag}</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-black uppercase">{info.code}</p>
                              <p className="text-[9px] text-slate-500 truncate">{info.name}</p>
                            </div>
                            <span className="text-[10px] text-slate-500">{info.symbol}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-white uppercase italic">{currentCurrency}</p>
            </div>
          </div><Zap size={240} className="absolute -right-10 -bottom-10 opacity-10" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { icon: <ArrowUpRight />, label: "Send", color: "bg-blue-600", link: "/transfer" },
            { icon: <ArrowDownLeft />, label: "Withdraw", color: "bg-emerald-600", link: "/withdraw" },
            { icon: <RefreshCcw />, label: "Swap", color: "bg-orange-600", link: "/swap" },
            { icon: <CreditCard />, label: "Card", color: "bg-slate-800", link: "/dashboard/card" },
          ].map((action, i) => (
            <button key={i} onClick={() => router.push(action.link)} className="flex flex-col items-center gap-2"><div className={`${action.color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-transform`}>{action.icon}</div><span className="text-[9px] font-black text-slate-500 uppercase">{action.label}</span></button>
          ))}
        </div>
        <section className="mb-8 p-6 rounded-[32px] bg-slate-900/40 border border-white/10">
          <div className="flex justify-between items-center mb-6"><h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Flux de Trésorerie</h3><LayoutGrid size={16} className="text-slate-600" /></div>
          <div className="flex items-center gap-6"><div className="w-32 h-32 relative"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={5} dataKey="value">{pieData.map((entry, index) => (<Cell key={index} fill={pieColor(entry.name)} stroke="none" />))}</Pie></PieChart></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-blue-400">{stats.total > 0 ? "Live" : "N/A"}</div></div>
            <div className="flex-1 grid grid-cols-1 gap-2">
              {stats.list.map((item, i) => (
                <div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pieColor(item.name) }} /><span className="text-[9px] font-bold text-slate-400 uppercase">{item.name}</span></div><span className="text-[10px] font-black">{item.value}</span></div>
              ))}
            </div>
          </div>
        </section>
        <section className="mb-12 relative">
          <div className="flex justify-between items-center mb-6"><h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Flux de transactions</h3><div className="absolute top-0 right-0 opacity-[0.03] text-[120px] font-black pointer-events-none italic">7</div><History size={16} className="text-slate-600" /></div>
          <div className="space-y-4 relative z-10 max-h-[400px] overflow-y-auto no-scrollbar pr-1">
            {data?.transactions?.length > 0 ? data.transactions.map((tx: any) => {
              const { icon, color } = getTxIcon(tx);
              return (
                <div 
                  key={tx.id} 
                  onClick={() => {
                    const query = tx.reference ? `ref=${encodeURIComponent(tx.reference)}` : `id=${encodeURIComponent(tx.id)}`;
                    router.push(`/deposit/receipt?${query}`);
                  }}
                  className="p-4 bg-slate-900/40 border border-white/5 rounded-[24px] flex justify-between items-center active:bg-slate-800 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4"><div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${color}`}>{icon}</div><div><p className="text-[11px] font-bold uppercase text-white">{formatDescription(tx.description || tx.type)}</p><p className="text-[8px] text-slate-500 font-black uppercase mt-1">{tx.isDebit ? `À: ${truncateAddress(tx.peerName || "SYSTÈME PIMPAY")}` : `DE: ${truncateAddress(tx.peerName || "SYSTÈME PIMPAY")}`}</p></div></div>
                  <div className="text-right"><p className={`text-sm font-black ${!tx.isDebit ? "text-emerald-400" : "text-blue-400"}`}>{tx.isDebit ? "-" : "+"}{tx.amount.toLocaleString()} {tx.currency}</p><p className="text-[8px] text-slate-500 font-black mt-1">{new Date(tx.createdAt).toLocaleDateString()}</p></div>
                </div>
              );
            }) : <div className="text-center py-10 opacity-30 text-[10px] uppercase font-bold border border-dashed border-white/10 rounded-[32px]">Aucune transaction</div>}
          </div>
        </section>
      </main>
      <footer className="pt-8 pb-32 border-t border-white/5 flex flex-col items-center gap-6 bg-[#020617]">
        <div className="flex items-center gap-6">
          <a href="https://facebook.com/pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"><Facebook size={20} /></a>
          <a href="https://x.com/pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"><Twitter size={20} /></a>
          <a href="https://youtube.com/@pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Youtube size={20} /></a>
          <a href="https://tiktok.com/@pimobilepay" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-label="TikTok"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.52V6.76a4.85 4.85 0 0 1-1.02-.07z"/></svg>
          </a>
        </div>
        <div className="text-center"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">© 2026 PimPay Virtual Bank</p><p className="text-[8px] font-bold uppercase tracking-widest text-slate-700 mt-1">Pi Mobile Payment Solution</p></div>
      </footer>
      <BottomNav onOpenMenu={() => setIsSidebarOpen(true)} />
      {showReferral && <ReferralProgram onClose={() => setShowReferral(false)} />}
    </div>
  );
}
