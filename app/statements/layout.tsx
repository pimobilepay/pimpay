"use client"; // Obligatoire car on utilise une fonction/état pour le menu

import React, { useState } from 'react';
import SideMenu from '@/components/SideMenu';

export default function StatementsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // On crée un état local ou une fonction vide pour satisfaire le composant SideMenu
  const [isOpen, setIsOpen] = useState(false);
  const handleClose = () => setIsOpen(false);

  return (
    <div className="flex min-h-screen bg-[#020617]">
      {/* CORRECTION : Ajout de la prop open={isOpen} 
          Cela permet au compilateur de valider le type de SideMenu.
      */}
      <SideMenu open={isOpen} onClose={handleClose} />

      <main className="flex-1 w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
