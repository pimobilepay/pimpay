"use client";

import { useState, useEffect, useRef } from "react";

interface PiPriceState {
  price: number;
  loading: boolean;
  error: string | null;
  source: string | null;
  lastUpdated: number | null;
}

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
const FALLBACK_PRICE = 1.5;

// Module-level cache so multiple components share the same data
let moduleCache: { price: number; timestamp: number; source: string } | null = null;

export function usePiPrice(autoRefresh = true) {
  const [state, setState] = useState<PiPriceState>({
    price: moduleCache?.price ?? FALLBACK_PRICE,
    loading: !moduleCache,
    error: null,
    source: moduleCache?.source ?? null,
    lastUpdated: moduleCache?.timestamp ?? null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPrice = async (silent = false) => {
    if (!silent) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }

    try {
      const res = await fetch("/api/pi-price", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();

      if (data.success && typeof data.price === "number" && data.price > 0) {
        moduleCache = {
          price: data.price,
          timestamp: data.timestamp ?? Date.now(),
          source: data.source ?? "api",
        };

        setState({
          price: data.price,
          loading: false,
          error: null,
          source: data.source ?? "api",
          lastUpdated: data.timestamp ?? Date.now(),
        });
      } else {
        throw new Error("Invalid price data");
      }
    } catch (err: any) {
      const fallback = moduleCache?.price ?? FALLBACK_PRICE;
      setState((prev) => ({
        ...prev,
        price: fallback,
        loading: false,
        error: err.message ?? "Erreur de récupération du prix Pi",
      }));
    }
  };

  useEffect(() => {
    fetchPrice();

    if (autoRefresh) {
      intervalRef.current = setInterval(() => fetchPrice(true), REFRESH_INTERVAL);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh]);

  return { ...state, refetch: () => fetchPrice(false) };
}
