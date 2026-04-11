"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Unlock, Wifi, ShieldCheck } from "lucide-react";

interface CardProps {
  holderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  balance: number;
  isLocked?: boolean;
  brand?: "VISA" | "MASTERCARD";
}

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



export const VirtualCard = ({ 
  holderName = "PIM PIONEER", 
  cardNumber = "4532 8890 1234 5678", 
  expiryDate = "12/28", 
  cvv = "314",
  balance = 0,
  isLocked = false,
  brand = "VISA"
}: CardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  const isVisa = brand === "VISA";
  const isMasterCard = brand === "MASTERCARD";

  const getCardGradient = () => {
    if (isLocked) return "bg-slate-900 border-white/5 grayscale";
    if (isVisa) return "bg-gradient-to-br from-[#5c6bc0] via-[#5c6bc0] to-[#3f51b5] border-indigo-400/30";
    if (isMasterCard) return "bg-gradient-to-br from-[#0288d1] via-[#0277bd] to-[#01579b] border-cyan-400/30";
    return "bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a] border-white/20";
  };

  return (
    <div className="relative w-full max-w-md mx-auto perspective-1000">
      <motion.div
        initial={{ rotateY: 20, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className={`relative h-60 w-full rounded-[2.5rem] p-8 overflow-hidden border shadow-2xl transition-all duration-500 ${getCardGradient()}`}
      >
        {/* Background Patterns */}
        {isVisa && !isLocked && <VisaPattern />}
        {isMasterCard && !isLocked && <MasterCardPattern />}

        {/* Header - PIMPAY VIRTUAL in gold */}
        <div className="relative z-10 flex justify-between items-start mb-4">
          <div className="flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-[#FFD700]" />
            <span className="text-[11px] font-black text-[#FFD700] uppercase tracking-widest">PIMPAY VIRTUAL</span>
          </div>
          {isVisa ? (
            <span className="text-2xl font-black italic text-[#3b82f6] tracking-tight" style={{ fontFamily: "Arial, sans-serif" }}>VISA</span>
          ) : (
            <div className="flex items-center">
              <div className="w-7 h-7 rounded-full bg-[#eb001b]" />
              <div className="w-7 h-7 rounded-full bg-[#f79e1b] -ml-3" />
            </div>
          )}
        </div>

        {/* Middle - Contactless icon on right */}
        <div className="relative z-10 flex items-end justify-end flex-1 py-2">
          <Wifi size={24} className="rotate-90 text-[#3b82f6]" />
        </div>

        {/* Card Number - stays on one line */}
        <div className="relative z-10 mb-2">
          <p className="text-base font-mono font-bold text-white tracking-[0.12em] whitespace-nowrap">
            {showDetails ? cardNumber : `•••• •••• •••• `}
            <span className="text-[#3b82f6]">{cardNumber.slice(-4)}</span>
          </p>
        </div>

        {/* Bottom - EXPIRE, CVV, Holder */}
        <div className="relative z-10 space-y-1">
          <div className="flex gap-8">
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">EXPIRE</p>
              <p className="text-sm font-bold text-white">{showDetails ? expiryDate : "••/••"}</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">CVV</p>
              <p className="text-sm font-bold text-white">{showDetails ? cvv : "•••"}</p>
            </div>
          </div>
          <p className="text-sm font-black text-white uppercase tracking-widest pt-1">{holderName}</p>
        </div>

        {/* Overlay si la carte est verrouillée */}
        {isLocked && (
          <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
             <Lock size={40} className="text-white/20 mb-2" />
             <p className="text-[10px] font-black text-white/40 uppercase tracking-[4px]">Carte Verrouillée</p>
          </div>
        )}
      </motion.div>

      {/* Boutons d'action sous la carte */}
      <div className="mt-6 flex justify-center gap-4 px-4">
        <button 
          onClick={() => setShowDetails(!showDetails)}
          className="flex-1 h-14 bg-slate-900/50 hover:bg-slate-900 border border-white/5 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl"
        >
          {showDetails ? <EyeOff size={18} className="text-blue-400" /> : <Eye size={18} className="text-blue-400" />}
          <span className="text-[10px] font-black text-white uppercase tracking-widest">
            {showDetails ? "Masquer" : "Révéler"}
          </span>
        </button>

        <button 
          className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl border ${
            isLocked 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
            : "bg-red-500/10 border-red-500/20 text-red-500"
          }`}
        >
          {isLocked ? <Unlock size={18} /> : <Lock size={18} />}
          <span className="text-[10px] font-black uppercase tracking-widest">
            {isLocked ? "Débloquer" : "Geler"}
          </span>
        </button>
      </div>

      {/* Solde rattaché à la carte */}
      <div className="mt-6 text-center">
         <p className="text-[10px] font-black text-slate-500 uppercase tracking-[5px] mb-1">Balance Disponible</p>
         <p className="text-3xl font-black text-white">
            <span className="text-blue-500">π</span> {balance.toLocaleString()}
         </p>
      </div>
    </div>
  );
};
