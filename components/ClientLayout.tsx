"use client";

import { useEffect, useState } from "react";
import SideMenu from "@/components/SideMenu";
import { BottomNav } from "@/components/bottom-nav";
import { usePathname } from "next/navigation";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Déterminer si on est sur une page d'authentification
  const isAuthPage = pathname?.startsWith("/auth") || pathname?.includes("/login") || pathname?.includes("/signup");

  // Rendu de chargement stable pour l'hydratation
  if (!mounted) {
    return (
      <div className="bg-[#020617] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col bg-[#020617] selection:bg-blue-500/30"
      suppressHydrationWarning
    >
      {/* Menu Latéral : On ne le rend pas sur les pages Auth */}
      {!isAuthPage && (
        <SideMenu 
          open={isMenuOpen} 
          onClose={() => setIsMenuOpen(false)} 
        />
      )}

      {/* Contenu Principal */}
      <main 
        className={`flex-grow relative z-0 transition-all duration-300 ${
          !isAuthPage ? "pb-20 lg:pb-0" : ""
        }`}
      >
        {children}
      </main>

      {/* Navigation Basse : Uniquement pour les utilisateurs connectés hors Auth */}
      {!isAuthPage && (
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
      )}
    </div>
  );
}
