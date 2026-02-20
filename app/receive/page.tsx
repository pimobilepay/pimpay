"use client";

import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, ArrowLeft, Loader2, Info } from "lucide-react";
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

  // --- FONCTION DE RÉCUPÉRATION (Mémorisée pour éviter les boucles) ---
  const handleIncompletePayment = useCallback(async (payment) => {
    console.log("⚠️ Paiement incomplet détecté:", payment.identifier);
    try {
      const res = await fetch("/api/pi/incomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: payment.identifier,
          txid: payment.transaction.txid
        }),
      });
      if (res.ok) {
        toast.success("Ancien paiement synchronisé et débloqué !");
      }
    } catch (err) {
      console.error("Échec de récupération:", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    const loadData = async () => {
      try {
        // 1. Charger le profil
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        setPiAddress(data.user?.walletAddress || data.user?.id || "Non disponible");

        // 2. VÉRIFICATION AUTOMATIQUE AU CHARGEMENT (Anti-blocage)
        if (window.Pi) {
          await window.Pi.authenticate(['payments'], handleIncompletePayment);
        }
      } catch (e) {
        setPiAddress("Erreur de chargement");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [handleIncompletePayment]);

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

    if (!window.Pi) {
      toast.error("Ouvrez PimPay dans le Pi Browser");
      return;
    }

    setIsProcessing(true);
    const loadingToast = toast.loading("Vérification des sessions...");

    try {
      // ÉTAPE 1: Forcer la résolution de tout paiement incomplet avant de créer
      await window.Pi.authenticate(['payments'], handleIncompletePayment);

      // ÉTAPE 2: Création du paiement
      await window.Pi.createPayment({
        amount: floatAmount,
        memo: memo || "Dépôt PimPay",
        metadata: { type: "deposit", app: "pimpay" },
      }, {
        onReadyForServerApproval: async (paymentId) => {
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId, amount: floatAmount }),
          });
          if (!res.ok) throw new Error("Approbation refusée");
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
            // Redirection pour forcer le rafraîchissement du solde et du graphique
            setTimeout(() => window.location.href = "/wallet", 1500);
          } else {
            toast.error("Erreur de synchronisation du solde.");
          }
          setIsProcessing(false);
        },
        onCancel: (paymentId) => {
          toast.dismiss(loadingToast);
          setIsProcessing(false);
          toast.info("Paiement annulé");
        },
        onError: (error, paymentId) => {
          toast.dismiss(loadingToast);
          console.error("SDK Error:", error);
          // Si l'erreur est "Already has a pending payment", on tente de nettoyer
          if (error.message?.includes("already has a pending payment")) {
             window.Pi.authenticate(['payments'], handleIncompletePayment);
          }
          toast.error(`Erreur: ${error.message}`);
          setIsProcessing(false);
        },
      });
    } catch (err) {
      toast.dismiss(loadingToast);
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;
  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6 pb-24 font-sans">
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
              <p className="text-[10px] font-mono text-slate-300 break-all flex-1 py-2">{piAddress}</p>
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
