"use client";

import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NetworkAnnouncement = () => {
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch('/api/admin/config');
        if (res.ok) {
          const data = await res.json();
          // On affiche si un message existe et qu'il n'est pas vide
          if (data.globalAnnouncement && data.globalAnnouncement !== "Bienvenue sur PIMPAY.") {
            setAnnouncement(data.globalAnnouncement);
            setIsVisible(true);
          }
        }
      } catch (error) {
        console.error("Erreur annonce:", error);
      }
    };

    fetchAnnouncement();
    // Rafraîchir toutes les 5 minutes
    const interval = setInterval(fetchAnnouncement, 300000);
    return () => clearInterval(interval);
  }, []);

  if (!isVisible || !announcement) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-4 left-4 right-4 z-[100]"
      >
        <div className="bg-blue-600 border border-white/20 shadow-2xl rounded-2xl p-4 flex items-center gap-4">
          <div className="bg-white/20 p-2 rounded-xl animate-pulse">
            <Megaphone size={18} className="text-white" />
          </div>
          
          <div className="flex-1 overflow-hidden">
            <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-0.5">
              Annonce Réseau
            </p>
            <div className="relative h-5 overflow-hidden">
              <p className="text-sm font-bold text-white truncate italic">
                {announcement}
              </p>
            </div>
          </div>

          <button 
            onClick={() => setIsVisible(false)}
            className="p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={16} className="text-white/60" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
