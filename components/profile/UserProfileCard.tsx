"use client";

import {
  ShieldCheck,
  BadgeCheck,
  Mail,
  Phone,
  MapPin,
  Wallet,
  Calendar,
  UserRound,
  Building2,
  Check,
  Copy,
} from "lucide-react";
import { useState } from "react";
import { resolveCountry, squareFlagUrl } from "@/lib/country";

interface UserProfileCardProps {
  name: string;
  username?: string;
  email?: string | null;
  phone?: string | null;
  country?: string;
  city?: string;
  wallet?: string;
  joinDate?: string;
  avatar?: string | null;
  isVerified?: boolean;
  kycStatus?: string;
}

/**
 * Carte de profil pour les utilisateurs STANDARDS (non-agents).
 * Reprend le langage visuel bleu de la plateforme mais sans les éléments
 * réservés aux agents (statistiques, paliers, réalisations, code référent).
 */
export function UserProfileCard({
  name,
  username,
  email,
  phone,
  country,
  city,
  wallet,
  joinDate = "—",
  avatar,
  isVerified = false,
  kycStatus,
}: UserProfileCardProps) {
  const [copiedWallet, setCopiedWallet] = useState(false);
  const resolved = resolveCountry(country);

  const copyWallet = () => {
    if (!wallet || wallet === "—") return;
    navigator.clipboard.writeText(wallet);
    setCopiedWallet(true);
    setTimeout(() => setCopiedWallet(false), 2000);
  };

  return (
    <div className="mx-auto w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-blue-500/20 bg-[#02040a] p-5 shadow-2xl shadow-blue-500/10 sm:p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
            <Wallet className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-black leading-none text-white">PIMOBIPAY</p>
            <p className="text-[10px] font-bold uppercase tracking-[2px] text-blue-500">
              Compte Personnel
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ShieldCheck className={`h-6 w-6 ${isVerified ? "text-blue-500" : "text-slate-600"}`} />
          <div className="text-right">
            <p className="text-xs font-black leading-none text-white">
              {isVerified ? "Compte Vérifié" : "Non Vérifié"}
            </p>
            <p className="text-[10px] text-slate-400">Utilisateur PiMobiPay</p>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="mt-5 flex items-center gap-4">
        <div className="relative shrink-0 p-1">
          <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-blue-500/50 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar || "/logo-pimpay.png"}
              alt={name}
              className="h-full w-full object-cover"
              crossOrigin="anonymous"
            />
          </div>
          {isVerified && (
            <span className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#02040a] bg-blue-500">
              <Check className="h-4 w-4 text-white" strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-2xl font-black text-white">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-blue-500">
              {username ? `@${username}` : "Membre"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-blue-400">
              <BadgeCheck className="h-3 w-3" />
              {isVerified ? "KYC Vérifié" : kycStatus || "En attente"}
            </span>
          </div>
        </div>
      </div>

      {/* Info grid */}
      <div className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:grid-cols-2">
        <InfoItem icon={Mail} label="Email" value={<span className="break-all">{email || "—"}</span>} />
        <InfoItem icon={Phone} label="Téléphone" value={phone || "—"} />
        <InfoItem
          icon={MapPin}
          label="Pays"
          value={resolved.label}
          flagIso={resolved.iso}
        />
        <InfoItem icon={Building2} label="Ville" value={city || "—"} />
        <InfoItem
          icon={Wallet}
          label="Wallet Address"
          value={<span className="font-mono">{wallet || "—"}</span>}
          onCopy={wallet && wallet !== "—" ? copyWallet : undefined}
          copied={copiedWallet}
        />
        <InfoItem icon={Calendar} label="Date d'inscription" value={joinDate} />
      </div>

      {/* Footer */}
      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-600">
            <Wallet className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">Powered by</p>
            <p className="text-xs font-black text-white">
              PIMOBIPAY <span className="font-normal text-slate-400">Technologies</span>
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-black text-white">www.pimobipay.com</p>
          <p className="text-[10px] text-slate-500">L&apos;avenir de vos transactions</p>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  icon: Icon,
  label,
  value,
  onCopy,
  copied,
  flagIso,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
  flagIso?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      {flagIso && squareFlagUrl(flagIso) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={squareFlagUrl(flagIso) as string}
          alt=""
          aria-hidden="true"
          crossOrigin="anonymous"
          className="mt-0.5 aspect-square h-8 w-8 shrink-0 rounded-lg border border-white/10 object-cover"
        />
      ) : (
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
          <Icon className="h-4 w-4 text-blue-400" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <span className="min-w-0 truncate">{value}</span>
          {onCopy && (
            <button
              onClick={onCopy}
              aria-label={`Copier ${label}`}
              className="shrink-0 text-slate-500 hover:text-blue-400"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-blue-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
