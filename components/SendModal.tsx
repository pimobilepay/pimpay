"use client";
import React, { useState } from "react";
import { X, Send, Loader2, CheckCircle2, ExternalLink } from "lucide-react";

// Ajout de currency dans les props pour rendre le composant universel
export default function SendModal({ isOpen, onClose, balance, currency = "SDA", onRefresh }: any) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState("");

  const handleSend = async () => {
    if (!address || !amount) return;
    
    // Sécurité : Vérifier le solde avant l'appel API
    if (parseFloat(amount) > parseFloat(balance)) {
      alert("Solde insuffisant pour effectuer ce transfert.");
      return;
    }

    setStatus("loading");

    try {
      // Utilisation de l'API de transfert universelle de PimPay
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: address,
          amount,
          currency: currency // Dynamique : SDA, PI, USDT (TRC-20), BTC
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setStatus("success");
        setTxHash(result.hash);
        if (onRefresh) onRefresh();
      } else {
        setStatus("error");
        alert(result.error || "Erreur lors de l'envoi");
        setStatus("idle");
      }
    } catch (err) {
      setStatus("error");
      setStatus("idle");
    }
  };

  if (!isOpen) return null;

  // STRUCTURE TRON & AUTRES : Définition de l'explorateur selon la monnaie
  const getExplorerLink = (hash: string) => {
    switch (currency.toUpperCase()) {
      case "SDA":
        return `https://ledger.sidrachain.com/tx/${hash}`;
      case "PI":
        return `https://minepi.com/blockexplorer/tx/${hash}`;
      case "USDT":
        // Structure TRON pour l'USDT (TRC-20)
        return `https://tronscan.org/#/transaction/${hash}`;
      case "BTC":
        return `https://www.blockchain.com/btc/tx/${hash}`;
      default:
        return "#";
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
      <div className="bg-[#0a0a0a] w-full max-w-xs rounded-[2.5rem] border border-white/10 p-8 relative shadow-2xl">
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <p className="text-[10px] font-black uppercase text-blue-500 mb-2 text-center tracking-widest">PimPay Transfer</p>
        <h4 className="text-lg font-black text-white mb-6 uppercase text-center tracking-tighter">Envoyer {currency}</h4>

        {status === "success" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 size={40} className="text-emerald-500 animate-pulse" />
            </div>

            <p className="text-sm font-black text-white mb-1 uppercase">Succès !</p>
            <p className="text-[10px] text-slate-400 mb-6 px-4 font-medium uppercase tracking-tight">
              {amount} {currency} ont été envoyés avec succès.
            </p>

            <div className="w-full space-y-3 mb-8">
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Destinataire</p>
                <p className="text-[10px] font-mono text-blue-400 truncate">{address}</p>
              </div>

              {txHash && (
                <a
                  href={getExplorerLink(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl text-left hover:bg-white/10 transition-colors group"
                >
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Détails Blockchain</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate w-32">{txHash}</p>
                  </div>
                  <ExternalLink size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                </a>
              )}
            </div>

            <button onClick={onClose} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[12px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">
                Adresse de destination {currency === "USDT" ? "(TRON)" : ""}
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={currency === "USDT" ? "Adresse commençant par T..." : `${currency} Address...`}
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-[11px] font-mono text-blue-100 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2 flex justify-between">
                <span>Montant</span>
                <span className="text-blue-500 font-bold tracking-tighter">Solde: {balance}</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-black text-white focus:outline-none focus:border-blue-500 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">{currency}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSend}
                disabled={status === "loading" || !address || !amount}
                className="w-full py-4 bg-blue-600 rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-[12px] disabled:opacity-30 disabled:grayscale transition-all shadow-lg shadow-blue-600/10 active:scale-95"
              >
                {status === "loading" ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Send size={16} />
                    <span>Confirmer le transfert</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
