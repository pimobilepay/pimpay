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

  const formatCardNumber = (num: string) => {
    if (!showDetails) return `•••• •••• •••• ${num.slice(-4)}`;
    return num.replace(/(\d{4})/g, '$1 ').trim();
  };

  const getCardGradient = () => {
    if (card.isFrozen) return 'bg-gray-800';
    if (isVisa) return 'bg-gradient-to-br from-[#5c6bc0] via-[#5c6bc0] to-[#3f51b5]';
    if (isMasterCard) return 'bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b]';
    return 'bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]';
  };

  return (
    <div className={`relative w-full aspect-[1.586/1] rounded-[2rem] p-8 text-white shadow-2xl transition-all duration-500 overflow-hidden ${card.isFrozen ? 'grayscale' : ''} ${getCardGradient()}`}>
      {/* Decorative patterns */}
      {isVisa && !card.isFrozen && <VisaPattern />}
      {isMasterCard && !card.isFrozen && <MasterCardPattern />}

      <div className="relative h-full flex flex-col justify-between z-10">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest flex items-center gap-1">
              <ShieldCheck size={12} /> Pimpay
            </span>
            <span className="text-[12px] font-semibold text-white/90 tracking-wide">Virtual</span>
          </div>
          {isVisa ? (
            <div className="flex flex-col items-end">
              <span className="text-2xl font-black italic text-[#1a237e] tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
              <span className="text-[8px] font-medium text-[#1a237e]/70 tracking-wider -mt-1">Platinum Business</span>
            </div>
          ) : isMasterCard ? (
            <div className="flex flex-col items-end">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-[#eb001b]" />
                <div className="w-8 h-8 rounded-full bg-[#f79e1b] -ml-3" />
              </div>
              <span className="text-[9px] font-medium text-white/80 tracking-wider mt-0.5">debit</span>
            </div>
          ) : (
            <div className="italic font-black text-xl">{card.brand}</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-12 h-9 rounded-md bg-gradient-to-br from-[#ffd700] to-[#daa520]">
            <div className="w-full h-full grid grid-cols-3 gap-[1px] p-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-black/20 rounded-[1px]"></div>
              ))}
            </div>
          </div>
          <Wifi size={20} className="rotate-90 text-white/60" />
        </div>

        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl md:text-3xl font-mono tracking-[0.2em]">
              {formatCardNumber(card.number)}
            </h2>
            <button onClick={() => setShowDetails(!showDetails)} className="p-2 hover:bg-white/10 rounded-full">
              {showDetails ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <div className="flex gap-10">
            <div>
              <p className="text-[10px] text-white/50 uppercase">Expire</p>
              <p className="text-sm font-bold tracking-widest">{card.exp}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50 uppercase">CVV</p>
              <p className="text-sm font-bold tracking-widest">{showDetails ? (card.cvv || '***') : '•••'}</p>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium tracking-wide uppercase text-white/90">{card.holder}</p>
      </div>
    </div>
  );
}
