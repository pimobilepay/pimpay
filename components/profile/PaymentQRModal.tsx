"use client";

import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { buildUserQRValue } from "@/lib/agent-qr";
import { useLanguage } from "@/context/LanguageContext";

interface PaymentQRModalProps {
  user: { id: string; name?: string; username?: string };
  onClose: () => void;
}

export function PaymentQRModal({ user, onClose }: PaymentQRModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const qrValue = buildUserQRValue(user);
  const displayId = user.username ? `@${user.username}` : user.id;

  const copyId = () => {
    navigator.clipboard.writeText(user.username || user.id);
    setCopied(true);
    toast.success(t("profile.paymentQrId"));
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md bg-[#0b1120] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 pb-10 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-black text-white">{t("profile.paymentQrTitle")}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-colors"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        {/* QR */}
        <div className="flex flex-col items-center gap-5">
          <div className="p-4 bg-white rounded-3xl shadow-2xl shadow-blue-500/20">
            <QRCodeSVG value={qrValue} size={210} level="H" includeMargin />
          </div>

          {/* Nom + identifiant */}
          <div className="text-center w-full">
            {user.name && <p className="text-lg font-bold text-white text-balance">{user.name}</p>}
            <button
              onClick={copyId}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-mono font-bold text-blue-400 hover:bg-white/10 transition-all active:scale-95"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {displayId}
            </button>
          </div>

          {/* Description */}
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed text-center text-pretty">
            {t("profile.paymentQrDesc")}
          </p>

          {/* Securite */}
          <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-full">
            <ShieldCheck size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider">PIMOBIPAY Ledger</span>
          </div>
        </div>
      </div>
    </div>
  );
}
