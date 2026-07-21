"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import {
  Phone,
  Mail,
  Globe,
  Calendar,
  Award,
  ShieldCheck,
  Lock,
  Handshake,
  UserRound,
  BarChart3,
  Download,
  FileText,
  Loader2,
} from "lucide-react";

interface AgentIdBadgeProps {
  name: string;
  agentId?: string;
  code: string;
  avatar?: string | null;
  qrValue: string;
  phone?: string | null;
  email?: string | null;
  country?: string;
  joinDate?: string;
  level?: string;
  partnerLabel?: string;
}

/** Petit drapeau République du Congo (diagonale vert / jaune / rouge). */
function CongoFlag({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true">
      <polygon points="0,0 24,0 0,40" fill="#009543" />
      <polygon points="24,0 60,0 0,40 36,40" fill="#FBDE4A" />
      <polygon points="60,0 60,40 36,40" fill="#DC241F" />
    </svg>
  );
}

function BrandHeader() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex items-center gap-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-pimpay.png" alt="PIMOBIPAY" className="h-10 w-10 object-contain" crossOrigin="anonymous" />
        <p className="text-2xl font-black tracking-tight">
          <span className="text-white">PIMOBI</span>
          <span className="text-sky-500">PAY</span>
        </p>
      </div>
      <div className="mt-1 flex w-full items-center justify-center gap-2">
        <span className="h-px w-6 bg-slate-600" />
        <p className="text-[9px] font-bold uppercase tracking-[4px] text-slate-400">Technologies</p>
        <span className="h-px w-6 bg-slate-600" />
      </div>
      <p className="mt-1.5 text-sm font-black uppercase tracking-[2px] text-emerald-500">Agent Officiel</p>
    </div>
  );
}

export function AgentIdBadge({
  name,
  agentId = "PMB-AGT-000001",
  code,
  avatar,
  qrValue,
  phone = "+242 06 123 45 67",
  email = "aimard.swana@pimobipay.com",
  country = "République du Congo",
  joinDate = "15 / 07 / 2024",
  level = "Gold Agent",
  partnerLabel = "Official Partner",
}: AgentIdBadgeProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);

  const initials = (name || "AG")
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const capture = (node: HTMLDivElement | null) =>
    node
      ? toPng(node, { cacheBust: true, pixelRatio: 3, backgroundColor: "#050b16" })
      : Promise.resolve(null);

  const handleDownloadPng = async () => {
    try {
      setDownloading("png");
      const [front, back] = await Promise.all([capture(frontRef.current), capture(backRef.current)]);
      [
        { data: front, suffix: "recto" },
        { data: back, suffix: "verso" },
      ].forEach(({ data, suffix }) => {
        if (!data) return;
        const link = document.createElement("a");
        link.download = `badge-${agentId}-${suffix}.png`;
        link.href = data;
        link.click();
      });
    } catch (e) {
      console.error("[AgentIdBadge] PNG export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading("pdf");
      const [front, back] = await Promise.all([capture(frontRef.current), capture(backRef.current)]);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const cardW = 80;
      const cardH = cardW * (1035 / 620); // ratio du badge
      const gap = 10;
      const totalW = cardW * 2 + gap;
      const startX = (pageWidth - totalW) / 2;
      const y = (pageHeight - cardH) / 2;
      pdf.setFillColor(2, 4, 10);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      if (front) pdf.addImage(front, "PNG", startX, y, cardW, cardH);
      if (back) pdf.addImage(back, "PNG", startX + cardW + gap, y, cardW, cardH);
      pdf.save(`badge-${agentId}.pdf`);
    } catch (e) {
      console.error("[AgentIdBadge] PDF export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const backRows = [
    { icon: UserRound, label: "Nom", value: name },
    { icon: Phone, label: "Téléphone", value: phone || "—" },
    { icon: Mail, label: "Email", value: email || "—", small: true },
    { icon: Globe, label: "Pays", value: country, flag: true },
    { icon: Calendar, label: "Date d'inscription", value: joinDate },
    { icon: Award, label: "Niveau Actuel", value: level, shield: true },
    { icon: BarChart3, label: "Statut", value: "ACTIF", dot: true },
  ];

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap items-start justify-center gap-6">
        {/* ============ FRONT ============ */}
        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-emerald-400">
            Front
          </span>
          <BadgeLanyard>
            <div
              ref={frontRef}
              className="flex h-full w-full flex-col items-center rounded-[1.75rem] bg-gradient-to-b from-[#0b1626] to-[#050b16] px-5 pb-0 pt-7"
            >
              <BrandHeader />

              {/* Photo */}
              <div className="relative mt-5">
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-emerald-500/70 bg-slate-700">
                  {avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar || "/placeholder.svg"} alt={name} className="h-full w-full object-cover" crossOrigin="anonymous" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-3xl font-black text-emerald-400">
                      {initials}
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#050b16] bg-emerald-500 shadow-lg">
                  <ShieldCheck className="h-5 w-5 text-white" strokeWidth={2.5} />
                </span>
              </div>

              {/* Name */}
              <p className="mt-4 text-center text-xl font-black uppercase tracking-wide text-white text-balance">{name}</p>
              <p className="text-xs font-bold uppercase tracking-[2px] text-emerald-500">{partnerLabel}</p>

              {/* Agent ID */}
              <div className="mt-4 w-full rounded-2xl border border-emerald-500/30 bg-white/[0.03] px-4 py-2 text-center">
                <p className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[2px] text-emerald-500">
                  <UserRound className="h-3.5 w-3.5" /> Agent ID
                </p>
                <p className="mt-0.5 font-mono text-lg font-black text-white">{agentId}</p>
              </div>

              {/* QR */}
              <div className="mt-4 rounded-xl bg-white p-2.5">
                <QRCodeSVG
                  value={qrValue}
                  size={120}
                  level="H"
                  includeMargin={false}
                  imageSettings={{ src: "/logo-pimpay.png", height: 26, width: 26, excavate: true }}
                />
              </div>
              <p className="mt-2 text-center text-[10px] font-bold uppercase tracking-wide text-emerald-500 leading-tight">
                Scan to verify
                <br />
                Official PimobiPay Agent
              </p>

              {/* Trust icons */}
              <div className="mt-4 grid w-full grid-cols-3 gap-1 px-1">
                <TrustItem icon={ShieldCheck} label={"Verified\nAgent"} />
                <TrustItem icon={Lock} label={"Secure\nTransactions"} />
                <TrustItem icon={Handshake} label={"Trusted\nPartner"} />
              </div>

              {/* Footer */}
              <div className="mt-4 -mx-5 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-sky-500 py-2.5">
                <p className="text-xs font-bold text-white">www.pimobipay.com</p>
              </div>
            </div>
          </BadgeLanyard>
        </div>

        {/* ============ BACK ============ */}
        <div className="flex flex-col items-center gap-2">
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-black uppercase tracking-widest text-emerald-400">
            Back
          </span>
          <BadgeLanyard>
            <div
              ref={backRef}
              className="flex h-full w-full flex-col rounded-[1.75rem] bg-gradient-to-b from-[#0b1626] to-[#050b16] px-5 pb-0 pt-7"
            >
              <BrandHeader />

              {/* Info rows */}
              <div className="mt-5 flex-1">
                {backRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-center gap-3 border-b border-white/5 py-2.5"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                      <row.icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-emerald-500">{row.label}</p>
                      <p className={`font-semibold text-white ${row.small ? "text-xs break-all" : "text-sm"}`}>
                        {row.value}
                      </p>
                    </div>
                    {row.flag && <CongoFlag className="h-6 w-9 shrink-0 rounded-sm border border-white/10" />}
                    {row.shield && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                        <ShieldCheck className="h-5 w-5 text-amber-400" />
                      </span>
                    )}
                    {row.dot && <span className="h-3 w-3 shrink-0 rounded-full bg-emerald-500" />}
                  </div>
                ))}
              </div>

              {/* Signature */}
              <div className="mt-3 flex flex-col items-center">
                <span className="font-serif text-2xl italic text-slate-300" style={{ fontFamily: "cursive" }}>
                  A.Swana
                </span>
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white">Pimobipay Technologies</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Directeur Général</p>
              </div>

              {/* Code agent */}
              <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-[2px] text-emerald-500">Code Agent</p>
                <p className="mt-0.5 break-all font-mono text-sm font-bold text-white">{code}</p>
              </div>

              {/* Footer */}
              <div className="mt-4 -mx-5 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-sky-500 py-2.5">
                <p className="text-xs font-bold text-white">Support: support@pimobipay.com</p>
              </div>
            </div>
          </BadgeLanyard>
        </div>
      </div>

      {/* Bottom pillars */}
      <div className="grid grid-cols-4 gap-4 sm:gap-8">
        <PillarItem icon={ShieldCheck} label="Sécurité" />
        <PillarItem icon={QrPillar} label="Vérification" />
        <PillarItem icon={Handshake} label="Confiance" />
        <PillarItem icon={BarChart3} label="Performance" />
      </div>

      {/* Actions */}
      <div className="grid w-full max-w-[420px] grid-cols-2 gap-3">
        <button
          onClick={handleDownloadPng}
          disabled={downloading !== null}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {downloading === "png" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Télécharger PNG
        </button>
        <button
          onClick={handleDownloadPdf}
          disabled={downloading !== null}
          className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          {downloading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Télécharger PDF
        </button>
      </div>
    </div>
  );
}

/** Cordon + clip + carte, largeur fixe pour un rendu identique au design. */
function BadgeLanyard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-[300px] flex-col items-center">
      {/* Lanyard strap */}
      <div className="relative z-10 flex h-16 w-16 items-start justify-center overflow-hidden rounded-b-md bg-gradient-to-b from-blue-700 to-blue-800 pt-2 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-pimpay.png" alt="" className="h-7 w-7 object-contain" crossOrigin="anonymous" />
      </div>
      {/* Clip */}
      <div className="-mt-1 h-4 w-8 rounded-sm border border-slate-400/40 bg-slate-300/20" />
      {/* Card */}
      <div className="-mt-1 h-[500px] w-full overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#050b16] p-1 shadow-2xl shadow-black/40">
        {children}
      </div>
    </div>
  );
}

function TrustItem({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <Icon className="h-6 w-6 text-emerald-400" />
      <p className="whitespace-pre-line text-[9px] font-bold uppercase leading-tight text-slate-300">{label}</p>
    </div>
  );
}

function PillarItem({ icon: Icon, label }: { icon: React.ComponentType<{ className?: string }>; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <Icon className="h-7 w-7 text-emerald-400" />
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">{label}</p>
    </div>
  );
}

function QrPillar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="3" width="6" height="6" rx="1" />
      <rect x="3" y="15" width="6" height="6" rx="1" />
      <path d="M15 15h2v2h-2zM19 15h2M15 19h2v2M19 19h2v2" />
    </svg>
  );
}
