"use client";
import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";

export default function AppShell({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthPage = pathname?.startsWith("/auth");

  if (!mounted) return <div className="bg-slate-950 min-h-screen" />;

  return (
    <div className="relative min-h-screen bg-slate-950 text-white">
      <main className={isAuthPage ? "" : "pb-24"}>
        {children}
      </main>
      
      {!isAuthPage && (
        <BottomNav onOpenMenu={() => {}} />
      )}
    </div>
  );
}
