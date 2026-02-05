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
      // Utilisation de l'API profil "vaccinée"
      const res = await fetch('/api/user/profile');
      if (res.ok) {
        const data = await res.json();
        // On récupère l'adresse générée ou l'ID Pi
        const address = data.user?.walletAddress || data.user?.id || "";
        setPiAddress(address);
      }
    } catch (error) {
      console.error("Erreur chargement adresse:", error);
      toast.error("Impossible de charger votre adresse");
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour synchroniser le solde réel après paiement
  const syncBalanceAfterPayment = async (newAmount: number) => {
    try {
      await fetch('/api/wallet/pi/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: newAmount })
      });
    } catch (e) {
      console.error("Erreur synchro auto:", e);
    }
  };

  const handleCopy = () => {
    if (!piAddress) return;
    navigator.clipboard.writeText(piAddress);
    setCopied(true);
    toast.success("Adresse copiée !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Mon adresse PimPay',
          text: `Voici mon adresse Pi pour le transfert : ${piAddress}`,
        });
      } catch (err) { /* Erreur silencieuse */ }
    }
  };

  const handleRequestPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Entrez un montant valide");
      return;
    }

    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser");
      return;
    }

    setRequestingPayment(true);

    try {
      const payment = await window.Pi.createPayment({
        amount: parseFloat(amount),
        memo: memo || "Paiement PimPay",
        metadata: { type: "receive_request" },
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });
          
          if (res.ok) {
            toast.success(`Reçu : ${amount} π`);
            // 🔥 SYNCHRONISATION AUTOMATIQUE DU SOLDE
            await syncBalanceAfterPayment(parseFloat(amount));
            setAmount("");
            setMemo("");
          }
          return res.json();
        },
        onCancel: () => setRequestingPayment(false),
        onError: (error: any) => {
          console.error(error);
          toast.error("Erreur de paiement");
          setRequestingPayment(false);
        },
      });
    } catch (error) {
      setRequestingPayment(false);
    }
  };

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
        <Link href="/wallet" className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black uppercase italic">Recevoir<span className="text-blue-500">.π</span></h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Identifiant PimPay unique</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* QR CODE */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center">
            <div className="bg-white p-3 rounded-[1.5rem] mb-6 shadow-2xl">
              <QRCodeSVG value={piAddress} size={180} level="H" />
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase text-blue-400">Mainnet Secured Address</span>
            </div>
          </div>
        </div>

        {/* ADDRESS */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 break-all relative">
          <p className="text-xs font-mono text-slate-400 pr-12">{piAddress || "Adresse non disponible"}</p>
          <button onClick={handleCopy} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl active:scale-90 transition-all">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        {/* PAYMENT FORM */}
        <div className="p-6 bg-gradient-to-br from-blue-900/10 to-transparent border border-white/5 rounded-[2.5rem] space-y-4">
          <div className="flex items-center gap-3">
             <Coins className="text-blue-500" size={20} />
             <h3 className="text-xs font-black uppercase">Demander un montant</h3>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant π"
            className="w-full h-14 px-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 transition-all"
          />
          <button
            onClick={handleRequestPayment}
            disabled={requestingPayment || !amount}
            className="w-full h-14 bg-blue-600 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {requestingPayment ? <Loader2 className="animate-spin" /> : <><Coins size={18}/> Demander le paiement</>}
          </button>
        </div>

        {/* INFO */}
        <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-3">
          <Info size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-tight">
            N'envoyez que du <span className="text-amber-500 font-bold">Pi (π)</span>. Toute autre devise envoyée à cette adresse sera définitivement perdue.
          </p>
        </div>
      </div>
    </div>
  );
}
