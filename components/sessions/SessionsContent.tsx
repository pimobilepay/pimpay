"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface SessionsContentProps {
  children: React.ReactNode;
}

export default function SessionsContent({ children }: SessionsContentProps) {
  const router = useRouter();
  const lastRefreshRef = useRef<number>(Date.now());

  useEffect(() => {
    // Auto-refresh every 10 seconds to show updated session list
    const interval = setInterval(() => {
      console.log("[v0] Auto-refreshing sessions page (10s interval)");
      lastRefreshRef.current = Date.now();
      router.refresh();
    }, 10000); // 10 seconds

    // Also refresh when page becomes visible again (user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
        // Only refresh if it's been more than 3 seconds since last refresh
        if (timeSinceLastRefresh > 3000) {
          console.log("[v0] Page became visible, refreshing sessions");
          lastRefreshRef.current = Date.now();
          router.refresh();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [router]);

  return <>{children}</>;
}
