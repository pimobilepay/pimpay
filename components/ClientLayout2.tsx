"use client";

import { useEffect, useState } from "react";
// Assure-toi que le fichier SideMenu.tsx contient bien le code avec "Principal", "Transactions", etc.
import SideMenu from "@/components/SideMenu"; 
import { BottomNav } from "@/components/bottom-nav";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Détection des pages d'authentification pour pimpay
  const isAuthPage = pathname?.startsWith("/auth/login") ||
                     pathname?.startsWith("/auth/signup");

  if (!mounted) {
    return (
      <div className="bg-[#020617] min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors duration-500 ${
        isDarkMode ? "bg-[#020617] text-white" : "bg-white text-slate-900"
      }`}
    >
      {/* Structure pour les pages connectées */}
      {!isAuthPage && (
        <>
          {/* On utilise uniquement SideMenu ici */}
          <SideMenu
            open={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
          />

          <main className="flex-grow relative z-0 pb-24 lg:pb-0">
            {children}
          </main>

          <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
        </>
      )}

      {/* Structure pour les pages d'authentification */}
      {isAuthPage && (
        <main className="flex-grow">
          {children}
        </main>
      )}
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LayoutContent>
        {children}
      </LayoutContent>
    </ThemeProvider>
  );
}
