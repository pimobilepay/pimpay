"use client";
import React, { useState } from "react";
import { Eye, EyeOff, Wifi, RotateCcw } from "lucide-react";

// ============================================================================
// PIMOBIPAY brand identity for virtual cards.
// All cards share the same deep-navy PimPay design; only a subtle accent glow
// differentiates the tiers. Name used on every card: PIMOBIPAY.
//
// The visual (front + back + 3D flip) lives in the exported <CardFace/> so the
// exact same design can be reused on /cards, /dashboard/card and the order page.
// ============================================================================

type CardStyle = {
  gradient: string;
  glow: string;
  accent: string; // hex used for contactless icon + subtle highlights
};

// Each tier carries its own on-brand color identity.
const BLUE: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#12235a_0%,#0c1a44_45%,#060e26_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(37,99,235,0.55)]",
  accent: "#3b82f6",
};

const TEAL: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#0a3b3a_0%,#07292b_45%,#03161a_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(20,184,166,0.5)]",
  accent: "#2dd4bf",
};

const INDIGO: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#1e2a6e_0%,#131d52_45%,#080f2e_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(99,102,241,0.5)]",
  accent: "#818cf8",
};

const PURPLE: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#3b1d6e_0%,#271050_45%,#12082e_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(168,85,247,0.5)]",
  accent: "#a855f7",
};

const GOLD: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#5c4318_0%,#3d2c0e_45%,#1c1406_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(245,158,11,0.5)]",
  accent: "#f59e0b",
};

const PLATINUM: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#3a4152_0%,#262c3a_45%,#12151f_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(148,163,184,0.5)]",
  accent: "#cbd5e1",
};

// Darker "black" identity for the top premium tiers, still on brand.
const NIGHT: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#1b2337_0%,#0d1220_50%,#04070f_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(148,163,184,0.4)]",
  accent: "#e2e8f0",
};

// [FIX] Style de repli par défaut. `getStyle()` (ci-dessous) retombait sur
// `NAVY` pour tout `type` de carte non reconnu (ex: "VIRTUAL", valeur par
// défaut posée par app/dashboard/card/page.tsx quand le type n'est pas
// renseigné) — mais `NAVY` n'était JAMAIS déclarée dans ce fichier. Résultat :
// `ReferenceError: NAVY is not defined` dès qu'une carte avait un type hors
// des 8 clés de CARD_STYLES, ce qui plantait le rendu de <VirtualCard/>
// (donc /cards, /dashboard/card, la page de commande...) avec un écran
// blanc / "This page couldn't load" côté navigateur. Couleur reprise du
// design "deep-navy PimPay" mentionné dans l'en-tête de ce fichier.
const NAVY: CardStyle = {
  gradient: "bg-[linear-gradient(135deg,#0f1b3d_0%,#0a1330_45%,#050914_100%)]",
  glow: "shadow-[0_20px_45px_-15px_rgba(59,130,246,0.45)]",
  accent: "#60a5fa",
};

const CARD_STYLES: Record<string, CardStyle> = {
  // MASTERCARD tiers
  PLATINIUM: BLUE,
  PREMIUM: TEAL,
  GOLD: INDIGO,
  ULTRA: NIGHT,
  // VISA tiers
  VISA_CLASSIC: PURPLE,
  VISA_GOLD: GOLD,
  VISA_PLATINUM: PLATINUM,
  VISA_INFINITE: NIGHT,
};

const getStyle = (type: string): CardStyle => CARD_STYLES[type] || NAVY;

// PimPay "P" logo mark (stroked, rounded — matching the brand identity).
export function PimpayLogo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 48" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="pimpayP" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4c8dff" />
          <stop offset="100%" stopColor="#1d5fe0" />
        </linearGradient>
      </defs>
      <path
        d="M8 44 V7 H24 a11 11 0 0 1 0 22 H8"
        stroke="url(#pimpayP)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Brand wordmark: P logo + PIMOBIPAY / Technologies.
function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <PimpayLogo size={24} />
      <div className="leading-none">
        <p className="text-[13px] font-black tracking-tight text-white">PIMOBIPAY</p>
        <p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-[#5b8def]">Technologies</p>
      </div>
    </div>
  );
}

// Subtle tech / network background (dots + connecting lines + globe arc),
// echoing the PimPay marketing visuals.
function TechPattern({ accent }: { accent: string }) {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-60"
      viewBox="0 0 400 252"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* soft glow top-right */}
      <defs>
        <radialGradient id="cardGlow" cx="80%" cy="18%" r="60%">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="252" fill="url(#cardGlow)" />
      {/* network lines */}
      <g stroke={accent} strokeOpacity="0.28" strokeWidth="1">
        <line x1="300" y1="30" x2="360" y2="70" />
        <line x1="360" y1="70" x2="320" y2="120" />
        <line x1="320" y1="120" x2="380" y2="150" />
        <line x1="300" y1="30" x2="340" y2="15" />
        <line x1="30" y1="210" x2="90" y2="235" />
        <line x1="90" y1="235" x2="60" y2="185" />
      </g>
      {/* network nodes */}
      <g fill={accent} fillOpacity="0.55">
        <circle cx="300" cy="30" r="2.5" />
        <circle cx="360" cy="70" r="2" />
        <circle cx="320" cy="120" r="2" />
        <circle cx="380" cy="150" r="2.5" />
        <circle cx="340" cy="15" r="1.6" />
        <circle cx="30" cy="210" r="2" />
        <circle cx="90" cy="235" r="2" />
        <circle cx="60" cy="185" r="1.6" />
      </g>
      {/* faint globe arc bottom-right */}
      <path
        d="M 250 260 A 130 130 0 0 1 400 130"
        stroke={accent}
        strokeOpacity="0.15"
        strokeWidth="1.2"
        fill="none"
      />
    </svg>
  );
}

// VISA / Mastercard brand logos.
function VisaLogo() {
  return (
    <span
      className="text-2xl font-black italic tracking-tight text-white drop-shadow"
      style={{ fontFamily: "Arial, sans-serif" }}
    >
      VISA
    </span>
  );
}

function MastercardLogo() {
  return (
    <div className="flex items-center">
      <div className="h-7 w-7 rounded-full bg-[#eb001b]" />
      <div className="-ml-3 h-7 w-7 rounded-full bg-[#f79e1b] mix-blend-hard-light" />
    </div>
  );
}

export type CardFaceData = {
  number?: string;
  exp?: string;
  cvv?: string;
  holder?: string;
  brand?: string;
  type?: string;
  isFrozen?: boolean;
};

// ---------------------------------------------------------------------------
// <CardFace/> — the shared PIMOBIPAY card visual (front + back + 3D flip).
// Controlled via `isFlipped` / `showInfo`. Renders its own 1.586:1 wrapper, so
// callers just drop it into a width-constrained container.
// ---------------------------------------------------------------------------
export function CardFace({
  card,
  isFlipped = false,
  showInfo = false,
}: {
  card: CardFaceData;
  isFlipped?: boolean;
  showInfo?: boolean;
}) {
  const cardType = card.type?.toUpperCase() || "CLASSIC";
  const cardBrand = card.brand?.toUpperCase() || "VISA";
  const style = getStyle(cardType);
  const isVisa = cardBrand === "VISA";
  const isMasterCard = cardBrand === "MASTERCARD";

  const digits = (card.number || "").replace(/\s/g, "");
  const last4 = digits.slice(-4) || "0000";
  const fullNumber = digits.replace(/(\d{4})/g, "$1 ").trim();

  return (
    <div className="relative h-full w-full" style={{ perspective: "1000px" }}>
      <div
        className="relative h-full w-full transition-transform duration-700 ease-in-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ---------- FRONT ---------- */}
        <div
          className={`absolute inset-0 h-full w-full overflow-hidden rounded-[1.5rem] p-6 text-white ring-1 ring-white/10 md:p-7 ${
            card.isFrozen ? "grayscale" : `${style.gradient} ${style.glow}`
          }`}
          style={{ backfaceVisibility: "hidden" }}
        >
          {!card.isFrozen && <TechPattern accent={style.accent} />}

          <div className="relative z-10 flex h-full flex-col justify-between">
            {/* Header: brand + card scheme */}
            <div className="flex items-start justify-between">
              <BrandMark />
              {isVisa ? <VisaLogo /> : isMasterCard ? <MastercardLogo /> : <span className="text-xl font-black">{card.brand}</span>}
            </div>

            {/* Contactless (NFC) — right aligned */}
            <div className="flex items-center justify-end">
              <Wifi size={22} className="rotate-90 text-white/70" />
            </div>

            {/* Card number */}
            <div>
              <p className="whitespace-nowrap font-mono text-lg font-bold tracking-[0.14em] text-white md:text-xl">
                {showInfo && fullNumber ? fullNumber : `•••• •••• •••• ${last4}`}
              </p>
            </div>

            {/* Footer: valid thru / cvv / holder */}
            <div className="flex items-end justify-between">
              <div className="flex gap-6">
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/50">Valid Thru</p>
                  <p className="text-sm font-bold tracking-widest text-white">{showInfo ? card.exp || "••/••" : "••/••"}</p>
                </div>
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.15em] text-white/50">CVV</p>
                  <p className="text-sm font-bold tracking-widest text-white">{showInfo ? card.cvv || "***" : "•••"}</p>
                </div>
              </div>
              <p className="max-w-[55%] truncate text-right text-sm font-black uppercase tracking-wider text-white">
                {card.holder}
              </p>
            </div>
          </div>
        </div>

        {/* ---------- BACK ---------- */}
        <div
          className={`absolute inset-0 h-full w-full overflow-hidden rounded-[1.5rem] text-white ring-1 ring-white/10 ${
            card.isFrozen ? "bg-gray-800 grayscale" : style.gradient
          }`}
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="mt-6 h-14 w-full bg-black/80" />

          <div className="flex h-[calc(100%-3.5rem)] flex-col justify-between p-6 md:p-7">
            <div className="mt-2 space-y-2">
              <div className="flex items-center">
                <div className="flex h-12 flex-1 items-center justify-end rounded bg-white">
                  <div className="px-4 py-2">
                    <span className="font-mono text-xl font-black tracking-widest text-slate-900">{showInfo ? card.cvv || "***" : "***"}</span>
                  </div>
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#5b8def]">Code de securite (CVV)</p>
              <p className="text-[10px] text-white/50">
                Numero complet:
                <span className="ml-2 font-mono text-white/80">{showInfo && fullNumber ? fullNumber : `•••• •••• •••• ${last4}`}</span>
              </p>
            </div>

            <div className="flex items-end justify-between">
              <p className="max-w-[70%] text-[8px] text-white/30">
                {"Cette carte est la propriete de PIMOBIPAY Technologies. Usage personnel uniquement."}
              </p>
              <PimpayLogo size={22} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VirtualCard({ card }: { card: any }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const handleFlip = () => setIsFlipped(!isFlipped);
  const toggleShowInfo = () => setShowInfo(!showInfo);

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[1.586/1]">
        <CardFace card={card} isFlipped={isFlipped} showInfo={showInfo} />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={toggleShowInfo}
          className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border py-3 text-xs font-bold uppercase tracking-wider transition-all ${
            showInfo
              ? "border-[#3b82f6]/40 bg-[#3b82f6]/20 text-[#93b8ff]"
              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
          }`}
        >
          {showInfo ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showInfo ? "Masquer infos" : "Afficher infos"}</span>
        </button>
        <button
          onClick={handleFlip}
          className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3 text-xs font-bold uppercase tracking-wider text-white/70 transition-all hover:border-[#3b82f6]/30 hover:bg-[#3b82f6]/10 hover:text-[#93b8ff]"
        >
          <RotateCcw size={16} />
          <span>{isFlipped ? "Voir recto" : "Voir verso"}</span>
        </button>
      </div>
    </div>
  );
}
