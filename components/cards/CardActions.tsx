"use client";

import React, { useState } from 'react';
import { 
  Lock, 
  Unlock, 
  Settings, 
  CreditCard, 
  ShieldAlert, 
  Zap,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CardActionsProps {
  cardId: string;
  isFrozen: boolean;
}

export default function CardActions({ cardId, isFrozen }: CardActionsProps) {
  const [loading, setLoading] = useState(false);
  const [frozen, setFrozen] = useState(isFrozen);
  const router = useRouter();

  const handleToggleFreeze = async () => {
    if (!confirm(`Voulez-vous vraiment ${frozen ? 'dégeler' : 'geler'} cette carte ?`)) return;

    setLoading(true);
    try {
      // Appel à l'API (à créer ou adapter selon ton back)
      const res = await fetch(`/api/auth/session/logout-others`, { // Exemple d'appel API
        method: 'POST',
        body: JSON.stringify({ cardId, action: frozen ? 'unfreeze' : 'freeze' })
      });

      // Simulation pour le test si l'API n'est pas encore prête
      setTimeout(() => {
        setFrozen(!frozen);
        setLoading(false);
        router.refresh();
      }, 800);

    } catch (error) {
      console.error("Erreur action carte:", error);
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Bouton Geler / Dégeler */}
      <button
        onClick={handleToggleFreeze}
        disabled={loading}
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
          frozen 
          ? 'bg-green-50 border-green-100 text-green-700 hover:bg-green-100' 
          : 'bg-amber-50 border-amber-100 text-amber-700 hover:bg-amber-100'
        }`}
      >
        <div className={`p-2 rounded-xl ${frozen ? 'bg-green-500 text-white' : 'bg-amber-500 text-white'}`}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : (frozen ? <Unlock size={20} /> : <Lock size={20} />)}
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">
            {frozen ? "Activer la carte" : "Geler la carte"}
          </p>
          <p className="text-[10px] opacity-70">Sécurité instantanée</p>
        </div>
      </button>

      {/* Bouton Limites (Exemple d'autre action) */}
      <button className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all">
        <div className="p-2 rounded-xl bg-gray-200 text-gray-600">
          <Settings size={20} />
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">Plafonds</p>
          <p className="text-[10px] opacity-70">Gérer les limites</p>
        </div>
      </button>

      {/* Bouton Remplacer */}
      <button className="flex items-center gap-4 p-4 rounded-2xl border border-gray-100 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all">
        <div className="p-2 rounded-xl bg-gray-200 text-gray-600">
          <Zap size={20} />
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">Détails</p>
          <p className="text-[10px] opacity-70">Voir les infos sensibles</p>
        </div>
      </button>

      {/* Bouton Signaler */}
      <button className="flex items-center gap-4 p-4 rounded-2xl border border-red-50 bg-red-50/30 text-red-600 hover:bg-red-50 transition-all">
        <div className="p-2 rounded-xl bg-red-100 text-red-600">
          <ShieldAlert size={20} />
        </div>
        <div className="text-left">
          <p className="font-bold text-sm uppercase tracking-tight">Signaler</p>
          <p className="text-[10px] opacity-70">Perte ou vol</p>
        </div>
      </button>
    </div>
  );
}
