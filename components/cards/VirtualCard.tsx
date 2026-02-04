"use client";
import React, { useState } from 'react';
import { Eye, EyeOff, ShieldCheck, Wifi } from 'lucide-react';

export default function VirtualCard({ card, user }: any) {
  const [isFlipped, setIsFlipped] = useState(false);

  const formatCardNumber = (num: string) => {
    return `•••• •••• •••• ${num.slice(-4)}`;
  };

  const formatCardNumberFull = (num: string) => {
    return num.replace(/(\d{4})/g, '$1 ').trim();
  };

  const isVisa = card.brand?.toLowerCase() === 'visa';
  const isMasterCard = card.brand?.toLowerCase() === 'mastercard';

  // Design Visa - Bleu et Or
  const visaGradient = 'bg-gradient-to-br from-[#1a1f71] via-[#2d3a8c] to-[#0d1137]';
  
  // Design MasterCard - Rouge et Orange
  const masterCardGradient = 'bg-gradient-to-br from-[#eb001b] via-[#c41230] to-[#ff5f00]';
  
  // Design par défaut
  const defaultGradient = 'bg-gradient-to-br from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]';

  const getCardGradient = () => {
    if (card.isFrozen) return 'bg-gray-800';
    if (isVisa) return visaGradient;
    if (isMasterCard) return masterCardGradient;
    return defaultGradient;
  };

  // Gradient pour le dos de la carte
  const getBackGradient = () => {
    if (card.isFrozen) return 'bg-gray-800';
    if (isVisa) return 'bg-gradient-to-br from-[#0d1137] via-[#1a1f71] to-[#2d3a8c]';
    if (isMasterCard) return 'bg-gradient-to-br from-[#ff5f00] via-[#c41230] to-[#eb001b]';
    return 'bg-gradient-to-br from-[#2d2d2d] via-[#1a1a1a] to-[#2d2d2d]';
  };

  // Logo Visa
  const VisaLogo = () => (
    <div className="flex items-center">
      <span className="text-2xl md:text-3xl font-black italic text-white tracking-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
        VISA
      </span>
    </div>
  );

  // Logo MasterCard avec les cercles
  const MasterCardLogo = () => (
    <div className="flex items-center gap-[-8px]">
      <div className="flex items-center">
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#eb001b] opacity-90"></div>
        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#f79e1b] opacity-90 -ml-4"></div>
      </div>
      <span className="text-xs font-bold ml-2 tracking-wider">mastercard</span>
    </div>
  );

  // Logo par défaut
  const DefaultLogo = () => (
    <div className="italic font-black text-xl">{card.brand}</div>
  );

  const renderLogo = () => {
    if (isVisa) return <VisaLogo />;
    if (isMasterCard) return <MasterCardLogo />;
    return <DefaultLogo />;
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="relative w-full aspect-[1.586/1]" style={{ perspective: '1000px' }}>
      <div 
        className={`relative w-full h-full transition-transform duration-700 ease-in-out`}
        style={{ 
          transformStyle: 'preserve-3d',
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* Face avant de la carte */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-[1.5rem] p-6 md:p-8 text-white shadow-2xl overflow-hidden ${card.isFrozen ? 'grayscale' : ''} ${getCardGradient()}`}
          style={{ backfaceVisibility: 'hidden' }}
        >
          {/* Motif de fond pour Visa */}
          {isVisa && !card.isFrozen && (
            <>
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#f7b924]/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-[#f7b924]/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </>
          )}

          {/* Motif de fond pour MasterCard */}
          {isMasterCard && !card.isFrozen && (
            <>
              <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-[#ff5f00]/30 to-transparent rounded-full -translate-y-1/3 translate-x-1/3"></div>
              <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-[#eb001b]/20 to-transparent rounded-full translate-y-1/3 -translate-x-1/3"></div>
              <div className="absolute top-1/2 left-1/2 w-40 h-40 bg-[#f79e1b]/10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            </>
          )}

          <div className="relative h-full flex flex-col justify-between z-10">
            {/* Header */}
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${isVisa ? 'text-[#f7b924]' : isMasterCard ? 'text-white/80' : 'text-[#6C5CE7]'}`}>
                  <ShieldCheck size={12} /> Pimpay Virtual
                </span>
              </div>
              {renderLogo()}
            </div>

            {/* Chip et Contactless */}
            <div className="flex items-center gap-4 my-2">
              {/* Puce de carte */}
              <div className={`w-12 h-9 rounded-md ${isVisa ? 'bg-gradient-to-br from-[#f7b924] to-[#d4a017]' : isMasterCard ? 'bg-gradient-to-br from-[#ffd700] to-[#daa520]' : 'bg-gradient-to-br from-[#d4af37] to-[#b8860b]'}`}>
                <div className="w-full h-full grid grid-cols-3 gap-[1px] p-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-black/20 rounded-[1px]"></div>
                  ))}
                </div>
              </div>
              {/* Icône Contactless */}
              <Wifi size={24} className="rotate-90 text-white/60" />
            </div>

            {/* Numéro de carte */}
            <div>
              <div className="flex items-center gap-4 mb-3">
                <h2 className="text-xl md:text-2xl lg:text-3xl font-mono tracking-[0.15em] text-white">
                  {formatCardNumber(card.number)}
                </h2>
                <button 
                  onClick={handleFlip}
                  className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${isVisa ? 'hover:bg-[#f7b924]/20' : isMasterCard ? 'hover:bg-white/20' : 'hover:bg-white/10'}`}
                  title="Voir le CVV"
                >
                  <Eye size={18} />
                </button>
              </div>
              
              {/* Expiration */}
              <div className="flex gap-8">
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isVisa ? 'text-[#f7b924]/70' : isMasterCard ? 'text-white/50' : 'text-gray-500'}`}>Expire</p>
                  <p className="text-sm font-bold tracking-widest">{card.exp}</p>
                </div>
                <div>
                  <p className={`text-[10px] uppercase tracking-wider ${isVisa ? 'text-[#f7b924]/70' : isMasterCard ? 'text-white/50' : 'text-gray-500'}`}>CVV</p>
                  <p className="text-sm font-bold tracking-widest">•••</p>
                </div>
              </div>
            </div>

            {/* Nom du titulaire */}
            <p className={`text-sm font-medium tracking-wide uppercase ${isVisa ? 'text-white/90' : isMasterCard ? 'text-white/90' : 'text-white'}`}>
              {card.holder}
            </p>
          </div>

          {/* Hologramme effet pour Visa */}
          {isVisa && !card.isFrozen && (
            <div className="absolute bottom-6 right-6 w-12 h-8 bg-gradient-to-r from-[#f7b924]/40 via-[#c0c0c0]/30 to-[#f7b924]/40 rounded animate-pulse"></div>
          )}
        </div>

        {/* Face arrière de la carte (CVV) */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-[1.5rem] text-white shadow-2xl overflow-hidden ${card.isFrozen ? 'grayscale' : ''} ${getBackGradient()}`}
          style={{ 
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)'
          }}
        >
          {/* Bande magnétique */}
          <div className="w-full h-14 bg-black/80 mt-6"></div>
          
          {/* Zone de signature et CVV */}
          <div className="p-6 md:p-8 h-[calc(100%-3.5rem)] flex flex-col justify-between">
            {/* Zone de signature avec CVV */}
            <div className="mt-4">
              <div className="flex items-center gap-4">
                {/* Zone de signature */}
                <div className="flex-1 h-10 bg-white/90 rounded flex items-center justify-end px-4">
                  <div className="bg-white px-3 py-1 border-l-2 border-gray-300">
                    <span className="text-black font-mono font-bold text-lg tracking-widest">
                      {card.cvv || '***'}
                    </span>
                  </div>
                </div>
              </div>
              <p className={`text-[10px] mt-2 uppercase tracking-wider ${isVisa ? 'text-[#f7b924]/70' : isMasterCard ? 'text-white/50' : 'text-gray-400'}`}>
                Code de sécurité (CVV)
              </p>
            </div>

            {/* Informations supplémentaires */}
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-white/60">
                <span>Numéro complet:</span>
                <span className="font-mono tracking-wider">{formatCardNumberFull(card.number)}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-white/60">
                <span>Titulaire:</span>
                <span className="uppercase">{card.holder}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-white/60">
                <span>Expiration:</span>
                <span>{card.exp}</span>
              </div>
            </div>

            {/* Bouton retour et logo */}
            <div className="flex justify-between items-center">
              <button 
                onClick={handleFlip}
                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 hover:scale-105 ${isVisa ? 'bg-[#f7b924]/20 hover:bg-[#f7b924]/30' : isMasterCard ? 'bg-white/10 hover:bg-white/20' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <EyeOff size={16} />
                <span className="text-xs font-medium">Masquer</span>
              </button>
              
              <div className="opacity-50 scale-75">
                {renderLogo()}
              </div>
            </div>
          </div>

          {/* Texte légal */}
          <div className="absolute bottom-2 left-0 right-0 text-center">
            <p className="text-[8px] text-white/30 px-4">
              Cette carte est la propriété de Pimpay. Usage personnel uniquement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
