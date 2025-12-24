"use client";

import { QRCodeSVG } from "qrcode.react";
import { ShieldCheck, Copy } from "lucide-react";
import { toast } from "sonner";

export function ReceiveQR({ userIdentifier }: { userIdentifier: string }) {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(userIdentifier);
    toast.success("Identifiant copié !");
  };

  return (
    <div className="flex flex-col items-center space-y-6 p-8 bg-slate-900/60 border border-white/10 rounded-[2.5rem] backdrop-blur-xl">
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

      <div className="text-center space-y-2">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[4px]">Votre ID de Réception</p>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 text-blue-400 font-bold text-sm"
        >
          {userIdentifier} <Copy size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full">
        <ShieldCheck size={14} />
        <span className="text-[10px] font-black uppercase tracking-wider">Sécurisé par PimPay Ledger</span>
      </div>
    </div>
  );
}
