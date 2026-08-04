"use client";

/**
 * useFees — SOURCE UNIQUE des taux de frais côté client.
 *
 * Les pages ne doivent JAMAIS coder un taux en dur (0.01, 0.015, ...).
 * Elles lisent les taux réellement appliqués par le serveur via /api/fees,
 * qui s'appuie sur `lib/fees.ts` → SystemConfig.GLOBAL_CONFIG.
 *
 * Un cache module partagé évite un appel réseau par composant.
 */

import { useEffect, useState } from "react";

export interface ClientFeeRates {
  // Crypto
  transferFee: number;
  withdrawFee: number;
  depositCryptoFee: number;
  exchangeFee: number;
  // Fiat
  depositMobileFee: number;
  depositCardFee: number;
  withdrawMobileFee: number;
  withdrawBankFee: number;
  fiatTransferFee: number;
  // Paiements
  cardPaymentFee: number;
  merchantPaymentFee: number;
  billPaymentFee: number;
  qrPaymentFee: number;
}

export interface ClientFeeLimits {
  minWithdrawal: number;
  maxWithdrawal: number;
}

/** Doit rester aligné avec DEFAULT_FEE_CONFIG dans lib/fees.ts */
export const DEFAULT_FEE_RATES: ClientFeeRates = {
  transferFee: 0.01,
  withdrawFee: 0.02,
  depositCryptoFee: 0.01,
  exchangeFee: 0.001,
  depositMobileFee: 0.02,
  depositCardFee: 0.035,
  withdrawMobileFee: 0.025,
  withdrawBankFee: 0.02,
  fiatTransferFee: 0.005,
  cardPaymentFee: 0.015,
  merchantPaymentFee: 0.02,
  billPaymentFee: 0.015,
  qrPaymentFee: 0.01,
};

const DEFAULT_LIMITS: ClientFeeLimits = { minWithdrawal: 1, maxWithdrawal: 5000 };

const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 min

type CacheEntry = { rates: ClientFeeRates; limits: ClientFeeLimits; timestamp: number };
let moduleCache: CacheEntry | null = null;
let inflight: Promise<CacheEntry> | null = null;

async function loadFees(): Promise<CacheEntry> {
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/fees", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.ok || !data?.fees) throw new Error("Réponse /api/fees invalide");

      const entry: CacheEntry = {
        rates: { ...DEFAULT_FEE_RATES, ...normalizeRates(data.fees) },
        limits: {
          minWithdrawal:
            typeof data.minWithdrawal === "number" ? data.minWithdrawal : DEFAULT_LIMITS.minWithdrawal,
          maxWithdrawal:
            typeof data.maxWithdrawal === "number" ? data.maxWithdrawal : DEFAULT_LIMITS.maxWithdrawal,
        },
        timestamp: Date.now(),
      };
      moduleCache = entry;
      return entry;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

function normalizeRates(raw: Record<string, unknown>): Partial<ClientFeeRates> {
  const out: Record<string, number> = {};
  for (const key of Object.keys(DEFAULT_FEE_RATES)) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      out[key] = value;
    }
  }
  return out as Partial<ClientFeeRates>;
}

export function useFees(autoRefresh = true) {
  const [rates, setRates] = useState<ClientFeeRates>(moduleCache?.rates ?? DEFAULT_FEE_RATES);
  const [limits, setLimits] = useState<ClientFeeLimits>(moduleCache?.limits ?? DEFAULT_LIMITS);
  const [loading, setLoading] = useState(!moduleCache);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const entry = await loadFees();
        if (cancelled) return;
        setRates(entry.rates);
        setLimits(entry.limits);
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Frais indisponibles");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    if (!autoRefresh) return () => { cancelled = true; };

    const id = setInterval(run, REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [autoRefresh]);

  return { rates, limits, loading, error };
}

/* ------------------------------------------------------------------ */
/*  HELPERS D'AFFICHAGE                                                */
/* ------------------------------------------------------------------ */

/** 0.035 → "3.5" ; 0.02 → "2" */
export function formatRatePercent(rate: number): string {
  const pct = rate * 100;
  return Number.isInteger(pct) ? String(pct) : String(Number(pct.toFixed(2)));
}

/**
 * Remplace (ou ajoute) le pourcentage dans un libellé traduit.
 * "Frais PIMOBIPAY (1%)" + 0.02 → "Frais PIMOBIPAY (2%)"
 */
export function feeLabelWithRate(label: string, rate: number): string {
  const base = label.replace(/\s*\([^)]*\)\s*$/, "").trim();
  return `${base} (${formatRatePercent(rate)}%)`;
}

/** Frais arrondi comme côté serveur (2 décimales) */
export function computeFee(amount: number, rate: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount * rate * 100) / 100;
}
