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

// Decorative pattern for VISA (Platinum Business style)
const VisaPattern = () => (
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 250" preserveAspectRatio="xMidYMid slice">
    <ellipse cx="320" cy="60" rx="120" ry="80" fill="rgba(0,0,50,0.3)" />
    <ellipse cx="350" cy="120" rx="100" ry="70" fill="rgba(0,0,50,0.2)" />
    <ellipse cx="80" cy="200" rx="150" ry="100" fill="rgba(0,0,50,0.15)" />
  </svg>
);



export default function VirtualCard({ card, user }: any) {
  const [showDetails, setShowDetails] = useState(false);

  const isVisa = card.brand?.toLowerCase() === "visa";
  const isMasterCard = card.brand?.toLowerCase() === "mastercard";
  const last4 = card.number?.slice(-4) || "0000";

  const getCardGradient = () => {
    if (card.isFrozen) return 'bg-gray-800';
    if (isVisa) return 'bg-gradient-to-br from-[#5c6bc0] via-[#5c6bc0] to-[#3f51b5]';
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

        {/* Middle - Contactless icon on right */}
        <div className="flex-1 flex items-end justify-end py-2">
          <Wifi size={24} className="rotate-90 text-[#3b82f6]" />
        </div>

        {/* Card Number - stays on one line */}
        <div className="mb-2">
          <div className="flex items-center gap-3">
            <p className="text-base md:text-lg font-mono tracking-[0.12em] text-white whitespace-nowrap">
              {showDetails ? card.number?.replace(/(\d{4})/g, '$1 ').trim() : `•••• •••• •••• `}
              <span className="text-[#3b82f6]">{last4}</span>
            </p>
            <button onClick={() => setShowDetails(!showDetails)} className="p-1.5 hover:bg-white/10 rounded-full">
              {showDetails ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Bottom - EXPIRE, CVV, Holder */}
        <div className="space-y-1">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">EXPIRE</p>
              <p className="text-sm font-bold tracking-widest text-white">{showDetails ? card.exp : "••/••"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">CVV</p>
              <p className="text-sm font-bold tracking-widest text-white">{showDetails ? (card.cvv || '***') : '•••'}</p>
            </div>
          </div>
          <p className="text-sm font-black uppercase tracking-widest text-white pt-1">{card.holder}</p>
        </div>
      </div>
    </div>
  );
}
