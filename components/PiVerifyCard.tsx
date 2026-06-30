"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ShieldCheck, Loader2, Zap, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = "piverify_session";

type Props = {
  /** Statut KYC courant côté PimPay (NONE | PENDING | REJECTED | ...). */
  kycStatus: string;
  /** Appelé lorsque la vérification aboutit (approuvée) pour rafraîchir la page. */
  onVerified?: () => void;
};

/**
 * Carte de vérification instantanée PiVerify (parcours hébergé Pi Network).
 *
 * Flux :
 *   1. POST /api/kyc/piverify/start -> hostedFlowUrl (clé API côté serveur)
 *   2. on mémorise le sessionId puis on redirige vers le parcours hébergé
 *   3. au retour, on interroge /api/kyc/piverify/status jusqu'au résultat
 */
export default function PiVerifyCard({ kycStatus, onVerified }: Props) {
  const [starting, setStarting] = useState(false);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setPolling(false);
  }, []);

  const checkStatus = useCallback(
    async (sessionId: string) => {
      try {
        const res = await fetch(
          `/api/kyc/piverify/status?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        if (!res.ok) return;
        const data = await res.json();

        if (data.status === "approved") {
          sessionStorage.removeItem(STORAGE_KEY);
          stopPolling();
          toast.success("Identité vérifiée avec succès !");
          onVerified?.();
        } else if (data.status === "rejected" || data.status === "failed") {
          sessionStorage.removeItem(STORAGE_KEY);
          stopPolling();
          toast.error(data.rejectionReason || "La vérification a échoué.");
          onVerified?.();
        }
      } catch {
        // silencieux : on retentera au prochain tick
      }
    },
    [onVerified, stopPolling]
  );

  // Reprise au retour du parcours hébergé : on poll la session mémorisée.
  useEffect(() => {
    const sessionId = sessionStorage.getItem(STORAGE_KEY);
    if (!sessionId) return;
    if (kycStatus === "VERIFIED" || kycStatus === "APPROVED") {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }

    setPolling(true);
    checkStatus(sessionId);
    pollRef.current = setInterval(() => checkStatus(sessionId), 4000);

    // Arrêt automatique après 2 minutes pour ne pas boucler indéfiniment.
    const timeout = setTimeout(stopPolling, 120000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearTimeout(timeout);
    };
  }, [kycStatus, checkStatus, stopPolling]);

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/kyc/piverify/start", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Impossible de démarrer la vérification.");
        return;
      }

      sessionStorage.setItem(STORAGE_KEY, data.sessionId);
      // Redirection vers le parcours hébergé PiVerify (ID + liveness).
      window.location.href = data.hostedFlowUrl;
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setStarting(false);
    }
  };

  const isRejected = kycStatus === "REJECTED";

  return (
    <section
      aria-label="Vérification instantanée PiVerify"
      className="rounded-2xl border border-blue-600/20 bg-gradient-to-br from-blue-600/10 to-blue-600/[0.02] p-5"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
          <ShieldCheck size={22} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black uppercase tracking-tight text-white">
              Vérification instantanée
            </h3>
            <span className="flex items-center gap-1 rounded-full bg-blue-600/20 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-blue-400">
              <Zap size={10} /> PiVerify
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {isRejected
              ? "Relancez une vérification d'identité automatisée par PiVerify (Pi Network)."
              : "Vérifiez votre identité en quelques minutes via PiVerify : pièce d'identité + selfie, contrôle anti-fraude automatisé par Pi Network."}
          </p>
        </div>
      </div>

      {polling ? (
        <div className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[11px] font-bold uppercase tracking-widest text-blue-400">
          <Loader2 size={14} className="animate-spin" />
          Vérification en cours…
        </div>
      ) : (
        <button
          onClick={start}
          disabled={starting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-blue-600/30 transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {starting ? (
            <>
              <Loader2 size={14} className="animate-spin" /> Démarrage…
            </>
          ) : (
            <>
              {isRejected ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
              {isRejected ? "Réessayer avec PiVerify" : "Vérifier avec PiVerify"}
              <ArrowRight size={14} />
            </>
          )}
        </button>
      )}

      <p className="mt-3 text-center text-[9px] font-medium uppercase tracking-widest text-slate-600">
        Ou complétez le formulaire manuel ci-dessous
      </p>
    </section>
  );
}
