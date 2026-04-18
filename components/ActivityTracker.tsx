"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export function ActivityTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string>("");
  const pageStartTime = useRef<number>(Date.now());
  const activityId = useRef<string | null>(null);
  const clickCount = useRef<number>(0);
  const maxScrollDepth = useRef<number>(0);
  const isTracking = useRef<boolean>(false);

  // Track scroll depth
  const trackScroll = useCallback(() => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? Math.round((scrollTop / docHeight) * 100) : 0;
    maxScrollDepth.current = Math.max(maxScrollDepth.current, scrollPercent);
  }, []);

  // Track clicks
  const trackClick = useCallback((e: MouseEvent) => {
    clickCount.current += 1;
    
    // Track click details
    const target = e.target as HTMLElement;
    const clickData = {
      element: target.tagName.toLowerCase(),
      text: target.textContent?.substring(0, 50) || "",
      className: target.className?.substring?.(0, 100) || "",
      id: target.id || "",
    };
    
    // Send click action
    fetch("/api/user/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page: pathname,
        action: "CLICK",
        metadata: clickData,
      }),
    }).catch(() => {});
  }, [pathname]);

  // Send page duration on leave
  const sendPageDuration = useCallback(() => {
    if (!isTracking.current || !activityId.current) return;
    
    const duration = Math.round((Date.now() - pageStartTime.current) / 1000);
    
    // Use sendBeacon for reliability on page unload
    const data = JSON.stringify({
      activityId: activityId.current,
      duration,
      scrollDepth: maxScrollDepth.current,
      clicks: clickCount.current,
    });
    
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/user/activity/update", data);
    } else {
      fetch("/api/user/activity/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    // Avoid tracking the same page twice in a row
    if (!pathname || pathname === lastTracked.current) return;

    // Skip admin pages from tracking
    if (pathname.startsWith("/admin")) return;

    // Skip auth pages
    if (pathname.startsWith("/auth")) return;

    // Send duration for previous page before tracking new one
    sendPageDuration();

    lastTracked.current = pathname;
    pageStartTime.current = Date.now();
    clickCount.current = 0;
    maxScrollDepth.current = 0;
    isTracking.current = true;

    // Small delay to not block page render
    const timeout = setTimeout(() => {
      fetch("/api/user/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: pathname,
          action: "PAGE_VIEW",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.activityId) {
            activityId.current = data.activityId;
          }
        })
        .catch(() => {
          // Silently fail - activity tracking should never break the app
        });
    }, 500);

    // Add event listeners
    window.addEventListener("scroll", trackScroll, { passive: true });
    document.addEventListener("click", trackClick);

    return () => {
      clearTimeout(timeout);
      window.removeEventListener("scroll", trackScroll);
      document.removeEventListener("click", trackClick);
    };
  }, [pathname, trackScroll, trackClick, sendPageDuration]);

  // Send duration on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      sendPageDuration();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
      sendPageDuration();
    };
  }, [sendPageDuration]);

  return null;
}
