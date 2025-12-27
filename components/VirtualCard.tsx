"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Lock, Unlock, Zap, Contact } from "lucide-react";

interface CardProps {
  holderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  balance: number;
  isLocked?: boolean;
}

export const VirtualCard = ({ 
  holderName = "PIM PIONEER", 
  cardNumber = "4532 8890 1234 5678", 
  expiryDate = "12/28", 
  cvv = "314",
  balance = 0,
  isLocked = false 
}: CardProps) => {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="relative w-full max-w-md mx-auto perspective-1000">
      <motion.div
        initial={{ rotateY: 20, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className={`relative h-60 w-full rounded-[2.5rem] p-8 overflow-hidden border shadow-2xl transition-all duration-500 ${
          isLocked 
          ? "bg-slate-900 border-white/5 grayscale" 
          : "bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 border-white/20"
        }`}
      >
        {/* Background Patterns - Verre et Lumière */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
        </div>

        {/* Top Header: Logo & Type */}
        <div className="relative z-10 flex justify-between items-start mb-8">
          <div className="flex flex-col">
            <h2 className="text-white font-black italic tracking-tighter text-xl leading-none">
              PIMPAY<span className="text-blue-300">CARD</span>
            </h2>
            <div className="flex items-center gap-1 mt-1">
              <Zap size={10} className="text-yellow-400 fill-yellow-400" />
              <span className="text-[8px] font-black text-white/70 uppercase tracking-widest">Premium Web3 Card</span>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10">
             <Contact size={24} className="text-white/80" />
          </div>
        </div>

        {/* Chip & Contactless */}
        <div className="relative z-10 flex items-center gap-4 mb-6">
          <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-lg relative overflow-hidden shadow-inner">
             <div className="absolute inset-0 opacity-30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,black_3px)]" />
          </div>
          <svg className="w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 8c4 0 4 8 8 8s4-8 8-8" />
          </svg>
        </div>

        {/* Card Number */}
        <div className="relative z-10 mb-6">
          <p className="text-2xl font-mono font-bold text-white tracking-[0.2em] drop-shadow-lg">
            {showDetails ? cardNumber : cardNumber.replace(/\d{4} \d{4} \d{4}/, "**** **** ****")}
          </p>
        </div>

        {/* Footer Info */}
        <div className="relative z-10 flex justify-between items-end">
          <div className="space-y-1">
            <p className="text-[8px] text-white/50 uppercase font-bold tracking-widest">Card Holder</p>
            <p className="text-sm font-black text-white uppercase tracking-tight">{holderName}</p>
          </div>
          
          <div className="flex gap-8">
             <div className="space-y-1 text-center">
                <p className="text-[8px] text-white/50 uppercase font-bold tracking-widest">Expires</p>
                <p className="text-sm font-bold text-white font-mono">{expiryDate}</p>
             </div>
             <div className="space-y-1 text-center">
                <p className="text-[8px] text-white/50 uppercase font-bold tracking-widest">CVV</p>
                <p className="text-sm font-bold text-white font-mono">{showDetails ? cvv : "***"}</p>
             </div>
          </div>

          <div className="text-right">
             <p className="text-xl font-black text-white italic">VISA</p>
          </div>
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
