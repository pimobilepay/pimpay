"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ArrowLeft, ShieldCheck, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function ReceivePage() {
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [piAddress, setPiAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    setMounted(true);
    const loadAddress = async () => {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        // On utilise l'adresse du wallet ou l'ID si vide
        setPiAddress(data.user?.walletAddress || data.user?.id || "Non disponible");
      } catch (e) {
        setPiAddress("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    loadAddress();
  }, []);

  const handleCopy = () => {
    if (!piAddress || piAddress === "Non disponible") return;
    navigator.clipboard.writeText(piAddress);
    setCopied(true);
    toast.success("Adresse copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePiPayment = async () => {
    const floatAmount = parseFloat(amount);
    
    if (!amount || floatAmount <= 0) {
      toast.error("Veuillez saisir un montant valide");
      return;
    }

    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Veuillez ouvrir PimPay dans le Pi Browser");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Déclenchement du paiement réel sur le Mainnet
      const payment = await window.Pi.createPayment({
        amount: floatAmount,
        memo: memo || "Dépôt PimPay",
        metadata: { type: "deposit", platform: "pimpay" },
      }, {
        onReadyForServerApproval: async (paymentId) => {
          console.log("Approbation serveur pour ID:", paymentId);
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          console.log("Transaction Blockchain détectée:", txid);
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              paymentId, 
              txid, 
              amount: floatAmount 
            }),
          });
          
          if (res.ok) {
            toast.success("Dépôt de " + floatAmount + " π réussi !");
            setAmount("");
            setMemo("");
          } else {
            toast.error("Erreur lors de la validation finale");
          }
          setIsProcessing(false);
        },
        onCancel: (paymentId) => {
          toast.dismiss();
          setIsProcessing(false);
        },
        onError: (error, payment) => {
          console.error("Erreur SDK Pi:", error);
          toast.error("Le paiement a échoué");
          setIsProcessing(false);
        },
      });
    } catch (err) {
      console.error("Erreur critique:", err);
      toast.error("Impossible de lancer le paiement");
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/wallet" className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black italic uppercase tracking-tight">Recevoir<span className="text-blue-500">.π</span></h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase">Mainnet Live</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* Card QR Code */}
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ShieldCheck size={80} />
          </div>
          
          <div className="bg-white p-3 rounded-[1.5rem] mb-6 shadow-xl">
            {piAddress && <QRCodeSVG value={piAddress} size={180} />}
          </div>
          
          <div className="w-full space-y-2 text-center">
            <p className="text-[10px] font-bold text-slate-500 uppercase">Votre Identifiant de réception</p>
            <div className="flex items-center justify-center gap-2">
               <p className="text-[11px] font-mono text-slate-300 break-all bg-black/30 p-3 rounded-xl border border-white/5 w-full">
                {piAddress}
              </p>
              <button 
                onClick={handleCopy}
                className="p-3 bg-blue-600 rounded-xl active:scale-90 transition-all"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire de paiement */}
        <div className="p-6 bg-gradient-to-b from-blue-900/20 to-transparent border border-white/5 rounded-[2.5rem] space-y-4">
          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2">Montant du dépôt</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00 π"
              className="w-full h-16 px-6 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 text-xl font-bold transition-all"
            />
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Note (ex: Recharge PimPay)"
              className="w-full h-14 px-6 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 text-sm transition-all"
            />
          </div>

          <button
            onClick={handlePiPayment}
            disabled={isProcessing}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              isProcessing ? "bg-slate-700 cursor-not-allowed" : "bg-blue-600 active:scale-95 shadow-lg shadow-blue-500/20"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Traitement...
              </>
            ) : (
              `Confirmer le dépôt`
            )}
          </button>
        </div>

        {/* Information de sécurité */}
        <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex gap-3">
          <Info size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-slate-400 italic">
            Les fonds seront crédités sur votre compte PimPay dès que la transaction sera confirmée sur la blockchain Pi.
          </p>
        </div>
      </div>
    </div>
  );
}
