"use client";
import { useState } from 'react';
import { toast } from 'sonner';
import { Pi, Usd, Euro, Gbp, CheckCircle, Lock, Wallet } from 'lucide-react'; // Icônes
import Image from 'next/image'; // Pour les logos de marque, si tu en ajoutes

// Définition des types et de la configuration pour chaque carte
type CardType = 'PREMIUM' | 'GOLD' | 'PLATINIUM';

interface CardConfig {
  label: string;
  usdPrice: number;
  piPrice?: number; // Calculé dynamiquement par le parent
  limit: string;
  currencies: string[];
  features: string[];
  gradientClass: string;
  icon: string; // Pour l'icône de la carte si tu as des SVG
}

const CARD_SPECS: Record<CardType, CardConfig> = {
  PREMIUM: {
    label: "Premium",
    usdPrice: 25,
    limit: "$1,000 / jour",
    currencies: ["PI"],
    features: ["Paiements PI", "Limites standards", "Accès à l'écosystème"],
    gradientClass: "bg-gradient-to-br from-blue-600/30 to-blue-900/30 backdrop-blur-md border-blue-500/20",
    icon: "/icons/premium.svg" // Exemple de chemin d'icône
  },
  GOLD: {
    label: "Gold",
    usdPrice: 50,
    limit: "$10,000 / jour",
    currencies: ["PI", "USD"],
    features: ["Toutes fonctionnalités Premium", "Paiements USD", "Cashback 1%", "Support prioritaire"],
    gradientClass: "bg-gradient-to-br from-yellow-500/30 to-amber-700/30 backdrop-blur-md border-yellow-500/20",
    icon: "/icons/gold.svg"
  },
  PLATINIUM: {
    label: "Platinium",
    usdPrice: 10, // Prix corrigé comme demandé
    limit: "Illimité",
    currencies: ["PI", "USD", "EUR", "GBP"],
    features: ["Toutes fonctionnalités Gold", "Paiements EUR/GBP", "Cashback 3%", "Concierge 24/7"],
    gradientClass: "bg-gradient-to-br from-slate-500/30 to-gray-800/30 backdrop-blur-md border-slate-400/20",
    icon: "/icons/platinium.svg"
  },
};

export default function CardSelector({ piPriceInUsd, onCardCreated }: { piPriceInUsd: number, onCardCreated: () => void }) {
  const [selectedCard, setSelectedCard] = useState<CardType>('PREMIUM');
  const [paymentMethod, setPaymentMethod] = useState<'PI' | 'USD'>('PI');
  const [isCreating, setIsCreating] = useState(false);

  const currentConfig = CARD_SPECS[selectedCard];
  const priceInPi = currentConfig.usdPrice / piPriceInUsd;

  const handleCreateCard = async () => {
    setIsCreating(true);
    try {
      const res = await fetch('/api/cards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: selectedCard, 
          holderName: "John Doe", // À remplacer par le nom de l'utilisateur
          paymentCurrency: paymentMethod 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Erreur de création de carte.");
      }

      toast.success(`Votre carte ${currentConfig.label} a été activée !`);
      onCardCreated(); // Callback pour rafraîchir la liste des cartes
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 md:p-12 font-sans relative overflow-hidden">
      {/* Effet de fond subtil */}
      <div className="absolute inset-0 z-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-700 via-gray-900 to-black"></div>
      
      <div className="relative z-10 max-w-6xl mx-auto space-y-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center tracking-tight leading-tight italic">
          Choisissez Votre <span className="text-blue-500">Carte Virtuelle</span>
        </h1>
        <p className="text-center text-gray-400 text-lg max-w-2xl mx-auto">
          Activez une carte virtuelle PimPay pour des transactions sécurisées et des avantages exclusifs dans l'écosystème.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
          {Object.entries(CARD_SPECS).map(([type, spec]) => (
            <div 
              key={type} 
              className={`
                relative p-8 rounded-[2.5rem] shadow-2xl transition-all duration-300
                flex flex-col items-center text-center
                ${spec.gradientClass}
                ${selectedCard === type ? 'ring-4 ring-blue-500/70 scale-[1.03]' : 'ring-2 ring-transparent hover:scale-[1.02]'}
                cursor-pointer
              `}
              onClick={() => setSelectedCard(type as CardType)}
            >
              {/* Effet de brillance */}
              <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none opacity-20"
                   style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 60%)' }}></div>

              <div className="relative z-10">
                {/* Icône de la carte, si tu en as */}
                {spec.icon && (
                  <Image src={spec.icon} alt={spec.label} width={64} height={64} className="mx-auto mb-4"/>
                )}

                <h2 className="text-3xl font-black mb-2 uppercase tracking-wide">{spec.label}</h2>
                <p className="text-sm text-gray-400 mb-6">Idéale pour {spec.label === "Premium" ? "vos débuts" : spec.label === "Gold" ? "les utilisateurs actifs" : "les power-users"}</p>

                <div className="text-5xl font-extrabold text-blue-400 mb-8">
                  ${spec.usdPrice}
                  <span className="text-xl text-gray-500"> /activation</span>
                </div>

                <ul className="text-left space-y-3 mb-8 text-gray-300">
                  {spec.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-sm">
                      <CheckCircle size={16} className="text-green-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                  <li className="flex items-center gap-3 text-sm">
                    <Wallet size={16} className="text-purple-400 flex-shrink-0" />
                    Devises: {spec.currencies.join(', ')}
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <Lock size={16} className="text-red-400 flex-shrink-0" />
                    Limite: {spec.limit}
                  </li>
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Section de confirmation et de paiement */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Activer la carte {currentConfig.label}</h3>
            <p className="text-gray-400">
              Coût : <span className="text-blue-400 font-bold">${currentConfig.usdPrice} USD</span> 
              {" / "} 
              <span className="text-pi-orange font-bold">
                {priceInPi.toFixed(6)} PI
              </span>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setPaymentMethod('PI')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                paymentMethod === 'PI' ? 'bg-pi-orange text-black' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Payer en PI <Pi size={16} className="inline ml-2" />
            </button>
            <button
              onClick={() => setPaymentMethod('USD')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                paymentMethod === 'USD' ? 'bg-blue-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              Payer en USD <Usd size={16} className="inline ml-2" />
            </button>
            <button 
              onClick={handleCreateCard} 
              disabled={isCreating}
              className="px-8 py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isCreating ? 'Activation...' : 'Activer maintenant'}
              {isCreating && <span className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></span>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
