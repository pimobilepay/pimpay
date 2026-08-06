"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface TransactionActivityListenerProps {
  userId?: string;
}

/**
 * Listener global : affiche un toast pour chaque mouvement d'argent finalise
 * sur le compte de l'utilisateur, quelle que soit la page affichee.
 *
 *  - ENTRANT  (depot agent, paiement recu, transfert recu) -> toast vert
 *  - SORTANT  (retrait agent, paiement envoye)             -> toast bleu
 *
 * Les demandes de confirmation (TRANSACTION_CONFIRM) ne sont PAS traitees ici :
 * elles ont leur propre toast interactif dans TransactionConfirmListener.
 */

/** Types de notification correspondant a un encaissement. */
const INCOMING_TYPES = new Set(["DEPOSIT", "PAYMENT_RECEIVED", "TRANSFER_RECEIVED"]);

/** Types de notification correspondant a un decaissement. */
const OUTGOING_TYPES = new Set(["WITHDRAW", "WITHDRAWAL", "PAYMENT_SENT", "TRANSFER_SENT"]);

const SEEN_KEY = "pimpay_seen_activity_notifs";
const POLL_MS = 6000;

function readSeen(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistSeen(ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(ids).slice(-60)));
  } catch {
    /* stockage indisponible */
  }
}

function formatAmount(amount: unknown, currency?: string): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!isFinite(value)) return "";
  const curr = (currency || "XAF").toUpperCase();
  if (curr === "PI") {
    return `${Number(value).toFixed(8).replace(/\.?0+$/, "") || "0"} PI`;
  }
  return `${value.toLocaleString("fr-FR")} ${curr}`;
}

export default function TransactionActivityListener({
  userId,
}: TransactionActivityListenerProps) {
  const router = useRouter();
  const seenRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    // Les notifications deja "toastees" dans cette session ne le seront plus.
    readSeen().forEach((id) => seenRef.current.add(id));

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/notifications?unread=true", { cache: "no-store" });
        if (!res.ok || cancelled) return;

        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data.notifications || [];

        const movements = list.filter((n) => {
          const type = String(n?.type || "").toUpperCase();
          return INCOMING_TYPES.has(type) || OUTGOING_TYPES.has(type);
        });

        if (movements.length === 0) return;

        // Premier passage : on memorise l'historique sans spammer l'utilisateur
        // avec des toasts pour des notifications anciennes.
        if (!initializedRef.current) {
          initializedRef.current = true;
          movements.forEach((n) => seenRef.current.add(n.id));
          persistSeen(seenRef.current);
          return;
        }

        // Du plus ancien au plus recent pour un empilement chronologique
        const fresh = movements
          .filter((n) => !seenRef.current.has(n.id))
          .reverse()
          .slice(-3);

        if (fresh.length === 0) return;

        fresh.forEach((n) => {
          seenRef.current.add(n.id);

          const type = String(n.type || "").toUpperCase();
          const isIncoming = INCOMING_TYPES.has(type);
          const meta = n.metadata || {};
          const amount = isIncoming ? (meta.netAmount ?? meta.amount) : (meta.totalDebit ?? meta.amount);
          const formatted = formatAmount(amount, meta.currency);

          toast(n.title || (isIncoming ? "Transaction reçue" : "Transaction envoyée"), {
            description: formatted
              ? `${isIncoming ? "+" : "-"} ${formatted}${
                  meta.agentName ? ` · Agent ${meta.agentName}` : ""
                }`
              : n.message,
            duration: 8000,
            icon: isIncoming ? (
              <ArrowDownLeft size={18} className="text-emerald-400" />
            ) : (
              <ArrowUpRight size={18} className="text-blue-400" />
            ),
            action: {
              label: "Voir",
              onClick: () => router.push("/notifications"),
            },
          });
        });

        persistSeen(seenRef.current);
      } catch {
        /* silencieux */
      }
    };

    check();
    const interval = setInterval(check, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, router]);

  return null;
}
