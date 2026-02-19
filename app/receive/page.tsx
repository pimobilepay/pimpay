"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ArrowLeft, Loader2, Info, ShieldCheck } from "lucide-react";
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
        setPiAddress(data.user?.walletAddress || data.user?.id || "Non disponible");
      } catch (e) {
        setPiAddress("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    loadAddress();
  }, []);

  // --- FONCTION DE RÉCUPÉRATION DES PAIEMENTS BLOQUÉS ---
  const handleIncompletePayment = async (payment) => {
    console.log("⚠️ Paiement incomplet détecté:", payment);
    try {
      await fetch("/api/pi/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          paymentId: payment.identifier, 
          txid: payment.transaction.txid 
        }),
      });
      toast.success("Ancien paiement synchronisé !");
    } catch (err) {
      console.error("Échec de récupération:", err);
    }
  };

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
      toast.error("Ouvrez PimPay dans le Pi Browser");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Connexion au Pi Network...");

    try {
      // 1. Authentification avec gestion des paiements incomplets (CRUCIAL)
      const scopes = ['payments'];
      await window.Pi.authenticate(scopes, handleIncompletePayment);

      // 2. Création du paiement
      await window.Pi.createPayment({
        amount: floatAmount,
        memo: memo || "Dépôt PimPay",
        metadata: { type: "deposit" },
      }, {
        onReadyForServerApproval: async (paymentId) => {
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, amount: floatAmount, memo }),
          });
          if (!res.ok) throw new Error("Approbation refusée par le serveur");
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid }),
          });

          toast.dismiss(loadingToast);
          if (res.ok) {
            toast.success(`Succès ! +${floatAmount} PI ajouté.`);
            setAmount("");
            // Rediriger vers le wallet pour voir le graphique bouger
            setTimeout(() => window.location.href = "/wallet", 2000);
          } else {
            toast.error("Erreur de mise à jour du solde.");
          }
          setIsProcessing(false);
        },
        onCancel: (paymentId) => {
          toast.dismiss(loadingToast);
          setIsProcessing(false);
        },
        onError: (error, paymentId) => {
          toast.dismiss(loadingToast);
          toast.error("Erreur: " + error.message);
          setIsProcessing(false);
        },
      });
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error("Action annulée ou erreur SDK");
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  // ... (Le reste de ton JSX reste identique, il est déjà très beau)
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-24 font-sans">
       {/* Garde ton Header, QR Section et Formulaire tels quels */}
       {/* Assure-toi juste que le bouton utilise handlePiPayment */}
       {/* ... */}
       <div className="flex items-center gap-4 mb-8">
        <Link href="/wallet" className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-95">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black italic uppercase">Recevoir<span className="text-blue-500">.π</span></h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mainnet Secure Process</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center relative shadow-2xl">
          <div className="bg-white p-3 rounded-[1.5rem] mb-6 shadow-xl shadow-white/5">
            {piAddress && <QRCodeSVG value={piAddress} size={180} level="H" />}
          </div>

          <div className="w-full space-y-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase text-center">Adresse de réception</p>
            <div className="flex items-center gap-2 bg-black/40 p-1 pl-4 rounded-2xl border border-white/5">
               <p className="text-[10px] font-mono text-slate-300 break-all flex-1 py-2">
                {piAddress}
              </p>
              <button onClick={handleCopy} className="p-3 bg-blue-600 rounded-xl active:scale-90 transition-all">
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900/50 border border-white/5 rounded-[2.5rem] space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase ml-2">Montant à déposer</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00 π"
                className="w-full h-16 px-6 bg-black/60 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 text-2xl font-black transition-all"
              />
            </div>
          </div>

          <button
            onClick={handlePiPayment}
            disabled={isProcessing}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg ${
              isProcessing ? "bg-slate-800 text-slate-500" : "bg-blue-600 shadow-blue-500/20 active:scale-95"
            }`}
          >
            {isProcessing ? "Traitement..." : "Confirmer le dépôt"}
          </button>
        </div>
      </div>
    </div>
  );
}
