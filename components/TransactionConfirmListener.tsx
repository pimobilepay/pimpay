"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import TransactionConfirmModal from "./TransactionConfirmModal";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import useSWR from "swr";

/**
 * Ecoute les demandes de confirmation de transaction.
 *
 * REGLE METIER : seules les transactions SORTANTES (retrait agent / cash-out)
 * exigent une confirmation du client. Un depot (entrant) est credite
 * directement et ne genere qu'une notification d'information, geree par
 * TransactionActivityListener.
 *
 * Deux corrections importantes ici :
 *  1. Les transactions deja traitees sont memorisees dans sessionStorage, donc
 *     un rechargement de page ne fait plus reapparaitre une demande confirmee.
 *  2. Apres confirmation ou refus on marque la notification comme lue cote
 *     serveur puis on revalide, ce qui elimine la notification fantome.
 */

interface PendingTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAW" | "WITHDRAWAL";
  amount: number;
  currency: string;
  fee?: number;
  totalDebit?: number;
  agentName?: string;
  createdAt: string;
}

interface TransactionConfirmListenerProps {
  userId?: string;
  twoFactorEnabled?: boolean;
}

const HANDLED_KEY = "pimpay_handled_tx_confirms";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

/** Transactions deja confirmees/refusees sur cet appareil (survit au reload). */
function readHandled(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HANDLED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function markHandled(id: string) {
  if (typeof window === "undefined") return;
  try {
    const next = Array.from(new Set([...readHandled(), id])).slice(-50);
    window.sessionStorage.setItem(HANDLED_KEY, JSON.stringify(next));
  } catch {
    /* stockage indisponible : la protection en memoire suffit */
  }
}

export default function TransactionConfirmListener({
  userId,
  twoFactorEnabled = false,
}: TransactionConfirmListenerProps) {
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const activeToastId = useRef<string | number | null>(null);

  const { data: notifications, mutate } = useSWR(
    userId ? "/api/notifications?type=TRANSACTION_CONFIRM&unread=true" : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    }
  );

  // Recharge la liste des transactions deja traitees au montage
  useEffect(() => {
    readHandled().forEach((id) => seenIds.current.add(id));
  }, []);

  /** Marque la demande comme traitee localement + cote serveur, puis revalide. */
  const settle = useCallback(
    async (transactionId: string) => {
      markHandled(transactionId);
      seenIds.current.add(transactionId);

      // Nettoyage cote client : la notification est deja marquee lue par
      // /api/transaction/confirm, on force juste la revalidation.
      await mutate();
    },
    [mutate]
  );

  const openModal = useCallback((tx: PendingTransaction) => {
    if (activeToastId.current !== null) {
      toast.dismiss(activeToastId.current);
      activeToastId.current = null;
    }
    setPendingTransaction(tx);
    setIsModalOpen(true);
  }, []);

  const rejectFromToast = useCallback(
    async (tx: PendingTransaction, toastId: string | number) => {
      toast.dismiss(toastId);
      activeToastId.current = null;
      try {
        const res = await fetch("/api/transaction/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: tx.id,
            userId,
            action: "reject",
          }),
        });
        if (!res.ok) throw new Error("reject failed");
        await settle(tx.id);
        toast.error("Transaction annulée", {
          description: `Le ${
            tx.type === "DEPOSIT" ? "dépôt" : "retrait"
          } de ${tx.amount.toLocaleString("fr-FR")} ${tx.currency} a été refusé.`,
        });
      } catch {
        toast.error("Erreur lors de l'annulation");
      }
    },
    [userId, settle]
  );

  const showTransactionToast = useCallback(
    (tx: PendingTransaction) => {
      const isDeposit = tx.type === "DEPOSIT";
      const fee = tx.fee ?? 0;
      const totalDebit = tx.totalDebit ?? tx.amount + fee;
      const id = toast.custom(
        (toastId) => (
          <div className="w-full max-w-sm bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className={`h-1 w-full ${isDeposit ? "bg-emerald-500" : "bg-blue-500"}`} />
            <div className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDeposit
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {isDeposit ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-white">
                    {isDeposit ? "Dépôt à confirmer" : "Retrait à confirmer"}
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5 font-medium">
                    {isDeposit
                      ? "Dépôt en attente de votre validation"
                      : "Un agent demande un retrait sur votre compte"}
                  </p>
                </div>
                <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3 text-center">
                <p className="text-2xl font-black text-white">
                  {tx.amount.toLocaleString("fr-FR")}
                  <span className="text-sm ml-1 text-white/60 font-bold">{tx.currency}</span>
                </p>
                {!isDeposit && (
                  <p className="text-[10px] text-white/50 font-medium mt-1">
                    Total débité : {totalDebit.toLocaleString("fr-FR")} {tx.currency} (frais{" "}
                    {fee.toLocaleString("fr-FR")})
                  </p>
                )}
                {tx.agentName && (
                  <p className="text-[9px] text-white/40 uppercase tracking-widest mt-1">
                    Agent : {tx.agentName}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => rejectFromToast(tx, toastId)}
                  className="flex-1 py-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-all"
                >
                  Annuler
                </button>
                <button
                  onClick={() => openModal(tx)}
                  className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDeposit
                      ? "bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300"
                      : "bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-300"
                  }`}
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        ),
        {
          duration: 30000, // 30 secondes
          id: `tx-confirm-${tx.id}`,
        }
      );
      activeToastId.current = id;
    },
    [openModal, rejectFromToast]
  );

  useEffect(() => {
    if (!notifications?.notifications) return;

    const pendingNotifs = notifications.notifications.filter(
      (n: { type: string; read: boolean }) =>
        n.type === "TRANSACTION_CONFIRM" && !n.read
    );

    if (pendingNotifs.length === 0) return;

    const latestNotif = pendingNotifs[0];
    const metadata = latestNotif.metadata;
    const txId = metadata?.transactionId;

    // Deja vue (y compris apres un rechargement de page) : on ignore.
    if (!txId || seenIds.current.has(txId)) return;

    const expiresAt = metadata.expiresAt ? new Date(metadata.expiresAt) : null;
    if (expiresAt && expiresAt < new Date()) {
      seenIds.current.add(txId);
      return;
    }

    seenIds.current.add(txId);

    showTransactionToast({
      id: txId,
      type: metadata.type || "WITHDRAW",
      amount: metadata.amount || 0,
      currency: metadata.currency || "XAF",
      fee: metadata.fee,
      totalDebit: metadata.totalDebit,
      agentName: metadata.agentName,
      createdAt: latestNotif.createdAt,
    });
  }, [notifications, showTransactionToast]);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setPendingTransaction(null);
  }, []);

  const handleSettled = useCallback(
    (status: "SUCCESS" | "REJECTED") => {
      const tx = pendingTransaction;
      if (!tx) return;
      settle(tx.id);
      const isDeposit = tx.type === "DEPOSIT";
      if (status === "SUCCESS") {
        toast.success(isDeposit ? "Dépôt confirmé" : "Retrait confirmé", {
          description: `${tx.amount.toLocaleString("fr-FR")} ${tx.currency}${
            isDeposit ? " crédités sur votre compte." : " remis par l'agent."
          }`,
        });
      } else {
        toast.error("Transaction refusée", {
          description: "Votre solde reste inchangé.",
        });
      }
    },
    [pendingTransaction, settle]
  );

  if (!userId) return null;

  return (
    <TransactionConfirmModal
      isOpen={isModalOpen}
      onClose={handleClose}
      onSettled={handleSettled}
      transaction={pendingTransaction}
      userId={userId}
      twoFactorEnabled={twoFactorEnabled}
    />
  );
}
