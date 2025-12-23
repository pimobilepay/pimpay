"use client";

import { useState, useEffect, useCallback } from "react";

export function useBalance() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/wallet/balance");
      const data = await res.json();
      if (res.ok) {
        setBalance(data.balance);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération de la balance", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return { balance, loading, refreshBalance: fetchBalance };
}
