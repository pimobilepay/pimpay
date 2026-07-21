"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import {
  Wallet,
  ShieldCheck,
  BadgeCheck,
  Star,
  Users,
  ArrowLeftRight,
  Store,
  Globe,
  TrendingUp,
  Phone,
  Mail,
  Calendar,
  MapPin,
  UserRound,
  Lock,
  ScanLine,
  Fingerprint,
  Medal,
  Copy,
  Check,
  Download,
  FileText,
  Share2,
  Printer,
  Link2,
  QrCode,
  Award,
  Crown,
  Flame,
  Gem,
  Loader2,
  Headphones,
} from "lucide-react";

interface AgentProfileCardProps {
  name: string;
  agentId?: string;
  code: string;
  role?: string | null;
  avatar?: string | null;
  qrValue: string;
  referralLink?: string;
  country?: string;
  phone?: string | null;
  email?: string | null;
  joinDate?: string;
  wallet?: string;
  level?: string;
  levelSubtitle?: string;
  nextLevel?: string;
  progress?: number;
  rank?: string;
  stats?: {
    references: string;
    transactions: string;
    volume: string;
    merchants: string;
    countries: string;
    successRate: string;
  };
  achievements?: { key: string; earned: boolean }[];
}

const ACHIEVEMENT_META: Record<
  string,
  { icon: React.ComponentType<{ className?: string }>; label: string; ring: string; bg: string; color: string }
> = {
  first_referral: { icon: Star, label: "Premier\nRéférent", ring: "border-emerald-500/60", bg: "bg-emerald-500/10", color: "text-emerald-400" },
  referrals_100: { icon: Users, label: "100\nRéférences", ring: "border-sky-500/60", bg: "bg-sky-500/10", color: "text-sky-400" },
  transactions_500: { icon: Award, label: "500\nTransactions", ring: "border-fuchsia-500/60", bg: "bg-fuchsia-500/10", color: "text-fuchsia-400" },
  merchants_100: { icon: Store, label: "100\nCommerçants", ring: "border-amber-500/60", bg: "bg-amber-500/10", color: "text-amber-400" },
  top_seller: { icon: Flame, label: "Top\nSeller", ring: "border-orange-500/60", bg: "bg-orange-500/10", color: "text-orange-400" },
  regional_ambassador: { icon: Crown, label: "Ambassadeur\nRégional", ring: "border-rose-500/60", bg: "bg-rose-500/10", color: "text-rose-400" },
  elite_partner: { icon: Gem, label: "Elite\nPartner", ring: "border-teal-500/60", bg: "bg-teal-500/10", color: "text-teal-400" },
};

const DEFAULT_ACHIEVEMENTS = [
  { key: "first_referral", earned: false },
  { key: "referrals_100", earned: false },
  { key: "transactions_500", earned: false },
  { key: "merchants_100", earned: false },
  { key: "top_seller", earned: false },
  { key: "regional_ambassador", earned: false },
  { key: "elite_partner", earned: false },
];

const defaultStats = {
  references: "1,584",
  transactions: "4,285",
  volume: "$128,450",
  merchants: "156",
  countries: "3",
  successRate: "98%",
};

export function AgentProfileCard({
  name,
  agentId = "PMB-AGT-000001",
  code,
  role,
  avatar,
  qrValue,
  referralLink,
  country = "République du Congo",
  phone = "+242 06 554 0305",
  email = "pimobilepay@gmail.com",
  joinDate = "15 Mai 2024",
  wallet = "GCVF...2k7f8a",
  level = "PLATINUM AGENT",
  levelSubtitle = "Niveau le plus élevé",
  nextLevel = "ELITE AGENT",
  progress = 78,
  rank = "#12 Top Performer",
  stats = defaultStats,
  achievements = DEFAULT_ACHIEVEMENTS,
}: AgentProfileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedWallet, setCopiedWallet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const roleLabel = role === "SUPERVISOR" ? "Superviseur Partenaire" : "Agent Partenaire";
  const remaining = Math.max(0, 100 - progress);

  const capture = async () => {
    if (!cardRef.current) return null;
    return toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#02040a",
    });
  };

  const handleDownloadPng = async () => {
    try {
      setDownloading("png");
      const dataUrl = await capture();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `profil-agent-${agentId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("[AgentProfileCard] PNG export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading("pdf");
      const dataUrl = await capture();
      if (!dataUrl) return;
      const { jsPDF } = await import("jspdf");
      const img = new Image();
      img.src = dataUrl;
      await new Promise((res) => (img.onload = res));
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20;
      const imgHeight = (img.height / img.width) * imgWidth;
      pdf.setFillColor(2, 4, 10);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.addImage(dataUrl, "PNG", 10, 10, imgWidth, Math.min(imgHeight, pageHeight - 20));
      pdf.save(`profil-agent-${agentId}.pdf`);
    } catch (e) {
      console.error("[AgentProfileCard] PDF export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const copy = (value: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(value);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleShare = async () => {
    const text = `Profil Agent Officiel PIMOBIPAY — ${name} (${code})`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Agent PIMOBIPAY", text, url: referralLink });
      } catch {
        /* annulé */
      }
    } else {
      copy(referralLink || code, setCopiedLink);
    }
  };

  const handlePrint = () => window.print();

  const statItems = [
    { icon: Users, value: stats.references, label: "Références", color: "text-sky-400" },
    { icon: ArrowLeftRight, value: stats.transactions, label: "Transactions", color: "text-cyan-400" },
    { icon: Wallet, value: stats.volume, label: "Volume Total", color: "text-emerald-400" },
    { icon: Store, value: stats.merchants, label: "Commerçants", color: "text-emerald-400" },
    { icon: Globe, value: stats.countries, label: "Pays Servis", color: "text-sky-400" },
    { icon: TrendingUp, value: stats.successRate, label: "Taux de Réussite", color: "text-emerald-400" },
  ];

  const security = [
    { icon: UserRound, label: "Identité\nVérifiée" },
    { icon: ScanLine, label: "KYC\nComplété" },
    { icon: Lock, label: "2FA\nActivé" },
    { icon: ShieldCheck, label: "AML\nVérifié" },
    { icon: Fingerprint, label: "Partenaire\nSécurisé" },
  ];

  const achievementItems = (achievements.length ? achievements : DEFAULT_ACHIEVEMENTS)
    .map((a) => ({ ...ACHIEVEMENT_META[a.key], earned: a.earned }))
    .filter((a) => a.icon);
  const earnedCount = achievementItems.filter((a) => a.earned).length;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Captured poster */}
      <div
        ref={cardRef}
        className="w-full max-w-[520px] overflow-hidden rounded-[2rem] border border-emerald-500/20 bg-[#02040a] p-5 shadow-2xl shadow-emerald-500/10 sm:p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-black leading-none text-white">PIMOBIPAY</p>
              <p className="text-[10px] font-bold uppercase tracking-[2px] text-emerald-500">Agent Officiel</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-500" />
            <div className="text-right">
              <p className="text-xs font-black leading-none text-white">Agent Vérifié</p>
              <p className="text-[10px] text-slate-400">Partenaire Officiel</p>
            </div>
          </div>
        </div>

        {/* Identity + level */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-emerald-500/50 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar || "/logo-pimpay.png"}
                  alt={name}
                  className="h-full w-full object-cover"
                  crossOrigin="anonymous"
                />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#02040a] bg-emerald-500">
                <Check className="h-4 w-4 text-white" strokeWidth={3} />
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{name}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-bold text-emerald-500">{roleLabel}</span>
                <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-sky-400">
                  Actif
                </span>
              </div>
              <p className="mt-2 font-mono text-lg font-black text-white">{agentId}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">ID Agent</p>
            </div>
          </div>

          {/* Level card */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-center">
            <p className="text-[10px] font-black uppercase tracking-[2px] text-slate-400">Niveau Actuel</p>
            <div className="my-2 flex items-center justify-center gap-1">
              <Medal className="h-5 w-5 -scale-x-100 text-emerald-500/60" />
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10">
                <Star className="h-7 w-7 fill-emerald-400 text-emerald-400" />
              </div>
              <Medal className="h-5 w-5 text-emerald-500/60" />
            </div>
            <p className="text-base font-black text-emerald-400">{level}</p>
            <p className="text-[11px] text-slate-400">{levelSubtitle}</p>
          </div>
        </div>

        {/* Progression */}
        <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-[2px] text-slate-400">Votre Progression</p>
            <p className="text-xl font-black text-emerald-400">{progress}%</p>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <p className="text-slate-400">
              Prochain niveau : <span className="font-black text-sky-400">{nextLevel}</span>
            </p>
            <p className="text-slate-500">Encore {remaining}% pour le niveau suivant</p>
          </div>
        </div>

        {/* QR + info grid */}
        <div className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4 sm:grid-cols-[auto_1fr]">
          {/* QR */}
          <div className="flex flex-col items-center gap-2 sm:border-r sm:border-white/5 sm:pr-4">
            <p className="text-[10px] font-black uppercase tracking-[2px] text-emerald-500">Scannez pour vérifier</p>
            <div className="rounded-xl bg-white p-2">
              <QRCodeSVG value={qrValue} size={116} level="H" includeMargin={false} />
            </div>
            <p className="max-w-[130px] text-center text-[10px] text-slate-500">
              Scannez pour vérifier cet agent officiel PiMobiPay
            </p>
          </div>

          {/* Info items */}
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <InfoItem icon={MapPin} label="Pays" value={country} />
            <InfoItem
              icon={UserRound}
              label="Code Agent / Référent"
              value={<span className="break-all font-mono text-emerald-400">{code}</span>}
              onCopy={() => copy(code, setCopiedCode)}
              copied={copiedCode}
            />
            <InfoItem icon={Phone} label="Téléphone" value={phone || "—"} />
            <InfoItem
              icon={ShieldCheck}
              label="Statut"
              value={<span className="font-bold text-emerald-400">Vérifié &amp; Actif</span>}
            />
            <InfoItem icon={Mail} label="Email" value={<span className="break-all">{email || "—"}</span>} />
            <InfoItem
              icon={Wallet}
              label="Wallet Address"
              value={<span className="font-mono">{wallet}</span>}
              onCopy={() => copy(wallet, setCopiedWallet)}
              copied={copiedWallet}
            />
            <InfoItem icon={Calendar} label="Date d'inscription" value={joinDate} />
            <InfoItem
              icon={Medal}
              label="Rang Actuel"
              value={<span className="font-bold text-amber-400">{rank}</span>}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4">
          <p className="text-center text-[11px] font-black uppercase tracking-[2px] text-emerald-500">Vos Statistiques</p>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {statItems.map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-center"
              >
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <p className="mt-1.5 text-sm font-black text-white">{s.value}</p>
                <p className="text-[9px] leading-tight text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <div className="mt-4 rounded-2xl border border-white/5 bg-white/[0.03] p-4">
          <p className="text-center text-[11px] font-black uppercase tracking-[2px] text-emerald-500">
            Sécurité &amp; Conformité
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
            {security.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1.5 text-center">
                <div className="relative">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                    <s.icon className="h-5 w-5 text-emerald-400" />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                  </span>
                </div>
                <p className="whitespace-pre-line text-[10px] font-bold leading-tight text-slate-300">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="mt-4">
          <p className="text-center text-[11px] font-black uppercase tracking-[2px] text-emerald-500">
            Vos Réalisations
            <span className="ml-2 text-slate-500">
              {earnedCount}/{achievementItems.length}
            </span>
          </p>
          <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-7">
            {achievementItems.map((a) => (
              <div key={a.label} className="flex flex-col items-center gap-1.5 text-center">
                <div
                  className={`relative flex h-12 w-12 items-center justify-center rounded-2xl border-2 ${
                    a.earned ? `${a.ring} ${a.bg}` : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <a.icon className={`h-6 w-6 ${a.earned ? a.color : "text-slate-600"}`} />
                  {a.earned ? (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500">
                      <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />
                    </span>
                  ) : (
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-white/10 bg-slate-800">
                      <Lock className="h-2 w-2 text-slate-500" />
                    </span>
                  )}
                </div>
                <p
                  className={`whitespace-pre-line text-[10px] font-bold leading-tight ${
                    a.earned ? "text-slate-300" : "text-slate-600"
                  }`}
                >
                  {a.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-4 text-center sm:flex-row sm:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-widest text-slate-500">Powered by</p>
              <p className="text-xs font-black text-white">
                PIMOBIPAY <span className="font-normal text-slate-400">Technologies</span>
              </p>
            </div>
          </div>
          <div>
            <p className="text-xs font-black text-white">www.pimobipay.com</p>
            <p className="text-[10px] text-slate-500">L&apos;avenir de vos transactions</p>
          </div>
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-emerald-500" />
            <div>
              <p className="text-[10px] font-bold text-white">Support</p>
              <p className="text-[10px] text-slate-500">support@pimobipay.com</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid w-full max-w-[520px] grid-cols-2 gap-3 sm:grid-cols-6">
        <ActionButton onClick={handleDownloadPng} disabled={downloading !== null} icon={downloading === "png" ? Loader2 : Download} spinning={downloading === "png"} label="PNG" />
        <ActionButton onClick={handleDownloadPdf} disabled={downloading !== null} icon={downloading === "pdf" ? Loader2 : FileText} spinning={downloading === "pdf"} label="PDF" />
        <ActionButton onClick={handleShare} icon={Share2} label="Partager" />
        <ActionButton onClick={handlePrint} icon={Printer} label="Imprimer" />
        <ActionButton onClick={() => copy(referralLink || code, setCopiedLink)} icon={copiedLink ? Check : Link2} label={copiedLink ? "Copié" : "Lien"} />
        <ActionButton onClick={() => copy(qrValue, setCopiedLink)} icon={QrCode} label="QR" />
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
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  onCopy?: () => void;
  copied?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
        <Icon className="h-4 w-4 text-emerald-400" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
          <span className="min-w-0 truncate">{value}</span>
          {onCopy && (
            <button onClick={onCopy} aria-label={`Copier ${label}`} className="shrink-0 text-slate-500 hover:text-emerald-400">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  icon: Icon,
  label,
  spinning,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  spinning?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-slate-900/60 px-2 py-3 text-white transition-colors hover:border-emerald-500/40 hover:bg-slate-800 disabled:opacity-50"
    >
      <Icon className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}
