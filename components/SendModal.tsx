"use client";
import React, { useState } from "react";
import { X, Send, Loader2, CheckCircle2, ExternalLink } from "lucide-react";
import { validateAddress } from "@/lib/crypto-validator";
import { getAssetConfig, getExplorerLink } from "@/lib/crypto-config";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: string;
  currency?: string;
  targetApi?: string;
  userId?: string;
  onRefresh?: () => void;
}

export default function SendModal({
  isOpen,
  onClose,
  balance,
  currency = "SDA",
  targetApi,
  userId,
  onRefresh,
}: SendModalProps) {
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [txHash, setTxHash] = useState("");
  const [validationError, setValidationError] = useState("");

  const config = getAssetConfig(currency);

  const handleSend = async () => {
    if (!address || !amount) return;

    // Validation de l'adresse de destination
    const validation = validateAddress(address, currency);
    if (!validation.isValid) {
      setValidationError(validation.error || "Adresse invalide");
      return;
    }
    setValidationError("");

    // Securite : Verifier le solde avant l'appel API
    if (parseFloat(amount) > parseFloat(balance)) {
      setValidationError("Solde insuffisant pour effectuer ce transfert.");
      return;
    }

    setStatus("loading");

    try {
      // Utilisation de l'API de transfert universelle de PimPay
      const res = await fetch("/api/wallet/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address,
          amount,
          currency: currency,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setStatus("success");
        setTxHash(result.hash);
        if (onRefresh) onRefresh();
      } else {
        setStatus("error");
        setValidationError(result.error || "Erreur lors de l'envoi");
        setStatus("idle");
      }
    } catch {
      setStatus("error");
      setValidationError("Erreur reseau");
      setStatus("idle");
    }
  };

  const handleClose = () => {
    setAddress("");
    setAmount("");
    setStatus("idle");
    setTxHash("");
    setValidationError("");
    onClose();
  };

  if (!isOpen) return null;

  const explorerLink = txHash ? getExplorerLink(currency, txHash) : "#";

  // Placeholder dynamique selon le groupe
  const getPlaceholder = () => {
    switch (config.group) {
      case "EVM":
        return "Adresse commencant par 0x...";
      case "STELLAR":
        return "Adresse commencant par G...";
      case "TRON":
        return "Adresse commencant par T...";
      case "XRP":
        return "Adresse commencant par r...";
      case "BTC":
        return "Adresse commencant par bc1/1/3...";
      case "SOL":
        return "Adresse Solana (Base58)...";
      default:
        return `Adresse ${currency}...`;
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md">
      <div className="bg-[#0a0a0a] w-full max-w-xs rounded-[2.5rem] border border-white/10 p-8 relative shadow-2xl">
        <button onClick={handleClose} className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>

        <p className="text-[10px] font-black uppercase text-blue-500 mb-2 text-center tracking-widest">PimPay Transfer</p>
        <h4 className="text-lg font-black text-white mb-1 uppercase text-center tracking-tighter">Envoyer {currency}</h4>
        <p className="text-[9px] font-bold text-slate-600 text-center mb-6 uppercase">{config.network}</p>

        {status === "success" ? (
          <div className="flex flex-col items-center py-4 text-center">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
               <CheckCircle2 size={40} className="text-emerald-500 animate-pulse" />
            </div>

            <p className="text-sm font-black text-white mb-1 uppercase">Succes !</p>
            <p className="text-[10px] text-slate-400 mb-6 px-4 font-medium uppercase tracking-tight">
              {amount} {currency} ont ete envoyes avec succes.
            </p>

            <div className="w-full space-y-3 mb-8">
              <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-left">
                <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Destinataire</p>
                <p className="text-[10px] font-mono text-blue-400 truncate">{address}</p>
              </div>

              {txHash && (
                <a
                  href={explorerLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-2xl text-left hover:bg-white/10 transition-colors group"
                >
                  <div>
                    <p className="text-[8px] font-black text-slate-500 uppercase mb-1">Details Blockchain</p>
                    <p className="text-[10px] font-mono text-slate-400 truncate w-32">{txHash}</p>
                  </div>
                  <ExternalLink size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
                </a>
              )}
            </div>

            <button onClick={handleClose} className="w-full py-4 bg-blue-600 rounded-2xl font-black uppercase text-[12px] hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20">
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase ml-2">
                Adresse de destination ({config.network})
              </label>
              <input
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setValidationError("");
                }}
                placeholder={getPlaceholder()}
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
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setValidationError("");
                  }}
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-sm font-black text-white focus:outline-none focus:border-blue-500 transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-600 uppercase tracking-tighter">{currency}</span>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-[9px] font-bold text-red-400 uppercase text-center">{validationError}</p>
              </div>
            )}

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
