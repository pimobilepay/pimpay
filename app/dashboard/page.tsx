"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import {
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCcw,
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
  Linkedin,
  Wallet as WalletIcon,
  Users as UsersIcon,
  Download,
  ArrowLeftRight,
  Lock,
  Smartphone,
  Building2,
  TrendingUp,
  TrendingDown,
  Shield,
  Star,
  ChevronRight,
  PiggyBank,
  Receipt,
  Banknote,
  MessageCircle,
  Activity,
  BarChart3,
} from "lucide-react";

import { formatCryptoBalance } from "@/lib/formatters";
import { BottomNav } from "@/components/bottom-nav";
import { Sidebar } from "@/components/sidebar";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useLanguage } from "@/context/LanguageContext";
import { useCurrency, CURRENCIES as CURRENCY_LIST } from "@/context/CurrencyContext";
import { ReferralProgram } from "@/components/ReferralProgram";
import { PartnersMarquee } from "@/components/PartnersMarquee";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const USD_TO_XAF = 601.32;

const MARKET_PRICE_INIT: Record<string, number> = {
  PI: 0, SDA: 1.2, USDT: 1.0, BTC: 0, XRP: 0, XLM: 0, USDC: 1.0,
  DAI: 1.0, BUSD: 1.0, EURC: 1.08, OUSD: 1.0, ETH: 0, BNB: 0, SOL: 0, TRX: 0, ADA: 0, DOGE: 0, TON: 0,
};

const PIE_COLOR_BY_NAME: Record<string, string> = {
  Sortant: "#3b82f6",
  Entrant: "#10b981",
  Swaps: "#6366f1",
  Autres: "#f59e0b",
  Total: "#94a3b8",
  Aucune: "#1e293b",
};

const pieColor = (name: string) => PIE_COLOR_BY_NAME[name] ?? "#64748b";

const truncateAddress = (address: string, startLen = 6, endLen = 4): string => {
  if (!address || address.length <= startLen + endLen + 3) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
};

const formatDescription = (description: string): string => {
  if (!description) return description;
  let result = description;
  result = result.replace(/0x[a-fA-F0-9]{40}/g, (addr) => truncateAddress(addr, 6, 4));
  result = result.replace(/G[A-Z2-7]{55}/g, (addr) => truncateAddress(addr, 6, 4));
  result = result.replace(/[A-Za-z0-9]{30,}/g, (addr) => truncateAddress(addr, 6, 4));
  return result;
};

// ─── Dashboard translations (fr / en / zh) ───────────────────────────────────
const DASH_T = {
  fr: {
    virtualBank: "Virtual Bank",
    account: "Compte PIMOBIPAY",
    profile: "Profil",
    myWallet: "Mon Wallet",
    referral: "Parrainage",
    language: "Langue",
    logout: "Déconnexion",
    greetingMorning: "Bonjour",
    greetingAfternoon: "Bon après-midi",
    greetingEvening: "Bonsoir",
    kycVerified: "KYC Vérifié",
    totalPortfolio: "Portefeuille Total",
    displayCurrency: "Devise d'affichage",
    multiChainActive: "Multi-Chain Actif",
    qaSend: "Envoyer", qaReceive: "Recevoir", qaSwap: "Swap", qaWithdraw: "Retrait",
    qaAirtime: "Airtime", qaCard: "Carte", qaStaking: "Staking", qaBills: "Factures",
    statTransactions: "Transactions",
    incoming: "entrantes",
    statUsdValue: "Valeur USD",
    totalPortfolioSub: "Portefeuille total",
    statActiveAssets: "Actifs actifs",
    withValue: "avec valeur > 0",
    statReferral: "Parrainage",
    activeReferrals: "Filleuls actifs",
    topAssets: "Top Actifs",
    viewAll: "Voir tout",
    cashFlow: "Flux de Trésorerie",
    live: "Live",
    na: "N/A",
    pieSortant: "Sortant", pieEntrant: "Entrant", pieSwaps: "Swaps", pieAutres: "Autres", pieTotal: "Total", pieNone: "Aucune",
    quickServices: "Services Rapides",
    svcBankTitle: "Virement Bancaire", svcBankSub: "Envoi vers banque",
    svcDepositTitle: "Dépôt", svcDepositSub: "Recharger compte",
    svcPimTitle: "Pim Coins", svcPimSub: "Récompenses",
    svcSupportTitle: "Support", svcSupportSub: "Aide & contact",
    recentTransactions: "Transactions Récentes",
    txTo: "À:", txFrom: "DE:", systemPimpay: "SYSTÈME PIMOBIPAY",
    noTransaction: "Aucune transaction",
    currencyLabel: "Devise",
  },
  en: {
    virtualBank: "Virtual Bank",
    account: "PIMOBIPAY Account",
    profile: "Profile",
    myWallet: "My Wallet",
    referral: "Referral",
    language: "Language",
    logout: "Logout",
    greetingMorning: "Good morning",
    greetingAfternoon: "Good afternoon",
    greetingEvening: "Good evening",
    kycVerified: "KYC Verified",
    totalPortfolio: "Total Portfolio",
    displayCurrency: "Display currency",
    multiChainActive: "Multi-Chain Active",
    qaSend: "Send", qaReceive: "Receive", qaSwap: "Swap", qaWithdraw: "Withdraw",
    qaAirtime: "Airtime", qaCard: "Card", qaStaking: "Staking", qaBills: "Bills",
    statTransactions: "Transactions",
    incoming: "incoming",
    statUsdValue: "USD Value",
    totalPortfolioSub: "Total portfolio",
    statActiveAssets: "Active assets",
    withValue: "with value > 0",
    statReferral: "Referral",
    activeReferrals: "Active referrals",
    topAssets: "Top Assets",
    viewAll: "View all",
    cashFlow: "Cash Flow",
    live: "Live",
    na: "N/A",
    pieSortant: "Outgoing", pieEntrant: "Incoming", pieSwaps: "Swaps", pieAutres: "Other", pieTotal: "Total", pieNone: "None",
    quickServices: "Quick Services",
    svcBankTitle: "Bank Transfer", svcBankSub: "Send to bank",
    svcDepositTitle: "Deposit", svcDepositSub: "Top up account",
    svcPimTitle: "Pim Coins", svcPimSub: "Rewards",
    svcSupportTitle: "Support", svcSupportSub: "Help & contact",
    recentTransactions: "Recent Transactions",
    txTo: "To:", txFrom: "FROM:", systemPimpay: "PIMOBIPAY SYSTEM",
    noTransaction: "No transactions",
    currencyLabel: "Currency",
  },
  zh: {
    virtualBank: "虚拟银行",
    account: "PIMOBIPAY 账户",
    profile: "个人资料",
    myWallet: "我的钱包",
    referral: "推荐",
    language: "语言",
    logout: "退出登录",
    greetingMorning: "早上好",
    greetingAfternoon: "下午好",
    greetingEvening: "晚上好",
    kycVerified: "KYC 已验证",
    totalPortfolio: "总资产",
    displayCurrency: "显示货币",
    multiChainActive: "多链已激活",
    qaSend: "发送", qaReceive: "接收", qaSwap: "兑换", qaWithdraw: "提现",
    qaAirtime: "话费", qaCard: "卡片", qaStaking: "质押", qaBills: "账单",
    statTransactions: "交易",
    incoming: "笔收入",
    statUsdValue: "美元价值",
    totalPortfolioSub: "总资产",
    statActiveAssets: "活跃资产",
    withValue: "价值 > 0",
    statReferral: "推荐",
    activeReferrals: "活跃推荐人",
    topAssets: "热门资产",
    viewAll: "查看全部",
    cashFlow: "资金流动",
    live: "实时",
    na: "无",
    pieSortant: "支出", pieEntrant: "收入", pieSwaps: "兑换", pieAutres: "其他", pieTotal: "总计", pieNone: "无",
    quickServices: "快捷服务",
    svcBankTitle: "银行转账", svcBankSub: "转账到银行",
    svcDepositTitle: "�����值", svcDepositSub: "为账户充值",
    svcPimTitle: "Pim 币", svcPimSub: "奖励",
    svcSupportTitle: "客服", svcSupportSub: "帮助与联系",
    recentTransactions: "最近交易",
    txTo: "至:", txFrom: "来自:", systemPimpay: "PIMOBIPAY 系统",
    noTransaction: "暂无交易",
    currencyLabel: "货币",
  },
} as const;

// ─── Subcomponents ─────────���───────────────────────────────────────────────

function QuickActionBtn({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div
        className={`${color} w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg active:scale-95 transition-all group-hover:opacity-90`}
      >
        {icon}
      </div>
      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wide">{label}</span>
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | null;
}) {
  return (
    <div className="p-4 bg-slate-900/50 border border-white/5 rounded-[20px] flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{label}</span>
        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">{icon}</div>
      </div>
      <p className="text-lg font-black text-white leading-none">{value}</p>
      {sub && (
        <div className="flex items-center gap-1">
          {trend === "up" && <TrendingUp size={10} className="text-emerald-400" />}
          {trend === "down" && <TrendingDown size={10} className="text-rose-400" />}
          <span className={`text-[9px] font-bold ${trend === "up" ? "text-emerald-400" : trend === "down" ? "text-rose-400" : "text-slate-500"}`}>{sub}</span>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function UserDashboard() {
  const router = useRouter();
  const { locale, setLocale, t } = useLanguage();
  const tr = DASH_T[locale as keyof typeof DASH_T] ?? DASH_T.fr;
  const pieLabel = (name: string): string => {
    const map: Record<string, string> = {
      Sortant: tr.pieSortant,
      Entrant: tr.pieEntrant,
      Swaps: tr.pieSwaps,
      Autres: tr.pieAutres,
      Total: tr.pieTotal,
      Aucune: tr.pieNone,
    };
    return map[name] ?? name;
  };
  const { currency, setCurrency: setCtxCurrency, currencyInfo, convertFromXAF, formatAmount } = useCurrency();
  const [data, setData] = useState<any>(null);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showCurrencySwitcher, setShowCurrencySwitcher] = useState(false);
  const currencySwitcherRef = useRef<HTMLDivElement>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>(MARKET_PRICE_INIT);
  const [unreadCount, setUnreadCount] = useState(0);

  // KYC toast
  useEffect(() => {
    if (!data?.kycStatus || !data?.id) return;
    const storageKey = `kyc_toast_${data.id}_${data.kycStatus}`;
    if (localStorage.getItem(storageKey)) return;
    if (data.kycStatus === "VERIFIED") {
      toast.success("Votre KYC a ete valide avec succes !", { duration: 5000 });
    } else if (data.kycStatus === "REJECTED") {
      toast.error("Votre KYC a ete rejete. Veuillez soumettre de nouveaux documents.", { duration: 6000 });
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
      if (currencySwitcherRef.current && !currencySwitcherRef.current.contains(event.target as Node)) setShowCurrencySwitcher(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Real-time notification polling
  useEffect(() => {
    let lastNotifId = sessionStorage.getItem("dashboard_last_notif_id") || "";
    let lastSupportMsgId = sessionStorage.getItem("dashboard_last_support_msg_id") || "";
    const checkNotifications = async () => {
      try {
        const res = await fetch("/api/transaction/notifications", { cache: "no-store" });
        if (res.ok) {
          const result = await res.json();
          setUnreadCount(result.unreadCount || 0);
          if (result.notifications?.length > 0) {
            const unreadPayments = result.notifications.filter(
              (n: any) => !n.read && ["PAYMENT_RECEIVED", "success", "DEPOSIT", "TRANSFER"].includes(n.type)
            );
            if (unreadPayments.length > 0 && unreadPayments[0].id !== lastNotifId) {
              const latest = unreadPayments[0];
              lastNotifId = latest.id;
              sessionStorage.setItem("dashboard_last_notif_id", latest.id);
              toast.success("Transaction recue !", {
                description: latest.message || "Vous avez recu un nouveau paiement",
                duration: 6000,
              });
              fetchDashboardData();
            }

            // Messages privés / notifications support envoyés par l'admin
            const supportMessages = result.notifications.filter(
              (n: any) => !n.read && n.type === "SUPPORT_MESSAGE"
            );
            if (supportMessages.length > 0 && supportMessages[0].id !== lastSupportMsgId) {
              const supportMsg = supportMessages[0];
              lastSupportMsgId = supportMsg.id;
              sessionStorage.setItem("dashboard_last_support_msg_id", supportMsg.id);
              toast(supportMsg.title || "Message du Support", {
                description: supportMsg.message || "Vous avez recu un message du support PIMOBIPAY",
                duration: 8000,
                icon: "📧",
                action: {
                  label: "Voir",
                  onClick: () => router.push("/notifications"),
                },
              });
            }
          }
        }
      } catch {}
    };
    checkNotifications();
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
    } catch {}
  }

  async function fetchMarketPrices() {
    try {
      const [piRes, othersRes] = await Promise.all([
        fetch("/api/pi-price", { cache: "no-store" }),
        fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether,usd-coin,dai,binance-usd,euro-coin,origin-dollar,ripple,stellar,ethereum,binancecoin,solana,tron,cardano,dogecoin,the-open-network&vs_currencies=usd"),
      ]);
      if (piRes.ok) {
        const piData = await piRes.json();
        if (piData.success && piData.price > 0) setMarketPrices((prev) => ({ ...prev, PI: piData.price }));
      }
      if (othersRes.ok) {
        const result = await othersRes.json();
        setMarketPrices((prev) => ({
          ...prev,
          BTC: result.bitcoin?.usd || prev.BTC,
          USDT: result.tether?.usd || prev.USDT,
          USDC: result["usd-coin"]?.usd || prev.USDC,
          DAI: result.dai?.usd || prev.DAI,
          BUSD: result["binance-usd"]?.usd || prev.BUSD,
          EURC: result["euro-coin"]?.usd || prev.EURC,
          OUSD: result["origin-dollar"]?.usd || prev.OUSD,
          XRP: result.ripple?.usd || prev.XRP,
          XLM: result.stellar?.usd || prev.XLM,
          ETH: result.ethereum?.usd || prev.ETH,
          BNB: result.binancecoin?.usd || prev.BNB,
          SOL: result.solana?.usd || prev.SOL,
          TRX: result.tron?.usd || prev.TRX,
          ADA: result.cardano?.usd || prev.ADA,
          DOGE: result.dogecoin?.usd || prev.DOGE,
          TON: result["the-open-network"]?.usd || prev.TON,
        }));
      }
    } catch {}
  }

  async function fetchDashboardData() {
    const startedAt = Date.now();
    try {
      fetch("/api/wallet/sidra/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }).catch(() => null);
      const [profileRes, historyRes, balRes] = await Promise.all([
        fetch("/api/user/profile", { cache: "no-store" }),
        fetch("/api/wallet/history", { cache: "no-store" }),
        fetch("/api/wallet/balance", { cache: "no-store" }),
      ]);
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const historyData = historyRes.ok ? await historyRes.json() : { transactions: [] };
        setData({ ...profileJson.user, transactions: historyData.transactions || [] });
      } else if (profileRes.status === 401) {
        router.push("/auth/login");
        return;
      }
      if (balRes.ok) {
        const balData = await balRes.json();
        const parsed: Record<string, number> = {};
        for (const key of Object.keys(MARKET_PRICE_INIT)) {
          parsed[key] = parseFloat(balData[key] || "0") || 0;
        }
        setBalances(parsed);
      }
    } catch {
      toast.error("Sync error");
    } finally {
      const MIN_LOADING_MS = 1400;
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_LOADING_MS - elapsed));
      }
      setIsLoading(false);
    }
  }

  // ── Compute total USD value from ALL wallets (same as wallet page)
  const totalUSDValue =
    (balances.PI || 0) * marketPrices.PI +
    (balances.BTC || 0) * marketPrices.BTC +
    (balances.SDA || 0) * marketPrices.SDA +
    (balances.USDT || 0) * marketPrices.USDT +
    (balances.USDC || 0) * marketPrices.USDC +
    (balances.DAI || 0) * marketPrices.DAI +
    (balances.BUSD || 0) * marketPrices.BUSD +
    (balances.EURC || 0) * marketPrices.EURC +
    (balances.OUSD || 0) * marketPrices.OUSD +
    (balances.XRP || 0) * marketPrices.XRP +
    (balances.XLM || 0) * marketPrices.XLM +
    (balances.ETH || 0) * marketPrices.ETH +
    (balances.BNB || 0) * marketPrices.BNB +
    (balances.SOL || 0) * marketPrices.SOL +
    (balances.TRX || 0) * marketPrices.TRX +
    (balances.ADA || 0) * marketPrices.ADA +
    (balances.DOGE || 0) * marketPrices.DOGE +
    (balances.TON || 0) * marketPrices.TON;

  const totalInXAF = totalUSDValue * USD_TO_XAF;
  const totalInSelectedCurrency = convertFromXAF(totalInXAF);

  const formatTotalBalance = () => {
    if (currencyInfo.code === "XAF" || currencyInfo.code === "XOF") {
      return `${Math.round(totalInSelectedCurrency).toLocaleString("fr-FR")} FCFA`;
    }
    if (["CDF", "NGN", "MGA"].includes(currencyInfo.code)) {
      return `${Math.round(totalInSelectedCurrency).toLocaleString("fr-FR")} ${currencyInfo.symbol}`;
    }
    return `${currencyInfo.symbol}${totalInSelectedCurrency.toLocaleString("en-US", {
      minimumFractionDigits: currencyInfo.decimals,
      maximumFractionDigits: currencyInfo.decimals,
    })}`;
  };

  const displayName = data?.name || "PIONEER";

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return tr.greetingMorning;
    if (hour < 18) return tr.greetingAfternoon;
    return tr.greetingEvening;
  };

  const computeStats = (txsRaw: any[]) => {
    const filtered = (txsRaw || []).filter((t) => t.status === "SUCCESS" || !t.status);
    const swapTypes = ["EXCHANGE", "SWAP"];
    const othersTypes = ["PAYMENT", "CARD_PURCHASE", "AIRDROP", "STAKING_REWARD", "STAKING", "MPAY", "AIRTIME", "BILL_PAYMENT", "MERCHANT_PAYMENT", "FEE", "BONUS", "REFERRAL", "CASHBACK", "REWARD"];
    const swaps = filtered.filter((t) => swapTypes.includes(t.type)).length;
    const others = filtered.filter((t) => othersTypes.includes(t.type) || (t.description && ["mpay", "airtime", "staking", "bonus", "parrainage"].some((k) => t.description.toLowerCase().includes(k)))).length;
    const sent = filtered.filter((t) => (t.isDebit || t.type === "WITHDRAW") && !swapTypes.includes(t.type) && !othersTypes.includes(t.type)).length;
    const received = filtered.filter((t) => (!t.isDebit || t.type === "DEPOSIT") && !swapTypes.includes(t.type) && !othersTypes.includes(t.type)).length;
    const total = sent + received + swaps + others;
    const pie = [
      { name: "Sortant", value: sent },
      { name: "Entrant", value: received },
      { name: "Swaps", value: swaps },
      { name: "Autres", value: others },
    ];
    return { pie, list: [...pie, { name: "Total", value: total }], total, sent, received };
  };

  const stats = computeStats(data?.transactions);
  const pieData = stats.total > 0 ? stats.pie.filter((s) => s.value > 0) : [{ name: "Aucune", value: 1 }];

  // Top wallets by value
  const topWallets = Object.entries(balances)
    .map(([k, v]) => ({ currency: k, balance: v, usdValue: v * (marketPrices[k] || 0) }))
    .filter((w) => w.usdValue > 0)
    .sort((a, b) => b.usdValue - a.usdValue)
    .slice(0, 4);

  const handleLogout = async () => {
    // Signale au SessionGuard qu'il s'agit d'une déconnexion VOLONTAIRE, pour
    // éviter le faux toast "déconnecté par l'administrateur" pendant l'appel.
    window.dispatchEvent(new Event("pimpay:logging-out"));
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success(t("settings.logoutSuccess"));
    router.push("/auth/login");
  };

  const getTxIcon = (tx: any) => {
    if (tx.type === "EXCHANGE") return { icon: <RefreshCcw size={18} />, color: "bg-orange-500/10 text-orange-500" };
    return tx.isDebit
      ? { icon: <ArrowUpCircle size={18} />, color: "bg-blue-500/10 text-blue-500" }
      : { icon: <ArrowDownCircle size={18} />, color: "bg-emerald-500/10 text-emerald-500" };
  };

  if (!hasMounted || isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />











      {/* ── Header ── */}
      <header className="px-6 py-6 flex justify-between items-center bg-[#020617]/80 backdrop-blur-md sticky top-0 z-[100] border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-xl flex items-center justify-center font-bold italic shadow-lg text-white text-xl">P</div>
          <div>
            <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">
              PIMOBIPAY<span className="not-italic text-blue-500">.</span>
            </h1>
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em] mt-1">{tr.virtualBank}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsLoading(true); fetchDashboardData(); fetchMarketPrices(); }}
            className="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all"
          >
            <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <NotificationBell
            buttonClassName="p-3 rounded-2xl bg-white/5 text-slate-400 active:scale-90 transition-all relative"
            badgeClassName="absolute -top-1 -right-1 min-w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1"
          />
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-11 h-11 rounded-2xl bg-white/5 text-slate-400 overflow-hidden flex items-center justify-center"
            >
              {data?.avatar ? <img src={data.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover" /> : <User size={18} />}
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-56 bg-slate-900 border border-white/10 rounded-[24px] shadow-2xl p-2 z-[110]">
                <div className="p-4 border-b border-white/5 mb-2">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{tr.account}</p>
                  <p className="text-sm font-bold truncate">@{data?.username}</p>
                </div>
                <button onClick={() => router.push("/profile")} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left"><Settings size={16} /> {tr.profile}</button>
                <button onClick={() => router.push("/wallet")} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left"><WalletIcon size={16} className="text-blue-400" /> {tr.myWallet}</button>
                <button onClick={() => { setShowReferral(true); setShowProfileMenu(false); }} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-white/5 text-xs font-bold uppercase text-left">
                  <div className="flex items-center gap-3"><UsersIcon size={16} className="text-blue-400" /><span>{tr.referral}</span></div>
                  <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">{data?.referralCount || 0}</span>
                </button>
                {/* Language selector — FR / EN / 中文 */}
                <div className="px-3 py-3">
                  <div className="flex items-center gap-3 mb-2">
                    <Globe size={16} className="text-cyan-400" />
                    <span className="text-xs font-bold uppercase">{tr.language}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { code: "fr", label: "FR" },
                      { code: "en", label: "EN" },
                      { code: "zh", label: "中文" },
                    ] as const).map((opt) => {
                      const active = locale === opt.code;
                      return (
                        <button
                          key={opt.code}
                          onClick={() => setLocale(opt.code)}
                          className={`py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all active:scale-95 ${
                            active
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                              : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 rounded-xl text-rose-500 text-xs font-bold uppercase text-left"><LogOut size={16} /> {tr.logout}</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="px-6 flex-grow pb-10">

        {/* ── Greeting ── */}
        <div className="mt-5 mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{getGreeting()} 👋</p>
            <h2 className="text-base font-black text-white tracking-tight mt-0.5">{displayName}</h2>
          </div>
          {data?.kycStatus === "VERIFIED" && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
              <Shield size={12} className="text-emerald-400" />
              <span className="text-[9px] font-black text-emerald-400 uppercase">{tr.kycVerified}</span>
            </div>
          )}
        </div>

        {/* ── FinTech Balance Card (unique design) ── */}
        <div className="relative w-full mb-6 overflow-hidden rounded-[28px]">
          {/* Outer glow */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-violet-600/40 via-blue-500/20 to-cyan-500/30 rounded-[30px] blur-md" />
          {/* Card body */}
          <div className="relative bg-[#050d1f] rounded-[28px] border border-white/8 overflow-hidden">
            {/* Animated circuit pattern */}
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, rgba(139,92,246,0.8) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.8) 0%, transparent 40%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(139,92,246,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.4) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            {/* Decorative orbs */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-violet-600/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />

            <div className="relative z-10 p-6">
              {/* Top row */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-400">PIMOBIPAY FINTECH</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tr.totalPortfolio}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowBalance(!showBalance)} className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-xl text-slate-400">
                    {showBalance ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  {/* Currency switcher */}
                  <div className="relative" ref={currencySwitcherRef}>
                    <button
                      onClick={() => setShowCurrencySwitcher(!showCurrencySwitcher)}
                      className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl hover:border-white/20 transition-colors"
                    >
                      <span className="text-sm">{currencyInfo.flag}</span>
                      <span className="text-[10px] font-black text-white">{currencyInfo.code}</span>
                      <ChevronDown size={10} className={`text-white/40 transition-transform ${showCurrencySwitcher ? "rotate-180" : ""}`} />
                    </button>
                    {showCurrencySwitcher && (
                      <div className="absolute right-0 mt-2 w-52 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[130]">
                        <div className="px-3 py-2 border-b border-white/5">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{tr.displayCurrency}</p>
                        </div>
                        <div className="max-h-52 overflow-y-auto py-1">
                          {(Object.keys(CURRENCY_LIST) as Array<keyof typeof CURRENCY_LIST>).map((code) => {
                            const info = CURRENCY_LIST[code];
                            const isSelected = code === currency;
                            return (
                              <button
                                key={code}
                                onClick={() => {
                                  setCtxCurrency(code);
                                  setShowCurrencySwitcher(false);
                                  toast.success(`${tr.currencyLabel}: ${info.name}`);
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${isSelected ? "bg-violet-600/20 text-violet-400" : "hover:bg-white/5 text-white"}`}
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
                </div>
              </div>

              {/* Balance */}
              <div className="mb-5">
                {isLoading ? (
                  <div className="h-10 w-52 bg-white/5 rounded-xl animate-pulse" />
                ) : (
                  <p className="text-4xl font-black tracking-tight text-white leading-none">
                    {showBalance ? formatTotalBalance() : "••••••••"}
                  </p>
                )}
                {showBalance && !isLoading && (
                  <p className="text-[10px] text-slate-500 font-bold mt-1.5">
                    ≈ ${totalUSDValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                  </p>
                )}
              </div>

              {/* Bottom row — user + top assets */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{displayName}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-bold text-emerald-500/80 uppercase">{tr.multiChainActive}</span>
                  </div>
                </div>
                {/* Mini asset pills */}
                <div className="flex gap-1 flex-wrap justify-end max-w-[150px]">
                  {topWallets.map((w) => (
                    <span key={w.currency} className="text-[8px] font-black text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md">
                      {w.currency}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <QuickActionBtn icon={<ArrowUpRight size={22} />} label={tr.qaSend} color="bg-blue-600" onClick={() => router.push("/transfer")} />
          <QuickActionBtn icon={<Download size={22} />} label={tr.qaReceive} color="bg-violet-600" onClick={() => router.push("/deposit")} />
          <QuickActionBtn icon={<ArrowLeftRight size={22} />} label={tr.qaSwap} color="bg-orange-600" onClick={() => router.push("/swap")} />
          <QuickActionBtn icon={<ArrowDownLeft size={22} />} label={tr.qaWithdraw} color="bg-emerald-700" onClick={() => router.push("/withdraw")} />
        </div>

        {/* ── Second row of actions ── */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <QuickActionBtn icon={<Smartphone size={20} />} label={tr.qaAirtime} color="bg-slate-700" onClick={() => router.push("/airtime")} />
          <QuickActionBtn icon={<CreditCard size={20} />} label={tr.qaCard} color="bg-slate-700" onClick={() => router.push("/dashboard/card")} />
          <QuickActionBtn icon={<Lock size={20} />} label={tr.qaStaking} color="bg-slate-700" onClick={() => router.push("/wallet/staking")} />
          <QuickActionBtn icon={<Receipt size={20} />} label={tr.qaBills} color="bg-slate-700" onClick={() => router.push("/statements")} />
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <StatCard
            label={tr.statTransactions}
            value={stats.total.toString()}
            sub={`${stats.received} ${tr.incoming}`}
            icon={<Activity size={14} />}
            trend="up"
          />
          <StatCard
            label={tr.statUsdValue}
            value={`$${totalUSDValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}`}
            sub={tr.totalPortfolioSub}
            icon={<TrendingUp size={14} />}
            trend={totalUSDValue > 0 ? "up" : null}
          />
          <StatCard
            label={tr.statActiveAssets}
            value={topWallets.length.toString()}
            sub={tr.withValue}
            icon={<BarChart3 size={14} />}
          />
          <StatCard
            label={tr.statReferral}
            value={(data?.referralCount || 0).toString()}
            sub={tr.activeReferrals}
            icon={<UsersIcon size={14} />}
          />
        </div>

        {/* ── Portfolio top assets ── */}
        {topWallets.length > 0 && (
          <section className="mb-8 p-5 rounded-[28px] bg-slate-900/40 border border-white/8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{tr.topAssets}</h3>
              <button onClick={() => router.push("/wallet")} className="flex items-center gap-1 text-[10px] font-black text-blue-400 uppercase tracking-wide">
                {tr.viewAll} <ChevronRight size={12} />
              </button>
            </div>
            <div className="space-y-3">
              {topWallets.map((w) => {
                const pct = totalUSDValue > 0 ? (w.usdValue / totalUSDValue) * 100 : 0;
                return (
                  <div key={w.currency} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-400 border border-white/5">{w.currency.slice(0, 2)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-white uppercase">{w.currency}</span>
                        <span className="text-[10px] font-black text-slate-400">${w.usdValue.toLocaleString("en-US", { maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-slate-500">{pct.toFixed(0)}%</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Flux de Trésorerie ── */}
        <section className="mb-8 p-5 rounded-[28px] bg-slate-900/40 border border-white/8">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{tr.cashFlow}</h3>
            <LayoutGrid size={16} className="text-slate-600" />
          </div>
          <div className="flex items-center gap-5">
            <div className="w-28 h-28 relative flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={30} outerRadius={46} paddingAngle={4} dataKey="value">
                    {pieData.map((entry, index) => <Cell key={index} fill={pieColor(entry.name)} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black uppercase text-violet-400">
                {stats.total > 0 ? tr.live : tr.na}
              </div>
            </div>
            <div className="flex-1 grid grid-cols-1 gap-2">
              {stats.list.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pieColor(item.name) }} />
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{pieLabel(item.name)}</span>
                  </div>
                  <span className="text-[10px] font-black">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Shortcuts section ── */}
        <section className="mb-8">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{tr.quickServices}</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Building2 size={18} />, label: tr.svcBankTitle, sub: tr.svcBankSub, link: "/bank", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
              { icon: <Banknote size={18} />, label: tr.svcDepositTitle, sub: tr.svcDepositSub, link: "/deposit", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
              { icon: <Star size={18} />, label: tr.svcPimTitle, sub: tr.svcPimSub, link: "/pim-coins", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
              { icon: <MessageCircle size={18} />, label: tr.svcSupportTitle, sub: tr.svcSupportSub, link: "/support", color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
            ].map((s, i) => (
              <button
                key={i}
                onClick={() => router.push(s.link)}
                className={`flex items-center gap-3 p-4 rounded-[20px] border ${s.color} bg-opacity-10 active:scale-95 transition-all text-left`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase">{s.label}</p>
                  <p className="text-[8px] font-bold text-slate-500">{s.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* ── Transactions récentes ── */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{tr.recentTransactions}</h3>
            <button onClick={() => router.push("/statements")} className="flex items-center gap-1 text-[10px] font-black text-blue-400 uppercase tracking-wide">
              {tr.viewAll} <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3 max-h-[380px] overflow-y-auto no-scrollbar">
            {data?.transactions?.length > 0 ? (
              data.transactions.slice(0, 8).map((tx: any) => {
                const { icon, color } = getTxIcon(tx);
                return (
                  <div
                    key={tx.id}
                    onClick={() => {
                      const query = tx.reference ? `ref=${encodeURIComponent(tx.reference)}` : `id=${encodeURIComponent(tx.id)}`;
                      router.push(`/deposit/receipt?${query}`);
                    }}
                    className="p-4 bg-slate-900/40 border border-white/5 rounded-[20px] flex justify-between items-center active:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
                      <div>
                        <p className="text-[11px] font-bold uppercase text-white leading-tight">{formatDescription(tx.description || tx.type)}</p>
                        <p className="text-[8px] text-slate-500 font-black uppercase mt-0.5">
                          {tx.isDebit ? `${tr.txTo} ${truncateAddress(tx.peerName || tr.systemPimpay)}` : `${tr.txFrom} ${truncateAddress(tx.peerName || tr.systemPimpay)}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${!tx.isDebit ? "text-emerald-400" : "text-blue-400"}`}>
                        {tx.isDebit ? "-" : "+"}
                        {tx.amount.toLocaleString()} {tx.currency}
                      </p>
                      <p className="text-[8px] text-slate-500 font-black mt-0.5">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 opacity-30 text-[10px] uppercase font-bold border border-dashed border-white/10 rounded-[28px]">
                {tr.noTransaction}
              </div>
            )}
          </div>
        </section>

        <PartnersMarquee />
      </main>

      <footer className="pt-8 pb-32 border-t border-white/5 flex flex-col items-center gap-6 bg-[#020617]">
        <div className="flex items-center gap-6">
          <a href="https://facebook.com/pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"><Facebook size={20} /></a>
          <a href="https://x.com/pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"><Twitter size={20} /></a>
          <a href="https://cg.linkedin.com/in/aimardswana" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"><Linkedin size={20} /></a>
          <a href="https://youtube.com/@pimpayofficial" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
          </a>
          <a href="https://tiktok.com/@pimobilepay" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.19 8.19 0 0 0 4.79 1.52V6.76a4.85 4.85 0 0 1-1.02-.07z" /></svg>
          </a>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">© 2026 PIMOBIPAY Virtual Bank</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-700 mt-1">Pi Mobile Payment Solution</p>
        </div>
      </footer>

      <BottomNav onOpenMenu={() => setIsSidebarOpen(true)} />
      {showReferral && <ReferralProgram onClose={() => setShowReferral(false)} />}
    </div>
  );
}
