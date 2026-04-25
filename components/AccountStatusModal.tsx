"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Clock, Ban, Snowflake, LogOut, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccountStatusModalProps {
  // isOpen est optionnel pour rétro-compatibilité avec AccountStatusListener
  // (qui monte/démonte le composant lui-même). La page de login l'utilise avec isOpen.
  isOpen?: boolean;
  status: "SUSPENDED" | "BANNED" | "FROZEN" | "MAINTENANCE";
  reason?: string;
  maintenanceUntil?: string | null;
  onClose?: () => void;
}

export default function AccountStatusModal({
  isOpen = true,
  status,
  reason,
  maintenanceUntil,
  onClose,
}: AccountStatusModalProps) {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const calculateTimeLeft = useCallback(() => {
    if (!maintenanceUntil || status !== "MAINTENANCE") return null;

    const endTime = new Date(maintenanceUntil).getTime();
    const now = new Date().getTime();
    const difference = endTime - now;

    if (difference <= 0) {
      setIsExpired(true);
      return null;
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return { hours, minutes, seconds };
  }, [maintenanceUntil, status]);

  useEffect(() => {
    if (status !== "MAINTENANCE" || !maintenanceUntil) return;

    const timer = setInterval(() => {
      const time = calculateTimeLeft();
      setTimeLeft(time);

      if (!time) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 1000);

    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [calculateTimeLeft, status, maintenanceUntil]);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      // 1. Appeler l'API logout côté serveur en premier
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch {
      // Continuer même si l'API échoue — le cookie sera supprimé côté client
    }

    // 2. Nettoyer tous les cookies de session
    const cookiesToClear = [
      "pimpay_token",
      "token",
      "pi_session_token",
      "next-auth.session-token",
      "next-auth.csrf-token",
    ];
    cookiesToClear.forEach((name) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
    });

    // 3. Vider le localStorage et sessionStorage
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignoré si le storage est désactivé
    }

    // 4. Fermer le modal (si callback fourni)
    onClose?.();

    // 5. Rediriger + invalider le cache Next.js
    router.push("/auth/login");
    router.refresh();
  };

  const getStatusConfig = () => {
    switch (status) {
      case "SUSPENDED":
        return {
          icon: ShieldAlert,
          title: "Compte Suspendu",
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
          borderColor: "border-amber-500/30",
          description:
            reason ||
            "Votre compte a été suspendu. Veuillez contacter le support pour plus d'informations.",
        };
      case "BANNED":
        return {
          icon: Ban,
          title: "Compte Banni",
          color: "text-red-500",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
          description:
            reason ||
            "Votre compte a été définitivement banni pour violation des conditions d'utilisation.",
        };
      case "FROZEN":
        return {
          icon: Snowflake,
          title: "Compte Gelé",
          color: "text-blue-400",
          bgColor: "bg-blue-400/10",
          borderColor: "border-blue-400/30",
          description:
            reason ||
            "Votre compte a été temporairement gelé pour des raisons de sécurité.",
        };
      case "MAINTENANCE":
        return {
          icon: Clock,
          title: "Compte en Maintenance",
          color: "text-purple-500",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/30",
          description:
            reason ||
            "Votre compte est temporairement en maintenance. Il sera réactivé automatiquement.",
        };
      default:
        return {
          icon: ShieldAlert,
          title: "Statut Inconnu",
          color: "text-slate-500",
          bgColor: "bg-slate-500/10",
          borderColor: "border-slate-500/30",
          description: "Un problème est survenu avec votre compte.",
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className={`relative w-full max-w-md bg-slate-900 rounded-2xl border ${config.borderColor} overflow-hidden shadow-2xl`}
          >
            {/* Header avec icône animée */}
            <div className={`relative py-8 ${config.bgColor}`}>
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/50" />
              <motion.div
                animate={{
                  scale: [1, 1.1, 1],
                  rotate: status === "MAINTENANCE" ? [0, 360] : 0,
                }}
                transition={{
                  duration: status === "MAINTENANCE" ? 4 : 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative flex justify-center"
              >
                <div className={`p-4 rounded-full ${config.bgColor} border ${config.borderColor}`}>
                  <Icon className={`w-12 h-12 ${config.color}`} />
                </div>
              </motion.div>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-6">
              <div className="text-center space-y-2">
                <h2 className={`text-2xl font-bold ${config.color}`}>{config.title}</h2>
                <p className="text-sm text-slate-400 leading-relaxed">{config.description}</p>
              </div>

              {/* Compte à rebours maintenance */}
              {status === "MAINTENANCE" && timeLeft && !isExpired && (
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                  <p className="text-xs text-slate-500 text-center mb-3 uppercase tracking-wider">
                    Reprise automatique dans
                  </p>
                  <div className="flex justify-center gap-3">
                    <TimeUnit value={timeLeft.hours} label="Heures" />
                    <div className="text-2xl font-bold text-slate-600 self-start pt-2">:</div>
                    <TimeUnit value={timeLeft.minutes} label="Minutes" />
                    <div className="text-2xl font-bold text-slate-600 self-start pt-2">:</div>
                    <TimeUnit value={timeLeft.seconds} label="Secondes" />
                  </div>
                </div>
              )}

              {/* Maintenance expirée */}
              {status === "MAINTENANCE" && isExpired && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 text-center"
                >
                  <RefreshCw className="w-6 h-6 text-emerald-500 mx-auto mb-2 animate-spin" />
                  <p className="text-emerald-400 font-medium">Maintenance terminée !</p>
                  <p className="text-xs text-emerald-500/70 mt-1">
                    Rechargement de la page en cours...
                  </p>
                </motion.div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full py-3.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-slate-700"
                >
                  {isLoggingOut ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <LogOut className="w-5 h-5" />
                  )}
                  {isLoggingOut ? "Déconnexion..." : "Se déconnecter"}
                </button>

                {status === "MAINTENANCE" && !isExpired && (
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full py-3 text-slate-400 hover:text-white text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Vérifier le statut
                  </button>
                )}
              </div>

              {/* Contact support */}
              {(status === "SUSPENDED" || status === "BANNED" || status === "FROZEN") && (
                <p className="text-center text-xs text-slate-500">
                  Pour toute question, contactez{" "}
                  <a href="mailto:support@pimpay.app" className="text-blue-400 hover:underline">
                    support@pimpay.app
                  </a>
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <motion.div
        key={value}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-slate-700/50 rounded-lg px-3 py-2 min-w-[50px] border border-slate-600"
      >
        <span className="text-2xl font-bold text-white font-mono">
          {String(value).padStart(2, "0")}
        </span>
      </motion.div>
      <span className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}
