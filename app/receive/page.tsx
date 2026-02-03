"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  Copy, 
  Check, 
  ArrowLeft, 
  Share2, 
  ShieldCheck, 
  Info,
  QrCode as QrIcon,
  Coins,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

declare global {
  interface Window {
    Pi: any;
  }
}

export default function ReceivePage() {
  const [copied, setCopied] = useState(false);
  const [piAddress, setPiAddress] = useState("");
  const [loading, setLoading] = useState(true);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    loadUserAddress();
  }, []);

  const loadUserAddress = async () => {
    try {
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        setPiAddress(data.walletAddress || data.piUserId || "");
      }
    } catch (error) {
      console.error("Erreur chargement adresse:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(piAddress);
    setCopied(true);
    toast.success("Adresse copiée dans le presse-papier");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon adresse PimPay',
          text: `Voici mon adresse Pi Network pour le transfert : ${piAddress}`,
        });
      } catch (err) {
        console.log("Erreur de partage");
      }
    }
  };

  const handleRequestPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Veuillez entrer un montant valide");
      return;
    }

    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Veuillez ouvrir PimPay via le Pi Browser");
      return;
    }

    setRequestingPayment(true);

    try {
      // Initialiser le SDK Pi si nécessaire
      if (!window.Pi._initialized) {
        await window.Pi.init({ version: "2.0", sandbox: false });
      }

      // Créer une demande de paiement
      const paymentData = {
        amount: parseFloat(amount),
        memo: memo || "Demande de paiement PimPay",
        metadata: { 
          type: "receive_request",
          requestedAt: new Date().toISOString()
        },
      };

      const payment = await window.Pi.createPayment(paymentData, {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("Payment ready for approval:", paymentId);
          
          // Envoyer au backend pour approbation
          const response = await fetch("/api/payments/receive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentId,
              amount: parseFloat(amount),
              memo: memo || "Demande de paiement PimPay",
            }),
          });

          if (!response.ok) {
            throw new Error("Échec de l'approbation du paiement");
          }

          const result = await response.json();
          return result;
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("Payment ready for completion:", paymentId, txid);
          
          // Compléter le paiement
          const response = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });

          if (!response.ok) {
            throw new Error("Échec de la finalisation du paiement");
          }

          const result = await response.json();
          toast.success(`Paiement reçu avec succès : ${amount} π`);
          
          // Réinitialiser le formulaire
          setAmount("");
          setMemo("");
          
          return result;
        },
        onCancel: () => {
          toast.info("Demande de paiement annulée");
          setRequestingPayment(false);
        },
        onError: (error: any) => {
          console.error("Payment error:", error);
          toast.error("Erreur lors de la demande de paiement");
          setRequestingPayment(false);
        },
      });

      console.log("Payment created:", payment);
    } catch (error: any) {
      console.error("Erreur demande de paiement:", error);
      toast.error(error.message || "Erreur lors de la demande de paiement");
    } finally {
      setRequestingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <Link href="/wallet" className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black uppercase italic">Recevoir<span className="text-blue-500">.π</span></h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Votre Identifiant Mainnet</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-8">
        
        {/* QR CODE CONTAINER */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-10 flex flex-col items-center">
            
            <div className="bg-white p-4 rounded-[2rem] mb-6 shadow-2xl">
              <QRCodeSVG 
                value={piAddress} 
                size={200}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: "/pi-logo.png",
                  x: undefined,
                  y: undefined,
                  height: 40,
                  width: 40,
                  excavate: true,
                }}
              />
            </div>

            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20 mb-2">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase text-blue-400 tracking-tighter">Verified Pi Network Address</span>
            </div>
          </div>
        </div>

        {/* ADDRESS DISPLAY */}
        <div className="space-y-3">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">Votre adresse de réception</p>
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 break-all relative group overflow-hidden">
            <p className="text-sm font-mono text-slate-300 pr-12 leading-relaxed">
              {piAddress}
            </p>
            <button 
              onClick={handleCopy}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-2xl shadow-lg active:scale-90 transition-all"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        </div>

        {/* DEMANDE DE PAIEMENT PI */}
        <div className="space-y-4 p-6 bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-[2rem]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <Coins size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase text-white">Demander un paiement</h3>
              <p className="text-[9px] text-slate-400 font-medium">Initiez une transaction vers votre Pi Wallet</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">
                Montant (π)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-12 px-4 bg-slate-950/50 border border-white/10 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-2 block">
                Note (optionnel)
              </label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Ex: Paiement pour service"
                className="w-full h-12 px-4 bg-slate-950/50 border border-white/10 text-white rounded-2xl focus:border-blue-500/50 transition-all outline-none"
              />
            </div>

            <button
              onClick={handleRequestPayment}
              disabled={requestingPayment || !amount}
              className="w-full h-14 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {requestingPayment ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Coins size={20} />
                  <span>Demander le paiement</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SHARE OPTIONS */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={handleShare}
            className="flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all"
          >
            <Share2 size={16} className="text-blue-500" /> Partager
          </button>
          <button className="flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all opacity-50 cursor-not-allowed">
            <QrIcon size={16} className="text-slate-500" /> Imprimer
          </button>
        </div>

        {/* ATTENTION BOX */}
        <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem] flex gap-4">
          <div className="p-3 bg-amber-500/10 rounded-2xl h-fit">
            <Info size={18} className="text-amber-500" />
          </div>
          <div>
            <p className="text-[11px] font-black text-amber-500 uppercase mb-1 tracking-tight">Attention</p>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              N'envoyez que des <span className="text-amber-200">Pi (π)</span> sur cette adresse. L'envoi d'autres actifs peut entraîner une perte définitive. Assurez-vous d'être sur le Mainnet.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
