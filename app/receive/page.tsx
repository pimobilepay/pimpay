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

    // Vérification du SDK Pi
    if (typeof window === "undefined" || !window.Pi) {
      toast.error("Veuillez ouvrir PimPay dans le Pi Browser");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Initialisation du paiement Pi...");

    try {
      // 1. Authentification pour s'assurer que la session est active
      const scopes = ['payments', 'wallet_address'];
      await window.Pi.authenticate(scopes, (onIncompletePayment) => {
        console.log("Paiement incomplet trouvé:", onIncompletePayment);
      });

      // 2. Création du paiement via le SDK
      await window.Pi.createPayment({
        amount: floatAmount,
        memo: memo || "Dépôt PimPay",
        metadata: { 
          type: "deposit", 
          platform: "pimpay",
          userId: piAddress // Pour aider ton backend à identifier le compte
        },
      }, {
        onReadyForServerApproval: async (paymentId) => {
          // Étape cruciale : Ton serveur doit valider ce paymentId auprès de Pi Network
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId }),
          });
          
          if (!res.ok) throw new Error("Approbation serveur échouée");
          return res.json();
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          // Étape finale : Enregistrement de la transaction en base de données
          const res = await fetch("/api/payments/complete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, txid, amount: floatAmount }),
          });

          toast.dismiss(loadingToast);
          if (res.ok) {
            toast.success(`Dépôt de ${floatAmount} π validé !`, { duration: 5000 });
            setAmount("");
            setMemo("");
          } else {
            toast.error("Erreur de synchronisation du solde");
          }
          setIsProcessing(false);
        },
        onCancel: (paymentId) => {
          toast.dismiss(loadingToast);
          console.log("Paiement annulé:", paymentId);
          setIsProcessing(false);
        },
        onError: (error: any, paymentId?: string) => {
          toast.dismiss(loadingToast);
          console.error("SDK Error:", error, paymentId);
          toast.error(`Erreur Pi: ${error.message || "Paiement refusé"}`);
          setIsProcessing(false);
        },
      });
    } catch (err: any) {
      toast.dismiss(loadingToast);
      console.error("Catch Error:", err);
      toast.error("Vérifiez votre connexion au Pi Browser");
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
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-24 font-sans">
      {/* Header */}
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
        {/* QR Section */}
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

        {/* Form */}
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
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Note (ex: Recharge PimPay)"
              className="w-full h-14 px-6 bg-black/40 border border-white/10 rounded-2xl outline-none text-sm"
            />
          </div>

          <button
            onClick={handlePiPayment}
            disabled={isProcessing}
            className={`w-full h-16 rounded-2xl font-black uppercase tracking-wider transition-all shadow-lg ${
              isProcessing
                ? "bg-slate-800 text-slate-500"
                : "bg-blue-600 shadow-blue-500/20 active:scale-95"
            }`}
          >
            {isProcessing ? "Lancement du SDK..." : "Confirmer le dépôt"}
          </button>
        </div>

        <div className="p-5 bg-blue-500/5 border border-blue-500/10 rounded-3xl flex gap-3">
          <Info size={16} className="text-blue-500 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-tight">
            Le paiement s'ouvrira dans une fenêtre sécurisée de Pi Network. Ne fermez pas l'application pendant le processus.
          </p>
        </div>
      </div>
    </div>
  );
}
