"use client";

import { useEffect, useState } from "react";
import SideMenu from "@/components/SideMenu";
import { BottomNav } from "@/components/bottom-nav";
import { usePathname } from "next/navigation";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { ActivityTracker } from "@/components/ActivityTracker";
import TransactionConfirmListener from "@/components/TransactionConfirmListener";
import useSWR from "swr";

// Fetcher for user data
const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
};

function LayoutContent({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  // Get current user info for transaction confirmation
  const { data: userData } = useSWR('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000, // Only refetch every minute
  });

  useEffect(() => {
    setMounted(true);
  }, []);

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
      className={`min-h-screen flex transition-colors duration-500 ${
        isDarkMode ? "bg-[#020617] text-white" : "bg-white text-slate-900"
      }`}
    >
      <ActivityTracker />
      {/* Global transaction confirmation listener */}
      {userData?.user?.id && (
        <TransactionConfirmListener 
          userId={userData.user.id}
          twoFactorEnabled={userData.user.twoFactorEnabled || false}
        />
      )}
      {!isAuthPage ? (
        <>
          {/* SideMenu : Il prend sa place à gauche sur Desktop */}
          <SideMenu
            open={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
          />

          {/* Zone de contenu : flex-1 pour occuper tout l'espace restant à droite */}
          <main className="flex-1 flex flex-col min-h-screen relative overflow-x-hidden">
            <div className="flex-1 pb-24 lg:pb-8">
              {children}
            </div>

            {/* BottomNav : Uniquement visible sur Mobile (via CSS interne de BottomNav ou Tailwind) */}
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
