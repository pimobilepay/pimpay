"use client";

import { useLanguage } from "@/context/LanguageContext";

/**
 * Fin anneau circulaire (style natif navigateur) comme dans la maquette.
 * Anneau fin clair avec un segment plus marqué qui tourne.
 */
function RingSpinner({ size = 64 }: { size?: number }) {
  return (
    <div
      className="rounded-full border-[3px] border-white/20 border-t-white/90 animate-spin"
      style={{ width: size, height: size, animationDuration: "0.8s" }}
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
        "bg-[#020617] flex flex-col items-center justify-center gap-5"
      }
    >
      <RingSpinner size={64} />
      <p className="text-white/90 text-lg font-medium tracking-tight text-pretty text-center px-6">
        {label}
      </p>
    </div>
  );
}
