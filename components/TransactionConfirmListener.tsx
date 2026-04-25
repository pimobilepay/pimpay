"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import TransactionConfirmModal from "./TransactionConfirmModal";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, ShieldCheck } from "lucide-react";
import useSWR from "swr";

interface PendingTransaction {
  id: string;
  type: "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  currency: string;
  agentName?: string;
  createdAt: string;
}

interface TransactionConfirmListenerProps {
  userId?: string;
  twoFactorEnabled?: boolean;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
};

export default function TransactionConfirmListener({
  userId,
  twoFactorEnabled = false,
}: TransactionConfirmListenerProps) {
  const [pendingTransaction, setPendingTransaction] = useState<PendingTransaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const lastCheckedId = useRef<string | null>(null);
  const activeToastId = useRef<string | number | null>(null);

  const { data: notifications } = useSWR(
    userId ? "/api/notifications?type=TRANSACTION_CONFIRM&unread=true" : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
    }
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
        await fetch("/api/transaction/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transactionId: tx.id,
            userId,
            action: "reject",
          }),
        });
        toast.error("Transaction annulée");
      } catch {
        toast.error("Erreur lors de l'annulation");
      }
    },
    [userId]
  );

  const showTransactionToast = useCallback(
    (tx: PendingTransaction) => {
      const isDeposit = tx.type === "DEPOSIT";
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
                    Nouvelle transaction à confirmer
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5 font-medium">
                    {isDeposit ? "Dépôt" : "Retrait"} en attente de votre validation
                  </p>
                </div>
                <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
              </div>

              <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3 text-center">
                <p className="text-2xl font-black text-white">
                  {tx.amount.toLocaleString("fr-FR")}
                  <span className="text-sm ml-1 text-white/60 font-bold">{tx.currency}</span>
                </p>
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
                  ✗ Annuler
                </button>
                <button
                  onClick={() => openModal(tx)}
                  className={`flex-1 py-2.5 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    isDeposit
                      ? "bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300"
                      : "bg-blue-500/20 border border-blue-500/30 hover:bg-blue-500/30 text-blue-300"
                  }`}
                >
                  ✓ Confirmer
                </button>
              </div>
            </div>
          </div>
        ),
        {
          duration: Infinity,
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

    if (pendingNotifs.length > 0) {
      const latestNotif = pendingNotifs[0];
      const metadata = latestNotif.metadata;

      if (metadata?.transactionId && metadata.transactionId !== lastCheckedId.current) {
        const expiresAt = metadata.expiresAt ? new Date(metadata.expiresAt) : null;
        if (expiresAt && expiresAt < new Date()) {
          lastCheckedId.current = metadata.transactionId;
          return;
        }

        const tx: PendingTransaction = {
          id: metadata.transactionId,
          type: metadata.type || "DEPOSIT",
          amount: metadata.amount || 0,
          currency: metadata.currency || "USD",
          agentName: metadata.agentName,
          createdAt: latestNotif.createdAt,
        };

        lastCheckedId.current = metadata.transactionId;

        fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: latestNotif.id }),
        }).catch(() => {});

        showTransactionToast(tx);
      }
    }
  }, [notifications, showTransactionToast]);

  const handleClose = useCallback(() => {
    setIsModalOpen(false);
    setPendingTransaction(null);
  }, []);

  if (!userId) return null;

  return (
    <TransactionConfirmModal
      isOpen={isModalOpen}
      onClose={handleClose}
      transaction={pendingTransaction}
      userId={userId}
      twoFactorEnabled={twoFactorEnabled}
    />
  );
}
