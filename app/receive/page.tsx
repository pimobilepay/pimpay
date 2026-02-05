"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Check,
  ArrowLeft,
  ShieldCheck,
  Info,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
// Utilisation de ton composant de bouton centralisé
import { PiButton } from "@/components/PiButton";

export default function ReceivePage() {
  const [copied, setCopied] = useState(false);
  const [piAddress, setPiAddress] = useState("Chargement...");
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");

  useEffect(() => {
    // Petit délai pour laisser le SDK Pi s'initialiser via ton PiInitializer
    const timer = setTimeout(() => {
      loadUserAddress();
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const loadUserAddress = async () => {
    try {
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      const dbAddress = data.user?.walletAddress;

      // On tente de récupérer l'adresse fraîche via Authenticate
      if (typeof window !== "undefined" && window.Pi) {
        try {
          const scopes = ['payments', 'wallet_address', 'username'];
          const auth = await window.Pi.authenticate(scopes, (onIncomplete) => {
            console.log("Paiement incomplet détecté:", onIncomplete);
          });
          
          const realPiAddress = auth.user.walletAddress;

          if (realPiAddress) {
            setPiAddress(realPiAddress);
            // Mise à jour si différente (évite de perdre l'adresse réelle)
            if (dbAddress !== realPiAddress) {
              await fetch('/api/user/update-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: realPiAddress })
              });
            }
          } else {
            setPiAddress(dbAddress || data.user?.id || "Adresse non disponible");
          }
        } catch (authErr) {
          console.error("Erreur Auth Pi:", authErr);
          setPiAddress(dbAddress || data.user?.id || "Erreur de connexion Pi");
        }
      } else {
        setPiAddress(dbAddress || data.user?.id || "Ouvrez dans Pi Browser");
      }
    } catch (error) {
      toast.error("Impossible de charger le profil");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!piAddress || piAddress.includes(" ")) return;
    navigator.clipboard.writeText(piAddress);
    setCopied(true);
    toast.success("Adresse copiée !");
    setTimeout(() => setCopied(false), 2000);
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
          <h1 className="text-xl font-black uppercase italic">
            Recevoir<span className="text-blue-500">.π</span>
          </h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mainnet Secured</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        {/* QR Code Section */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-20 transition duration-1000"></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center">
            <div className="bg-white p-3 rounded-[1.5rem] mb-6 shadow-[0_0_25px_rgba(255,255,255,0.1)]">
              <QRCodeSVG value={piAddress} size={180} level="H" />
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase text-blue-400">Verified Address</span>
            </div>
          </div>
        </div>

        {/* Address Display */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 break-all relative shadow-inner">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Votre Identifiant de réception</p>
          <p className="text-xs font-mono text-slate-300 pr-12 leading-relaxed">
            {piAddress}
          </p>
          <button 
            onClick={handleCopy} 
            className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl active:scale-95 transition-all shadow-lg"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        {/* Payment Form */}
        <div className="p-6 bg-gradient-to-br from-blue-900/20 to-transparent border border-white/5 rounded-[2.5rem] space-y-4 shadow-2xl">
          <div className="space-y-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant en π"
              className="w-full h-14 px-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-600"
            />
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="Note (ex: Dépôt PimPay)"
              className="w-full h-14 px-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50 transition-all text-white placeholder:text-slate-600"
            />
          </div>

          {/* Utilisation de ton bouton centralisé configuré pour le MAINNET */}
          <div className="pt-2">
            <PiButton
              amount={Number(amount)}
              memo={memo || "Dépôt PimPay"}
              onSuccess={() => {
                setAmount("");
                setMemo("");
                toast.success("Dépôt enregistré avec succès !");
              }}
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-3">
          <Info size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-tight italic">
            Attention : Vérifiez toujours que vous êtes dans le Pi Browser officiel. Les transactions sur le réseau Mainnet sont irréversibles.
          </p>
        </div>
      </div>
    </div>
  );
}
