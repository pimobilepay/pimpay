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
  const [amount, setAmount] = useState("");

  // Empêche l'erreur de rendu côté serveur (Hydration Error)
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
      <div className="flex items-center gap-4 mb-8">
        <Link href="/wallet" className="p-3 bg-white/5 rounded-2xl border border-white/10">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-black italic">RECEVOIR.π</h1>
      </div>

      <div className="max-w-md mx-auto space-y-6">
        <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center">
          <div className="bg-white p-3 rounded-[1.5rem] mb-6">
            {piAddress && <QRCodeSVG value={piAddress} size={180} />}
          </div>
          <p className="text-[10px] font-mono text-slate-400 break-all text-center px-4">
            {piAddress}
          </p>
        </div>

        <div className="p-6 bg-blue-900/10 border border-white/5 rounded-[2.5rem] space-y-4">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Montant en π"
            className="w-full h-14 px-5 bg-black/40 border border-white/10 rounded-2xl outline-none"
          />
          
          {/* BOUTON DE TEST DIRECT SANS COMPOSANT EXTERNE POUR ÉVITER LE CRASH */}
          <button 
            onClick={() => toast.info("Le SDK Pi va s'ouvrir...")}
            className="w-full h-14 bg-blue-600 rounded-2xl font-bold active:scale-95 transition-all"
          >
            Confirmer le dépôt
          </button>
        </div>
      </div>
    </div>
  );
}
