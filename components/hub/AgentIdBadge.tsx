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

/** Table de correspondance pays -> libellé + code ISO (drapeau). */
const COUNTRY_MAP: Record<string, { label: string; iso: string }> = {
  cg: { label: "République du Congo", iso: "cg" },
  "republique du congo": { label: "République du Congo", iso: "cg" },
  "congo": { label: "République du Congo", iso: "cg" },
  "congo-brazzaville": { label: "République du Congo", iso: "cg" },
  cd: { label: "RD Congo", iso: "cd" },
  "rd congo": { label: "RD Congo", iso: "cd" },
  "republique democratique du congo": { label: "RD Congo", iso: "cd" },
  cm: { label: "Cameroun", iso: "cm" },
  cameroun: { label: "Cameroun", iso: "cm" },
  ga: { label: "Gabon", iso: "ga" },
  gabon: { label: "Gabon", iso: "ga" },
  cf: { label: "Centrafrique", iso: "cf" },
  centrafrique: { label: "Centrafrique", iso: "cf" },
  td: { label: "Tchad", iso: "td" },
  tchad: { label: "Tchad", iso: "td" },
  ci: { label: "Côte d'Ivoire", iso: "ci" },
  "cote d'ivoire": { label: "Côte d'Ivoire", iso: "ci" },
  sn: { label: "Sénégal", iso: "sn" },
  senegal: { label: "Sénégal", iso: "sn" },
  ml: { label: "Mali", iso: "ml" },
  mali: { label: "Mali", iso: "ml" },
  bf: { label: "Burkina Faso", iso: "bf" },
  "burkina faso": { label: "Burkina Faso", iso: "bf" },
  bj: { label: "Bénin", iso: "bj" },
  benin: { label: "Bénin", iso: "bj" },
  tg: { label: "Togo", iso: "tg" },
  togo: { label: "Togo", iso: "tg" },
  ng: { label: "Nigeria", iso: "ng" },
  nigeria: { label: "Nigeria", iso: "ng" },
  fr: { label: "France", iso: "fr" },
  france: { label: "France", iso: "fr" },
};

function resolveCountry(input?: string | null): { label: string; iso: string } {
  if (!input) return { label: "République du Congo", iso: "cg" };
  const key = input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return COUNTRY_MAP[key] || { label: input, iso: "" };
}

/** Petite étoile 5 branches réutilisable pour les drapeaux. */
function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const outer = (Math.PI / 180) * (i * 72 - 90);
    const inner = (Math.PI / 180) * (i * 72 - 90 + 36);
    pts.push(`${cx + r * Math.cos(outer)},${cy + r * Math.sin(outer)}`);
    pts.push(`${cx + r * 0.4 * Math.cos(inner)},${cy + r * 0.4 * Math.sin(inner)}`);
  }
  return <polygon points={pts.join(" ")} fill={fill} />;
}

/** Drapeaux SVG inline (nets, sans CORS, compatibles export PNG/PDF). ViewBox 60x40. */
const FLAG_SVGS: Record<string, React.ReactNode> = {
  cg: (
    <>
      <rect width="60" height="40" fill="#FBDE4A" />
      <polygon points="0,0 46,0 0,31" fill="#009543" />
      <polygon points="60,40 14,40 60,9" fill="#DC241F" />
    </>
  ),
  cd: (
    <>
      <rect width="60" height="40" fill="#007FFF" />
      <polygon points="0,25 0,40 13,40 60,15 60,0 47,0" fill="#F7D618" />
      <polygon points="0,29 0,40 9,40 60,11 60,0 51,0" fill="#CE1021" />
      <Star cx={9} cy={8} r={5} fill="#F7D618" />
    </>
  ),
  cm: (
    <>
      <rect width="20" height="40" fill="#007A5E" />
      <rect x="20" width="20" height="40" fill="#CE1126" />
      <rect x="40" width="20" height="40" fill="#FCD116" />
      <Star cx={30} cy={20} r={6} fill="#FCD116" />
    </>
  ),
  ga: (
    <>
      <rect width="60" height="13.34" fill="#009E60" />
      <rect y="13.34" width="60" height="13.33" fill="#FCD116" />
      <rect y="26.67" width="60" height="13.33" fill="#3A75C4" />
    </>
  ),
  cf: (
    <>
      <rect width="60" height="10" fill="#003082" />
      <rect y="10" width="60" height="10" fill="#fff" />
      <rect y="20" width="60" height="10" fill="#289728" />
      <rect y="30" width="60" height="10" fill="#FFCE00" />
      <rect x="26" width="8" height="40" fill="#D21034" />
      <Star cx={9} cy={7} r={4} fill="#FFCE00" />
    </>
  ),
  td: (
    <>
      <rect width="20" height="40" fill="#002664" />
      <rect x="20" width="20" height="40" fill="#FECB00" />
      <rect x="40" width="20" height="40" fill="#C60C30" />
    </>
  ),
  ci: (
    <>
      <rect width="20" height="40" fill="#F77F00" />
      <rect x="20" width="20" height="40" fill="#fff" />
      <rect x="40" width="20" height="40" fill="#009E60" />
    </>
  ),
  sn: (
    <>
      <rect width="20" height="40" fill="#00853F" />
      <rect x="20" width="20" height="40" fill="#FDEF42" />
      <rect x="40" width="20" height="40" fill="#E31B23" />
      <Star cx={30} cy={20} r={6} fill="#00853F" />
    </>
  ),
  ml: (
    <>
      <rect width="20" height="40" fill="#14B53A" />
      <rect x="20" width="20" height="40" fill="#FCD116" />
      <rect x="40" width="20" height="40" fill="#CE1126" />
    </>
  ),
  bf: (
    <>
      <rect width="60" height="20" fill="#EF2B2D" />
      <rect y="20" width="60" height="20" fill="#009E49" />
      <Star cx={30} cy={20} r={6} fill="#FCD116" />
    </>
  ),
  bj: (
    <>
      <rect width="24" height="40" fill="#008751" />
      <rect x="24" width="36" height="20" fill="#FCD116" />
      <rect x="24" y="20" width="36" height="20" fill="#E8112D" />
    </>
  ),
  tg: (
    <>
      <rect width="60" height="8" fill="#006A4E" />
      <rect y="8" width="60" height="8" fill="#FFCE00" />
      <rect y="16" width="60" height="8" fill="#006A4E" />
      <rect y="24" width="60" height="8" fill="#FFCE00" />
      <rect y="32" width="60" height="8" fill="#006A4E" />
      <rect width="24" height="24" fill="#D21034" />
      <Star cx={12} cy={12} r={7} fill="#fff" />
    </>
  ),
  ng: (
    <>
      <rect width="20" height="40" fill="#008751" />
      <rect x="20" width="20" height="40" fill="#fff" />
      <rect x="40" width="20" height="40" fill="#008751" />
    </>
  ),
  fr: (
    <>
      <rect width="20" height="40" fill="#0055A4" />
      <rect x="20" width="20" height="40" fill="#fff" />
      <rect x="40" width="20" height="40" fill="#EF4135" />
    </>
  ),
};

/** Drapeau du pays de l'agent (SVG inline). */
function CountryFlag({ iso, className = "" }: { iso: string; className?: string }) {
  const flag = FLAG_SVGS[iso];
  if (!flag) return null;
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      {flag}
    </svg>
  );
}

/** Marque "P" PIMOBIPAY : stem blanc + boucle bleue + pixels (accent tech). */
function PimobiPMark({ className = "", mono = false }: { className?: string; mono?: boolean }) {
  const bowl = mono ? "#ffffff" : "#2563eb";
  const stem = mono ? "#ffffff" : "#ffffff";
  const dot1 = mono ? "rgba(255,255,255,0.95)" : "#2563eb";
  const dot2 = mono ? "rgba(255,255,255,0.75)" : "#38bdf8";
  const dot3 = mono ? "rgba(255,255,255,0.55)" : "#1d4ed8";
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden="true">
      <g transform="skewX(-11)">
        {/* pixels (accent tech en haut a gauche) */}
        <rect x="8" y="6" width="13" height="13" rx="2.5" fill={dot1} />
        <rect x="24" y="1" width="8" height="8" rx="1.5" fill={dot2} />
        <rect x="1" y="23" width="6" height="6" rx="1.5" fill={dot3} />
        {/* Boucle bleue du P */}
        <path
          fill={bowl}
          d="M42 24 H62 A23 23 0 0 1 62 70 H42 V54 H58 A7 7 0 0 0 58 40 H42 Z"
        />
        {/* Barre verticale blanche du P */}
        <rect x="24" y="24" width="18" height="74" rx="2" fill={stem} />
      </g>
    </svg>
  );
}

function BrandHeader() {
  return (
    <div className="flex flex-col items-center">
      <PimobiPMark className="h-14 w-14" />
      <p className="mt-1.5 text-2xl font-black tracking-tight leading-none">
        <span className="text-white">PIMOBI</span>
        <span className="text-sky-500">PAY</span>
      </p>
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
  country,
  joinDate = "15 / 07 / 2024",
  level = "Gold Agent",
  partnerLabel = "Official Partner",
}: AgentIdBadgeProps) {
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);
  const [side, setSide] = useState<"both" | "recto" | "verso">("both");

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
      const wantFront = side !== "verso";
      const wantBack = side !== "recto";
      const [front, back] = await Promise.all([
        wantFront ? capture(frontRef.current) : Promise.resolve(null),
        wantBack ? capture(backRef.current) : Promise.resolve(null),
      ]);
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
      const wantFront = side !== "verso";
      const wantBack = side !== "recto";
      const [front, back] = await Promise.all([
        wantFront ? capture(frontRef.current) : Promise.resolve(null),
        wantBack ? capture(backRef.current) : Promise.resolve(null),
      ]);
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const cardW = 80;
      const cardH = cardW * (1035 / 620); // ratio du badge
      const gap = 10;
      const cards = [front, back].filter(Boolean) as string[];
      const totalW = cardW * cards.length + gap * (cards.length - 1);
      const startX = (pageWidth - totalW) / 2;
      const y = (pageHeight - cardH) / 2;
      pdf.setFillColor(2, 4, 10);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      cards.forEach((data, i) => {
        pdf.addImage(data, "PNG", startX + i * (cardW + gap), y, cardW, cardH);
      });
      const suffix = side === "both" ? "" : `-${side}`;
      pdf.save(`badge-${agentId}${suffix}.pdf`);
    } catch (e) {
      console.error("[AgentIdBadge] PDF export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const resolvedCountry = resolveCountry(country);

  const backRows = [
    { icon: UserRound, label: "Nom", value: name },
    { icon: Phone, label: "Téléphone", value: phone || "—" },
    { icon: Mail, label: "Email", value: email || "—", small: true },
    { icon: Globe, label: "Pays", value: resolvedCountry.label, flag: true },
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
              <div className="relative mt-4">
                <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-emerald-500/70 bg-slate-700">
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
                  size={108}
                  level="H"
                  includeMargin={false}
                  imageSettings={{ src: "/logo-pimpay.png", height: 24, width: 24, excavate: true }}
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
              <div className="mt-auto -mx-5 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-sky-500 py-2.5">
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
                    {row.flag && (
                      <CountryFlag
                        iso={resolvedCountry.iso}
                        className="h-6 w-9 shrink-0 rounded-sm border border-white/10"
                      />
                    )}
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
              <div className="mt-auto -mx-5 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-sky-500 py-2.5">
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

      {/* Side selector */}
      <div className="w-full max-w-[420px]">
        <p className="mb-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-400">
          Choisir le côté à télécharger
        </p>
        <div className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-slate-900/60 p-1">
          {([
            { value: "recto", label: "Recto" },
            { value: "verso", label: "Verso" },
            { value: "both", label: "Recto-verso" },
          ] as const).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSide(opt.value)}
              aria-pressed={side === opt.value}
              className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                side === opt.value
                  ? "bg-emerald-600 text-white"
                  : "text-slate-300 hover:bg-white/5"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
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
        <PimobiPMark className="h-7 w-7" mono />
      </div>
      {/* Clip */}
      <div className="-mt-1 h-4 w-8 rounded-sm border border-slate-400/40 bg-slate-300/20" />
      {/* Card */}
      <div className="-mt-1 h-[600px] w-full overflow-hidden rounded-[1.9rem] border border-white/10 bg-[#050b16] p-1 shadow-2xl shadow-black/40">
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
