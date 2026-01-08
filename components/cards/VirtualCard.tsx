"use client";

import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface VirtualCardProps {
  card: {
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    holderName?: string;
    isFrozen?: boolean;
  };
  user: {
    username: string;
  };
}

export default function VirtualCard({ card, user }: VirtualCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Formattage du numéro : 1234 5678 ....
  const formatCardNumber = (num: string) => {
    if (!showDetails) return `•••• •••• •••• ${num.slice(-4)}`;
    return num.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim();
  };

  return (
    <div className={`relative w-full aspect-[1.586/1] rounded-[2rem] p-8 text-white shadow-2xl transition-all duration-500 overflow-hidden ${card.isFrozen ? 'grayscale bg-gray-800' : 'bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]'}`}>
      
      {/* Design Background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-[#6C5CE7] opacity-10 rounded-full -mr-20 -mt-20 blur-3xl" />
      
      <div className="relative h-full flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-widest">Pimpay Virtual Card</p>
            <div className="flex items-center gap-2 mt-1">
              <ShieldCheck size={14} className="text-[#6C5CE7]" />
              <span className="text-[10px] font-bold text-[#6C5CE7] uppercase">Secured</span>
            </div>
          </div>
          <div className="italic font-black text-xl">VISA</div>
        </div>

        <div>
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-2xl md:text-3xl font-mono tracking-[0.2em]">
              {formatCardNumber(card.cardNumber)}
            </h2>
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              {showDetails ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <div className="flex gap-10">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Expire</p>
              <p className="text-sm font-bold tracking-widest">{card.expiryDate}</p>
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase">CVV</p>
              <p className="text-sm font-bold tracking-widest">{showDetails ? card.cvv : '•••'}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <p className="text-sm font-medium tracking-wide uppercase">
            {card.holderName || user.username}
          </p>
          <div className="flex -space-x-3">
             <div className="w-8 h-8 rounded-full bg-red-500/80" />
             <div className="w-8 h-8 rounded-full bg-yellow-500/80" />
          </div>
        </div>
      </div>
    </div>
  );
}
