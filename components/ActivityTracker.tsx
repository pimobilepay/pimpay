"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function ActivityTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");

  useEffect(() => {
    // Avoid tracking the same page twice in a row
    if (!pathname || pathname === lastTracked.current) return;

    // Skip admin pages from tracking
    if (pathname.startsWith("/admin")) return;

    // Skip auth pages
    if (pathname.startsWith("/auth")) return;

    lastTracked.current = pathname;

    // Small delay to not block page render
    const timeout = setTimeout(() => {
      fetch("/api/user/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: pathname,
          action: "PAGE_VIEW",
        }),
      }).catch(() => {
        // Silently fail - activity tracking should never break the app
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}
