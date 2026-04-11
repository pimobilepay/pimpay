"use client";
import React, { useState } from "react";
import { Eye, EyeOff, ShieldCheck, Wifi, RotateCcw } from "lucide-react";

// Decorative wave pattern for MasterCard (similar to ePayService design)
const MasterCardPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 400 250"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <text x="-20" y="200" fontSize="180" fontWeight="bold" fill="rgba(255,255,255,0.08)" fontFamily="Arial, sans-serif">100</text>
    <path d="M 350 0 Q 280 80 350 160 Q 420 240 350 320" stroke="rgba(255,255,255,0.1)" strokeWidth="60" fill="none" />
    <path d="M 380 -20 Q 310 60 380 140 Q 450 220 380 300" stroke="rgba(255,255,255,0.05)" strokeWidth="40" fill="none" />
  </svg>
);

// Decorative wave pattern for VISA (Platinum Business style)
const VisaPattern = () => (
  <svg
    className="absolute inset-0 w-full h-full"
    viewBox="0 0 400 250"
    preserveAspectRatio="xMidYMid slice"
    xmlns="http://www.w3.org/2000/svg"
  >
    <ellipse cx="320" cy="60" rx="120" ry="80" fill="rgba(0,0,50,0.3)" />
    <ellipse cx="350" cy="120" rx="100" ry="70" fill="rgba(0,0,50,0.2)" />
    <ellipse cx="80" cy="200" rx="150" ry="100" fill="rgba(0,0,50,0.15)" />
  </svg>
);



export default function VirtualCard({ card, user }: any) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const last4 = card.number?.slice(-4) || "0000";

  const formatCardNumber = (num: string) => {
    if (showInfo) {
      return num.replace(/(\d{4})/g, "$1 ").trim();
    }
    return `•••• •••• •••• `;
  };

  const isVisa = card.brand?.toLowerCase() === "visa";
  const isMasterCard = card.brand?.toLowerCase() === "mastercard";

  const visaGradient = "bg-gradient-to-br from-[#5c6bc0] via-[#5c6bc0] to-[#3f51b5]";
  const masterCardGradient = "bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]";
  const defaultGradient = "bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]";

  const getCardGradient = () => {
    if (card.isFrozen) return "bg-gray-800";
    if (isVisa) return visaGradient;
    if (isMasterCard) return masterCardGradient;
    return defaultGradient;
  };

  const getBackGradient = () => {
    if (card.isFrozen) return "bg-gray-800";
    if (isVisa) return "bg-gradient-to-br from-[#3f51b5] via-[#5c6bc0] to-[#7986cb]";
    if (isMasterCard) return "bg-gradient-to-br from-[#01579b] via-[#0277bd] to-[#0288d1]";
    return "bg-gradient-to-br from-[#2d2d2d] via-[#1a1a1a] to-[#2d2d2d]";
  };

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
            } ${getCardGradient()}`}
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
                  <span className="text-2xl font-black italic text-[#3b82f6] tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
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
                <Wifi size={24} className="rotate-90 text-[#3b82f6]" />
              </div>

              {/* Card Number - stays on one line */}
              <div className="mb-2">
                <p className="text-base md:text-lg font-black tracking-[0.12em] font-mono text-white whitespace-nowrap">
                  {formatCardNumber(card.number)}
                  <span className="text-[#3b82f6]">{last4}</span>
                </p>
              </div>

              {/* Bottom Section - EXPIRE, CVV labels in gray */}
              <div className="space-y-1">
                <div className="flex gap-8">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">EXPIRE</p>
                    <p className="text-sm font-bold tracking-widest text-white">{showInfo ? card.exp : "••/••"}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">CVV</p>
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
              card.isFrozen ? "grayscale" : ""
            } ${getBackGradient()}`}
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
