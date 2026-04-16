"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Share2, Download, Clock, X, Copy, Check, History,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar,
  RefreshCcw, Globe, ExternalLink, Wallet, TrendingUp,
  Send, Loader2, Scan, User, FileText, Hash,
  CheckCircle2, XCircle
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// Importation du scanner QR
import { QRScanner } from "@/components/qr-scanner"; 
import { toast } from "sonner";
import { initPiSDK } from "@/lib/pi-sdk";

/**
 * CONFIGURATION DES ACTIFS
 * Corrections : Décimales à 18 pour BNB, DAI, BUSD (Standards BEP20)
 * Correction image BUSD : /busd.png
 */
const ASSET_CONFIG: Record<string, {
  name: string;
  network: string;
  image: string;
  accentColor: string;
  accentBg: string;
  accentBorder: string;
  explorerLabel: string;
  explorerBase: string;
  decimals: number;
}> = {
  PI: {
    name: "Pi Network",
    network: "Pi Mainnet",
    image: "/pi.png",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/20",
    explorerLabel: "Pi Explorer",
    explorerBase: "https://blockexplorer.minepi.com/tx/",
    decimals: 7,
  },
  SDA: {
    name: "Sidra Chain",
    network: "Sidra Mainnet",
    image: "/sda.png",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
    explorerLabel: "Sidra Ledger",
    explorerBase: "https://ledger.sidrachain.com/tx/",
    decimals: 18,
  },
  USDT: {
    name: "Tether USD",
    network: "TRC20 (TRON)",
    image: "/usdt.png",
    accentColor: "text-emerald-400",
    accentBg: "bg-emerald-500/10",
    accentBorder: "border-emerald-500/20",
    explorerLabel: "TronScan",
    explorerBase: "https://tronscan.org/#/transaction/",
    decimals: 6,
  },
  BTC: {
    name: "Bitcoin",
    network: "Bitcoin Mainnet",
    image: "/btc.png",
    accentColor: "text-orange-400",
    accentBg: "bg-orange-500/10",
    accentBorder: "border-orange-500/20",
    explorerLabel: "Blockchain.com",
    explorerBase: "https://www.blockchain.com/btc/tx/",
    decimals: 8,
  },
  ETH: {
    name: "Ethereum",
    network: "ERC20",
    image: "/eth.png",
    accentColor: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    accentBorder: "border-indigo-500/20",
    explorerLabel: "Etherscan",
    explorerBase: "https://etherscan.io/tx/",
    decimals: 18,
  },
  BNB: {
    name: "Binance Coin",
    network: "BSC (BEP20)",
    image: "/bnb.png",
    accentColor: "text-yellow-400",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/20",
    explorerLabel: "BscScan",
    explorerBase: "https://bscscan.com/tx/",
    decimals: 18,
  },
  DAI: {
    name: "Dai Stablecoin",
    network: "BSC (BEP20)",
    image: "/dai.png",
    accentColor: "text-yellow-600",
    accentBg: "bg-yellow-600/10",
    accentBorder: "border-yellow-600/20",
    explorerLabel: "BscScan",
    explorerBase: "https://bscscan.com/tx/",
    decimals: 18,
  },
  BUSD: {
    name: "Binance USD",
    network: "BSC (BEP20)",
    image: "/busd.png",
    accentColor: "text-yellow-500",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/20",
    explorerLabel: "BscScan",
    explorerBase: "https://bscscan.com/tx/",
    decimals: 18,
  },
  SOL: {
    name: "Solana",
    network: "Solana Mainnet",
    image: "/sol.png",
    accentColor: "text-cyan-400",
    accentBg: "bg-cyan-500/10",
    accentBorder: "border-cyan-500/20",
    explorerLabel: "SolScan",
    explorerBase: "https://solscan.io/tx/",
    decimals: 9,
  },
  XRP: {
    name: "Ripple",
    network: "XRP Ledger",
    image: "/xrp.png",
    accentColor: "text-slate-300",
    accentBg: "bg-slate-500/10",
    accentBorder: "border-slate-400/20",
    explorerLabel: "XRP Scan",
    explorerBase: "https://xrpscan.com/tx/",
    decimals: 6,
  },
  XLM: {
    name: "Stellar",
    network: "Stellar Network",
    image: "/xlm.png",
    accentColor: "text-sky-400",
    accentBg: "bg-sky-500/10",
    accentBorder: "border-sky-400/20",
    explorerLabel: "Stellar Expert",
    explorerBase: "https://stellar.expert/explorer/public/tx/",
    decimals: 7,
  },
  TRX: {
    name: "Tron",
    network: "Tron Mainnet",
    image: "/trx.png",
    accentColor: "text-red-500",
    accentBg: "bg-red-500/10",
    accentBorder: "border-red-500/20",
    explorerLabel: "TronScan",
    explorerBase: "https://tronscan.org/#/transaction/",
    decimals: 6,
  },
  ADA: {
    name: "Cardano",
    network: "Cardano Mainnet",
    image: "/ada.png",
    accentColor: "text-blue-600",
    accentBg: "bg-blue-600/10",
    accentBorder: "border-blue-600/20",
    explorerLabel: "CardanoScan",
    explorerBase: "https://cardanoscan.io/transaction/",
    decimals: 6,
  },
  DOGE: {
    name: "Dogecoin",
    network: "Dogecoin Network",
    image: "/doge.png",
    accentColor: "text-yellow-500",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/20",
    explorerLabel: "DogeChain",
    explorerBase: "https://dogechain.info/tx/",
    decimals: 8,
  },
  TON: {
    name: "Toncoin",
    network: "TON Mainnet",
    image: "/ton.png",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-400/10",
    accentBorder: "border-blue-400/20",
    explorerLabel: "TonScan",
    explorerBase: "https://tonscan.org/tx/",
    decimals: 9,
  },
  USDC: {
    name: "USD Coin",
    network: "ERC20",
    image: "/usdc.png",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-400/20",
    explorerLabel: "Etherscan",
    explorerBase: "https://etherscan.io/tx/",
    decimals: 6,
  },
};

const MARKET_DEFAULTS: Record<string, number> = {
  PI: 314159, SDA: 1.20, USDT: 1.00, BTC: 52000, ETH: 2800, BNB: 600, XRP: 0.55, XLM: 0.12, USDC: 1.00, TRX: 0.14, ADA: 0.60, DOGE: 0.15, TON: 5.20, SOL: 145, DAI: 1.00, BUSD: 1.00,
};

const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", BNB: "binancecoin", USDT: "tether", USDC: "usd-coin", XRP: "ripple", XLM: "stellar", TRX: "tron", ADA: "cardano", DOGE: "dogecoin", TON: "the-open-network", SOL: "solana", DAI: "dai", BUSD: "binance-usd",
};

interface TxUser {
  id: string;
  username?: string | null;
  name?: string | null;
  avatar?: string | null;
  displayName?: string;
}

interface Transaction {
  id: string;
  reference?: string;
  createdAt: string;
  currency: string;
  amount: number;
  fee?: number;
  status: string;
  type?: string;
  description?: string;
  blockchainTx?: string;
  externalId?: string;
  toUserId?: string;
  fromUserId?: string;
  fromUser?: TxUser;
  toUser?: TxUser;
  metadata?: {
    blockchainTxHash?: string;
    memo?: string;
    [key: string]: unknown;
  };
}

export default function AssetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const rawAssetId = typeof params?.assetid === 'string' ? params.assetid : "PI";
  const assetId = rawAssetId.toUpperCase();
  const config = ASSET_CONFIG[assetId] || ASSET_CONFIG.PI;
  const [isMounted, setIsMounted] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState("");
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "loading" | "success" | "error" | "pending">("idle");
  const [sendTxHash, setSendTxHash] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [balance, setBalance] = useState("0.00000000");
  const [address, setAddress] = useState("");
  const [marketPrice, setMarketPrice] = useState(MARKET_DEFAULTS[assetId] || 0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const fetchMarketPrice = useCallback(async () => {
    if (assetId === "PI" || assetId === "SDA") return;
    const geckoId = COINGECKO_IDS[assetId];
    if (!geckoId) return;
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`);
      if (res.ok) {
        const data = await res.json();
        const price = data[geckoId]?.usd;
        if (price) setMarketPrice(price);
      }
    } catch { /* keep default */ }
  }, [assetId]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (assetId === "SDA") {
        fetch("/api/wallet/sidra/sync", { method: "POST" }).catch(() => null);
      }
      const [profileRes, balanceRes, historyRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/wallet/balance'),
        fetch(`/api/wallet/history?currency=${assetId}`)
      ]);
      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        if (profileJson.user) setUserId(profileJson.user.id);
      }
      if (balanceRes.ok) {
        const balData = await balanceRes.json();
        const rawBalance = balData[assetId] || "0";
        const displayDecimals = Math.min(config.decimals, 8);
        setBalance(parseFloat(rawBalance).toFixed(displayDecimals));
        if (balData.addresses) {
          setAddress(balData.addresses[assetId] || "");
        }
      }
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const filtered = (historyData.transactions || []).filter(
          (tx: Transaction) => tx.currency?.toUpperCase() === assetId
        );
        setTransactions(filtered);
      }
    } catch (err) {
      console.error("Asset data error:", err);
    } finally {
      setLoading(false);
    }
  }, [assetId, config.decimals]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
    fetchMarketPrice();
  }, [loadData, fetchMarketPrice]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Adresse copiée");
    setTimeout(() => setCopied(false), 2000);
  };

  const usdValue = parseFloat(balance) * marketPrice;
  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col pb-52">
      <div className="px-5 pt-12 pb-3 flex justify-between items-center">
        <button onClick={() => router.back()} className="p-2.5 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform">
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <div className="text-center">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.accentColor}`}>{config.name}</p>
          <p className="text-[9px] font-bold text-slate-600 uppercase">{config.network}</p>
        </div>
        <button onClick={loadData} disabled={loading} className="p-2.5 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform disabled:opacity-50">
          <RefreshCcw size={20} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-5">
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className={`w-20 h-20 rounded-full ${config.accentBg} p-4 mb-5 border ${config.accentBorder} relative flex items-center justify-center`}>
            <img src={config.image} alt={assetId} className="w-full h-full object-contain" />
            {loading && <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
          </div>
          <div className="text-center w-full px-4">
            {loading ? <div className="h-10 w-40 bg-white/5 rounded-xl animate-pulse mx-auto mb-2" /> : <h2 className="text-3xl font-black tracking-tighter text-white mb-1 break-all leading-tight">{balance}</h2>}
            <span className={`text-[11px] font-black uppercase tracking-wider ${config.accentColor}`}>{assetId}</span>
            <div className="mt-3 flex items-center justify-center gap-2">
              {loading ? <div className="h-5 w-24 bg-white/5 rounded animate-pulse" /> : <p className="text-sm font-bold text-slate-400">${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</p>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mb-8">
          <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-2xl text-center">
            <Wallet size={14} className="mx-auto text-slate-600 mb-1.5" />
            <p className="text-[8px] font-bold uppercase text-slate-600 tracking-wide mb-1">Disponible</p>
            <p className="text-[11px] font-black text-white truncate">{loading ? "..." : balance}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-2xl text-center">
            <TrendingUp size={14} className="mx-auto text-slate-600 mb-1.5" />
            <p className="text-[8px] font-bold uppercase text-slate-600 tracking-wide mb-1">Prix</p>
            <p className="text-[11px] font-black text-white truncate">${marketPrice.toLocaleString()}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] p-4 rounded-2xl text-center">
            <Globe size={14} className="mx-auto text-slate-600 mb-1.5" />
            <p className="text-[8px] font-bold uppercase text-slate-600 tracking-wide mb-1">Réseau</p>
            <p className="text-[10px] font-black text-white truncate">{config.network}</p>
          </div>
        </div>

        <div className="w-full max-w-sm mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Adresse {assetId}</p>
          <div onClick={() => handleCopy(address)} className={`bg-white/[0.03] border ${address ? 'border-white/[0.08] cursor-pointer active:bg-white/[0.06]' : 'border-white/[0.05]'} p-4 rounded-2xl flex items-center justify-between transition-all`}>
            <div className="flex-1 min-w-0 mr-3">
              {loading ? <div className="h-4 w-full bg-white/5 rounded animate-pulse" /> : <p className="text-[10px] font-mono text-slate-400 truncate">{address || "Non configurée"}</p>}
              <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">{config.network}</p>
            </div>
            {address && !loading && (copied ? <Check size={16} className="text-emerald-400 shrink-0" /> : <Copy size={16} className="text-blue-500 shrink-0" />)}
          </div>
        </div>

        <div className="w-full">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Historique {assetId}</h3>
            <button onClick={() => router.push('/transactions')} className="text-[10px] font-bold text-blue-500 uppercase">Tout voir</button>
          </div>
          <div className="space-y-2.5">
            {transactions.length > 0 ? transactions.map((tx, i) => {
              const isSent = tx.fromUserId === userId;
              const statusColor = tx.status?.toLowerCase() === "success" ? "text-emerald-400" : tx.status?.toLowerCase() === "pending" ? "text-amber-400" : "text-red-400";
              const amountFormatted = parseFloat(String(tx.amount)).toFixed(Math.min(config.decimals, 8));
              return (
               <button key={i} onClick={() => setSelectedTx(tx)} className="w-full bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between active:bg-white/[0.06] transition-all text-left">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                      {isSent
                        ? <ArrowUpRight size={18} className="text-red-400" />
                        : <ArrowDownLeft size={18} className="text-emerald-400" />
                      }
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase">{tx.type || "TRANSFERT"}</p>
                      <p className="text-[9px] text-slate-500 font-bold">{new Date(tx.createdAt).toLocaleDateString("fr-FR")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-black ${isSent ? "text-red-400" : "text-emerald-400"}`}>
                      {isSent ? "-" : "+"}{amountFormatted} {assetId}
                    </p>
                    <p className={`text-[9px] font-bold uppercase ${statusColor}`}>{tx.status}</p>
                  </div>
               </button>
              );
            }) : (
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <Clock size={20} className="mx-auto text-slate-700 mb-2" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">Aucune activité</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-[80px] inset-x-0 z-[91] bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 p-4 pb-5">
        <div className="flex gap-3 max-w-sm mx-auto">
          <button onClick={() => setShowSendModal(true)} className="flex-1 bg-white/[0.08] border border-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2.5 active:scale-95 transition-transform hover:bg-white/[0.12]">
            <Share2 size={16} strokeWidth={2.5} /> Envoyer
          </button>
          <button onClick={() => setShowReceiveModal(true)} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2.5 active:scale-95 transition-transform hover:bg-blue-500 shadow-lg shadow-blue-600/20">
            <Download size={16} strokeWidth={2.5} /> Recevoir
          </button>
        </div>
      </div>

      {/* Modal de details de transaction */}
      {selectedTx && (() => {
        const tx = selectedTx;
        const isSent = tx.fromUserId === userId;
        const otherUser = isSent ? tx.toUser : tx.fromUser;

        const statusLower = tx.status?.toLowerCase() || "";
        const statusInfo = statusLower === "success"
          ? { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Confirme" }
          : statusLower === "pending"
          ? { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/10", label: "En cours" }
          : { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Echoue" };
        const StatusIcon = statusInfo.icon;

        const txType = tx.type?.toUpperCase() || "";
        const ref = tx.reference?.toUpperCase() || "";
        const getDisplayName = (): string => {
          if (tx.description && (txType.includes("CARD") || tx.description.toUpperCase().includes("CARTE"))) {
            return tx.description.charAt(0).toUpperCase() + tx.description.slice(1).toLowerCase();
          }
          if (txType === "CARD_PURCHASE" || ref.startsWith("CARD-BUY")) return "Achat Carte PimPay";
          if (txType === "WITHDRAWAL" || ref.startsWith("WD-")) return "Retrait Externe";
          if (txType === "DEPOSIT") return "Depot";
          const u = otherUser;
          const fullName = `${u?.name || ""}`.trim();
          if (fullName) return fullName;
          if (u?.displayName) return u.displayName;
          if (u?.username) return `@${u.username}`;
          return "Utilisateur PimPay";
        };
        const displayName = getDisplayName();

        const getTypeLabel = () => {
          switch (txType) {
            case "TRANSFER": return "Transfert";
            case "DEPOSIT": return "Depot";
            case "WITHDRAWAL": return "Retrait";
            case "PAYMENT": return "Paiement";
            case "SALARY": return "Salaire";
            case "CARD_PURCHASE": return "Achat Carte";
            case "CARD_RECHARGE": return "Recharge Carte";
            case "CARD_WITHDRAW": return "Retrait Carte";
            default: return txType || "Transfert";
          }
        };

        const isCrypto = !["XAF", "EUR", "USD", "XOF", "GHS", "NGN"].includes((tx.currency || "").toUpperCase());
        const decimals = isCrypto ? Math.min(config.decimals, 8) : 2;
        const amountFormatted = parseFloat(String(tx.amount)).toFixed(decimals).replace(/\.?0+$/, "") || "0";
        const feeFormatted = tx.fee ? parseFloat(String(tx.fee)).toFixed(decimals).replace(/\.?0+$/, "") : null;

        const formattedDate = new Date(tx.createdAt).toLocaleDateString("fr-FR", {
          weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
        });

        const handleShare = async () => {
          const text = `Transaction PimPay\nReference: ${tx.reference || tx.id}\nMontant: ${amountFormatted} ${tx.currency}\nStatut: ${tx.status}`;
          if (navigator.share) {
            try { await navigator.share({ title: "Transaction PimPay", text }); } catch { navigator.clipboard.writeText(text); toast.success("Details copies"); }
          } else {
            navigator.clipboard.writeText(text);
            toast.success("Details copies");
          }
        };

        return (
          <div className="fixed inset-0 z-[102] flex flex-col bg-[#020617] overflow-y-auto">
            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center justify-between shrink-0">
              <button onClick={() => setSelectedTx(null)} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-transform">
                <ArrowLeft size={20} />
              </button>
              <div className="text-center">
                <h1 className="text-lg font-black uppercase tracking-tight">Details</h1>
                <p className={`text-[9px] font-bold tracking-[3px] uppercase ${config.accentColor}`}>Transaction</p>
              </div>
              <button onClick={handleShare} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-transform">
                <Share2 size={20} />
              </button>
            </header>

            <main className="px-6 space-y-4 pb-10">
              {/* Carte montant */}
              <div className={`rounded-[2rem] p-8 text-center relative overflow-hidden border ${isSent ? "border-red-500/20 bg-red-500/5" : "border-emerald-500/20 bg-emerald-500/5"}`}>
                <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl ${statusInfo.bg} mb-5`}>
                  <StatusIcon size={14} className={statusInfo.color} />
                  <span className={`text-[10px] font-black uppercase tracking-wider ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 ${isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                  {isSent ? <ArrowUpRight size={28} className="text-red-400" /> : <ArrowDownLeft size={28} className="text-emerald-400" />}
                </div>
                <p className={`text-4xl font-black ${isSent ? "text-red-400" : "text-emerald-400"}`}>
                  {isSent ? "-" : "+"}{amountFormatted} {tx.currency}
                </p>
                {feeFormatted && parseFloat(feeFormatted) > 0 && (
                  <p className="text-[10px] font-bold text-slate-500 mt-2">Frais: {feeFormatted} {tx.currency}</p>
                )}
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-lg">
                  <Wallet size={12} className={config.accentColor} />
                  <span className="text-[9px] font-black text-slate-400 uppercase">{getTypeLabel()}</span>
                </div>
              </div>

              {/* Infos utilisateur */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${isSent ? "bg-red-500/10" : "bg-emerald-500/10"}`}>
                    {otherUser?.avatar
                      ? <img src={otherUser.avatar} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
                      : <User size={24} className={isSent ? "text-red-400" : "text-emerald-400"} />
                    }
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {isSent ? "Envoye a" : "Recu de"}
                    </p>
                    <p className="text-base font-black uppercase tracking-tight">{displayName}</p>
                    {otherUser?.username && (
                      <p className="text-[10px] text-blue-400">@{otherUser.username}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lignes de detail */}
              <div className="bg-white/[0.02] border border-white/10 rounded-2xl overflow-hidden divide-y divide-white/5">
                {/* Reference */}
                {(tx.reference || tx.id) && (
                  <button onClick={() => { navigator.clipboard.writeText(tx.reference || tx.id); toast.success("Reference copiee"); }} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all">
                    <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <Hash size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Reference</p>
                      <p className="text-xs font-bold text-white truncate">{tx.reference || tx.id}</p>
                    </div>
                    <Copy size={16} className="text-slate-500 shrink-0" />
                  </button>
                )}

                {/* Date */}
                <div className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Calendar size={18} className="text-purple-400" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Date</p>
                    <p className="text-xs font-bold text-white capitalize">{formattedDate}</p>
                  </div>
                </div>

                {/* Description */}
                {tx.description && (
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-cyan-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-cyan-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Description</p>
                      <p className="text-xs font-bold text-white">{tx.description}</p>
                    </div>
                  </div>
                )}

                {/* Memo metadata */}
                {tx.metadata?.memo && (
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-amber-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Memo</p>
                      <p className="text-xs font-bold text-white">{tx.metadata.memo}</p>
                    </div>
                  </div>
                )}

                {/* Hash blockchain */}
                {(tx.metadata?.blockchainTxHash || tx.blockchainTx) && (
                  <button onClick={() => { navigator.clipboard.writeText(String(tx.metadata?.blockchainTxHash || tx.blockchainTx)); toast.success("Hash copie"); }} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all">
                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                      <ExternalLink size={18} className="text-indigo-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Hash Blockchain</p>
                      <p className="text-xs font-bold text-white truncate">{tx.metadata?.blockchainTxHash || tx.blockchainTx}</p>
                    </div>
                    <Copy size={16} className="text-slate-500 shrink-0" />
                  </button>
                )}

                {/* ID Transaction */}
                <button onClick={() => { navigator.clipboard.writeText(tx.id); toast.success("ID Transaction copie"); }} className="w-full flex items-center gap-4 p-4 hover:bg-white/[0.03] transition-all">
                  <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <Hash size={18} className="text-slate-400" />
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">ID Transaction</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{tx.id}</p>
                  </div>
                  <Copy size={16} className="text-slate-500 shrink-0" />
                </button>
              </div>

              {/* Actions */}
              <button onClick={() => setSelectedTx(null)} className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-sm font-black uppercase tracking-wider active:scale-95 transition-transform">
                Fermer
              </button>
            </main>
          </div>
        );
      })()}

      {showReceiveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
           <div className="bg-[#0a0f1a] w-full max-w-xs rounded-3xl border border-white/10 p-7 relative text-center">
            <button onClick={() => setShowReceiveModal(false)} className="absolute top-5 right-5 text-slate-500 p-1"><X size={20} /></button>
            <p className={`text-[10px] font-black uppercase mb-1 ${config.accentColor}`}>Déposer {assetId}</p>
            <div className="bg-white p-3 rounded-2xl inline-block my-5">
               <QRCodeSVG value={address} size={170} />
            </div>
            <div onClick={() => handleCopy(address)} className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-center justify-between cursor-pointer">
              <p className="text-[10px] font-mono text-slate-400 truncate mr-3">{address}</p>
              <Copy size={16} className="text-blue-500" />
            </div>
          </div>
        </div>
      )}

      {showSendModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0f1a] w-full max-w-xs rounded-3xl border border-white/10 p-7 relative text-center">
            <button onClick={() => { setShowSendModal(false); setSendAddress(""); setSendAmount(""); setSendStatus("idle"); setSendTxHash(""); setSendMessage(""); }} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${config.accentColor}`}>Envoyer {assetId}</p>
            <h4 className="text-lg font-black text-white uppercase tracking-tight mb-5">{config.name}</h4>
            {(sendStatus === "success" || sendStatus === "pending") ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className={`w-16 h-16 ${sendStatus === "pending" ? "bg-amber-500/10" : "bg-emerald-500/10"} rounded-full flex items-center justify-center mb-4`}>
                  {sendStatus === "pending" ? (
                    <Clock size={40} className="text-amber-500" />
                  ) : (
                    <Check size={40} className="text-emerald-500" />
                  )}
                </div>
                <p className="text-sm font-black text-white mb-1 uppercase">
                  {sendStatus === "pending" ? "Transfert en cours" : "Transfert réussi"}
                </p>
                <p className="text-[10px] text-slate-400 mb-4 font-medium tracking-tight">
                  {sendMessage || `${sendAmount} ${assetId} envoyés avec succès`}
                </p>
                {sendTxHash && (
                  <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl mb-4 w-full">
                    <p className="text-[9px] font-mono text-slate-400 truncate flex-1">{sendTxHash}</p>
                    {sendTxHash.startsWith("PIM-") ? (
                      <Copy size={14} className="text-blue-500 shrink-0 cursor-pointer" onClick={() => {
                        navigator.clipboard.writeText(sendTxHash);
                        toast.success("Référence copiée");
                      }} />
                    ) : (
                      <a href={`${config.explorerBase}${sendTxHash}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={14} className="text-blue-500 shrink-0" />
                      </a>
                    )}
                  </div>
                )}
                <button onClick={() => { setShowSendModal(false); setSendAddress(""); setSendAmount(""); setSendStatus("idle"); setSendTxHash(""); setSendMessage(""); loadData(); }} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-500 transition-all">Fermer</button>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Adresse de destination</label>
                  <div className="relative">
                    <input value={sendAddress} onChange={(e) => setSendAddress(e.target.value)} placeholder={`Adresse ${assetId}...`} className="w-full bg-white/5 border border-white/10 p-4 pr-14 rounded-2xl text-[11px] font-mono text-blue-100 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700" />
                    <button onClick={() => QRScanner ? setShowQRScanner(true) : toast.error("Scanner indisponible")} className="absolute right-3 top-3 p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors active:scale-90"><Scan size={16} className="text-white" /></button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                    <span>Montant</span>
                    <span className="text-blue-500 font-bold tracking-tighter">Solde: {balance} {assetId}</span>
                  </label>
                  <div className="relative">
                    <input type="number" value={sendAmount} onChange={(e) => setSendAmount(e.target.value)} placeholder="0.00" className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-black text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700" />
                    <button onClick={() => setSendAmount(balance)} className="absolute right-3 top-3 px-2.5 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[8px] font-black text-blue-400 uppercase hover:bg-blue-600/30 transition-colors">MAX</button>
                  </div>
                </div>
                {sendAmount && parseFloat(sendAmount) > parseFloat(balance) && (
                  <div className="py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[9px] font-bold text-red-400 uppercase text-center">Solde insuffisant</p>
                  </div>
                )}
                <button onClick={async () => {
                    if (!sendAddress || !sendAmount) return;
                    if (parseFloat(sendAmount) > parseFloat(balance)) { toast.error("Solde insuffisant"); return; }
                    setSendStatus("loading");
                    
                    try {
                      // Pour Pi Network, utiliser l'API mpay/external-transfer qui fait le broadcast blockchain direct
                      if (assetId === "PI") {
                        const res = await fetch("/api/mpay/external-transfer", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            destination: sendAddress,
                            amount: parseFloat(sendAmount),
                            memo: `Retrait PimPay Wallet`,
                          }),
                        });
                        const result = await res.json();
                        
                        if (res.ok && result.success) {
                          const txHash = result.data?.blockchainTxHash || result.data?.txid || "";
                          const status = result.data?.status || "BROADCASTED";
                          
                          if (status === "COMPLETED" || status === "BROADCASTED") {
                            setSendStatus("success");
                            setSendMessage(result.message || `${sendAmount} PI envoyés avec succès`);
                            setSendTxHash(txHash);
                            toast.success("Transfert Pi reussi !");
                          } else {
                            setSendStatus("pending");
                            setSendMessage(`Envoi en cours vers ${sendAddress.substring(0, 8)}...${sendAddress.substring(sendAddress.length - 4)}. En attente de confirmation.`);
                            setSendTxHash(txHash || result.data?.txid || "");
                          }
                        } else {
                          toast.error(result.error || "Erreur lors de l'envoi Pi");
                          setSendStatus("idle");
                        }
                        return;
                      }
                      
                      // Pour SDA/Sidra Chain, utiliser l'API /api/user/transfer qui broadcast directement sur la blockchain
                      if (assetId === "SDA") {
                        const res = await fetch("/api/user/transfer", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          credentials: "include",
                          body: JSON.stringify({
                            recipientIdentifier: sendAddress,
                            amount: parseFloat(sendAmount),
                            currency: "SDA",
                            description: `Transfert SDA vers ${sendAddress.substring(0, 8)}...${sendAddress.substring(sendAddress.length - 4)}`,
                          }),
                        });
                        const result = await res.json();
                        
                        if (res.ok && result.success) {
                          const txHash = result.transaction?.blockchainTx || "";
                          
                          if (result.mode === "INTERNAL") {
                            setSendStatus("success");
                            setSendMessage("Transfert instantané réussi vers PimPay");
                            setSendTxHash(result.transaction?.reference || "");
                            toast.success("Transfert SDA réussi !");
                          } else if (txHash) {
                            // Transaction blockchain confirmée
                            setSendStatus("success");
                            setSendMessage(`${sendAmount} SDA envoyés avec succès sur la Sidra Chain`);
                            setSendTxHash(txHash);
                            toast.success("Transfert SDA réussi !");
                          } else {
                            // Transfert externe en attente
                            setSendStatus("pending");
                            setSendMessage(`Envoi en cours vers ${sendAddress.substring(0, 8)}...${sendAddress.substring(sendAddress.length - 4)}. En attente de confirmation.`);
                            setSendTxHash(result.transaction?.reference || "");
                          }
                        } else {
                          toast.error(result.error || "Erreur lors de l'envoi SDA");
                          setSendStatus("idle");
                        }
                        return;
                      }
                      
                      // Pour les autres cryptos, utiliser l'API /api/user/transfer (unifiée)
                      const res = await fetch("/api/user/transfer", { 
                        method: "POST", 
                        headers: { "Content-Type": "application/json" }, 
                        body: JSON.stringify({ 
                          recipientIdentifier: sendAddress, 
                          amount: parseFloat(sendAmount), 
                          currency: assetId,
                          description: `Transfert ${assetId} vers ${sendAddress.substring(0, 8)}...${sendAddress.substring(sendAddress.length - 4)}`
                        }), 
                      });
                      const result = await res.json();
                      
                      if (res.ok && result.success) { 
                        // Déterminer le statut selon le type de transfert retourné par l'API
                        if (result.mode === "INTERNAL") {
                          // Transfert instantané entre membres PimPay
                          setSendStatus("success"); 
                          setSendMessage("Transfert instantané réussi vers PimPay");
                          setSendTxHash(result.transaction?.reference || "");
                          toast.success(`Transfert ${assetId} réussi !`);
                        } else {
                          // Envoi vers adresse externe
                          const txHash = result.transaction?.blockchainTx;
                          if (txHash) {
                            setSendStatus("success");
                            setSendMessage(`${sendAmount} ${assetId} envoyés avec succès`);
                            setSendTxHash(txHash);
                            toast.success(`Transfert ${assetId} réussi !`);
                          } else {
                            setSendStatus("pending");
                            setSendMessage(`Envoi en cours vers ${sendAddress.substring(0, 8)}...${sendAddress.substring(sendAddress.length - 4)}. Transaction en attente de confirmation blockchain.`);
                            setSendTxHash(result.transaction?.reference || "");
                            toast.info("Vous recevrez une notification une fois la transaction confirmée sur la blockchain", { duration: 5000 });
                          }
                        }
                      } else { 
                        toast.error(result.error || "Erreur lors de l'envoi"); 
                        setSendStatus("idle"); 
                      }
                    } catch (e: any) { 
                      console.error("Send error:", e);
                      toast.error(e?.message || "Erreur réseau"); 
                      setSendStatus("idle"); 
                    }
                  }} disabled={sendStatus === "loading" || !sendAddress || !sendAmount || parseFloat(sendAmount) > parseFloat(balance)} className="w-full py-4 bg-blue-600 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-blue-600/10 active:scale-95 hover:bg-blue-500">
                  {sendStatus === "loading" ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /><span>Confirmer le transfert</span></>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showQRScanner && QRScanner && (
        <QRScanner 
          onResult={(data: string) => { 
            if (data && data.length > 0) { 
              setSendAddress(data); 
              toast.success("Adresse scannée avec succès"); 
            } 
          }}
          onClose={() => setShowQRScanner(false)} 
        />
      )}
    </div>
  );
}
