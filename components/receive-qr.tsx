"use client";

import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Copy, Check, Zap, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export function ReceiveQR({ userIdentifier }: { userIdentifier: string }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(userIdentifier);
    setCopied(true);
    toast.success("Identifiant copie !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Mon ID PimPay',
        text: `Envoyez-moi des Pi via PimPay: ${userIdentifier}`,
      });
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-8 bg-slate-900/60 border border-white/10 rounded-[2.5rem] backdrop-blur-xl">
      {/* QR Code */}
      <div className="relative p-4 bg-white rounded-3xl shadow-2xl shadow-blue-500/20">
        <QRCodeSVG 
          value={userIdentifier} 
          size={200}
          level="H"
          includeMargin={true}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <p className="text-black font-black text-4xl rotate-12">PIMPAY</p>
        </div>
      </div>

      {/* ID Section */}
      <div className="text-center space-y-3 w-full">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Votre ID Marchand</p>
        <div className="bg-white/5 rounded-2xl border border-white/10 p-4">
          <p className="text-lg font-mono font-black text-blue-400 break-all">{userIdentifier}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 w-full">
        <button 
          onClick={copyToClipboard}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 rounded-2xl text-white font-black text-[10px] uppercase tracking-wider hover:bg-blue-500 active:scale-95 transition-all"
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? "Copie !" : "Copier ID"}
        </button>
        <button 
          onClick={handleShare}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-black text-[10px] uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all"
        >
          <Share2 size={16} />
          Partager
        </button>
      </div>

      {/* Info Card */}
      <div className="w-full bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-blue-500" />
          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Comment recevoir</span>
        </div>
        <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
          Partagez ce QR code ou votre ID marchand pour recevoir des paiements Pi instantanement.
        </p>
      </div>

      {/* Security Badge */}
      <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-black uppercase tracking-wider">Securise par PimPay Ledger</span>
      </div>
    </div>
  );
}
