"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Scan, ArrowLeft, Zap, ShieldCheck,
  Store, Loader2, CheckCircle2,
  Search, Fingerprint, Activity,
  Send, QrCode, Users, Bell,
  Clock, ArrowUpRight, ArrowDownLeft,
  Eye, EyeOff, ChevronRight, Star,
  Wallet, Plus, TrendingUp, BarChart3,
  X, Delete, Info, Cpu, Landmark
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { QRScanner } from "@/components/qr-scanner";
import { ReceiveQR } from "@/components/receive-qr";
import { useLanguage } from "@/context/LanguageContext";

// Types for Map of Pi merchants
interface MapOfPiMerchant {
  id: string;
  name: string;
  category: string;
  description: string;
  location: {
    city: string;
    country: string;
    address: string;
  };
  rating: number;
  reviewCount: number;
  avatar: string;
  piPaymentId: string;
  verified: boolean;
  distance?: number;
  businessHours?: string;
  tags: string[];
}

// Type for P2P contacts from API
interface P2PContact {
  id: string;
  contactId: string;
  name: string;
  username: string | null;
  phone: string | null;
  avatar: string | null;
  initials: string;
  nickname: string | null;
  isFavorite: boolean;
  lastTransaction: string | null;
  transactionCount: number;
}

// Transaction history type from API
interface TransactionHistory {
  id: string;
  reference: string;
  amount: number;
  fee: number;
  type: string;
  status: string;
  description: string;
  currency?: string;
  createdAt: string;
  fromUserId: string;
  toUserId: string;
  fromUser?: { username: string; name: string; avatar: string | null; displayName?: string };
  toUser?: { username: string; name: string; avatar: string | null; displayName?: string };
}

// Helper function to format amounts with proper decimals
const formatAmount = (amount: number, currency: string = "Pi"): string => {
  // For crypto, max 8 decimals; for fiat, max 2 decimals
  const isFiat = ["XAF", "EUR", "USD", "XOF", "GHS", "NGN"].includes(currency.toUpperCase());
  const maxDecimals = isFiat ? 2 : 8;
  
  // Handle very small numbers (avoid scientific notation)
  if (Math.abs(amount) < 0.00000001 && amount !== 0) {
    return amount.toFixed(maxDecimals);
  }
  
  // Format with appropriate decimals
  const formatted = amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  });
  
  return formatted;
};

// Helper function to get display name for special transaction types
const getTransactionDisplayName = (
  tx: TransactionHistory,
  isSent: boolean,
  t: (key: string) => string
): string => {
  const txType = tx.type?.toUpperCase() || "";
  const ref = tx.reference?.toUpperCase() || "";
  const desc = tx.description?.toUpperCase() || "";
  const currency = tx.currency?.toUpperCase() || "PI";
  const descLower = tx.description?.toLowerCase() || "";
  
  // Handle STAKING transactions (Pi added to staking = sent, rewards/unstake = received)
  if (txType === "STAKING" || txType === "STAKE" || descLower.includes("staking") || descLower.includes("stake")) {
    if (descLower.includes("unstake") || descLower.includes("retrait") || descLower.includes("clotur")) {
      return t("mpay.txNames.stakingWithdrawal");
    }
    return t("mpay.txNames.stakingDeposit");
  }
  
  // Handle STAKING_REWARD transactions (rewards earned from staking)
  if (txType === "STAKING_REWARD" || descLower.includes("recompense") || descLower.includes("reward")) {
    return t("mpay.txNames.stakingReward");
  }
  
  // Handle UNSTAKE transactions (Pi withdrawn from staking)
  if (txType === "UNSTAKE" || txType === "STAKING_UNSTAKE") {
    return t("mpay.txNames.stakingWithdrawal");
  }
  
  // Handle CARD_RECHARGE and CARD_WITHDRAW transactions - use description if available
  if (txType === "CARD_RECHARGE" || txType === "CARD_WITHDRAW" || desc.includes("CARTE")) {
    if (tx.description) {
      // Capitalize first letter and format nicely
      return tx.description.charAt(0).toUpperCase() + tx.description.slice(1).toLowerCase();
    }
    return txType === "CARD_RECHARGE" ? t("mpay.txNames.cardRecharge") : t("mpay.txNames.cardWithdraw");
  }
  
  // Handle CARD_PURCHASE transactions
  if (txType === "CARD_PURCHASE" || ref.startsWith("CARD-BUY") || ref.includes("CARD_PURCHASE")) {
    return t("mpay.txNames.cardPurchase");
  }
  
  // Handle external withdrawals with blockchain detection
  if (txType === "WITHDRAWAL" || txType === "WITHDRAW" || ref.startsWith("WD-") || ref.includes("EXTERNAL")) {
    if (currency === "SDA" || descLower.includes("sidra")) return t("mpay.txNames.withdrawSidra");
    if (currency === "PI" || descLower.includes("pi network")) return t("mpay.txNames.withdrawPi");
    if (currency === "XRP") return t("mpay.txNames.withdrawXrp");
    if (currency === "BTC") return t("mpay.txNames.withdrawBtc");
    if (currency === "ETH") return t("mpay.txNames.withdrawEth");
    return t("mpay.txNames.withdrawExternal");
  }
  
  // Handle deposits with blockchain detection
  if (txType === "DEPOSIT" && !tx.fromUserId) {
    if (currency === "SDA" || descLower.includes("sidra")) return t("mpay.txNames.depositSidra");
    if (currency === "PI" || descLower.includes("pi network")) return t("mpay.txNames.depositPi");
    if (currency === "XRP") return t("mpay.txNames.depositXrp");
    if (currency === "BTC") return t("mpay.txNames.depositBtc");
    if (currency === "ETH") return t("mpay.txNames.depositEth");
    if (["USDT", "USDC", "DAI", "BUSD"].includes(currency)) return t("mpay.txNames.depositStablecoin");
    return t("mpay.txNames.depositBlockchain");
  }
  
  // Default: use user display name
  if (isSent) {
    return tx.toUser?.displayName || tx.toUser?.name || tx.toUser?.username || t("mpay.unknownUser");
  } else {
    return tx.fromUser?.displayName || tx.fromUser?.name || tx.fromUser?.username || t("mpay.unknownUser");
  }
};

// Helper to check if transaction is sent (for deposits and withdrawals without userId)
const isTransactionSent = (tx: TransactionHistory, userId: string): boolean => {
  const txType = tx.type?.toUpperCase() || "";
  const descLower = tx.description?.toLowerCase() || "";
  
  // For STAKING - depositing Pi into staking = sent (money leaves wallet)
  if (txType === "STAKING" || txType === "STAKE") {
    // If it's an unstake/withdrawal from staking, it's received
    if (descLower.includes("unstake") || descLower.includes("retrait") || descLower.includes("clotur")) {
      return false;
    }
    // Regular stake = money sent to staking
    return true;
  }
  
  // For UNSTAKE - withdrawing Pi from staking = received (money comes back to wallet)
  if (txType === "UNSTAKE" || txType === "STAKING_UNSTAKE") {
    return false;
  }
  
  // For STAKING_REWARD - rewards earned = received
  if (txType === "STAKING_REWARD") {
    return false;
  }
  
  // For deposits without fromUserId, it's received
  if (txType === "DEPOSIT" && !tx.fromUserId) {
    return false;
  }
  
  // For withdrawals without toUserId, it's sent
  if ((txType === "WITHDRAWAL" || txType === "WITHDRAW") && !tx.toUserId) {
    return true;
  }
  
  // Default: check fromUserId
  return tx.fromUserId === userId;
};

type ActiveView = "hub" | "scanner" | "receive" | "pay-merchant";

export default function MPayPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const priorityLabel = (p: string) =>
    p === "low" ? t("mpay.priorityLow") : p === "instant" ? t("mpay.priorityInstant") : t("mpay.priorityFast");
  const dateLocale = locale === "zh" ? "zh-CN" : locale === "en" ? "en-US" : "fr-FR";
  const [activeView, setActiveView] = useState<ActiveView>("hub");
  const [userBalance, setUserBalance] = useState(0);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [notifications, setNotifications] = useState(0);
  // Avoids showing the "payment received" toast for pre-existing notifications on first load/login
  const notifFirstCheck = useRef(true);
  const [isOnline, setIsOnline] = useState(true);
  const [userMerchantId, setUserMerchantId] = useState("");
  const [userName, setUserName] = useState("");

  // Map of Pi merchants state
  const [mapOfPiMerchants, setMapOfPiMerchants] = useState<MapOfPiMerchant[]>([]);
  const [merchantCategories, setMerchantCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [merchantsLoading, setMerchantsLoading] = useState(true);
  const [merchantSearch, setMerchantSearch] = useState("");
const [showAllMerchants, setShowAllMerchants] = useState(false);

  // P2P contacts state
  const [p2pContacts, setP2pContacts] = useState<P2PContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [recentP2PUsers, setRecentP2PUsers] = useState<{id: string; name: string; username: string | null; avatar: string | null; initials: string; lastUsed: number}[]>([]);

  // Load recent P2P users from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("pimpay_recent_p2p_users");
      if (stored) {
        const parsed = JSON.parse(stored);
        setRecentP2PUsers(parsed.slice(0, 5));
      }
    } catch {
      // Ignore parsing errors
    }
  }, []);

  // Transaction history state
  const [transactions, setTransactions] = useState<TransactionHistory[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  // Payment flow states
  const [merchantId, setMerchantId] = useState("");
  const [amount, setAmount] = useState("");
  const [payStep, setPayStep] = useState(1); // 1: search, 2: amount, 3: confirm
  const [isLoading, setIsLoading] = useState(false);
  const [txPriority, setTxPriority] = useState("fast");

  // Fetch user profile (reusable so the balance can auto-refresh)
  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.user) {
        setUserBalance(data.user.balances?.pi || 0);
        const merchantCode = `PIMPAY-${(data.user.id || "").slice(0, 8).toUpperCase()}`;
        setUserMerchantId(merchantCode);
        setUserName(data.user.name || data.user.username || "Utilisateur");
        setUserId(data.user.id || "");
      }
    } catch {
      setUserBalance(0);
    }
  }, []);

  // Fetch transaction history (reusable so the list can auto-refresh)
  const fetchTransactions = useCallback(async () => {
    setTransactionsLoading(true);
    try {
      const res = await fetch("/api/transaction/history", { cache: "no-store" });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTransactions(data.slice(0, 10)); // Get last 10 transactions
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  }, []);

  // Initial load of profile + transactions
  useEffect(() => {
    fetchProfile();
    fetchTransactions();
  }, [fetchProfile, fetchTransactions]);

  // Fetch Map of Pi merchants
  const fetchMapOfPiMerchants = useCallback(async () => {
    setMerchantsLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== "Tous") params.append("category", selectedCategory);
      if (merchantSearch) params.append("search", merchantSearch);
      
      const res = await fetch(`/api/mpay/mapofpi?${params.toString()}`);
      const data = await res.json();
      
      if (data.success) {
        setMapOfPiMerchants(data.merchants || []);
        setMerchantCategories(data.categories || []);
        setIsOnline(true);
      }
    } catch (error) {
      console.error("Error fetching Map of Pi merchants:", error);
      setIsOnline(false);
    } finally {
      setMerchantsLoading(false);
    }
  }, [selectedCategory, merchantSearch]);

  useEffect(() => {
    fetchMapOfPiMerchants();
  }, [fetchMapOfPiMerchants]);

  // Fetch P2P contacts from API
  useEffect(() => {
    const fetchContacts = async () => {
      setContactsLoading(true);
      try {
        const res = await fetch("/api/mpay/contacts");
        const data = await res.json();
        if (data.success && data.contacts) {
          setP2pContacts(data.contacts);
        }
      } catch (error) {
        console.error("Error fetching P2P contacts:", error);
      } finally {
        setContactsLoading(false);
      }
    };
    fetchContacts();
  }, []);

  // Real notification polling
  useEffect(() => {
    // Persisted across sessions so a payment that was already announced is not re-announced on the next login
    let lastNotifId = localStorage.getItem("mpay_last_notif_id") || "";
    
    const checkNewNotifications = async () => {
      try {
        const res = await fetch("/api/transaction/notifications");
        const data = await res.json();
        
        if (data.notifications && data.notifications.length > 0) {
          const unreadPayments = data.notifications.filter(
            (n: any) => !n.read && (n.type === "PAYMENT_RECEIVED" || n.type === "success")
          );
          
          setNotifications(data.unreadCount || 0);
          
          if (unreadPayments.length > 0) {
            const latest = unreadPayments[0];

            // On the first poll after (re)load, just establish the baseline silently.
            // This prevents the toast from firing on every login for older / already-seen transactions.
            if (notifFirstCheck.current) {
              lastNotifId = latest.id;
              localStorage.setItem("mpay_last_notif_id", latest.id);
            } else if (latest.id !== lastNotifId) {
              // Genuinely new payment received during this active session -> notify + refresh
              lastNotifId = latest.id;
              localStorage.setItem("mpay_last_notif_id", latest.id);

              toast.success(t("mpay.paymentReceived"), {
                description: latest.message || t("mpay.paymentReceivedDesc"),
                duration: 6000,
                style: {
                  background: "rgba(16, 185, 129, 0.95)",
                  border: "1px solid rgba(52, 211, 153, 0.3)",
                  color: "#fff",
                },
              });

              // Refresh balance + transactions automatically (no page reload needed)
              fetchProfile();
              fetchTransactions();
            }
          }
        }
      } catch (error) {
        console.error("Notification check error:", error);
      } finally {
        notifFirstCheck.current = false;
      }
    };
    
    // Check immediately
    checkNewNotifications();
    
    // Then poll every 10 seconds
    const interval = setInterval(checkNewNotifications, 10000);
    return () => clearInterval(interval);
  }, [fetchProfile, fetchTransactions, t]);

  const handleQRResult = useCallback((data: string) => {
    if (data) {
      setMerchantId(data);
      setActiveView("pay-merchant");
      setPayStep(2);
      // Detecter si c'est une adresse Pi externe
      const piAddressRegex = /^G[A-Z0-9]{55}$/;
      if (piAddressRegex.test(data)) {
        toast.success(t("mpay.piAddressDetected") + ": " + data.slice(0, 8) + "..." + data.slice(-4));
      } else {
        toast.success(t("mpay.merchantDetected") + ": " + data);
      }
    } else {
      setActiveView("hub");
    }
  }, [t]);

  const handleMerchantTap = (merchant: MapOfPiMerchant) => {
    setMerchantId(merchant.piPaymentId);
    setActiveView("pay-merchant");
    setPayStep(2);
    toast.success(`${t("mpay.merchant")}: ${merchant.name}`, {
      description: merchant.description,
    });
  };

  const handlePayStep = () => {
    if (payStep === 1 && merchantId.length < 3) {
      return toast.error(t("mpay.invalidMerchantId"));
    }
    if (payStep === 2 && (parseFloat(amount) <= 0 || !amount)) {
      return toast.error(t("mpay.enterAmount"));
    }
    if (payStep === 2 && parseFloat(amount) > userBalance) {
      return toast.error(t("mpay.insufficientBalance"));
    }
    setPayStep(payStep + 1);
  };

  const executePayment = async () => {
    setIsLoading(true);
    try {
      // Detecter si c'est une adresse Pi externe (commence par G et fait 56 caracteres)
      const piAddressRegex = /^G[A-Z0-9]{55}$/;
      const isExternalPiAddress = piAddressRegex.test(merchantId);
      
      if (isExternalPiAddress) {
        // Utiliser l'API external-transfer pour les adresses Pi externes
        const res = await fetch("/api/mpay/external-transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            destination: merchantId,
            amount: parseFloat(amount),
            memo: t("mpay.paymentMemo")
          }),
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          const txRef = data.data?.txid || `WD-${Date.now()}`;
          const status = data.data?.status || "BROADCASTED";
          const blockchainHash = data.data?.blockchainTxHash || "";
          toast.success(data.message || t("mpay.piTransferSuccess"));
          router.push(`/mpay/success?amount=${amount}&to=${merchantId.slice(0, 8)}...${merchantId.slice(-4)}&txid=${txRef}&external=true&status=${status}&hash=${blockchainHash}`);
        } else {
          const errorMsg = data.error || `${t("mpay.error")} ${res.status}`;
          toast.error(errorMsg);
          router.push(`/mpay/failed?reason=${encodeURIComponent(errorMsg)}`);
        }
      } else {
        // Utiliser l'API mpay/confirm pour les ID marchands PimPay
        const res = await fetch("/api/mpay/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amount,
            to: merchantId,
            method: "wallet",
            txid: `MPAY-${Date.now()}`
          }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          toast.success(t("mpay.mpayConfirmed"));
          router.push(`/mpay/success?amount=${amount}&to=${merchantId}&txid=${data.data?.txid || data.txid || "CONFIRMED"}`);
        } else {
          toast.error(data.message || t("mpay.transactionFailed"));
          router.push(`/mpay/failed?reason=${encodeURIComponent(data.message || t("mpay.unknownError"))}`);
        }
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      toast.error(t("mpay.networkConsensusFailed"));
      router.push(`/mpay/failed?reason=${encodeURIComponent(t("mpay.connectionError"))}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (val: string) => {
    if (val === "delete") {
      setAmount(prev => prev.slice(0, -1));
    } else if (val === ".") {
      if (!amount.includes(".")) setAmount(prev => prev + val);
    } else {
      if (amount.length < 8) setAmount(prev => prev + val);
    }
  };

  // QR Scanner View
  if (activeView === "scanner") {
    return <QRScanner onClose={handleQRResult} />;
  }

  // Receive QR View
  if (activeView === "receive") {
    return (
      <div className="min-h-screen bg-[#020617] text-white">
        <header className="px-6 pt-12 pb-6 flex items-center justify-between">
          <button onClick={() => setActiveView("hub")} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-tight">{t("mpay.receiveTitle")}</h1>
            <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">{t("mpay.yourQR")}</p>
          </div>
          <div className="w-11" />
        </header>
        <div className="px-6 pt-4 space-y-4">
          {/* Nom de l'utilisateur */}
          {userName && (
            <div className="text-center">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{t("mpay.merchantAccount")}</p>
              <p className="text-lg font-black text-white">{userName}</p>
            </div>
          )}
          <ReceiveQR userIdentifier={userMerchantId || t("mpay.loading")} />
        </div>
      </div>
    );
  }

  // Pay Merchant Flow (Bottom Sheet style)
  if (activeView === "pay-merchant") {
    return (
      <div className="min-h-screen bg-[#020617] text-white font-sans overflow-hidden">
        <header className="px-6 pt-12 pb-6 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
          <button
            onClick={() => {
              if (payStep > 1) {
                setPayStep(payStep - 1);
              } else {
                setActiveView("hub");
                setMerchantId("");
                setAmount("");
                setPayStep(1);
              }
            }}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="text-center">
            <h1 className="text-lg font-black uppercase tracking-tight">{t("mpay.payTitle")}</h1>
            <p className="text-[9px] font-bold text-blue-500 tracking-[3px] uppercase">
              {t("mpay.step") + " " + payStep + " / 3"}
            </p>
          </div>
          <button
            onClick={() => { setActiveView("hub"); setMerchantId(""); setAmount(""); setPayStep(1); }}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all"
          >
            <X size={20} />
          </button>
        </header>

        <main className="px-6 pt-8 pb-32">
          {/* Step 1: Search merchant */}
          {payStep === 1 && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="relative group cursor-pointer" onClick={() => setActiveView("scanner")}>
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
                <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 flex flex-col items-center backdrop-blur-md">
                  <div className="relative">
                    <div className="absolute -inset-4 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
                    <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center mb-4 shadow-2xl">
                      <Scan size={36} className="text-white" />
                    </div>
                  </div>
                  <h2 className="text-lg font-black uppercase tracking-tight">{t("mpay.scanMpayQR")}</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">{t("mpay.openCamera")}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{t("mpay.orSearch")}</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="bg-white/5 rounded-[2rem] p-2 flex items-center gap-2 border border-white/10 focus-within:border-blue-500/50 transition-all">
                <div className="p-4 bg-white/5 rounded-2xl text-slate-400">
                  <Store size={20} />
                </div>
                <input
                  type="text"
                  placeholder={t("mpay.merchantIdPlaceholder")}
                  className="bg-transparent flex-1 outline-none font-black text-[10px] uppercase placeholder:text-slate-700"
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value.toUpperCase())}
                />
                <button onClick={handlePayStep} className="bg-blue-600 hover:bg-blue-700 p-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20">
                  <Search size={20} className="text-white" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Amount */}
          {payStep === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-8 duration-500">
              <div className="bg-slate-900/40 border border-white/10 rounded-[2rem] p-8 text-center relative overflow-hidden backdrop-blur-md">
                <div className="flex flex-col items-center mb-6">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center text-blue-400 mb-2 border border-blue-500/20">
                    <Cpu size={24} />
                  </div>
                  <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest max-w-full truncate px-4">
                    {merchantId && merchantId.length > 20 
                      ? `${merchantId.slice(0, 8)}...${merchantId.slice(-8)}` 
                      : (merchantId || t("mpay.merchantPimpay"))}
                  </span>
                </div>

                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t("mpay.transferAmount")}</div>
                <div className="flex items-center justify-center gap-1">
                  <span className="text-4xl font-black text-blue-500">Pi</span>
                  <span className="text-5xl font-black tracking-tighter">{amount || "0"}</span>
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex justify-between items-center px-2">
                  <div className="text-left">
<p className="text-[9px] font-black text-slate-500 uppercase">{t("mpay.balanceLabel")}</p>
<p className="text-sm font-black text-emerald-400">{formatAmount(userBalance, "Pi")} Pi</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-500 uppercase">{t("mpay.fee")}</p>
                    <p className="text-sm font-black text-white">0.00 Pi</p>
                  </div>
                </div>
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key) => (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className="h-14 rounded-2xl bg-white/5 border border-white/5 text-lg font-bold hover:bg-white/10 active:scale-90 transition-all flex items-center justify-center"
                  >
                    {key === "delete" ? <Delete size={20} className="text-red-500" /> : key}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {["low", "fast", "instant"].map((p) => (
                  <button
                    key={p}
                    onClick={() => setTxPriority(p)}
                    className={`py-3 rounded-2xl border text-[9px] font-black uppercase transition-all ${txPriority === p ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-slate-500"}`}
                  >
                    {priorityLabel(p)}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePayStep}
                className="w-full bg-blue-600 p-5 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/30 active:scale-95 transition-all"
              >
                {t("mpay.verifyTransaction")}
              </button>
            </div>
          )}

          {/* Step 3: Confirm */}
          {payStep === 3 && (
            <div className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="bg-slate-900/60 border border-white/10 rounded-[2rem] p-8 space-y-6 relative overflow-hidden backdrop-blur-xl">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <ShieldCheck size={120} />
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-[3px] text-blue-500 mb-1">{t("mpay.summary")}</h2>
                    <p className="text-2xl font-black uppercase">{t("mpay.signatureTitle")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase">{t("mpay.total")}</p>
                    <p className="text-2xl font-black text-white">{amount} Pi</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest flex-shrink-0">{t("mpay.merchant")}</span>
                    <span className="font-black text-xs text-blue-400 uppercase truncate ml-2 max-w-[180px]">
                      {merchantId && merchantId.length > 20 
                        ? `${merchantId.slice(0, 8)}...${merchantId.slice(-8)}` 
                        : merchantId}
                    </span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">{t("mpay.protocol")}</span>
                    <span className="font-black text-xs uppercase">PimPay mPay</span>
                  </div>
                  <div className="flex justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                    <span className="text-slate-500 font-bold uppercase text-[9px] tracking-widest">{t("mpay.priority")}</span>
                    <span className="font-black text-xs uppercase text-emerald-400">{priorityLabel(txPriority)}</span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center py-4 gap-3">
                  <div className="p-4 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-500 animate-bounce">
                    <Fingerprint size={32} />
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t("mpay.biometricRequired")}</p>
                </div>
              </div>

              <button
                onClick={executePayment}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-[2rem] font-black uppercase tracking-[0.15em] text-sm shadow-2xl shadow-blue-600/40 flex items-center justify-center gap-4 active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                {isLoading ? t("mpay.broadcasting") : t("mpay.signAndSend")}
              </button>
            </div>
          )}
        </main>

        {/* Footer */}
        <div className="fixed bottom-8 left-0 right-0 px-8">
          <div className="bg-slate-900/80 backdrop-blur-md border border-white/5 py-4 px-6 rounded-2xl flex items-center justify-between shadow-2xl">
            <div className="flex items-center gap-3 text-slate-400">
              <Landmark size={16} />
              <span className="text-[9px] font-black uppercase tracking-widest">{t("mpay.mpayProtocol")}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[8px] font-black text-emerald-500 uppercase">{t("mpay.online")}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // MAIN HUB VIEW
  // ============================================
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans overflow-x-hidden">
      {/* HEADER */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between bg-[#020617]/80 backdrop-blur-xl sticky top-0 z-50 border-b border-white/5">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all">
          <ArrowLeft size={20} />
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black uppercase tracking-tighter">mPay</h1>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-[2px]">{isOnline ? t("mpay.networkActive") : t("mpay.offline")}</p>
          </div>
        </div>
        <button
          onClick={() => router.push("/notifications")}
          className="p-3 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all relative"
        >
          <Bell size={20} />
          {notifications > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[9px] font-black flex items-center justify-center border-2 border-[#020617] animate-pulse">
              {notifications > 9 ? "9+" : notifications}
            </span>
          )}
        </button>
      </header>

      <main className="px-6 pt-6 pb-32 space-y-8">

        {/* BALANCE CARD */}
        <section className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600/30 to-indigo-600/30 rounded-[2rem] blur-sm opacity-60" />
          <div className="relative bg-slate-900/60 border border-white/10 rounded-[2rem] p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-blue-500" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("mpay.balance")}</span>
              </div>
              <button onClick={() => setBalanceVisible(!balanceVisible)} className="p-2 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all">
                {balanceVisible ? <Eye size={14} className="text-slate-400" /> : <EyeOff size={14} className="text-slate-400" />}
              </button>
            </div>
            <div className="flex items-baseline gap-2">
              {balanceVisible ? (
                <>
                  <span className="text-4xl font-black tracking-tighter">{formatAmount(userBalance, "Pi")}</span>
                  <span className="text-lg font-black text-blue-500">Pi</span>
                </>
              ) : (
                <span className="text-4xl font-black tracking-tighter text-slate-600">{"* * * * *"}</span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">+12.5% {t("mpay.thisMonth")}</span>
            </div>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section>
          <div className="grid grid-cols-4 gap-3">
            {[
              { icon: Scan, label: t("mpay.actionScan"), color: "from-blue-600 to-blue-700", action: () => setActiveView("scanner") },
              { icon: Store, label: t("mpay.actionPay"), color: "from-indigo-600 to-indigo-700", action: () => { setActiveView("pay-merchant"); setPayStep(1); } },
              { icon: Send, label: t("mpay.actionSend"), color: "from-cyan-600 to-cyan-700", action: () => router.push("/mpay/send") },
              { icon: QrCode, label: t("mpay.actionReceive"), color: "from-emerald-600 to-emerald-700", action: () => setActiveView("receive") },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg group-active:scale-90 transition-all`}>
                  <item.icon size={22} className="text-white" />
                </div>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">{item.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* MAP OF PI MERCHANTS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-amber-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">Map of Pi</h2>
            </div>
            <a 
              href="https://www.mapofpi.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[9px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1"
            >
              {t("mpay.openMap")} <ChevronRight size={12} />
            </a>
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-6 px-6 scrollbar-hide">
            {merchantCategories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-white/5 text-slate-500 border border-white/10 hover:bg-white/10"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Merchants Grid */}
          {merchantsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase">{t("mpay.loadingMap")}</span>
            </div>
          ) : mapOfPiMerchants.length === 0 ? (
            <div className="text-center py-8">
              <Store size={32} className="mx-auto text-slate-600 mb-2" />
              <p className="text-[10px] font-bold text-slate-500 uppercase">{t("mpay.noMerchant")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-3">
              {(showAllMerchants ? mapOfPiMerchants : mapOfPiMerchants.slice(0, 6)).map((merchant) => (
                <button
                  key={merchant.id}
                  onClick={() => handleMerchantTap(merchant)}
                  className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex flex-col items-start gap-2 hover:bg-white/[0.06] active:scale-[0.98] transition-all text-left"
                >
                  <div className="flex items-start justify-between w-full">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 rounded-xl flex items-center justify-center border border-blue-500/20">
                      <span className="text-[10px] font-black text-blue-400">{merchant.avatar}</span>
                    </div>
                    {merchant.verified && (
                      <div className="p-1 bg-emerald-500/20 rounded-lg">
                        <CheckCircle2 size={10} className="text-emerald-400" />
                      </div>
                    )}
                  </div>
                  <div className="w-full">
                    <p className="text-[11px] font-black uppercase tracking-tight text-white truncate">{merchant.name}</p>
                    <p className="text-[8px] font-bold text-blue-400 uppercase">{merchant.category}</p>
                  </div>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1">
                      <Star size={8} className="text-amber-400 fill-amber-400" />
                      <span className="text-[8px] font-bold text-slate-400">{merchant.rating}</span>
                      <span className="text-[7px] text-slate-600">({merchant.reviewCount})</span>
                    </div>
                    {merchant.distance && (
                      <span className="text-[8px] font-bold text-slate-500">{merchant.distance.toFixed(1)} km</span>
                    )}
                  </div>
                  <p className="text-[8px] text-slate-500 truncate w-full">{merchant.location.city}, {merchant.location.country}</p>
                </button>
              ))}
            </div>
          )}

          {/* View All Button */}
          {mapOfPiMerchants.length > 6 && (
            <button 
              onClick={() => setShowAllMerchants(!showAllMerchants)}
              className="w-full mt-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black text-slate-400 uppercase tracking-wider hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              {showAllMerchants ? (
                <>{t("mpay.seeLess")} <ChevronRight size={12} className="rotate-[-90deg]" /></>
              ) : (
                <>{t("mpay.seeAllMerchants")} ({mapOfPiMerchants.length}) <ChevronRight size={12} className="rotate-90" /></>
              )}
            </button>
          )}
        </section>

{/* P2P CONTACTS */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={14} className="text-cyan-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">{t("mpay.contactsP2P")}</h2>
            </div>
            <button
              onClick={() => router.push("/mpay/contacts")}
              className="text-[9px] font-bold text-blue-500 uppercase tracking-wider flex items-center gap-1"
            >
              {t("mpay.seeAll")} <ChevronRight size={12} />
            </button>
          </div>

          {/* Recent P2P Users */}
          {recentP2PUsers.length > 0 && (
            <div className="mb-4">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-3 flex items-center gap-1">
                <Clock size={10} />
                {t("mpay.recent")}
              </p>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
                {recentP2PUsers.map((recent) => (
                  <button
                    key={`recent-${recent.id}`}
                    onClick={() => router.push(`/mpay/send?to=${recent.username || recent.id}`)}
                    className="flex-shrink-0 flex flex-col items-center gap-2 group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-amber-600/20 to-orange-600/20 rounded-full flex items-center justify-center border border-amber-500/20 group-active:scale-90 transition-all overflow-hidden">
                      {recent.avatar ? (
                        <img src={recent.avatar} alt={recent.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-black text-amber-400">{recent.initials}</span>
                      )}
                    </div>
                    <span className="text-[7px] font-bold text-slate-500 uppercase max-w-12 truncate">{recent.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contacts List */}
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-6 px-6 scrollbar-hide">
            <button
              onClick={() => router.push("/mpay/send")}
              className="flex-shrink-0 flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 bg-white/5 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center hover:bg-white/10 transition-all">
                <Plus size={20} className="text-slate-400" />
              </div>
              <span className="text-[8px] font-bold text-slate-600 uppercase">{t("mpay.new")}</span>
            </button>
            {contactsLoading ? (
              <div className="flex items-center justify-center px-8">
                <Loader2 className="animate-spin text-cyan-500" size={20} />
              </div>
            ) : p2pContacts.length === 0 ? (
              <div className="flex items-center justify-center px-4">
                <span className="text-[10px] font-bold text-slate-500">{t("mpay.noContact")}</span>
              </div>
            ) : (
              p2pContacts.slice(0, 5).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => {
                    // Save to recent users
                    try {
                      const stored = localStorage.getItem("pimpay_recent_p2p_users");
                      let recent = stored ? JSON.parse(stored) : [];
                      recent = recent.filter((r: any) => r.id !== contact.contactId);
                      recent.unshift({
                        id: contact.contactId,
                        name: contact.name,
                        username: contact.username,
                        avatar: contact.avatar,
                        initials: contact.initials,
                        lastUsed: Date.now(),
                      });
                      recent = recent.slice(0, 5);
                      localStorage.setItem("pimpay_recent_p2p_users", JSON.stringify(recent));
                      setRecentP2PUsers(recent);
                    } catch {}
                    router.push(`/mpay/send?to=${contact.username || contact.contactId}`);
                  }}
                  className="flex-shrink-0 flex flex-col items-center gap-2 group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-cyan-600/20 to-blue-600/20 rounded-full flex items-center justify-center border border-cyan-500/20 group-active:scale-90 transition-all overflow-hidden">
                    {contact.avatar ? (
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-cyan-400">{contact.initials}</span>
                    )}
                  </div>
                  <span className="text-[8px] font-bold text-slate-500 uppercase max-w-14 truncate">{contact.nickname || contact.name}</span>
                </button>
              ))
            )}
          </div>
        </section>

        {/* TRANSACTION HISTORY */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-blue-500" />
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-300">{t("mpay.history")}</h2>
            </div>
            <button
              onClick={() => router.push("/mpay/statistics")}
              className="flex items-center gap-1.5 text-[9px] font-bold text-blue-500 uppercase tracking-wider"
            >
              <BarChart3 size={12} /> {t("mpay.stats")}
            </button>
          </div>
          <div className="bg-white/[0.02] border border-white/10 rounded-[2rem] overflow-hidden divide-y divide-white/5">
            {transactionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-blue-500" size={24} />
                <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase">{t("mpay.loading")}</span>
            </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Clock size={32} className="text-slate-700 mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase">{t("mpay.noTransaction")}</p>
                <p className="text-[9px] text-slate-600">{t("mpay.noTransactionDesc")}</p>
              </div>
            ) : (
              transactions.map((tx) => {
                // Use helper to correctly determine if transaction is sent (handles deposits/withdrawals)
                const isSent = isTransactionSent(tx, userId);
                // Use helper function to get proper display name for all transaction types
                const displayName = getTransactionDisplayName(tx, isSent, t);
                const statusLower = tx.status.toLowerCase();
                const currency = tx.currency || "Pi";
                const formattedAmount = formatAmount(tx.amount, currency);
                const formattedDate = new Date(tx.createdAt).toLocaleDateString(dateLocale, {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <button
                    key={tx.id}
                    onClick={() => router.push(`/mpay/transaction/${tx.id}`)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSent ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {isSent ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-xs font-black uppercase tracking-tight">{displayName}</p>
                      <p className="text-[9px] font-bold text-slate-600">{formattedDate}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${isSent ? "text-red-400" : "text-emerald-400"}`}>
                        {isSent ? "-" : "+"}{formattedAmount} {currency}
                      </p>
                      <p className={`text-[8px] font-black uppercase ${statusLower === "success" ? "text-emerald-500/60" : statusLower === "pending" ? "text-amber-500/60" : "text-red-500/60"}`}>
                        {statusLower === "success" ? t("mpay.statusConfirmed") : statusLower === "pending" ? t("mpay.statusPending") : t("mpay.statusFailed")}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* FOOTER STATUS BAR */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 py-3.5 px-5 rounded-2xl flex items-center justify-between shadow-2xl">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Activity size={14} className="text-blue-500" />
            <span className="text-[8px] font-black uppercase tracking-widest">{t("mpay.mapConnected")}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-bold text-slate-600">{mapOfPiMerchants.length} {t("mpay.merchants")}</span>
            <div className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-emerald-500 animate-ping" : "bg-red-500"}`} />
              <span className={`text-[8px] font-black uppercase ${isOnline ? "text-emerald-500" : "text-red-500"}`}>
                {isOnline ? t("mpay.online") : t("mpay.offlineShort")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
