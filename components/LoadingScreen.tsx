"use client";

import { useLanguage } from "@/context/LanguageContext";

/**
 * Petit anneau circulaire (style natif navigateur) comme dans la maquette.
 * Utilise la couleur de la plateforme (--primary).
 */
function RingSpinner({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-2 border-blue-500/25 border-t-blue-500 animate-spin"
      style={{ width: size, height: size, animationDuration: "0.6s" }}
      role="status"
      aria-label="loading"
    />
  );
}

interface LoadingScreenProps {
  /** Message optionnel. Par defaut : traduction de common.loading (Loading.../Chargement...). */
  message?: string;
  /** Affichage plein ecran (fixe) ou integre dans le flux. */
  fullScreen?: boolean;
}

/**
 * Ecran de chargement reutilisable pour toute la plateforme.
 * Le texte s'adapte automatiquement a la langue selectionnee via t().
 */
export default function LoadingScreen({ message, fullScreen = true }: LoadingScreenProps) {
  const { t } = useLanguage();
  const label = message ?? t("common.loading");

  return (
    <div
      className={
        (fullScreen ? "fixed inset-0 z-[999] " : "w-full min-h-[60vh] ") +
        "bg-background flex flex-col items-center justify-center gap-3"
      }
    >
      <RingSpinner size={28} />
      <p className="text-blue-500 text-sm font-medium tracking-tight text-pretty text-center px-6">
        {label}
      </p>
    </div>
  );
}
