"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";

interface SupportReplyListenerProps {
  userId?: string;
}

/**
 * Listener global : surveille les nouvelles notifications de type SUPPORT_MESSAGE
 * (reponses du support / messages prives de l'admin) et affiche un toast a l'ecran
 * quelle que soit la page ou se trouve l'utilisateur. Le toast propose un bouton
 * pour ouvrir la page /notifications.
 */
export default function SupportReplyListener({ userId }: SupportReplyListenerProps) {
  const router = useRouter();
  const lastSeenIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch("/api/notifications?type=SUPPORT_MESSAGE&unread=true", {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list: any[] = Array.isArray(data) ? data : data.notifications || [];
        if (list.length === 0) return;

        // list est trie du plus recent au plus ancien
        const latest = list[0];

        // Premier passage : on memorise sans notifier (evite un toast au chargement)
        if (!initializedRef.current) {
          initializedRef.current = true;
          lastSeenIdRef.current = latest.id;
          return;
        }

        if (latest.id !== lastSeenIdRef.current) {
          lastSeenIdRef.current = latest.id;
          toast(latest.title || "Message du Support PimPay", {
            description: latest.message || "Vous avez recu un nouveau message du support",
            duration: 8000,
            icon: <MessageSquare size={18} className="text-cyan-400" />,
            action: {
              label: "Voir",
              onClick: () => router.push("/notifications"),
            },
          });
        }
      } catch {
        /* silencieux */
      }
    };

    check();
    const interval = setInterval(check, 8000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, router]);

  return null;
}
