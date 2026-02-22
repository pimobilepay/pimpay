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
import { QRScanner } from "@/components/qr-scanner";
import { toast } from "sonner";
import {
  CRYPTO_ASSETS,
  getAssetConfig,
  getExplorerLink,
  getCoinGeckoIds,
} from "@/lib/crypto-config";
import { validateAddress } from "@/lib/crypto-validator";

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
  const config = getAssetConfig(assetId);

  const [isMounted, setIsMounted] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [userId, setUserId] = useState("");
  const [generatingAddress, setGeneratingAddress] = useState(false);

  // Send form state
  const [sendAddress, setSendAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendStatus, setSendStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [sendTxHash, setSendTxHash] = useState("");
  const [validationError, setValidationError] = useState("");

  const [balance, setBalance] = useState("0.00000000");
  const [address, setAddress] = useState("");
  const [marketPrice, setMarketPrice] = useState(config.defaultPrice);

  const fetchMarketPrice = useCallback(async () => {
    if (!config.coingeckoId) return;
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${config.coingeckoId}&vs_currencies=usd`);
      if (res.ok) {
        const data = await res.json();
        const price = data[config.coingeckoId!]?.usd;
        if (price) setMarketPrice(price);
      }
    } catch { /* keep default */ }
  }, [config.coingeckoId]);

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
        const user = profileJson.user;
        if (user) setUserId(user.id);
      }

      if (balanceRes.ok) {
        const balData = await balanceRes.json();
        const rawBalance = balData[assetId] || "0";
        setBalance(parseFloat(rawBalance).toFixed(config.decimals));

        let addr = "";
        if (balData.addresses) {
          addr = balData.addresses[assetId] || "";
        }

        // If no address, auto-generate via group API
        if (!addr) {
          try {
            const genRes = await fetch(config.targetApi, { method: 'POST' });
            if (genRes.ok) {
              const genData = await genRes.json();
              addr = genData.address || "";
            }
          } catch { /* ignore */ }
        }

        setAddress(addr);
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const filtered = (historyData.transactions || []).filter(
          (tx: Transaction) => tx.currency?.toUpperCase() === assetId ||
            (assetId === "SDA" && tx.currency?.toUpperCase() === "SIDRA")
        );
        setTransactions(filtered);
      }
    } catch (err) {
      console.error("Asset data error:", err);
    } finally {
      setLoading(false);
    }
  }, [assetId, config.decimals, config.targetApi]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
    fetchMarketPrice();
  }, [loadData, fetchMarketPrice]);

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Adresse copiee");
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle receive: generate address if needed
  const handleReceive = async () => {
    if (!address || address === "Non configuree") {
      setGeneratingAddress(true);
      setShowReceiveModal(true);
      try {
        const res = await fetch(config.targetApi, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          const newAddr = data.address || "";
          setAddress(newAddr);
          toast.success("Adresse generee avec succes");
        } else {
          toast.error("Erreur lors de la generation de l'adresse");
        }
      } catch {
        toast.error("Erreur reseau");
      } finally {
        setGeneratingAddress(false);
      }
    } else {
      setShowReceiveModal(true);
    }
  };

  // Handle send with validation
  const handleSendSubmit = async () => {
    if (!sendAddress || !sendAmount) return;

    // Validate address format
    const validation = validateAddress(sendAddress, assetId);
    if (!validation.isValid) {
      setValidationError(validation.error || "Adresse invalide");
      return;
    }
    setValidationError("");

    if (parseFloat(sendAmount) > parseFloat(balance)) {
      toast.error("Solde insuffisant");
      return;
    }

    setSendStatus("loading");
    try {
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: sendAddress, amount: sendAmount, currency: assetId }),
      });
      const result = await res.json();
      if (res.ok) {
        setSendStatus("success");
        setSendTxHash(result.hash || "");
      } else {
        toast.error(result.error || "Erreur lors de l'envoi");
        setSendStatus("idle");
      }
    } catch {
      toast.error("Erreur reseau");
      setSendStatus("idle");
    }
  };

  // Dynamic placeholder for address input
  const getAddressPlaceholder = () => {
    switch (config.group) {
      case "EVM": return "Adresse commencant par 0x...";
      case "STELLAR": return "Adresse commencant par G...";
      case "TRON": return "Adresse commencant par T...";
      case "XRP": return "Adresse commencant par r...";
      case "BTC": return "Adresse commencant par bc1/1/3...";
      case "SOL": return "Adresse Solana (Base58)...";
      default: return `Adresse ${assetId}...`;
    }
  };

  const usdValue = parseFloat(balance) * marketPrice;

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col pb-52">
      {/* HEADER */}
      <div className="px-5 pt-12 pb-3 flex justify-between items-center">
        <button
          onClick={() => router.back()}
          className="p-2.5 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} className="text-slate-400" />
        </button>
        <div className="text-center">
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.accentColor}`}>{config.name}</p>
          <p className="text-[9px] font-bold text-slate-600 uppercase">{config.network}</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2.5 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform disabled:opacity-50"
        >
          <RefreshCcw size={20} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center px-5">
        {/* ASSET ICON + BALANCE */}
        <div className="flex flex-col items-center pt-6 pb-8">
          <div className={`w-20 h-20 rounded-full ${config.accentBg} p-4 mb-5 border ${config.accentBorder} relative flex items-center justify-center`}>
            <img src={config.logo} alt={assetId} className="w-full h-full object-contain" />
            {loading && (
              <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          <div className="text-center">
            {loading ? (
              <div className="h-10 w-40 bg-white/5 rounded-xl animate-pulse mx-auto mb-2" />
            ) : (
              <h2 className="text-4xl font-black tracking-tighter text-white mb-1">
                {balance}
              </h2>
            )}
            <span className={`text-[11px] font-black uppercase tracking-wider ${config.accentColor}`}>
              {assetId}
            </span>

            <div className="mt-3 flex items-center justify-center gap-2">
              {loading ? (
                <div className="h-5 w-24 bg-white/5 rounded animate-pulse" />
              ) : (
                <p className="text-sm font-bold text-slate-400">
                  ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </p>
              )}
            </div>
          </div>
        </div>

        {/* STATS CARDS */}
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
            <p className="text-[8px] font-bold uppercase text-slate-600 tracking-wide mb-1">Reseau</p>
            <p className="text-[10px] font-black text-white truncate">{config.network}</p>
          </div>
        </div>

        {/* ADDRESS SECTION */}
        <div className="w-full max-w-sm mb-8">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">
            Adresse {assetId}
          </p>
          <div
            onClick={() => handleCopy(address)}
            className={`bg-white/[0.03] border ${address ? 'border-white/[0.08] cursor-pointer active:bg-white/[0.06]' : 'border-white/[0.05]'} p-4 rounded-2xl flex items-center justify-between transition-all`}
          >
            <div className="flex-1 min-w-0 mr-3">
              {loading ? (
                <div className="h-4 w-full bg-white/5 rounded animate-pulse" />
              ) : (
                <p className="text-[10px] font-mono text-slate-400 truncate">
                  {address || "Non configuree"}
                </p>
              )}
              <p className="text-[8px] font-bold text-slate-600 uppercase mt-1">{config.network}</p>
            </div>
            {address && !loading && (
              copied ? <Check size={16} className="text-emerald-400 shrink-0" /> : <Copy size={16} className="text-blue-500 shrink-0" />
            )}
          </div>

          {(assetId === "USDT" || assetId === "TRX") && (
            <div className="mt-2 py-1.5 px-3 bg-orange-500/[0.08] border border-orange-500/15 rounded-xl">
              <p className="text-[9px] font-bold text-orange-400/80 uppercase text-center">
                Reseau Tron Network (TRC20) uniquement
              </p>
            </div>
          )}
          {assetId === "BTC" && address && (
            <div className="mt-2 py-1.5 px-3 bg-orange-500/[0.08] border border-orange-500/15 rounded-xl">
              <p className="text-[9px] font-bold text-orange-400/80 uppercase text-center">
                Bitcoin Mainnet - SegWit (bc1...)
              </p>
            </div>
          )}
        </div>

        {/* TRANSACTION HISTORY */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Historique {assetId}</h3>
            <button onClick={() => router.push('/transactions')} className="text-[10px] font-bold text-blue-500 uppercase">Tout voir</button>
          </div>

          <div className="space-y-2.5">
            {transactions.length > 0 ? transactions.map((tx, i) => {
              const txDate = new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
              });

              let txType = "ENVOI";
              let TxIcon = ArrowUpRight;
              let iconBg = "bg-red-500/10";
              let iconColor = "text-red-400";
              let amountPrefix = "-";
              let amountColor = "text-white";

              if (tx.type === "EXCHANGE" || tx.type === "SWAP") {
                txType = "SWAP";
                TxIcon = ArrowLeftRight;
                iconBg = "bg-blue-500/10";
                iconColor = "text-blue-400";
                amountPrefix = "";
              } else if (tx.toUserId === userId || tx.type === "DEPOSIT") {
                txType = tx.type === "DEPOSIT" ? "DEPOT" : "RECU";
                TxIcon = ArrowDownLeft;
                iconBg = "bg-emerald-500/10";
                iconColor = "text-emerald-400";
                amountPrefix = "+";
                amountColor = "text-emerald-400";
              }

              const hash = tx.blockchainTx || tx.externalId;

              return (
                <div
                  key={i}
                  className="bg-white/[0.03] border border-white/5 p-4 rounded-2xl flex items-center justify-between hover:bg-white/[0.06] transition-all cursor-pointer"
                  onClick={() => {
                    if (hash) window.open(getExplorerLink(assetId, hash), '_blank');
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center`}>
                      <TxIcon size={18} className={iconColor} />
                    </div>
                    <div>
                      <p className="text-[11px] font-black text-white uppercase tracking-tight">{txType}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={9} className="text-slate-600" />
                        <p className="text-[9px] text-slate-500 font-bold">{txDate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className={`text-[12px] font-black tracking-tight ${amountColor}`}>
                        {amountPrefix}{tx.amount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: config.decimals })} {assetId}
                      </p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 'bg-emerald-500' :
                          tx.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'
                        }`} />
                        <p className="text-[8px] text-slate-500 uppercase font-bold">{tx.status}</p>
                      </div>
                    </div>
                    {hash && <ExternalLink size={12} className="text-slate-700" />}
                  </div>
                </div>
              );
            }) : (
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-2xl p-10 text-center">
                <Clock size={20} className="mx-auto text-slate-700 mb-2" />
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                  Aucune activite {assetId}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BAR */}
      <div className="fixed bottom-[80px] inset-x-0 z-[91] bg-[#020617]/90 backdrop-blur-xl border-t border-white/5 p-4 pb-5">
        <div className="flex gap-3 max-w-sm mx-auto">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex-1 bg-white/[0.08] border border-white/10 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2.5 active:scale-95 transition-transform hover:bg-white/[0.12]"
          >
            <Share2 size={16} strokeWidth={2.5} /> Envoyer
          </button>
          <button
            onClick={handleReceive}
            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2.5 active:scale-95 transition-transform hover:bg-blue-500 shadow-lg shadow-blue-600/20"
          >
            <Download size={16} strokeWidth={2.5} /> Recevoir
          </button>
        </div>
      </div>

      {/* RECEIVE MODAL */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0f1a] w-full max-w-xs rounded-3xl border border-white/10 p-7 relative text-center">
            <button onClick={() => setShowReceiveModal(false)} className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors p-1">
              <X size={20} />
            </button>

            <div className="mb-5">
              <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${config.accentColor}`}>Deposer {assetId}</p>
              <h4 className="text-lg font-black text-white uppercase tracking-tight">{config.name}</h4>
              <span className={`inline-block mt-2 px-3 py-1 ${config.accentBg} border ${config.accentBorder} rounded-lg text-[9px] font-black ${config.accentColor} uppercase`}>
                {config.network}
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl inline-block mb-5 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              {!address || generatingAddress ? (
                <div className="w-[170px] h-[170px] flex flex-col items-center justify-center gap-2">
                  {generatingAddress ? (
                    <>
                      <Loader2 size={24} className="text-blue-500 animate-spin" />
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Generation...</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-bold uppercase text-[10px] animate-pulse">
                      Chargement...
                    </span>
                  )}
                </div>
              ) : (
                <QRCodeSVG value={address} size={170} />
              )}
            </div>

            <div
              onClick={() => handleCopy(address)}
              className="bg-white/5 border border-white/10 p-3.5 rounded-xl flex items-center justify-between cursor-pointer active:bg-white/10 transition-all"
            >
              <p className="text-[10px] font-mono text-slate-400 truncate mr-3">{address || "Non disponible"}</p>
              {copied ? <Check size={16} className="text-emerald-400 shrink-0" /> : <Copy size={16} className="text-blue-500 shrink-0" />}
            </div>

            {(assetId === "USDT" || assetId === "TRX") && (
              <div className="mt-3 py-1.5 px-3 bg-orange-500/[0.08] border border-orange-500/15 rounded-xl">
                <p className="text-[9px] font-bold text-orange-400/80 uppercase">Reseau Tron Network (TRC20) uniquement</p>
              </div>
            )}

            <p className="text-[8px] text-slate-600 uppercase font-bold mt-4 tracking-wide">
              Envoyez uniquement du {assetId} sur cette adresse
            </p>
          </div>
        </div>
      )}

      {/* SEND MODAL - with address validation and QR scan */}
      {showSendModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0f1a] w-full max-w-xs rounded-3xl border border-white/10 p-7 relative text-center">
            <button
              onClick={() => {
                setShowSendModal(false);
                setSendAddress("");
                setSendAmount("");
                setSendStatus("idle");
                setSendTxHash("");
                setValidationError("");
              }}
              className="absolute top-5 right-5 text-slate-500 hover:text-white transition-colors p-1"
            >
              <X size={20} />
            </button>

            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${config.accentColor}`}>Envoyer {assetId}</p>
            <h4 className="text-lg font-black text-white uppercase tracking-tight mb-1">{config.name}</h4>
            <p className="text-[9px] font-bold text-slate-600 text-center mb-5 uppercase">{config.network}</p>

            {sendStatus === "success" ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                  <Check size={40} className="text-emerald-500" />
                </div>
                <p className="text-sm font-black text-white mb-1 uppercase">Transfert reussi</p>
                <p className="text-[10px] text-slate-400 mb-4 font-medium uppercase tracking-tight">
                  {sendAmount} {assetId} envoyes avec succes
                </p>
                {sendTxHash && (
                  <a
                    href={getExplorerLink(assetId, sendTxHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-white/5 border border-white/10 p-3 rounded-xl mb-4 hover:bg-white/10 transition-colors"
                  >
                    <p className="text-[9px] font-mono text-slate-400 truncate flex-1">{sendTxHash}</p>
                    <ExternalLink size={14} className="text-blue-500 shrink-0" />
                  </a>
                )}
                <button
                  onClick={() => {
                    setShowSendModal(false);
                    setSendAddress("");
                    setSendAmount("");
                    setSendStatus("idle");
                    setSendTxHash("");
                    setValidationError("");
                    loadData();
                  }}
                  className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-blue-500 transition-all"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <div className="space-y-4 text-left">
                {/* Address input with QR scan */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">
                    Adresse de destination
                  </label>
                  <div className="relative">
                    <input
                      value={sendAddress}
                      onChange={(e) => {
                        setSendAddress(e.target.value);
                        setValidationError("");
                      }}
                      placeholder={getAddressPlaceholder()}
                      className="w-full bg-white/5 border border-white/10 p-4 pr-14 rounded-2xl text-[11px] font-mono text-blue-100 focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                    />
                    <button
                      onClick={() => setShowQRScanner(true)}
                      className="absolute right-3 top-3 p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors active:scale-90"
                      aria-label="Scanner un QR code"
                    >
                      <Scan size={16} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Amount input */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
                    <span>Montant</span>
                    <span className="text-blue-500 font-bold tracking-tighter">Solde: {balance} {assetId}</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={sendAmount}
                      onChange={(e) => {
                        setSendAmount(e.target.value);
                        setValidationError("");
                      }}
                      placeholder="0.00"
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-black text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-slate-700"
                    />
                    <button
                      onClick={() => setSendAmount(balance)}
                      className="absolute right-3 top-3 px-2.5 py-1.5 bg-blue-600/20 border border-blue-500/30 rounded-lg text-[8px] font-black text-blue-400 uppercase hover:bg-blue-600/30 transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                {/* Validation error */}
                {validationError && (
                  <div className="py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[9px] font-bold text-red-400 uppercase text-center">{validationError}</p>
                  </div>
                )}

                {/* Warning if insufficient */}
                {sendAmount && parseFloat(sendAmount) > parseFloat(balance) && !validationError && (
                  <div className="py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-[9px] font-bold text-red-400 uppercase text-center">Solde insuffisant</p>
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSendSubmit}
                  disabled={sendStatus === "loading" || !sendAddress || !sendAmount || parseFloat(sendAmount) > parseFloat(balance)}
                  className="w-full py-4 bg-blue-600 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[11px] tracking-widest disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-blue-600/10 active:scale-95 hover:bg-blue-500"
                >
                  {sendStatus === "loading" ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Confirmer le transfert</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Scanner */}
      {showQRScanner && (
        <QRScanner
          onClose={(data: string) => {
            setShowQRScanner(false);
            if (data && data.length > 0) {
              setSendAddress(data);
              toast.success("Adresse scannee avec succes");
            }
          }}
        />
      )}
    </div>
  );
}
