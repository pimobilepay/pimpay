"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import AccountStatusModal from "./AccountStatusModal";
import { toast } from "sonner";

interface AccountStatusListenerProps {
  userId?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur");
  }
  return res.json();
};

export default function AccountStatusListener({ userId }: AccountStatusListenerProps) {
  const [showModal, setShowModal] = useState(false);
  const [statusData, setStatusData] = useState<{
    status: "SUSPENDED" | "BANNED" | "FROZEN" | "MAINTENANCE";
    reason?: string;
    maintenanceUntil?: string | null;
  } | null>(null);

  // Polling toutes les 10 secondes pour verifier le statut
  const { data, error } = useSWR(
    userId ? "/api/auth/account-status" : null,
    fetcher,
    {
      refreshInterval: 10000, // Verifier toutes les 10 secondes
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
    }
  );

  const handleStatusChange = useCallback((newStatus: any) => {
    if (!newStatus) return;

    // Si le compte vient d'etre reactive depuis la maintenance
    if (newStatus.wasInMaintenance) {
      toast.success("Votre compte a ete reactive !", {
        description: "Vous pouvez maintenant utiliser l'application normalement.",
      });
      setShowModal(false);
      setStatusData(null);
      return;
    }

    // Verifier si le compte est restreint
    if (newStatus.isRestricted && ["SUSPENDED", "BANNED", "FROZEN", "MAINTENANCE"].includes(newStatus.status)) {
      setStatusData({
        status: newStatus.status,
        reason: newStatus.reason,
        maintenanceUntil: newStatus.maintenanceUntil,
      });
      setShowModal(true);
    } else if (showModal && newStatus.status === "ACTIVE") {
      // Le compte est redevenu actif
      setShowModal(false);
      setStatusData(null);
      toast.success("Votre compte est de nouveau actif !");
    }
  }, [showModal]);

  useEffect(() => {
    if (data) {
      handleStatusChange(data);
    }
  }, [data, handleStatusChange]);

  // Si erreur de session, ne pas afficher le modal
  if (error) {
    return null;
  }

  // Afficher le modal si le compte est restreint
  if (showModal && statusData) {
    return (
      <AccountStatusModal
        status={statusData.status}
        reason={statusData.reason}
        maintenanceUntil={statusData.maintenanceUntil}
      />
    );
  }

  return null;
}
