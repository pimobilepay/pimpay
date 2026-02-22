"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCcw, ArrowUpRight, ArrowLeftRight, History, X, Copy, Check, Download,
  ArrowDownLeft, Clock, Calendar, Facebook, Twitter, Youtube,
  Shield, Loader2, ChevronRight
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";
import { useRouter } from "next/navigation";
import SendModal from "@/components/SendModal";
import { toast } from "sonner";
import { useLanguage } from "@/context/LanguageContext";
import {
  CRYPTO_ASSETS,
  WALLET_ASSET_ORDER,
  STABLECOIN_ORDER,
  ALL_SYMBOLS,
  getAssetConfig,
  getTargetApi,
  getCoinGeckoIds,
  mapCoinGeckoPrices,
} from "@/lib/crypto-config";

// --- TYPES ---
type WalletAddresses = Record<string, string>;

export default function WalletPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<{
    name: string; symbol: string; address: string; network: string; targetApi: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [userName, setUserName] = useState("Pioneer");
  const [generatingAddress, setGeneratingAddress] = useState(false);

  // Send modal state
  const [sendCurrency, setSendCurrency] = useState("SDA");
  const [sendBalance, setSendBalance] = useState("0");
  const [sendTargetApi, setSendTargetApi] = useState("/api/wallet/sidra");

  // Balances & addresses driven by config
  const [balances, setBalances] = useState<Record<string, string>>(
    Object.fromEntries(ALL_SYMBOLS.map((s) => [s, "0.00"]))
  );
  const [addresses, setAddresses] = useState<WalletAddresses>(
    Object.fromEntries(ALL_SYMBOLS.map((s) => [s, ""]))
  );
  const [marketPrices, setMarketPrices] = useState<Record<string, number>>(
    Object.fromEntries(Object.entries(CRYPTO_ASSETS).map(([k, v]) => [k, v.defaultPrice]))
  );

  const fetchMarketPrices = useCallback(async () => {
    try {
      const ids = getCoinGeckoIds();
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`);
      if (res.ok) {
        const result = await res.json();
        const mapped = mapCoinGeckoPrices(result);
        setMarketPrices((prev) => ({ ...prev, ...mapped }));
      }
    } catch { /* silently fail, keep defaults */ }
  }, []);

  const loadWalletData = useCallback(async () => {
    setLoading(true);
    try {
      fetch("/api/wallet/sidra/sync", { method: "POST" }).catch(() => null);

      const [profileRes, balRes, txRes] = await Promise.all([
        fetch("/api/user/profile"),
        fetch("/api/wallet/balance"),
        fetch("/api/wallet/history?limit=10"),
      ]);

      if (profileRes.ok) {
        const profileJson = await profileRes.json();
        const user = profileJson.user;
        if (user) {
          setUserId(user.id);
          setUserName(user.name || "Pioneer");
        }
      }

      if (balRes.ok) {
        const balData = await balRes.json();
        const newBalances: Record<string, string> = {};
        const newAddresses: Record<string, string> = {};

        for (const symbol of ALL_SYMBOLS) {
          const config = getAssetConfig(symbol);
          newBalances[symbol] = parseFloat(balData[symbol] || "0").toFixed(config.decimals);
          newAddresses[symbol] = balData.addresses?.[symbol] || "";
        }

        setBalances(newBalances);
        setAddresses(newAddresses);
      }

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

  // --- RECEIVE: auto-generate address if missing ---
  const handleReceive = async (symbol: string) => {
    const config = getAssetConfig(symbol);
    const currentAddr = addresses[symbol];

    if (!currentAddr || currentAddr === "Non configuree") {
      setGeneratingAddress(true);
      setSelectedAsset({
        name: config.name,
        symbol,
        address: "",
        network: config.network,
        targetApi: config.targetApi,
      });

      try {
        const res = await fetch(config.targetApi, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          const newAddr = data.address || "";
          setAddresses((prev) => ({ ...prev, [symbol]: newAddr }));
          setSelectedAsset((prev) => prev ? { ...prev, address: newAddr } : null);
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
      setSelectedAsset({
        name: config.name,
        symbol,
        address: currentAddr,
        network: config.network,
        targetApi: config.targetApi,
      });
    }
  };

  // --- SEND: open modal with correct config ---
  const handleSend = (symbol: string) => {
    const config = getAssetConfig(symbol);
    setSendCurrency(symbol);
    setSendBalance(balances[symbol] || "0");
    setSendTargetApi(config.targetApi);
    setIsSendOpen(true);
  };

  const totalUSDValue = ALL_SYMBOLS.reduce((sum, symbol) => {
    return sum + parseFloat(balances[symbol] || "0") * (marketPrices[symbol] || 0);
  }, 0);

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
                <div className="flex gap-1 flex-wrap justify-end">
                  {ALL_SYMBOLS.map((c) => (
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
            onClick={() => handleSend("SDA")}
          />
          <QuickAction
            icon={<Download size={20} />}
            label={t("wallet.receive")}
            onClick={() => handleReceive("PI")}
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
          <span className="text-[9px] font-bold text-slate-600">{ALL_SYMBOLS.length} {t("wallet.assetsCount")}</span>
        </div>

        <div className="space-y-2.5 mb-8">
          {WALLET_ASSET_ORDER.map((symbol) => {
            const config = getAssetConfig(symbol);
            const balance = balances[symbol] || "0";
            const price = marketPrices[symbol] || 0;
            return (
              <AssetCard
                key={symbol}
                logo={<AssetLogo src={config.logo} alt={symbol} accentBg={config.accentBg} accentBorder={config.accentBorder} />}
                name={config.name}
                symbol={symbol}
                network={config.network}
                balance={balance}
                marketPrice={price}
                usdValue={parseFloat(balance) * price}
                isMain={symbol === "PI"}
                loading={loading}
                onClick={() => router.push(`/wallet/${symbol.toLowerCase()}`)}
              />
            );
          })}

          {/* --- STABLECOINS --- */}
          <div className="pt-4 pb-2 px-1">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stablecoins</h3>
          </div>

          {STABLECOIN_ORDER.map((symbol) => {
            const config = getAssetConfig(symbol);
            const balance = balances[symbol] || "0";
            const price = marketPrices[symbol] || 0;
            return (
              <AssetCard
                key={symbol}
                logo={<AssetLogo src={config.logo} alt={symbol} accentBg={config.accentBg} accentBorder={config.accentBorder} />}
                name={config.name}
                symbol={symbol}
                network={config.network}
                balance={balance}
                marketPrice={price}
                usdValue={parseFloat(balance) * price}
                loading={loading}
                onClick={() => router.push(`/wallet/${symbol.toLowerCase()}`)}
              />
            );
          })}
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
                      const txCurrency = (tx.currency || "PI").toUpperCase();
                      const config = getAssetConfig(txCurrency === "SIDRA" ? "SDA" : txCurrency);
                      window.open(`${config.explorerBase}${hash}`, '_blank');
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
                      <span className={`w-1.5 h-1.5 rounded-full ${tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 'bg-emerald-500' : tx.status === 'FAILED' ? 'bg-red-500' : 'bg-yellow-500'}`} />
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
              {!selectedAsset.address || generatingAddress ? (
                <div className="w-[170px] h-[170px] flex flex-col items-center justify-center gap-2">
                  {generatingAddress ? (
                    <>
                      <Loader2 size={24} className="text-blue-500 animate-spin" />
                      <span className="text-slate-400 font-bold uppercase text-[10px]">Generation...</span>
                    </>
                  ) : (
                    <span className="text-slate-400 font-bold uppercase text-[10px] animate-pulse">
                      {t("wallet.loading")}
                    </span>
                  )}
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

            {(selectedAsset.symbol === "USDT" || selectedAsset.symbol === "TRX") && (
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

      <SendModal
        isOpen={isSendOpen}
        onClose={() => setIsSendOpen(false)}
        balance={sendBalance}
        currency={sendCurrency}
        targetApi={sendTargetApi}
        userId={userId}
        onRefresh={loadWalletData}
      />
      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}

// --- SUPPORT COMPONENTS ---

function AssetLogo({ src, alt, accentBg, accentBorder }: {
  src: string; alt: string; accentBg: string; accentBorder: string;
}) {
  return (
    <div className={`w-11 h-11 rounded-2xl ${accentBg} flex items-center justify-center border ${accentBorder} p-2`}>
      <img src={src} alt={alt} className="w-full h-full object-contain" />
    </div>
  );
}

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
