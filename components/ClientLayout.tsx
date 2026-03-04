"use client";

import { useEffect, useState } from "react";
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

  const isAuthPage = pathname?.startsWith("/auth/login") ||
                     pathname?.startsWith("/auth/signup");

  if (!mounted) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex transition-colors duration-500 ${
        isDarkMode ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"
      }`}
    >
      {!isAuthPage ? (
        <>
          {/* SideMenu: Takes its place on the left on Desktop */}
          <SideMenu
            open={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
          />

          {/* Content area: flex-1 to occupy all remaining space on the right */}
          <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
            <div className="flex-1 pb-24 lg:pb-8">
              {children}
            </div>

            {/* BottomNav: Only visible on Mobile (via BottomNav internal CSS or Tailwind) */}
            <div className="lg:hidden">
              <BottomNav onOpenMenu={() => setIsMenuOpen(true)} />
            </div>
          </main>
        </>
      ) : (
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
