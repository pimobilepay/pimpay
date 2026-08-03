"use client";

import useSWR from "swr";

export type LimitChannel = "WITHDRAW" | "TRANSFER" | "MPAY" | "WALLET";

export interface UserLimits {
  channel: LimitChannel | null;
  verified: boolean;
  kycStatus: string | null;
  role: string | null;
  /** Plafond effectif par transaction pour ce compte. */
  maxPerTx: number;
  /** Franchise autorisée sans KYC. */
  kycFreeLimitPi: number;
  /** Plafond par transaction avec KYC validé. */
  kycMaxPerTxPi: number;
  adminApprovalThresholdPi: number;
  maxPerDay: number;
  dailyTotalPi: number | null;
  minPerTxPi: number | null;
  bypassKyc: boolean;
  kycRequired: boolean;
  appliedPolicies: { id: string; name: string; scope: string }[];
  usingDefaults: boolean;
}

/** Valeurs de repli utilisées uniquement pendant le chargement. */
const FALLBACK: UserLimits = {
  channel: null,
  verified: false,
  kycStatus: null,
  role: null,
  maxPerTx: 5,
  kycFreeLimitPi: 5,
  kycMaxPerTxPi: 100,
  adminApprovalThresholdPi: 50,
  maxPerDay: 10,
  dailyTotalPi: null,
  minPerTxPi: null,
  bypassKyc: false,
  kycRequired: true,
  appliedPolicies: [],
  usingDefaults: true,
};

const fetcher = (url: string) =>
  fetch(url, { credentials: "include" }).then((r) => {
    if (!r.ok) throw new Error("limits unavailable");
    return r.json();
  });

/**
 * Récupère les plafonds réellement applicables à l'utilisateur connecté.
 * Remplace toute valeur codée en dur (5 Pi / 100 Pi) dans les écrans
 * retrait, wallet, transfert et mpay.
 */
export function useLimits(channel?: LimitChannel) {
  const key = channel ? `/api/user/limits?channel=${channel}` : "/api/user/limits";
  const { data, error, isLoading, mutate } = useSWR<UserLimits>(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 30_000,
  });

  return {
    limits: data ?? FALLBACK,
    /** true tant que les vraies valeurs ne sont pas chargées. */
    isLoading,
    error,
    refresh: mutate,
  };
}

/** Formate un plafond en Pi pour l'affichage. */
export function formatPi(value: number | null | undefined): string {
  if (value === null || value === undefined) return "illimité";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 6 })} Pi`;
}
