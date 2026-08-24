"use client";

import { useState, useEffect, useCallback } from "react";

export function useBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) {
        const nextBalance = Number(data.balance);
        if (Number.isFinite(nextBalance)) setBalance(nextBalance);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de la balance", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
    const interval = window.setInterval(fetchBalance, 15000);
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") fetchBalance();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnFocus);
    };
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
}
