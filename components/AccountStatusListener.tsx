"use client";

import { useState, useEffect, useCallback } from "react";
import useSWR from "swr";
import AccountStatusModal from "./AccountStatusModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface AccountStatusListenerProps {
  userId?: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (res.status === 401) {
    // Session révoquée par l'admin → signaler via une erreur typée
    const err: any = new Error("SESSION_REVOKED");
    err.status = 401;
    throw err;
  }
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Erreur");
  }
  return res.json();
};

export default function AccountStatusListener({ userId }: AccountStatusListenerProps) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [statusData, setStatusData] = useState<{
    status: "SUSPENDED" | "BANNED" | "FROZEN" | "MAINTENANCE";
    reason?: string;
    maintenanceUntil?: string | null;
  } | null>(null);

  // Polling toutes les 3 secondes — réponse quasi-instantanée lors d'une révocation
  const { data, error, mutate } = useSWR(
    userId ? "/api/auth/account-status" : null,
    fetcher,
    {
      refreshInterval: 3000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      shouldRetryOnError: false,
    }
  );

  // Écouter l'event "pimpay:session-revoked" émis par les boutons de révocation
  // pour forcer un check immédiat sans attendre le prochain poll
  useEffect(() => {
    const handleImmediateCheck = () => mutate();
    window.addEventListener("pimpay:session-revoked", handleImmediateCheck);
    return () => window.removeEventListener("pimpay:session-revoked", handleImmediateCheck);
  }, [mutate]);

  // Déconnexion forcée côté client (purge cookies + redirect)
  const forceLogout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch { /* continuer même si l'API échoue */ }

    const cookiesToClear = ["pimpay_token", "token", "pi_session_token", "next-auth.session-token", "next-auth.csrf-token"];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignoré */ }

    router.push("/auth/login");
    router.refresh();
  }, [router]);

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

  // Si erreur 401 → session révoquée par l'admin → déconnexion forcée immédiate
  useEffect(() => {
    if (error && (error as any).status === 401) {
      toast.error("Votre session a été fermée par un administrateur.", { duration: 4000 });
      forceLogout();
    }
  }, [error, forceLogout]);

  // Autres erreurs (réseau, etc.) → ne pas déconnecter
  if (error && (error as any).status !== 401) {
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
