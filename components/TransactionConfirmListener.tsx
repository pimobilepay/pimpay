"use client";

import React, { useState, useEffect, useCallback } from "react";
import TransactionConfirmModal from "./TransactionConfirmModal";
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
  const [lastCheckedId, setLastCheckedId] = useState<string | null>(null);

  // Poll for pending transaction confirmations
  const { data: notifications } = useSWR(
    userId ? "/api/notifications?type=TRANSACTION_CONFIRM&unread=true" : null,
    fetcher,
    {
      refreshInterval: 3000, // Check every 3 seconds
      revalidateOnFocus: true,
    }
  );

  // Check for new pending transactions
  useEffect(() => {
    if (!notifications?.notifications) return;

    const pendingNotifs = notifications.notifications.filter(
      (n: any) => n.type === "TRANSACTION_CONFIRM" && !n.read
    );

    if (pendingNotifs.length > 0) {
      const latestNotif = pendingNotifs[0];
      const metadata = latestNotif.metadata;

      // Only show if it's a new transaction we haven't shown yet
      if (metadata?.transactionId && metadata.transactionId !== lastCheckedId) {
        // Check if not expired
        const expiresAt = metadata.expiresAt ? new Date(metadata.expiresAt) : null;
        if (expiresAt && expiresAt < new Date()) {
          // Expired, skip
          setLastCheckedId(metadata.transactionId);
          return;
        }

        setPendingTransaction({
          id: metadata.transactionId,
          type: metadata.type || "DEPOSIT",
          amount: metadata.amount || 0,
          currency: metadata.currency || "USD",
          agentName: metadata.agentName,
          createdAt: latestNotif.createdAt,
        });
        setIsModalOpen(true);
        setLastCheckedId(metadata.transactionId);

        // Mark notification as read
        fetch("/api/notifications/mark-read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notificationId: latestNotif.id }),
        }).catch(() => {});
      }
    }
  }, [notifications, lastCheckedId]);

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
