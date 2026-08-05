"use client";

import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, ShieldCheck, Mail, Phone, User as UserIcon, BadgeCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { buildUserQRValue, displayFullName } from "@/lib/agent-qr";
import { useLanguage } from "@/context/LanguageContext";

interface PaymentQRUser {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  phone?: string;
  email?: string;
  role?: string;
  agentId?: string;
}

interface PaymentQRModalProps {
  user: PaymentQRUser;
  onClose: () => void;
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-none">
      <span className="text-blue-400 shrink-0">{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 w-20 shrink-0">
        {label}
      </span>
      <span className="text-xs font-semibold text-white truncate">{value}</span>
    </div>
  );
}

export function PaymentQRModal({ user, onClose }: PaymentQRModalProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const qrValue = buildUserQRValue(user);
  const displayId = user.username ? `@${user.username}` : user.id;
  const fullName = displayFullName(user, displayId);
  const isAgent = user.role === "AGENT" || user.role === "ADMIN" || Boolean(user.agentId);

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
            <QRCodeSVG value={qrValue} size={210} level="M" includeMargin />
          </div>

          {/* Nom + identifiant */}
          <div className="text-center w-full">
            <p className="text-lg font-bold text-white text-balance">{fullName}</p>
            <button
              onClick={copyId}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full text-sm font-mono font-bold text-blue-400 hover:bg-white/10 transition-all active:scale-95"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {displayId}
            </button>
          </div>

          {/* Informations transmises a l'agent lors du scan */}
          <div className="w-full rounded-[28px] bg-white/5 border border-white/10 px-4 py-2">
            <Row
              icon={<UserIcon size={14} />}
              label="Prenom"
              value={user.firstName || undefined}
            />
            <Row icon={<UserIcon size={14} />} label="Nom" value={user.lastName || undefined} />
            <Row icon={<Phone size={14} />} label="Tel." value={user.phone || undefined} />
            <Row icon={<Mail size={14} />} label="E-mail" value={user.email || undefined} />
            {isAgent && (
              <Row
                icon={<BadgeCheck size={14} />}
                label="Agent"
                value={user.agentId || user.role || undefined}
              />
            )}
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
