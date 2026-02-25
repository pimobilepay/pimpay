"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCcw, ArrowUpRight, ArrowLeftRight, History, X, Copy, Check, Download,
  ArrowDownLeft, Clock, Calendar, Facebook, Twitter, Youtube, Zap, Globe,
  TrendingUp, TrendingDown, ChevronRight, Shield, Wallet
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { useRouter } from "next/navigation";
import SendModal from "@/components/SendModal";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";

// --- LOGOS ---
const PiLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center border border-white/10 p-2">
    <img src="/pi-coin.png" alt="Pi" className="w-full h-full object-contain" />
  </div>
);

const SdaLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-[#1e293b] flex items-center justify-center border border-emerald-500/20 p-2">
    <img src="/sidrachain.png" alt="SDA" className="w-full h-full object-contain" />
  </div>
);

const UsdtLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-emerald-900/20 flex items-center justify-center border border-emerald-500/20 p-2">
    <img src="/tether-usdt.png" alt="USDT" className="w-full h-full object-contain" />
  </div>
);

const BtcLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-orange-900/20 flex items-center justify-center border border-orange-500/20 p-2">
    <img src="/bitcoin.png" alt="BTC" className="w-full h-full object-contain" />
  </div>
);

const UsdcLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-blue-900/20 flex items-center justify-center border border-blue-400/20 p-2">
    <img src="/usdc.png" alt="USDC" className="w-full h-full object-contain rounded-lg" />
  </div>
);

const DaiLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-amber-900/20 flex items-center justify-center border border-amber-500/20 p-2">
    <img src="/dai.png" alt="DAI" className="w-full h-full object-contain rounded-lg" />
  </div>
);

const BusdLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-yellow-900/20 flex items-center justify-center border border-yellow-500/20 p-2">
    <img src="/busd.png" alt="BUSD" className="w-full h-full object-contain rounded-lg" />
  </div>
);

const XrpLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-slate-900/60 flex items-center justify-center border border-slate-400/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#23292f"/>
      <path d="M23.07 8h2.89l-6.01 5.84a5.52 5.52 0 01-7.9 0L6.04 8h2.89l4.58 4.46a3.5 3.5 0 005.01 0L23.07 8zm-17.14 16H3.04l6.01-5.84a5.52 5.52 0 017.9 0L22.96 24h-2.89l-4.58-4.46a3.5 3.5 0 00-5.01 0L5.93 24z" fill="#fff"/>
    </svg>
  </div>
);

const XlmLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-sky-900/20 flex items-center justify-center border border-sky-400/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#0e1b2e"/>
      <path d="M24.9 10.5l-1.4.8-14 8-2.5 1.4V18l2.5-1.4 10.3-5.9 1.4-.8L24.9 8v2.5zm0 3.7l-2.5 1.4-10.3 5.9-1.4.8-2.5 1.4-2.2 1.3v-2.5l2.2-1.3 1.4-.8 10.3-5.9 2.5-1.4 2.5-1.4v2.5l-2.5 1.4 2.5-1.4zm0 3.6l-2.5 1.4-14 8-1.4.8v-2.5l1.4-.8 14-8 2.5-1.4V24l-2.5 1.4V17.8z" fill="#50e6ff"/>
    </svg>
  </div>
);

const EthLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-indigo-900/20 flex items-center justify-center border border-indigo-400/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#627eea"/>
      <path d="M16.498 4v8.87l7.497 3.35z" fill="#fff" fillOpacity=".6"/>
      <path d="M16.498 4L9 16.22l7.498-3.35z" fill="#fff"/>
      <path d="M16.498 21.968v6.027L24 17.616z" fill="#fff" fillOpacity=".6"/>
      <path d="M16.498 27.995v-6.028L9 17.616z" fill="#fff"/>
      <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fill="#fff" fillOpacity=".2"/>
      <path d="M9 16.22l7.498 4.353v-7.701z" fill="#fff" fillOpacity=".6"/>
    </svg>
  </div>
);

const BnbLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-yellow-900/20 flex items-center justify-center border border-yellow-500/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#f3ba2f"/>
      <path d="M12.116 14.404L16 10.52l3.886 3.886 2.26-2.26L16 6l-6.144 6.144 2.26 2.26zM6 16l2.26-2.26L10.52 16l-2.26 2.26zm6.116 1.596L16 21.48l3.886-3.886 2.26 2.259L16 26l-6.144-6.144-.003-.003 2.263-2.257zM21.48 16l2.26-2.26L26 16l-2.26 2.26zm-3.188-.002h.002L16 13.706 14.294 15.4l-.002.002-.2.2-.09.09L16 17.696l2.293-2.293.001-.001-.002-.004z" fill="#fff"/>
    </svg>
  </div>
);

const SolLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-purple-900/20 flex items-center justify-center border border-purple-400/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#000"/>
      <defs><linearGradient id="sol-a" x1="6" y1="24" x2="26" y2="8"><stop stopColor="#9945FF"/><stop offset="1" stopColor="#14F195"/></linearGradient></defs>
      <path d="M9.5 20.8a.6.6 0 01.42-.17h15.33a.3.3 0 01.21.51l-2.96 2.96a.6.6 0 01-.42.17H6.75a.3.3 0 01-.21-.51l2.96-2.96zm0-12.87a.6.6 0 01.42-.17h15.33a.3.3 0 01.21.51l-2.96 2.96a.6.6 0 01-.42.17H6.75a.3.3 0 01-.21-.51l2.96-2.96zm13.5 6.43a.6.6 0 00-.42-.17H7.25a.3.3 0 00-.21.51l2.96 2.96a.6.6 0 00.42.17h15.33a.3.3 0 00.21-.51l-2.96-2.96z" fill="url(#sol-a)"/>
    </svg>
  </div>
);

const TrxLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-red-900/20 flex items-center justify-center border border-red-500/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#eb0029"/>
      <path d="M8 8.8l3.5 12.9L24.3 10 8 8.8zm4 3l8.3.6-7.1 7.2L12 11.8z" fill="#fff"/>
    </svg>
  </div>
);

const AdaLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-blue-900/30 flex items-center justify-center border border-blue-500/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#0033ad"/>
      <circle cx="16" cy="10" r="2" fill="#fff"/><circle cx="16" cy="22" r="2" fill="#fff"/>
      <circle cx="10.5" cy="13" r="1.6" fill="#fff"/><circle cx="21.5" cy="13" r="1.6" fill="#fff"/>
      <circle cx="10.5" cy="19" r="1.6" fill="#fff"/><circle cx="21.5" cy="19" r="1.6" fill="#fff"/>
      <circle cx="16" cy="16" r="3" fill="none" stroke="#fff" strokeWidth="1"/>
    </svg>
  </div>
);

const DogeLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-amber-900/20 flex items-center justify-center border border-amber-400/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#c2a633"/>
      <text x="16" y="21" textAnchor="middle" fill="#fff" fontWeight="900" fontSize="14" fontFamily="sans-serif">D</text>
    </svg>
  </div>
);

const TonLogo = () => (
  <div className="w-11 h-11 rounded-2xl bg-sky-900/20 flex items-center justify-center border border-sky-400/20 p-2">
    <svg viewBox="0 0 32 32" className="w-full h-full">
      <circle cx="16" cy="16" r="16" fill="#0098ea"/>
      <path d="M16 6l-9 16h6l3-6 3 6h6z" fill="#fff"/>
    </svg>
  </div>
);

// --- TYPES ---
interface WalletAddresses {
  PI: string;
  SDA: string;
  USDT: string;
  BTC: string;
  ETH: string;
  BNB: string;
  SOL: string;
  TRX: string;
  ADA: string;
  DOGE: string;
  TON: string;
  USDC: string;
  DAI: string;
  BUSD: string;
  XRP: string;
  XLM: string;
}

export default function WalletPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [userId, setUserId] = useState("");

  const [userName, setUserName] = useState("Pioneer");
  const [piBalance, setPiBalance] = useState("0.00000000");
  const [btcBalance, setBtcBalance] = useState("0.00000000");
  const [sdaBalance, setSdaBalance] = useState("0.0000");
  const [usdtBalance, setUsdtBalance] = useState("0.0000");
  const [usdcBalance, setUsdcBalance] = useState("0.0000");
  const [daiBalance, setDaiBalance] = useState("0.0000");
  const [busdBalance, setBusdBalance] = useState("0.0000");

  const [xrpBalance, setXrpBalance] = useState("0.000000");
  const [xlmBalance, setXlmBalance] = useState("0.0000000");
  const [ethBalance, setEthBalance] = useState("0.00000000");
  const [bnbBalance, setBnbBalance] = useState("0.00000000");
  const [solBalance, setSolBalance] = useState("0.00000000");
  const [trxBalance, setTrxBalance] = useState("0.000000");
  const [adaBalance, setAdaBalance] = useState("0.000000");
  const [dogeBalance, setDogeBalance] = useState("0.000000");
  const [tonBalance, setTonBalance] = useState("0.000000");

  const [addresses, setAddresses] = useState<WalletAddresses>({
    PI: "", SDA: "", USDT: "", BTC: "", ETH: "", BNB: "", SOL: "", TRX: "", ADA: "", DOGE: "", TON: "", USDC: "", DAI: "", BUSD: "", XRP: "", XLM: ""
  });

  const [marketPrices, setMarketPrices] = useState({
    BTC: 0, USDT: 1.00, SDA: 1.20, PI: 314159, USDC: 1.00, DAI: 1.00, BUSD: 1.00, XRP: 0, XLM: 0,
    ETH: 0, BNB: 0, SOL: 0, TRX: 0, ADA: 0, DOGE: 0, TON: 0
  });

  const fetchMarketPrices = useCallback(async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether,usd-coin,dai,binance-usd,ripple,stellar,ethereum,binancecoin,solana,tron,cardano,dogecoin,the-open-network&vs_currencies=usd');
      if (res.ok) {
        const result = await res.json();
        setMarketPrices(prev => ({
          ...prev,
          BTC: result.bitcoin?.usd || prev.BTC,
          USDT: result.tether?.usd || prev.USDT,
          USDC: result["usd-coin"]?.usd || prev.USDC,
          DAI: result.dai?.usd || prev.DAI,
          BUSD: result["binance-usd"]?.usd || prev.BUSD,
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
    } catch (err) { /* silently fail, keep defaults */ }
  }, []);

  const loadWalletData = useCallback(async () => {
    setLoading(true);
    try {
      // Sync SDA silently
      fetch("/api/wallet/sidra/sync", { method: "POST" }).catch(() => null);

      const [profileRes, balRes, txRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/wallet/balance'),
        fetch('/api/wallet/history?limit=10')
      ]);

      // Profile data - correctly read from result.user
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const user = profileJson.user;
        if (user) {
          setUserId(user.id);
          setUserName(user.name || "Pioneer");
        }
      }

      // Balance data - with addresses
      if (balRes.ok) {
        const balData = await balRes.json();
        setPiBalance(parseFloat(balData.PI || "0").toFixed(8));
        setSdaBalance(parseFloat(balData.SDA || "0").toFixed(4));
        setUsdtBalance(parseFloat(balData.USDT || "0").toFixed(4));
        setBtcBalance(parseFloat(balData.BTC || "0").toFixed(8));
        setUsdcBalance(parseFloat(balData.USDC || "0").toFixed(4));
        setDaiBalance(parseFloat(balData.DAI || "0").toFixed(4));
        setBusdBalance(parseFloat(balData.BUSD || "0").toFixed(4));
        setXrpBalance(parseFloat(balData.XRP || "0").toFixed(6));
        setXlmBalance(parseFloat(balData.XLM || "0").toFixed(7));
        setEthBalance(parseFloat(balData.ETH || "0").toFixed(8));
        setBnbBalance(parseFloat(balData.BNB || "0").toFixed(8));
        setSolBalance(parseFloat(balData.SOL || "0").toFixed(8));
        setTrxBalance(parseFloat(balData.TRX || "0").toFixed(6));
        setAdaBalance(parseFloat(balData.ADA || "0").toFixed(6));
        setDogeBalance(parseFloat(balData.DOGE || "0").toFixed(6));
        setTonBalance(parseFloat(balData.TON || "0").toFixed(6));

        if (balData.addresses) {
          setAddresses({
            PI: balData.addresses.PI || "",
            SDA: balData.addresses.SDA || "",
            USDT: balData.addresses.USDT || "",
            BTC: balData.addresses.BTC || "",
            ETH: balData.addresses.ETH || "",
            BNB: balData.addresses.BNB || "",
            SOL: balData.addresses.SOL || "",
            TRX: balData.addresses.TRX || "",
            ADA: balData.addresses.ADA || "",
            DOGE: balData.addresses.DOGE || "",
            TON: balData.addresses.TON || "",
            USDC: balData.addresses.USDC || "",
            DAI: balData.addresses.DAI || "",
            BUSD: balData.addresses.BUSD || "",
            XRP: balData.addresses.XRP || "",
            XLM: balData.addresses.XLM || "",
          });
        }
      }

      // Transaction history
      if (txRes.ok) {
        const txData = await txRes.json();
        setRecentTx(txData.transactions || []);
      }
    } catch (err) {
      console.error("Wallet data error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    loadWalletData();
    fetchMarketPrices();
  }, [loadWalletData, fetchMarketPrices]);

  const handleCopy = (address: string) => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success(t("wallet.addressCopied"));
    setTimeout(() => setCopied(false), 2000);
  };

  const totalUSDValue =
    (parseFloat(piBalance) * marketPrices.PI) +
    (parseFloat(btcBalance) * marketPrices.BTC) +
    (parseFloat(sdaBalance) * marketPrices.SDA) +
    (parseFloat(usdtBalance) * marketPrices.USDT) +
    (parseFloat(usdcBalance) * marketPrices.USDC) +
    (parseFloat(daiBalance) * marketPrices.DAI) +
    (parseFloat(busdBalance) * marketPrices.BUSD) +
    (parseFloat(xrpBalance) * marketPrices.XRP) +
    (parseFloat(xlmBalance) * marketPrices.XLM) +
    (parseFloat(ethBalance) * marketPrices.ETH) +
    (parseFloat(bnbBalance) * marketPrices.BNB) +
    (parseFloat(solBalance) * marketPrices.SOL) +
    (parseFloat(trxBalance) * marketPrices.TRX) +
    (parseFloat(adaBalance) * marketPrices.ADA) +
    (parseFloat(dogeBalance) * marketPrices.DOGE) +
    (parseFloat(tonBalance) * marketPrices.TON);

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen w-full bg-[#020617] text-white overflow-x-hidden font-sans flex flex-col">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="px-5 pt-10 max-w-md mx-auto flex-grow w-full">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter">
              M<span className="text-blue-500">Wallet</span>
            </h1>
            <p className="text-[9px] font-black text-blue-400/70 uppercase tracking-[0.2em] mt-0.5">{t("wallet.multiChainPortfolio")}</p>
          </div>
          <button
            onClick={loadWalletData}
            disabled={loading}
            className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* PORTFOLIO CARD */}
        <div className="relative w-full mb-8">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 via-blue-500/10 to-blue-600/20 rounded-[2rem] blur-xl" />
          <div className="relative bg-gradient-to-br from-[#0c1629] to-[#0f172a] rounded-[1.75rem] p-6 border border-blue-500/10 overflow-hidden">
            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)',
              backgroundSize: '24px 24px'
            }} />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{t("wallet.totalBalance")}</p>
                  {loading ? (
                    <div className="h-9 w-48 bg-white/5 rounded-xl animate-pulse" />
                  ) : (
                    <p className="text-3xl font-black text-white tracking-tight">
                      ${totalUSDValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <Shield size={10} className="text-blue-400" />
                  <span className="text-[8px] font-black text-blue-400 uppercase">Secured</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{userName}</p>
                </div>
                <div className="flex gap-1">
                  {["PI", "BTC", "ETH", "SDA", "USDT", "BNB", "SOL", "XRP", "XLM", "TRX", "ADA", "DOGE", "TON", "USDC", "DAI", "BUSD"].map((c) => (
                    <span key={c} className="text-[7px] font-black text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          <QuickAction
            icon={<ArrowUpRight size={20} />}
            label={t("wallet.send")}
            onClick={() => setIsSendOpen(true)}
          />
          <QuickAction
            icon={<Download size={20} />}
            label={t("wallet.receive")}
            onClick={() => setSelectedAsset({
              name: "Pi Network",
              symbol: "PI",
              address: addresses.PI,
              network: "Pi Mainnet"
            })}
          />
          <QuickAction
            icon={<ArrowLeftRight size={20} />}
            label={t("wallet.swap")}
            onClick={() => router.push('/wallet/swap')}
          />
          <QuickAction
            icon={<History size={20} />}
            label={t("wallet.history")}
            onClick={() => router.push('/transactions')}
          />
        </div>

        {/* ASSETS LIST */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("wallet.yourAssets")}</h3>
          <span className="text-[9px] font-bold text-slate-600">16 {t("wallet.assetsCount")}</span>
        </div>

        <div className="space-y-2.5 mb-8">
          <AssetCard
            logo={<PiLogo />}
            name="Pi Network"
            symbol="PI"
            network="Pi Mainnet"
            balance={piBalance}
            marketPrice={marketPrices.PI}
            usdValue={parseFloat(piBalance) * marketPrices.PI}
            isMain
            loading={loading}
            onClick={() => router.push('/wallet/pi')}
          />
          <AssetCard
            logo={<SdaLogo />}
            name="Sidra Chain"
            symbol="SDA"
            network="Sidra Mainnet"
            balance={sdaBalance}
            marketPrice={marketPrices.SDA}
            usdValue={parseFloat(sdaBalance) * marketPrices.SDA}
            loading={loading}
            onClick={() => router.push('/wallet/sda')}
          />
          <AssetCard
            logo={<UsdtLogo />}
            name="Tether USD"
            symbol="USDT"
            network="TRC20"
            balance={usdtBalance}
            marketPrice={marketPrices.USDT}
            usdValue={parseFloat(usdtBalance) * marketPrices.USDT}
            loading={loading}
            onClick={() => router.push('/wallet/usdt')}
          />
          <AssetCard
            logo={<BtcLogo />}
            name="Bitcoin"
            symbol="BTC"
            network="Bitcoin Mainnet"
            balance={btcBalance}
            marketPrice={marketPrices.BTC}
            usdValue={parseFloat(btcBalance) * marketPrices.BTC}
            loading={loading}
            onClick={() => router.push('/wallet/btc')}
          />
          <AssetCard
            logo={<EthLogo />}
            name="Ethereum"
            symbol="ETH"
            network="ERC20"
            balance={ethBalance}
            marketPrice={marketPrices.ETH}
            usdValue={parseFloat(ethBalance) * marketPrices.ETH}
            loading={loading}
            onClick={() => router.push('/wallet/eth')}
          />
          <AssetCard
            logo={<BnbLogo />}
            name="BNB"
            symbol="BNB"
            network="BEP20"
            balance={bnbBalance}
            marketPrice={marketPrices.BNB}
            usdValue={parseFloat(bnbBalance) * marketPrices.BNB}
            loading={loading}
            onClick={() => router.push('/wallet/bnb')}
          />
          <AssetCard
            logo={<SolLogo />}
            name="Solana"
            symbol="SOL"
            network="Solana Mainnet"
            balance={solBalance}
            marketPrice={marketPrices.SOL}
            usdValue={parseFloat(solBalance) * marketPrices.SOL}
            loading={loading}
            onClick={() => router.push('/wallet/sol')}
          />

          <AssetCard
            logo={<XrpLogo />}
            name="Ripple"
            symbol="XRP"
            network="XRP Ledger"
            balance={xrpBalance}
            marketPrice={marketPrices.XRP}
            usdValue={parseFloat(xrpBalance) * marketPrices.XRP}
            loading={loading}
            onClick={() => router.push('/wallet/xrp')}
          />
          <AssetCard
            logo={<XlmLogo />}
            name="Stellar"
            symbol="XLM"
            network="Stellar Network"
            balance={xlmBalance}
            marketPrice={marketPrices.XLM}
            usdValue={parseFloat(xlmBalance) * marketPrices.XLM}
            loading={loading}
            onClick={() => router.push('/wallet/xlm')}
          />
          <AssetCard
            logo={<TrxLogo />}
            name="Tron"
            symbol="TRX"
            network="TRC20"
            balance={trxBalance}
            marketPrice={marketPrices.TRX}
            usdValue={parseFloat(trxBalance) * marketPrices.TRX}
            loading={loading}
            onClick={() => router.push('/wallet/trx')}
          />
          <AssetCard
            logo={<AdaLogo />}
            name="Cardano"
            symbol="ADA"
            network="Cardano Mainnet"
            balance={adaBalance}
            marketPrice={marketPrices.ADA}
            usdValue={parseFloat(adaBalance) * marketPrices.ADA}
            loading={loading}
            onClick={() => router.push('/wallet/ada')}
          />
          <AssetCard
            logo={<DogeLogo />}
            name="Dogecoin"
            symbol="DOGE"
            network="Dogecoin Network"
            balance={dogeBalance}
            marketPrice={marketPrices.DOGE}
            usdValue={parseFloat(dogeBalance) * marketPrices.DOGE}
            loading={loading}
            onClick={() => router.push('/wallet/doge')}
          />
          <AssetCard
            logo={<TonLogo />}
            name="Toncoin"
            symbol="TON"
            network="TON Network"
            balance={tonBalance}
            marketPrice={marketPrices.TON}
            usdValue={parseFloat(tonBalance) * marketPrices.TON}
            loading={loading}
            onClick={() => router.push('/wallet/ton')}
          />

          {/* --- STABLECOINS --- */}
          <div className="pt-4 pb-2 px-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stablecoins</h3>
          </div>

          <AssetCard
            logo={<UsdcLogo />}
            name="USD Coin"
            symbol="USDC"
            network="ERC20 / TRC20"
            balance={usdcBalance}
            marketPrice={marketPrices.USDC}
            usdValue={parseFloat(usdcBalance) * marketPrices.USDC}
            loading={loading}
            onClick={() => router.push('/wallet/usdc')}
          />
          <AssetCard
            logo={<DaiLogo />}
            name="Dai"
            symbol="DAI"
            network="ERC20"
            balance={daiBalance}
            marketPrice={marketPrices.DAI}
            usdValue={parseFloat(daiBalance) * marketPrices.DAI}
            loading={loading}
            onClick={() => router.push('/wallet/dai')}
          />
          <AssetCard
            logo={<BusdLogo />}
            name="Binance USD"
            symbol="BUSD"
            network="BEP20"
            balance={busdBalance}
            marketPrice={marketPrices.BUSD}
            usdValue={parseFloat(busdBalance) * marketPrices.BUSD}
            loading={loading}
            onClick={() => router.push('/wallet/busd')}
          />
        </div>

        {/* RECENT ACTIVITY */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t("wallet.recentActivity")}</h3>
            <button onClick={() => router.push('/transactions')} className="text-[10px] font-bold text-blue-500 uppercase">{t("wallet.viewAll")}</button>
          </div>

          <div className="space-y-2.5">
            {recentTx.length > 0 ? recentTx.map((tx: any, i: number) => {
              const txDate = new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              });

              let txType = t("wallet.transfer");
              let TxIcon = ArrowUpRight;
              let iconBg = "bg-red-500/10";
              let iconColor = "text-red-400";
              let amountPrefix = "-";
              let amountColor = "text-white";

              if (tx.type === "EXCHANGE" || tx.type === "SWAP") {
                txType = t("wallet.swapLabel");
                TxIcon = ArrowLeftRight;
                iconBg = "bg-blue-500/10";
                iconColor = "text-blue-400";
                amountPrefix = "";
              } else if (tx.isDebit === false) {
                txType = tx.type === "DEPOSIT" ? t("wallet.depositLabel") : t("wallet.received");
                TxIcon = ArrowDownLeft;
                iconBg = "bg-emerald-500/10";
                iconColor = "text-emerald-400";
                amountPrefix = "+";
                amountColor = "text-emerald-400";
              }

              return (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/[0.06] transition-all cursor-pointer"
                  onClick={() => {
                    const hash = tx.blockchainTx || tx.externalId;
                    if (hash) {
                      const url = tx.currency === 'SDA'
                        ? `https://ledger.sidrachain.com/tx/${hash}`
                        : `https://minepi.com/blockexplorer/tx/${hash}`;
                      window.open(url, '_blank');
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
                      <TxIcon size={18} className={iconColor} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-tight">
                        {txType} {tx.currency}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={9} className="text-slate-600" />
                        <p className="text-[9px] text-slate-500 font-bold">{txDate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-black tracking-tight ${amountColor}`}>
                      {amountPrefix}{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} {tx.currency}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'SUCCESS' || tx.status === 'SUCCESS' ? 'bg-emerald-500' : tx.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <p className="text-[8px] text-slate-500 uppercase font-bold">{tx.status}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-10 text-center bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
                <Clock size={22} className="mx-auto text-slate-700 mb-2" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">{t("wallet.noRecentActivity")}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="pt-8 pb-32 border-t border-white/5 flex flex-col items-center gap-5 bg-[#020617] mt-6">
        <div className="flex items-center gap-5">
          <a href="https://www.facebook.com/profile.php?id=61583243122633" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-blue-400 transition-colors"><Facebook size={16} /></a>
          <a href="https://x.com/pimobilepay" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-colors"><Twitter size={16} /></a>
          <a href="https://youtube.com/@pimobilepay" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors"><Youtube size={16} /></a>
        </div>
        <div className="text-center">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-600">2026 PimPay Virtual Bank</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-700 mt-0.5">Pi Mobile Payment Solution</p>
        </div>
      </footer>

      {/* RECEIVE QR MODAL */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0f1a] w-full max-w-xs rounded-3xl border border-white/10 p-7 relative text-center">
            <button onClick={() => setSelectedAsset(null)} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors">
              <X size={20} />
            </button>

            <div className="mb-4">
              <p className="text-[10px] font-black uppercase text-blue-500 tracking-widest mb-1">{t("wallet.depositSymbol")} {selectedAsset.symbol}</p>
              <h4 className="text-lg font-black text-white uppercase tracking-tight">{selectedAsset.name}</h4>
              {selectedAsset.network && (
                <span className="inline-block mt-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[9px] font-black text-blue-400 uppercase">
                  {t("wallet.network")}: {selectedAsset.network}
                </span>
              )}
            </div>

            <div className="bg-white p-3 rounded-2xl inline-block mb-5">
              {!selectedAsset.address ? (
                <div className="w-[170px] h-[170px] flex items-center justify-center text-slate-400 font-bold uppercase text-[10px] animate-pulse">
                  {t("wallet.loading")}
                </div>
              ) : (
                <QRCodeSVG value={selectedAsset.address} size={170} />
              )}
            </div>

            <div
              onClick={() => handleCopy(selectedAsset.address)}
              className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-center justify-between cursor-pointer active:bg-white/10 transition-all"
            >
              <p className="text-[10px] font-mono text-slate-400 truncate mr-3">
                {selectedAsset.address || t("wallet.notAvailable")}
              </p>
              {copied ? <Check size={16} className="text-emerald-400 shrink-0" /> : <Copy size={16} className="text-blue-500 shrink-0" />}
            </div>

            {selectedAsset.symbol === "USDT" && (
              <div className="mt-3 py-1.5 px-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-[9px] font-bold text-orange-400 uppercase">{t("wallet.trc20Only")}</p>
              </div>
            )}

            <p className="text-[8px] text-slate-600 uppercase font-bold mt-4 tracking-wide">
              {t("wallet.sendOnlyWarning").replace("{symbol}", selectedAsset.symbol)}
            </p>
          </div>
        </div>
      )}

      <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} balance={sdaBalance} onRefresh={loadWalletData} />
      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}

// --- SUPPORT COMPONENTS ---

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div className="w-13 h-13 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-blue-500 group-active:scale-90 transition-all group-hover:bg-white/[0.07]">
        {icon}
      </div>
      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{label}</span>
    </button>
  );
}

function AssetCard({
  logo, name, balance, symbol, network, marketPrice, usdValue, isMain, loading, onClick
}: {
  logo: React.ReactNode;
  name: string;
  balance: string;
  symbol: string;
  network: string;
  marketPrice: number;
  usdValue: number;
  isMain?: boolean;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl flex items-center justify-between border transition-all active:scale-[0.98] cursor-pointer group ${
        isMain
          ? 'bg-blue-500/[0.06] border-blue-500/15 hover:bg-blue-500/[0.1]'
          : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-center gap-3.5">
        {logo}
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[13px] font-black text-white uppercase tracking-tight">{name}</p>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-bold text-slate-500">${marketPrice.toLocaleString()}</span>
            <span className="text-[8px] font-bold text-slate-600 bg-white/5 px-1.5 py-0.5 rounded">{network}</span>
          </div>
        </div>
      </div>
      <div className="text-right flex items-center gap-2">
        <div>
          {loading ? (
            <>
              <div className="h-4 w-16 bg-white/5 rounded animate-pulse mb-1 ml-auto" />
              <div className="h-3 w-10 bg-white/5 rounded animate-pulse ml-auto" />
            </>
          ) : (
            <>
              <p className="text-sm font-black text-white tracking-tight">{balance} <span className="text-[10px] text-slate-500">{symbol}</span></p>
              <p className="text-[10px] font-bold text-slate-500">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </>
          )}
        </div>
        <ChevronRight size={14} className="text-slate-700 group-hover:text-slate-500 transition-colors" />
      </div>
    </div>
  );
}

