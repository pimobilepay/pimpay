"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function VirtualCard({ card, user }: any) {
  const [showDetails, setShowDetails] = useState(false);

  // Utilisation des champs 'number', 'exp', 'holder' de ton schéma
  const formatCardNumber = (num: string) => {
    if (!showDetails) return `•••• •••• •••• ${num.slice(-4)}`;
    return num.replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className={`relative w-full aspect-[1.586/1] rounded-[2rem] p-8 text-white shadow-2xl transition-all duration-500 overflow-hidden ${card.isFrozen ? 'grayscale bg-gray-800' : 'bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]'}`}>
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <span className="text-[10px] font-bold text-[#6C5CE7] uppercase tracking-widest flex items-center gap-1">
            <ShieldCheck size={12} /> Pimpay Virtual
          </span>
          <div className="italic font-black text-xl italic">{card.brand}</div>
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
              <p className="text-[10px] text-gray-500 uppercase">Expire</p>
              <p className="text-sm font-bold tracking-widest">{card.exp}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">CVV</p>
              <p className="text-sm font-bold tracking-widest">{showDetails ? (card.cvv || '***') : '•••'}</p>
            </div>
          </div>
        </div>

        <p className="text-sm font-medium tracking-wide uppercase">{card.holder}</p>
      </div>
    </div>
  );
}
