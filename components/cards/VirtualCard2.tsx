"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Wifi } from 'lucide-react';

// Decorative pattern for MasterCard (ePayService style)
const MasterCardPattern = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
    <text x="-20" y="200" fontSize="180" fontWeight="bold" fill="rgba(255,255,255,0.08)" fontFamily="Arial, sans-serif">100</text>
    <path d="M 350 0 Q 280 80 350 160 Q 420 240 350 320" stroke="rgba(255,255,255,0.1)" strokeWidth="60" fill="none" />
    <path d="M 380 -20 Q 310 60 380 140 Q 450 220 380 300" stroke="rgba(255,255,255,0.05)" strokeWidth="40" fill="none" />
  </svg>
);

// Decorative pattern for VISA (Deep Navy style with blue accents)
const VisaPattern = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
    {/* Abstract shape - elephant/shield like left side */}
    <ellipse cx="70" cy="100" rx="50" ry="45" fill="rgba(59,91,219,0.4)" />
    <ellipse cx="45" cy="110" rx="30" ry="50" fill="rgba(59,91,219,0.35)" />
    {/* Contactless waves pattern */}
    <path d="M 130 80 Q 150 95 130 110" stroke="rgba(59,91,219,0.5)" strokeWidth="3" fill="none" />
    <path d="M 140 75 Q 165 95 140 115" stroke="rgba(59,91,219,0.4)" strokeWidth="3" fill="none" />
    <path d="M 150 70 Q 180 95 150 120" stroke="rgba(59,91,219,0.3)" strokeWidth="3" fill="none" />
    {/* Decorative swirl bottom right */}
    <ellipse cx="360" cy="180" rx="35" ry="35" fill="rgba(59,91,219,0.3)" />
    <path d="M 340 180 Q 360 150 380 180 Q 360 210 340 180" stroke="rgba(59,91,219,0.4)" strokeWidth="2" fill="none" />
  </svg>
);



export default function VirtualCard({ card, user }: any) {
  const [showDetails, setShowDetails] = useState(false);

  const isVisa = card.brand?.toLowerCase() === "visa";
  const isMasterCard = card.brand?.toLowerCase() === "mastercard";
  const last4 = card.number?.slice(-4) || "0000";

  const getCardGradient = () => {
    if (card.isFrozen) return 'bg-gray-800';
    if (isVisa) return 'bg-gradient-to-br from-[#1a1f4e] via-[#252d6a] to-[#1a1f4e]';
    if (isMasterCard) return 'bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]';
    return 'bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]';
  };

  return (
    <div className={`relative w-full aspect-[1.586/1] rounded-[2rem] p-6 text-white shadow-2xl transition-all duration-500 overflow-hidden ${card.isFrozen ? 'grayscale' : ''} ${getCardGradient()}`}>
      {isVisa && !card.isFrozen && <VisaPattern />}
      {isMasterCard && !card.isFrozen && <MasterCardPattern />}

      <div className="relative h-full flex flex-col justify-between z-10">
        {/* Header - PIMPAY VIRTUAL in gold */}
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

        {/* Middle - Contactless icon on right */}
        <div className="flex-1 flex items-end justify-end py-2">
          <Wifi size={24} className={`rotate-90 ${isVisa ? "text-[#3b5bdb]" : "text-[#3b82f6]"}`} />
        </div>

        {/* Card Number - stays on one line */}
        <div className="mb-2">
          <div className="flex items-center gap-3">
            <p className="text-base md:text-lg font-mono tracking-[0.12em] text-white whitespace-nowrap">
              {showDetails ? card.number?.replace(/(\d{4})/g, '$1 ').trim() : `•••• •••• •••• `}
              <span className={isVisa ? "text-[#3b5bdb]" : "text-[#3b82f6]"}>{last4}</span>
            </p>
            <button onClick={() => setShowDetails(!showDetails)} className="p-1.5 hover:bg-white/10 rounded-full">
              {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Bottom - EXPIRE, CVV, Holder - gold labels for Visa */}
        <div className="space-y-1">
          <div className="flex gap-8">
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${isVisa ? "text-[#d4a827]" : "text-gray-400"}`}>EXPIRE</p>
              <p className="text-sm font-bold tracking-widest text-white">{showDetails ? card.exp : "••/••"}</p>
            </div>
            <div>
              <p className={`text-[9px] font-bold uppercase tracking-wider ${isVisa ? "text-[#d4a827]" : "text-gray-400"}`}>CVV</p>
              <p className="text-sm font-bold tracking-widest text-white">{showDetails ? (card.cvv || '***') : '•••'}</p>
            </div>
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-white pt-1">{card.holder}</p>
        </div>
      </div>
    </div>
  );
}
