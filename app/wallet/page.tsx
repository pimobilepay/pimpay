"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCcw, ArrowUpRight, ArrowLeftRight, History, X, Copy, Check, Download,
  ArrowDownLeft, Clock, Calendar, Facebook, Twitter, Youtube, Zap, Globe
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";         
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";     
import { useRouter } from "next/navigation";
import SendModal from "@/components/SendModal";   
import { toast } from "sonner";

// --- LOGOS ---
const PiLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center shadow-lg border border-white/10 p-2">
    <img src="/pi-coin.png" alt="Pi" className="w-full h-full object-contain" />
  </div>
);

const SdaLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-[#1e293b] flex items-center justify-center shadow-lg border border-emerald-500/20 p-2">
    <img src="/sidrachain.png" alt="SDA" className="w-full h-full object-contain" />
  </div>
);

const UsdtLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-blue-900/20 flex items-center justify-center shadow-lg border border-blue-500/20 p-2">
    <img src="/tether-usdt.png" alt="USDT" className="w-full h-full object-contain" />
  </div>
);

const BtcLogo = () => (
  <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shadow-lg border border-white/10 p-2">
    <img src="/bitcoin.png" alt="BTC" className="w-full h-full object-contain opacity-80" />
  </div>
);

export default function WalletPage() {
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [recentTx, setRecentTx] = useState([]);
  const [userId, setUserId] = useState("");

  const [data, setData] = useState({
    id: "",
    name: "Pioneer",
    balance: "0.00000000",
    walletAddress: "",
    usdtAddress: "",
    sidraAddress: ""
  });

  const [btcBalance, setBtcBalance] = useState("0.00000000");
  const [sdaBalance, setSdaBalance] = useState("0.00");
  const [usdtBalance, setUsdtBalance] = useState("0.00");

  const [marketPrices, setMarketPrices] = useState({
    BTC: 0, USDT: 1.00, SDA: 1.20, PI: 314159
  });

  const PI_PUBLIC_ADDRESS = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWFJGL4CZ7MXW7UQR";

  const fetchMarketPrices = useCallback(async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,tether&vs_currencies=usd');
      if (res.ok) {
        const result = await res.json();
        setMarketPrices(prev => ({ ...prev, BTC: result.bitcoin.usd, USDT: result.tether.usd }));
      }
    } catch (err) { console.error("Erreur prix:", err); }
  }, []);

  const loadWalletData = useCallback(async () => {
    setLoading(true);
    try {
      // SYNCHRO SDA FORCÉE POUR L'HISTORIQUE
      fetch("/api/wallet/sidra/sync", { method: "POST" }).catch(() => null);

      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const result = await res.json();
        setUserId(result.id);
        setData({
          id: result.id,
          name: result.name || "Pioneer",
          balance: parseFloat(result.balance || "0").toFixed(8),
          walletAddress: result.walletAddress || "",
          usdtAddress: result.usdtAddress || "",
          sidraAddress: result.sidraAddress || ""
        });
      }

      const balRes = await fetch('/api/wallet/balance');
      if (balRes.ok) {
        const balData = await balRes.json();
        setSdaBalance(parseFloat(balData.SDA || "0").toFixed(2));
        setUsdtBalance(parseFloat(balData.USDT || "0").toFixed(2));
        setBtcBalance(parseFloat(balData.BTC || "0").toFixed(8));
      }

      const txRes = await fetch('/api/wallet/history?limit=10');
      if (txRes.ok) {
        const txData = await txRes.json();
        setRecentTx(txData.transactions || []);
      }
    } catch (err) {
      console.error("Erreur data:", err);
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
    toast.success("Adresse copiée");
    setTimeout(() => setCopied(false), 2000);
  };

  const totalUSDValue = (parseFloat(data.balance) * marketPrices.PI) +
                        (parseFloat(btcBalance) * marketPrices.BTC) +
                        (parseFloat(sdaBalance) * marketPrices.SDA) +
                        (parseFloat(usdtBalance) * marketPrices.USDT);

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen w-full bg-[#020617] text-white overflow-x-hidden font-sans flex flex-col">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="px-6 pt-10 max-w-md mx-auto flex-grow w-full">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1">Multi-Asset Node • GCV</p>
          </div>
          <button onClick={loadWalletData} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all">
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* NOUVEAU DESIGN CARTE FINTECH WEB3 */}
        <div className="relative w-full aspect-[1.58/1] mb-8 group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-[34px] blur-2xl opacity-30 group-hover:opacity-50 transition-opacity" />
          <div className="w-full h-full bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#312e81] rounded-[32px] p-8 border border-white/20 shadow-2xl flex flex-col justify-between relative overflow-hidden backdrop-blur-xl">
             {/* Cercles de design FinTech */}
            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-[-20%] left-[-10%] w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
            
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black text-blue-300 uppercase tracking-[0.2em] opacity-80">Portfolio Balance</span>
                <p className="text-3xl font-black text-white tracking-tighter mt-1">
                  ${totalUSDValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="w-12 h-8 bg-white/10 rounded-lg border border-white/10 flex items-center justify-center backdrop-blur-md">
                 <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                    <Zap size={14} className="text-blue-400" />
                 </div>
              </div>
            </div>

            <div className="relative z-10 flex justify-between items-end">
              <div>
                <p className="text-sm font-black uppercase text-white tracking-widest">{data.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                   <p className="text-[9px] font-bold text-blue-200 uppercase tracking-tighter opacity-70 italic">PimPay Verified Node</p>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <Globe size={20} className="text-white/20 mb-2" />
                <div className="px-3 py-1 bg-blue-600/30 border border-blue-400/30 rounded-lg text-[9px] font-black italic text-blue-200">GCV STANDARDS</div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <QuickAction icon={<ArrowUpRight size={20} />} label="Envoyer" onClick={() => setIsSendOpen(true)} />
          <QuickAction icon={<Download size={20} />} label="Recevoir" onClick={() => setSelectedAsset({ name: "Pi Network", symbol: "PI", address: PI_PUBLIC_ADDRESS })} />
          <QuickAction icon={<ArrowLeftRight size={20} />} label="Swap" onClick={() => router.push('/wallet/swap')} />
          <QuickAction icon={<History size={20} />} label="Historique" onClick={() => router.push('/transactions')} />
        </div>

        {/* ASSETS */}
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 ml-2">Tes Actifs</h3>
        <div className="space-y-3 mb-8">
          <AssetCard
            logo={<PiLogo />} name="Pi Network" symbol="PI" balance={data.balance}
            marketPrice={marketPrices.PI.toLocaleString()}
            usdValue={(parseFloat(data.balance) * marketPrices.PI).toLocaleString()} isMain
            onClick={() => router.push('/wallet/pi')}
          />
          <AssetCard
            logo={<SdaLogo />} name="Sidra Chain" symbol="SDA" balance={sdaBalance}
            marketPrice={marketPrices.SDA.toString()}
            usdValue={(parseFloat(sdaBalance) * marketPrices.SDA).toLocaleString()}
            onClick={() => router.push('/wallet/sda')}
          />
          <AssetCard
            logo={<UsdtLogo />} name="Tether USD" symbol="USDT" balance={usdtBalance}
            marketPrice={marketPrices.USDT.toString()}
            usdValue={(parseFloat(usdtBalance) * marketPrices.USDT).toLocaleString()}
            onClick={() => setSelectedAsset({ name: "Tether USDT", symbol: "USDT", address: data.usdtAddress, network: "TRC20" })}
          />
          <AssetCard
            logo={<BtcLogo />} name="Bitcoin" symbol="BTC" balance={btcBalance}
            marketPrice={marketPrices.BTC.toLocaleString()}
            usdValue={(parseFloat(btcBalance) * marketPrices.BTC).toLocaleString()}
            onClick={() => router.push('/wallet/btc')}
          />
        </div>

        {/* RÉCENTES ACTIVITÉS */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4 px-2">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Activités Récentes</h3>
            <button onClick={() => router.push('/transactions')} className="text-[10px] font-bold text-blue-500 uppercase">Voir tout</button>
          </div>

          <div className="space-y-3">
            {recentTx.length > 0 ? recentTx.map((tx: any, i) => {
              const txDate = new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
              
              let txType = "TRANSFERT";
              let TxIcon = ArrowUpRight;
              let iconColor = "bg-red-500/10 text-red-500";
              let amountPrefix = "-";

              if (tx.type === "EXCHANGE" || tx.type === "SWAP") {
                txType = "SWAP";
                TxIcon = ArrowLeftRight;
                iconColor = "bg-blue-500/10 text-blue-500";
                amountPrefix = "";
              } else if (tx.toUserId === userId || tx.type === "DEPOSIT") {
                txType = tx.type === "DEPOSIT" ? "DÉPÔT" : "REÇU";
                TxIcon = ArrowDownLeft;
                iconColor = "bg-emerald-500/10 text-emerald-500";
                amountPrefix = "+";
              }

              return (
                <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between hover:bg-white/[0.07] transition-all cursor-pointer"
                     onClick={() => {
                        const hash = tx.blockchainTx || tx.externalId;
                        if(hash) {
                          const url = tx.currency === 'SDA' ? `https://ledger.sidrachain.com/tx/${hash}` : `https://minepi.com/blockexplorer/tx/${hash}`;
                          window.open(url, '_blank');
                        }
                     }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
                       <TxIcon size={18} />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-white uppercase tracking-tight">
                        {txType} {tx.currency}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={10} className="text-slate-600" />
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{txDate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-black tracking-tighter ${amountPrefix === '+' ? 'text-emerald-500' : 'text-white'}`}>
                      {amountPrefix}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} {tx.currency}
                    </p>
                    <div className="flex items-center justify-end gap-1 mt-0.5">
                       <span className={`w-1 h-1 rounded-full ${tx.status === 'SUCCESS' || tx.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
                       <p className="text-[8px] text-slate-500 uppercase font-black tracking-tighter">{tx.status}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center bg-white/5 rounded-[2rem] border border-dashed border-white/10">
                <Clock size={24} className="mx-auto text-slate-700 mb-2" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Aucune activité récente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER SOCIAL */}
      <footer className="pt-8 pb-32 border-t border-white/5 flex flex-col items-center gap-6 bg-[#020617] mt-10">
        <div className="flex items-center gap-6">
          <a href="https://www.facebook.com/profile.php?id=61583243122633" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"><Facebook size={20} /></a>
          <a href="https://x.com/pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-all"><Twitter size={20} /></a>
          <a href="https://youtube.com/@pimobilepay" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><Youtube size={20} /></a>
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">© 2026 PimPay Virtual Bank</p>
          <p className="text-[8px] font-bold uppercase tracking-widest text-slate-700 mt-1">
            Pi Mobile Payment Solution
          </p>
        </div>
      </footer>

      {/* MODALE QR AVEC PRÉCISION USDT TRC20 */}
      {selectedAsset && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-xs rounded-[2.5rem] border border-white/10 p-8 relative text-center">
              <button onClick={() => setSelectedAsset(null)} className="absolute top-6 right-6 text-slate-400"><X size={20} /></button>
              
              <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Dépôt {selectedAsset.symbol}</p>
              <h4 className="text-lg font-black text-white mb-2 uppercase">{selectedAsset.name}</h4>
              
              {/* ALERTE RÉSEAU USDT */}
              {selectedAsset.symbol === "USDT" && (
                <div className="mb-4 py-1.5 px-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">⚠️ RÉSEAU TRC20 (TRON) UNIQUEMENT</p>
                </div>
              )}

              <div className="bg-white p-3 rounded-3xl inline-block mb-6">
                {!selectedAsset.address ? (
                  <div className="w-[180px] h-[180px] flex items-center justify-center text-black font-bold animate-pulse uppercase text-[10px]">Génération...</div>
                ) : (
                  <QRCodeSVG value={selectedAsset.address} size={180} />
                )}
              </div>

              <div onClick={() => handleCopy(selectedAsset.address)} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer active:bg-white/10 transition-all">
                <p className="text-[10px] font-mono text-slate-400 truncate mr-4">{selectedAsset.address || "Non disponible"}</p>
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-blue-500" />}
              </div>
              
              <p className="text-[8px] text-slate-500 uppercase font-bold mt-4 tracking-widest">
                Scannez pour créditer votre compte PimPay
              </p>
          </div>
        </div>
      )}

      <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} balance={sdaBalance} onRefresh={loadWalletData} />
      <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
    </div>
  );
}

// Composants de support
function QuickAction({ icon, label, onClick }: any) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-500 shadow-lg group-active:scale-90 transition-all">
        {icon}
      </div>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{label}</span>
    </button>
  );
}

function AssetCard({ logo, name, balance, symbol, marketPrice, usdValue, isMain, onClick }: any) {
  return (
    <div onClick={onClick} className={`p-4 rounded-[2rem] flex items-center justify-between border transition-all active:scale-95 cursor-pointer ${isMain ? 'bg-blue-600/10 border-blue-500/20' : 'bg-white/5 border-white/5'}`}>
      <div className="flex items-center gap-4">
        {logo}
        <div>
          <p className="text-[13px] font-black text-white uppercase tracking-tight">{name}</p>
          <p className="text-[10px] text-blue-500 font-bold tracking-tight">${marketPrice}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-black text-white">{balance} {symbol}</p>
        <p className="text-[10px] font-bold text-slate-500 uppercase">${usdValue}</p>
      </div>
    </div>
  );
}
