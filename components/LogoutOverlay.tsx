"use client";

import { useLanguage } from "@/context/LanguageContext";

/**
 * Petit spinner natif (type iOS) composé de 12 traits dont l'opacité décroît.
 * Le conteneur tourne, ce qui crée l'effet de "traînée" classique.
 * Taille volontairement réduite pour rester discret.
 */
function NativeSpinner({ size = 26 }: { size?: number }) {
  const bars = Array.from({ length: 12 });
  return (
    <div
      className="relative animate-spin"
      style={{ width: size, height: size, animationDuration: "0.9s" }}
      role="status"
      aria-label="loading"
    >
      {bars.map((_, i) => (
        <span
          key={i}
          className="absolute left-1/2 top-0 rounded-full bg-white"
          style={{
            width: Math.max(2, size * 0.08),
            height: size * 0.28,
            marginLeft: -(Math.max(2, size * 0.08) / 2),
            transformOrigin: `center ${size / 2}px`,
            transform: `rotate(${i * 30}deg)`,
            opacity: (i + 1) / 12,
          }}
        />
      ))}
    </div>
  );
}

/**
 * Écran plein affiché pendant la déconnexion.
 * Le texte s'adapte automatiquement à la langue sélectionnée via t().
 */
export default function LogoutOverlay() {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 z-[10000] bg-[#020617] flex flex-col items-center justify-center gap-3">
      <NativeSpinner size={26} />
      <p className="text-white font-bold text-sm tracking-tight">
        {t("sideMenu.loggingOut")}
      </p>
    </div>
  );
}
