"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  RefreshCcw,
  ArrowUpRight,
  ArrowLeftRight,
  History,
  X,
  Copy,
  Check,
  Download,
  ArrowDownLeft,
  Clock,
  Calendar
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";             
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";         
import { useRouter } from "next/navigation";
import SendModal from "@/components/SendModal";       

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
      const res = await fetch('/api/user/profile');
      let currentUserId = "";
      if (res.ok) {
        const result = await res.json();
        currentUserId = result.id;
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
        // Modification ici : On prend toutes les transactions sans filtrer uniquement les envois
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
    setTimeout(() => setCopied(false), 2000);
  };

  const totalUSDValue = (parseFloat(data.balance) * marketPrices.PI) +
                        (parseFloat(btcBalance) * marketPrices.BTC) +
                        (parseFloat(sdaBalance) * marketPrices.SDA) +
                        (parseFloat(usdtBalance) * marketPrices.USDT);

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen w-full pb-32 bg-[#020617] text-white overflow-x-hidden font-sans">
      <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <div className="px-6 pt-10 max-w-md mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tighter">
              PimPay<span className="text-blue-500">Wallet</span>
            </h1>
            <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mt-1">Multi-Asset Node • GCV</p>
          </div>
          <button onClick={loadWalletData} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all">
            <RefreshCcw size={18} className={loading ? "animate-spin text-blue-500" : "text-slate-400"} />
          </button>
        </div>

        {/* SOLDE CARD */}
        <div className="relative w-full aspect-[1.58/1] mb-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-[34px] blur-xl opacity-50" />
          <div className="w-full h-full bg-black rounded-[32px] p-8 border border-white/10 shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
            <div className="relative z-10">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Net Worth (GCV)</span>
              <p className="text-3xl font-black text-white tracking-tighter mt-1">
                ${totalUSDValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="relative z-10 flex justify-between items-end">
              <p className="text-sm font-black uppercase text-blue-100">{data.name}</p>
              <div className="px-3 py-1 bg-blue-600 rounded-lg text-[10px] font-black italic">MASTER NODE</div>
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
            onClick={() => router.push('/wallet/usdt')}
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
            <button onClick={() => router.push('/wallet/history')} className="text-[10px] font-bold text-blue-500 uppercase">Voir tout</button>
          </div>

          <div className="space-y-3">
            {recentTx.length > 0 ? recentTx.map((tx: any, i) => {
              const txDate = new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
              
              // Logique pour déterminer le type de transaction
              let txType = "TRANSFERT";
              let TxIcon = ArrowUpRight;
              let iconColor = "bg-red-500/10 text-red-500";
              let amountPrefix = "-";

              if (tx.type === "EXCHANGE") {
                txType = "SWAP";
                TxIcon = ArrowLeftRight;
                iconColor = "bg-blue-500/10 text-blue-500";
                amountPrefix = "";
              } else if (tx.toUserId === userId) {
                txType = "REÇU";
                TxIcon = ArrowDownLeft;
                iconColor = "bg-emerald-500/10 text-emerald-500";
                amountPrefix = "+";
              } else if (tx.type === "DEPOSIT") {
                txType = "DÉPÔT";
                TxIcon = ArrowDownLeft;
                iconColor = "bg-emerald-500/10 text-emerald-500";
                amountPrefix = "+";
              }

              return (
                <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between hover:bg-white/[0.07] transition-all cursor-pointer"
                     onClick={() => tx.blockchainTx && window.open(`https://ledger.sidrachain.com/tx/${tx.blockchainTx}`, '_blank')}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconColor}`}>
                       <TxIcon size={18} />
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-white uppercase tracking-tight">
                        {txType} {tx.currency} {tx.destCurrency ? `➔ ${tx.destCurrency}` : ''}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Calendar size={10} className="text-slate-600" />
                        <p className="text-[9px] text-slate-500 font-bold uppercase">{txDate}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-[12px] font-black tracking-tighter ${amountPrefix === '+' ? 'text-emerald-500' : 'text-white'}`}>
                      {amountPrefix}{tx.amount.toFixed(tx.currency === 'BTC' ? 6 : 2)} {tx.currency}
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

        {/* MODALE QR */}
        {selectedAsset && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
            <div className="bg-[#0a0a0a] w-full max-w-xs rounded-[2.5rem] border border-white/10 p-8 relative text-center">
              <button onClick={() => setSelectedAsset(null)} className="absolute top-6 right-6 text-slate-400"><X size={20} /></button>
              <p className="text-[10px] font-black uppercase text-blue-500 mb-2">Dépôt {selectedAsset.symbol}</p>
              <h4 className="text-lg font-black text-white mb-6 uppercase">{selectedAsset.name}</h4>
              <div className="bg-white p-3 rounded-3xl inline-block mb-6">
                {!selectedAsset.address ? <div className="w-[180px] h-[180px] flex items-center justify-center text-black font-bold animate-pulse uppercase text-[10px]">Génération...</div> : <QRCodeSVG value={selectedAsset.address} size={180} />}
              </div>
              <div onClick={() => handleCopy(selectedAsset.address)} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer active:bg-white/10 transition-all">
                <p className="text-[10px] font-mono text-slate-400 truncate mr-4">{selectedAsset.address || "Non disponible"}</p>
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} className="text-blue-500" />}
              </div>
            </div>
          </div>
        )}

        <SendModal isOpen={isSendOpen} onClose={() => setIsSendOpen(false)} balance={sdaBalance} onRefresh={loadWalletData} />
      </div>
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
