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
    // Petit délai pour s'assurer que le script du layout est chargé
    const timer = setTimeout(() => {
        loadUserAddress();
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const loadUserAddress = async () => {
    try {
      // 1. On récupère d'abord les infos de notre DB
      const res = await fetch('/api/user/profile');
      const data = await res.json();
      const dbAddress = data.user?.walletAddress;

      // 2. Si on est dans le Pi Browser, on authentifie pour avoir la VRAIE adresse
      if (typeof window !== "undefined" && window.Pi) {
        try {
          const scopes = ['payments', 'wallet_address', 'username'];
          const auth = await window.Pi.authenticate(scopes, (onIncompletePaymentFound) => {
            console.log("Paiement incomplet trouvé:", onIncompletePaymentFound);
          });

          const realPiAddress = auth.user.walletAddress;

          if (realPiAddress) {
            setPiAddress(realPiAddress);
            
            // Si l'adresse en DB n'est pas la bonne (ou vide), on met à jour
            if (dbAddress !== realPiAddress) {
              await fetch('/api/user/update-address', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress: realPiAddress })
              });
            }
          } else {
            setPiAddress(dbAddress || data.user?.id || "");
          }
        } catch (authErr) {
          console.error("Erreur Auth Pi:", authErr);
          setPiAddress(dbAddress || data.user?.id || "");
        }
      } else {
        setPiAddress(dbAddress || data.user?.id || "");
      }
    } catch (error) {
      console.error("Erreur chargement:", error);
      toast.error("Erreur de connexion");
    } finally {
      setLoading(false);
    }
  };

  const syncBalanceAfterPayment = async (newAmount: number) => {
    try {
      await fetch('/api/wallet/pi/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: newAmount })
      });
    } catch (e) {
      console.error("Erreur synchro:", e);
    }
  };

  const handleRequestPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Entrez un montant valide");
      return;
    }

    if (!window.Pi) {
      toast.error("Utilisez le Pi Browser");
      return;
    }

    setRequestingPayment(true);

    try {
      // Le montant doit être un nombre
      const paymentAmount = parseFloat(amount);

      await window.Pi.createPayment({
        amount: paymentAmount,
        memo: memo || "Paiement PimPay",
        metadata: { type: "receive_request", app: "pimpay" },
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          const res = await fetch("/api/payments/approve", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                paymentId, 
                amount: paymentAmount,
                memo: memo || "Réception Pi"
            }),
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
            toast.success("Paiement reçu !");
            await syncBalanceAfterPayment(paymentAmount);
            setAmount("");
            setMemo("");
          }
          setRequestingPayment(false);
          return res.json();
        },
        onCancel: () => setRequestingPayment(false),
        onError: (error: any) => {
          console.error("Erreur Payment SDK:", error);
          toast.error("Le paiement a échoué");
          setRequestingPayment(false);
        },
      });
    } catch (error) {
      console.error("Erreur globale:", error);
      setRequestingPayment(false);
    }
  };

  const handleCopy = () => {
    if (!piAddress) return;
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
      <div className="flex items-center gap-4 mb-8">
        <Link href="/wallet" className="p-3 bg-white/5 rounded-2xl border border-white/10 active:scale-90 transition-all">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-xl font-black uppercase italic">Recevoir<span className="text-blue-500">.π</span></h1>
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Mainnet Secured</p>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-[2.5rem] blur opacity-20 transition duration-1000"></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center">
            <div className="bg-white p-3 rounded-[1.5rem] mb-6">
              <QRCodeSVG value={piAddress} size={180} level="H" />
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/20">
              <ShieldCheck size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase text-blue-400">Verified Address</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-5 break-all relative">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Votre Adresse Réelle</p>
          <p className="text-xs font-mono text-slate-300 pr-12">{piAddress}</p>
          <button onClick={handleCopy} className="absolute right-3 top-1/2 -translate-y-1/2 p-3 bg-blue-600 rounded-xl active:scale-90 transition-all">
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-900/20 to-transparent border border-white/5 rounded-[2.5rem] space-y-4 shadow-xl">
          <div className="flex items-center gap-3">
             <div className="p-2 bg-blue-500/20 rounded-lg"><Coins className="text-blue-400" size={20} /></div>
             <h3 className="text-xs font-black uppercase tracking-wider">Demander un paiement</h3>
          </div>
          
          <div className="space-y-3">
            <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Montant en π"
                className="w-full h-14 px-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50"
            />
            <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="Note (ex: Café)"
                className="w-full h-14 px-5 bg-black/40 border border-white/10 rounded-2xl outline-none focus:border-blue-500/50"
            />
          </div>

          <button
            onClick={handleRequestPayment}
            disabled={requestingPayment || !amount}
            className="w-full h-14 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-blue-900/20"
          >
            {requestingPayment ? <Loader2 className="animate-spin" /> : <><Coins size={18}/> Lancer la demande</>}
          </button>
        </div>

        <div className="p-5 bg-amber-500/5 border border-amber-500/10 rounded-3xl flex gap-3">
          <Info size={16} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-slate-400 leading-tight italic">
            N'utilisez cette fonction que si vous êtes dans le Pi Browser sur le réseau Mainnet.
          </p>
        </div>
      </div>
    </div>
  );
}
