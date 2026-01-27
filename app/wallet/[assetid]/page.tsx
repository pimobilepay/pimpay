"use client";
import React, { useState, useEffect, useCallback } from "react";
import {
  ArrowLeft,
  MoreVertical,
  Share2,
  Download,
  Clock,
  X,
  Copy,
  Check,
  History
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import SendModal from "@/components/SendModal";

interface Transaction {
  createdAt: string;
  currency: string;
  amount: number;
  status: string;
  blockchainTx?: string;
}

interface AssetData {
  name: string;
  symbol: string;
  balance: string;
  address: string;
}

export default function AssetDetailStructure() {
  const router = useRouter();
  const params = useParams();

  const rawAssetId = typeof params?.assetid === 'string' ? params.assetid : "PI";
  const assetId = rawAssetId.toUpperCase();

  const [isMounted, setIsMounted] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [assetData, setAssetData] = useState<AssetData>({
    name: assetId === "PI" ? "Pi Network" : assetId === "SDA" ? "Sidra Chain" : assetId === "USDT" ? "Tether USD" : "Bitcoin",
    symbol: assetId,
    balance: "0.00000000",
    address: ""
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, balanceRes, historyRes] = await Promise.all([
        fetch('/api/user/profile'),
        fetch('/api/wallet/balance'),
        fetch(`/api/wallet/history?currency=${assetId}`)
      ]);

      if (profileRes.ok && balanceRes.ok) {
        const profile = await profileRes.json();
        const balances = await balanceRes.json();

        let addr = "";
        let realBalance = "0.00000000";

        // --- LOGIQUE DE RÉCUPÉRATION DES DONNÉES RÉELLES ---
        switch (assetId) {
          case "PI":
            addr = "GD3SGMIZH6NAQ3RY7KQZDSSDHTN2K2HFKRRPEVAWWFJGL4CZ7MXW7UQR";
            realBalance = profile.balance ? parseFloat(profile.balance).toFixed(8) : "0.00000000";
            break;
          case "SDA":
            addr = profile.sidraAddress;
            realBalance = balances.SDA ? parseFloat(balances.SDA).toFixed(2) : "0.00";
            break;
          case "USDT":
            addr = profile.usdtAddress;
            realBalance = balances.USDT ? parseFloat(balances.USDT).toFixed(2) : "0.00";
            break;
          case "BTC":
            // CORRECTION : On évite profile.walletAddress qui contient l'adresse Pi.
            // On tente de récupérer l'adresse BTC spécifique dans les wallets.
            const btcWallet = balances.wallets?.find((w: any) => w.currency === "BTC");
            
            if (btcWallet?.depositMemo && btcWallet.depositMemo.startsWith("bc1")) {
              addr = btcWallet.depositMemo;
            } else {
              // Si pas d'adresse BTC ou adresse erronée, on appelle l'API de génération
              const genRes = await fetch('/api/wallet/btc', { method: 'POST' });
              if (genRes.ok) {
                const genData = await genRes.json();
                addr = genData.address;
              } else {
                addr = "Génération échouée";
              }
            }
            realBalance = balances.BTC ? parseFloat(balances.BTC).toFixed(8) : "0.00000000";
            break;
        }

        setAssetData(prev => ({
          ...prev,
          balance: realBalance,
          address: addr || "Non configurée"
        }));
      }

      if (historyRes.ok) {
        const historyData = await historyRes.json();
        const filtered = (historyData.transactions || []).filter(
          (tx: Transaction) => tx.currency.toUpperCase() === assetId
        );
        setTransactions(filtered);
      }
    } catch (err) {
      console.error("Erreur PimPay Sync:", err);
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, [loadData]);

  const handleCopy = (address: string) => {
    if (!address || address === "Non configurée" || address === "Génération en cours...") return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAssetImage = () => {
    switch(assetId) {
      case "PI": return "/pi-coin.png";
      case "SDA": return "/sidrachain.png";
      case "USDT": return "/tether-usdt.png";
      case "BTC": return "/bitcoin.png";
      default: return "/pi-coin.png";
    }
  };

  if (!isMounted) return <div className="min-h-screen bg-[#020617]" />;

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans flex flex-col pb-32">
      {/* HEADER */}
      <div className="px-6 pt-12 pb-4 flex justify-between items-center">
        <button onClick={() => router.back()} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90">
          <ArrowLeft size={22} className="text-slate-400" />
        </button>
        <div className="text-center">
          <h1 className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-500">Détails de l'actif</h1>
          <p className="text-xs font-bold text-slate-500 uppercase">{assetData.name}</p>
        </div>
        <button onClick={loadData} className="p-3 bg-white/5 rounded-2xl border border-white/10 active:rotate-180 transition-transform">
          <MoreVertical size={22} className="text-slate-400" />
        </button>
      </div>

      {/* BALANCE SECTION */}
      <div className="flex-1 flex flex-col items-center pt-8 px-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-600/20 to-transparent p-5 mb-6 border border-white/10 shadow-2xl relative flex items-center justify-center">
          <img src={getAssetImage()} alt={assetId} className="w-full h-full object-contain" />
          {loading && <div className="absolute inset-0 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        <div className="text-center mb-10">
          <h2 className="text-4xl font-black tracking-tighter text-white mb-2">
            {loading ? "..." : assetData.balance}
          </h2>
          <span className="px-4 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-500 font-black text-[10px] uppercase tracking-widest">
            {assetData.symbol} Balance
          </span>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-10">
          <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem]">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">Disponible</p>
            <p className="text-sm font-black text-white truncate">{assetData.balance}</p>
          </div>
          <div className="bg-white/5 border border-white/10 p-5 rounded-[2rem]">
            <p className="text-[9px] font-black uppercase text-slate-500 tracking-widest mb-1">En attente</p>
            <p className="text-sm font-black text-slate-700">0.0000</p>
          </div>
        </div>

        {/* HISTORIQUE SECTION */}
        <div className="w-full">
          <div className="flex justify-between items-center mb-6 px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Historique {assetId}</h3>
            <button onClick={() => router.push('/wallet/history')} className="text-[10px] font-bold text-blue-500 uppercase">Tout</button>
          </div>

          <div className="space-y-3">
            {transactions.length > 0 ? transactions.map((tx, i) => (
              <div key={i} className="bg-white/5 border border-white/5 p-4 rounded-[1.5rem] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                    <History size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-white uppercase tracking-tight">Activité {tx.currency}</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase">{new Date(tx.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[12px] font-black text-white">{tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(4)}</p>
                  <p className="text-[8px] text-emerald-500 uppercase font-black">{tx.status}</p>
                </div>
              </div>
            )) : (
              <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-[2rem] p-8 text-center">
                <Clock size={20} className="mx-auto text-slate-700 mb-2" />
                <p className="text-[9px] font-black text-slate-600 uppercase">Aucune activité {assetId}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ACTIONS FIXED */}
      <div className="fixed bottom-0 inset-x-0 bg-[#020617]/80 backdrop-blur-xl border-t border-white/5 p-6 pb-10">
        <div className="flex gap-4 max-w-md mx-auto">
          <button
            onClick={() => setShowSendModal(true)}
            className="flex-1 bg-white text-black py-5 rounded-[22px] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 shadow-lg"
          >
            <Share2 size={18} strokeWidth={3} /> Envoyer
          </button>
          <button
            onClick={() => setShowReceiveModal(true)}
            className="flex-1 bg-blue-600 text-white py-5 rounded-[22px] font-black uppercase text-[10px] tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-blue-600/20"
          >
            <Download size={18} strokeWidth={3} /> Recevoir
          </button>
        </div>
      </div>

      {/* MODALE RECEVOIR (Dynamique avec QR) */}
      {showReceiveModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
          <div className="bg-[#0a0a0a] w-full max-w-xs rounded-[3rem] border border-white/10 p-8 relative text-center">
            <button onClick={() => setShowReceiveModal(false)} className="absolute top-6 right-6 text-slate-500 p-2"><X size={24} /></button>
            <p className="text-[9px] font-black uppercase text-blue-500 mb-2 tracking-[0.2em]">PimPay Network Deposit</p>
            <h4 className="text-xl font-black text-white mb-6 uppercase tracking-tighter">{assetData.name}</h4>
            <div className="bg-white p-4 rounded-[2rem] inline-block mb-8 shadow-[0_0_40px_rgba(59,130,246,0.15)]">
              <QRCodeSVG value={assetData.address} size={170} />
            </div>
            <div onClick={() => handleCopy(assetData.address)} className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center justify-between cursor-pointer active:bg-white/10 transition-all group">
              <p className="text-[9px] font-mono text-slate-400 truncate mr-4">{assetData.address}</p>
              {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-blue-500 group-hover:scale-110 transition-transform" />}
            </div>
            <p className="mt-4 text-[8px] text-slate-600 uppercase font-bold tracking-widest">Envoyez uniquement du {assetData.symbol} sur cette adresse</p>
          </div>
        </div>
      )}

      {/* MODALE ENVOYER */}
      {showSendModal && (
        <SendModal isOpen={showSendModal} onClose={() => setShowSendModal(false)} balance={assetData.balance} currency={assetId} onRefresh={loadData} />
      )}
    </div>
  );
}
