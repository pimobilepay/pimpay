"use client";

import { useState, useEffect } from "react";
// ... vos autres imports (lucide, recharts)

export default function WalletPage() {
  const [mounted, setMounted] = useState(false);

  // useEffect ne s'exécute que sur le navigateur (client)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Si le composant n'est pas encore "monté", on ne rend rien ou un loader
  // Cela évite que React essaie de manipuler le DOM trop tôt
  if (!mounted) {
    return <div className="p-8 text-white">Chargement du portefeuille...</div>;
  }

  return (
    <div className="p-8">
      {/* Tout votre code existant : Carte, Graphique, Transactions */}
    </div>
  );
}
