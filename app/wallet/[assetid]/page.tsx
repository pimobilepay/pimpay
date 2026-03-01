"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft, Share2, Download, Clock, X, Copy, Check, History,
  ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Calendar,
  RefreshCcw, Globe, ExternalLink, Wallet, TrendingUp,
  Send, Loader2, Scan
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

// Importation du scanner QR
import { QRScanner } from "@/components/qr-scanner"; 
import { toast } from "sonner";

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
    explorerBase: "https://minepi.com/blockexplorer/tx/",
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

interface Transaction {
  createdAt: string;
  currency: string;
  amount: number;
  status: string;
  type?: string;
  blockchainTx?: string;
  externalId?: string;
  toUserId?: string;
  fromUserId?: string;
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
  const [sendStatus, setSendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sendTxHash, setSendTxHash] = useState("");
  const [balance, setBalance] = useState("0.00000000");
  const [address, setAddress] = useState("");
  const [marketPrice, setMarketPrice] = useState(MARKET_DEFAULTS[assetId] || 0);

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
            {transactions.length > 0 ? transactions.map((tx, i) => (
               <div key={i} className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <History size={18} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase">{tx.type || "TRANSFERT"}</p>
                      <p className="text-[9px] text-slate-500 font-bold">{new Date(tx.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-[12px] font-black text-white">{parseFloat(String(tx.amount)).toFixed(Math.min(config.decimals, 8))} {assetId}</p>
               </div>
            )) : (
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
            <button onClick={() => { setShowSendModal(false); setSendAddress(""); setSendAmount(""); setSendStatus("idle"); setSendTxHash(""); }} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${config.accentColor}`}>Envoyer {assetId}</p>
            <h4 className="text-lg font-black text-white uppercase tracking-tight mb-5">{config.name}</h4>
            {sendStatus === "success" ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <Check size={40} className="text-emerald-500" />
                </div>
                <p className="text-sm font-black text-white mb-1 uppercase">Transfert réussi</p>
                <p className="text-[10px] text-slate-400 mb-4 font-medium uppercase tracking-tight">{sendAmount} {assetId} envoyés avec succès</p>
                {sendTxHash && (
                  <a href={`${config.explorerBase}${sendTxHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl mb-4 hover:bg-white/10 transition-colors">
                    <p className="text-[9px] font-mono text-slate-400 truncate flex-1">{sendTxHash}</p>
                    <ExternalLink size={14} className="text-blue-500 shrink-0" />
                  </a>
                )}
                <button onClick={() => { setShowSendModal(false); setSendAddress(""); setSendAmount(""); setSendStatus("idle"); setSendTxHash(""); loadData(); }} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-500 transition-all">Fermer</button>
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
                      const res = await fetch("/api/wallet/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: sendAddress, amount: sendAmount, currency: assetId }), });
                      const result = await res.json();
                      if (res.ok) { setSendStatus("success"); setSendTxHash(result.hash || ""); } else { toast.error(result.error || "Erreur lors de l'envoi"); setSendStatus("idle"); }
                    } catch { toast.error("Erreur réseau"); setSendStatus("idle"); }
                  }} disabled={sendStatus === "loading" || !sendAddress || !sendAmount || parseFloat(sendAmount) > parseFloat(balance)} className="w-full py-4 bg-blue-600 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-blue-600/10 active:scale-95 hover:bg-blue-500">
                  {sendStatus === "loading" ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /><span>Confirmer le transfert</span></>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showQRScanner && QRScanner && (
        <QRScanner onClose={(data: string) => { 
          setShowQRScanner(false); 
          if (data && data.length > 0) { 
            setSendAddress(data); 
            toast.success("Adresse scannée avec succès"); 
          } 
        }} />
      )}
    </div>
  );
}
