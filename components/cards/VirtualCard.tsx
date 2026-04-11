"use client";
import React, { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Wifi, RotateCcw } from "lucide-react";

// Card style configurations matching the order page
const CARD_STYLES: Record<string, {
  gradient: string;
  shadow: string;
  label: string;
  labelColor: string;
  pattern: string;
  accentColor: string;
  brand: string;
}> = {
  // MASTERCARD Types
  PLATINIUM: {
    gradient: "bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]",
    shadow: "shadow-2xl shadow-cyan-600/30",
    label: "MASTERCARD BLUE",
    labelColor: "text-[#FFD700]",
    pattern: "mastercard",
    accentColor: "text-cyan-400",
    brand: "MASTERCARD",
  },
  PREMIUM: {
    gradient: "bg-gradient-to-br from-[#00897b] via-[#00796b] to-[#004d40]",
    shadow: "shadow-2xl shadow-teal-600/30",
    label: "MASTERCARD TEAL",
    labelColor: "text-[#FFD700]",
    pattern: "mastercard",
    accentColor: "text-teal-400",
    brand: "MASTERCARD",
  },
  GOLD: {
    gradient: "bg-gradient-to-br from-[#1a237e] via-[#283593] to-[#0d1b4c]",
    shadow: "shadow-2xl shadow-indigo-600/30",
    label: "MASTERCARD NAVY",
    labelColor: "text-[#FFD700]",
    pattern: "mastercard",
    accentColor: "text-indigo-300",
    brand: "MASTERCARD",
  },
  ULTRA: {
    gradient: "bg-gradient-to-br from-[#212121] via-[#424242] to-[#0a0a0a]",
    shadow: "shadow-2xl shadow-white/10",
    label: "MASTERCARD BLACK",
    labelColor: "text-[#FFD700]",
    pattern: "mastercard",
    accentColor: "text-white",
    brand: "MASTERCARD",
  },
  // VISA Types
  VISA_CLASSIC: {
    gradient: "bg-gradient-to-br from-[#1a1f4e] via-[#252d6a] to-[#1a1f4e]",
    shadow: "shadow-2xl shadow-indigo-900/30",
    label: "VISA PURPLE",
    labelColor: "text-[#FFD700]",
    pattern: "visa",
    accentColor: "text-[#3b5bdb]",
    brand: "VISA",
  },
  VISA_GOLD: {
    gradient: "bg-gradient-to-br from-[#c9a227] via-[#d4af37] to-[#aa8c2c]",
    shadow: "shadow-2xl shadow-amber-600/30",
    label: "VISA GOLD",
    labelColor: "text-[#1a1a1a]",
    pattern: "visa-gold",
    accentColor: "text-amber-300",
    brand: "VISA",
  },
  VISA_PLATINUM: {
    gradient: "bg-gradient-to-br from-[#546e7a] via-[#607d8b] to-[#37474f]",
    shadow: "shadow-2xl shadow-slate-500/30",
    label: "VISA PLATINUM",
    labelColor: "text-[#FFD700]",
    pattern: "visa-platinum",
    accentColor: "text-slate-300",
    brand: "VISA",
  },
  VISA_INFINITE: {
    gradient: "bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#0a0a0a]",
    shadow: "shadow-2xl shadow-white/10",
    label: "VISA BLACK",
    labelColor: "text-[#FFD700]",
    pattern: "visa-black",
    accentColor: "text-white",
    brand: "VISA",
  },
};

// Default styles based on brand
const getDefaultStyle = (brand: string) => {
  if (brand?.toUpperCase() === "VISA") {
    return {
      gradient: "bg-gradient-to-br from-[#1a1f4e] via-[#252d6a] to-[#1a1f4e]",
      shadow: "shadow-2xl shadow-indigo-900/30",
      label: "PIMPAY VIRTUAL",
      labelColor: "text-[#FFD700]",
      pattern: "visa",
      accentColor: "text-[#3b5bdb]",
      brand: "VISA",
    };
  }
  return {
    gradient: "bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]",
    shadow: "shadow-2xl shadow-blue-600/20",
    label: "PIMPAY VIRTUAL",
    labelColor: "text-[#FFD700]",
    pattern: "mastercard",
    accentColor: "text-blue-400",
    brand: "MASTERCARD",
  };
};

// VISA Pattern SVG - matching the order page design
function VisaPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
      <ellipse cx="70" cy="100" rx="50" ry="45" fill="rgba(59,91,219,0.4)" />
      <ellipse cx="45" cy="110" rx="30" ry="50" fill="rgba(59,91,219,0.35)" />
      <path d="M 130 80 Q 150 95 130 110" stroke="rgba(59,91,219,0.5)" strokeWidth="3" fill="none" />
      <path d="M 140 75 Q 165 95 140 115" stroke="rgba(59,91,219,0.4)" strokeWidth="3" fill="none" />
      <path d="M 150 70 Q 180 95 150 120" stroke="rgba(59,91,219,0.3)" strokeWidth="3" fill="none" />
      <ellipse cx="360" cy="180" rx="35" ry="35" fill="rgba(59,91,219,0.3)" />
      <path d="M 340 180 Q 360 150 380 180 Q 360 210 340 180" stroke="rgba(59,91,219,0.4)" strokeWidth="2" fill="none" />
    </svg>
  );
}

// MasterCard Pattern SVG - matching the order page design
function MasterCardPattern() {
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
      <text x="-20" y="200" fontSize="180" fontWeight="bold" fill="rgba(255,255,255,0.08)" fontFamily="Arial, sans-serif">100</text>
      <path d="M 350 0 Q 280 80 350 160 Q 420 240 350 320" stroke="rgba(255,255,255,0.1)" strokeWidth="60" fill="none" />
      <path d="M 380 -20 Q 310 60 380 140 Q 450 220 380 300" stroke="rgba(255,255,255,0.05)" strokeWidth="40" fill="none" />
    </svg>
  );
}

export default function VirtualCard({ card }: { card: any }) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const last4 = card.number?.slice(-4) || "0000";
  const cardType = card.type?.toUpperCase() || "CLASSIC";
  
  // IMPORTANT: Determine brand from card.brand first, then fallback to cardStyles
  const cardBrand = card.brand?.toUpperCase() || "VISA";
  
  // Get card styles based on type, but override brand detection
  const cardStyles = CARD_STYLES[cardType] || getDefaultStyle(card.brand);
  
  // Use actual card brand for logo/pattern, not the style's brand
  const isVisa = cardBrand === "VISA";
  const isMasterCard = cardBrand === "MASTERCARD";

  const handleFlip = () => setIsFlipped(!isFlipped);
  const toggleShowInfo = () => setShowInfo(!showInfo);

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-[1.586/1]" style={{ perspective: "1000px" }}>
        <div
          className="relative w-full h-full transition-transform duration-700 ease-in-out"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Face avant de la carte */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[1.5rem] p-6 md:p-8 text-white shadow-2xl overflow-hidden ${
              card.isFrozen ? "grayscale" : ""
            } ${cardStyles.gradient}`}
            style={{ backfaceVisibility: "hidden" }}
          >
            {isVisa && !card.isFrozen && <VisaPattern />}
            {isMasterCard && !card.isFrozen && <MasterCardPattern />}

            <div className="relative h-full flex flex-col justify-between z-10">
              {/* Header - PIMPAY VIRTUAL in gold + Brand logo */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-[#FFD700]" />
                  <span className="text-[11px] font-black text-[#FFD700] uppercase tracking-widest">PIMPAY VIRTUAL</span>
                </div>
                {isVisa ? (
                  <span className="text-2xl font-black italic text-white tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
                ) : isMasterCard ? (
                  <div className="flex items-center">
                    <div className="w-7 h-7 rounded-full bg-[#eb001b]" />
                    <div className="w-7 h-7 rounded-full bg-[#f79e1b] -ml-3" />
                  </div>
                ) : (
                  <span className="text-xl font-black">{card.brand}</span>
                )}
              </div>

              {/* Middle Section - Contactless icon on right */}
              <div className="flex-1 flex items-end justify-end py-2">
                <Wifi size={24} className={`rotate-90 ${isVisa ? "text-[#3b5bdb]" : "text-[#3b82f6]"}`} />
              </div>

              {/* Card Number - stays on one line */}
              <div className="mb-2">
                <p className="text-lg md:text-xl font-black tracking-[0.12em] font-mono text-white whitespace-nowrap">
                  {showInfo 
                    ? card.number?.replace(/(\d{4})/g, "$1 ").trim() 
                    : `•••• •••• •••• ${last4}`}
                </p>
              </div>

              {/* Bottom Section - EXPIRE, CVV labels in gold for Visa, gray for others */}
              <div className="space-y-1">
                <div className="flex gap-8">
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isVisa ? "text-[#d4a827]" : "text-gray-400"}`}>EXPIRE</p>
                    <p className="text-sm font-bold tracking-widest text-white">{showInfo ? card.exp : "••/••"}</p>
                  </div>
                  <div>
                    <p className={`text-[9px] font-bold uppercase tracking-wider ${isVisa ? "text-[#d4a827]" : "text-gray-400"}`}>CVV</p>
                    <p className="text-sm font-bold tracking-widest text-white">{showInfo ? card.cvv || "***" : "•••"}</p>
                  </div>
                </div>
                <p className="text-sm font-black uppercase tracking-widest text-white pt-1">{card.holder}</p>
              </div>
            </div>
          </div>

          {/* Face arriere de la carte (CVV) */}
          <div
            className={`absolute inset-0 w-full h-full rounded-[1.5rem] text-white shadow-2xl overflow-hidden ${
              card.isFrozen ? "grayscale bg-gray-800" : cardStyles.gradient
            }`}
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <div className="w-full h-14 bg-black/80 mt-6"></div>

            <div className="p-6 md:p-8 h-[calc(100%-3.5rem)] flex flex-col justify-between">
              {/* CVV signature strip */}
              <div className="space-y-2 mt-2">
                <div className="flex items-center">
                  <div className="flex-1 h-12 bg-white rounded flex items-center justify-end">
                    <div className="px-4 py-2">
                      <span className="text-slate-900 font-mono font-black text-xl tracking-widest">{card.cvv || "***"}</span>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-[#ec4899] uppercase tracking-widest">CODE DE SECURITE (CVV)</p>
                <p className="text-[10px] text-gray-400">
                  Numero complet: <span className="font-mono text-white/80 ml-2">{card.number?.replace(/(\d{4})/g, "$1 ").trim()}</span>
                </p>
              </div>

              {/* Legal text */}
              <p className="text-[8px] text-white/30">{"Cette carte est la propriete de Pimpay. Usage personnel uniquement."}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={toggleShowInfo}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border ${
            showInfo ? "bg-purple-500/20 border-purple-500/40 text-purple-300" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
          }`}
        >
          {showInfo ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showInfo ? "Masquer infos" : "Afficher infos"}</span>
        </button>
        <button
          onClick={handleFlip}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all border bg-white/5 border-white/10 text-white/70 hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-300"
        >
          <RotateCcw size={16} />
          <span>{isFlipped ? "Voir recto" : "Voir verso"}</span>
        </button>
      </div>
    </div>
  );
}
