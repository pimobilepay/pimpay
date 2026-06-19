"use client";

/**
 * Notificateur global des demandes KYC.
 *
 * Monte dans app/admin/layout.tsx pour que l'admin recoive une notification
 * toast des qu'une nouvelle demande de verification KYC est soumise,
 * quelle que soit la page admin sur laquelle il se trouve.
 *
 * Il interroge /api/admin/kyc/pending toutes les 10s et compare les IDs
 * pour ne notifier que les NOUVELLES demandes (pas celles deja vues).
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";

type PendingKycUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
};

export default function AdminGlobalKycNotifier() {
  const router = useRouter();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    let cancelled = false;

    const checkPendingKyc = async () => {
      try {
        const res = await fetch("/api/admin/kyc/pending", { cache: "no-store" });
        if (!res.ok) return;

        const data = await res.json();
        const users: PendingKycUser[] = Array.isArray(data) ? data : [];

        if (cancelled) return;

        // Premier chargement : on memorise les IDs existants sans notifier
        if (isFirstLoadRef.current) {
          users.forEach((u) => seenIdsRef.current.add(u.id));
          isFirstLoadRef.current = false;
          return;
        }

        // Detecte les nouvelles demandes non encore vues
        const newUsers = users.filter((u) => !seenIdsRef.current.has(u.id));

        newUsers.forEach((u) => {
          seenIdsRef.current.add(u.id);
          const name = `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Un utilisateur";
          toast(`Nouvelle demande KYC`, {
            description: `${name} a soumis une demande de verification.`,
            icon: <ShieldCheck className="text-blue-500" size={18} />,
            duration: 8000,
            action: {
              label: "Voir",
              onClick: () => router.push("/admin/kyc"),
            },
          });
        });
      } catch {
        // Silencieux : on ne veut pas spammer l'admin en cas d'erreur reseau
      }
    };

    checkPendingKyc();
    const interval = setInterval(checkPendingKyc, 10000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // On garde l'effet actif sur toutes les pages admin
  }, [router]);

  return null;
}
