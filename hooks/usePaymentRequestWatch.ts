"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PaymentRequestStatus } from "@/lib/payment-request";

export interface WatchedRequest {
  id: string;
  code: string;
  status: PaymentRequestStatus;
  paidAt: string | null;
  reference: string | null;
  amount: number;
  currency: string;
  payer?: { username: string; name: string | null } | null;
}

interface Options {
  /** Codes des demandes en attente a surveiller. Vide = ecoute inactive. */
  codes: string[];
  /** Intervalle de scrutation en ms (defaut 4s). */
  intervalMs?: number;
  /** Appele des qu'une demande surveillee passe a PAID. */
  onPaid?: (request: WatchedRequest) => void;
  /** Appele quand une demande change de statut sans etre payee (expiration). */
  onStatusChange?: (request: WatchedRequest) => void;
}

/**
 * Ecoute en direct l'etat des demandes de paiement en attente.
 *
 * - Ne scrute que s'il reste au moins une demande PENDING.
 * - Se met en pause quand l'onglet est masque et reprend immediatement
 *   (avec un rafraichissement instantane) au retour au premier plan.
 * - Declenche `onPaid` une seule fois par demande grace a un registre local.
 */
export function usePaymentRequestWatch({
  codes,
  intervalMs = 4000,
  onPaid,
  onStatusChange,
}: Options) {
  const [live, setLive] = useState<Record<string, WatchedRequest>>({});
  const [listening, setListening] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  // Refs pour eviter de relancer l'intervalle a chaque render.
  const codesKey = codes.slice().sort().join(",");
  const codesRef = useRef(codesKey);
  codesRef.current = codesKey;

  const onPaidRef = useRef(onPaid);
  onPaidRef.current = onPaid;
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  // Codes deja signales comme payes : evite les notifications en double.
  const notifiedRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef(false);

  const poll = useCallback(async () => {
    const currentCodes = codesRef.current;
    if (!currentCodes || inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(
        `/api/payments/request/watch?codes=${encodeURIComponent(currentCodes)}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.requests)) return;

      setLastCheck(new Date());
      setLive((prev) => {
        const next = { ...prev };
        for (const r of data.requests as WatchedRequest[]) {
          next[r.code] = r;
          if (r.status === "PAID" && !notifiedRef.current.has(r.code)) {
            notifiedRef.current.add(r.code);
            onPaidRef.current?.(r);
          } else if (
            r.status !== "PENDING" &&
            r.status !== "PAID" &&
            prev[r.code]?.status === "PENDING"
          ) {
            onStatusChangeRef.current?.(r);
          }
        }
        return next;
      });
    } catch {
      // Erreur reseau silencieuse : la prochaine iteration reessaiera.
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!codesKey) {
      setListening(false);
      return;
    }
    setListening(true);

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return;
      poll();
      timer = setInterval(poll, intervalMs);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", start);

    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", start);
      setListening(false);
    };
  }, [codesKey, intervalMs, poll]);

  return { live, listening, lastCheck, refresh: poll };
}

export default usePaymentRequestWatch;
