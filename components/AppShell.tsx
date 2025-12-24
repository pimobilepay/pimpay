"use client";

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import SideMenu from "@/components/SideMenu";

export default function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Déterminer si on est sur une page d'authentification
  const isAuthPage = pathname?.startsWith("/auth") || 
                     pathname?.includes("/login") || 
                     pathname?.includes("/signup");

  // Rendu initial neutre pour éviter le mismatch serveur/client
  if (!mounted) {
    return <div className="bg-[#020617] min-h-screen" aria-hidden="true" />;
  }

  return (
    <div
      className="relative min-h-screen bg-[#020617] text-white overflow-x-hidden"
      suppressHydrationWarning
    >
      {/* 1. Menu Latéral (uniquement hors pages Auth) 
      */}
      {!isAuthPage && (
        <SideMenu open={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      )}

      {/* 2. Contenu principal
          On évite 'contents' et on utilise une structure stable pour React 
      */}
      <main className={`flex-grow relative z-0 transition-all ${!isAuthPage ? "pb-24" : ""}`}>
        {children}
      </main>

      {/* 3. Barre de navigation basse
      */}
      {!isAuthPage && (
        <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
      )}
    </div>
  );
}
