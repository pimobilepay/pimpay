"use client";

import { Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export default function CardsLoading() {
  // [FIX] Texte auparavant codé en dur en français ("Chargement de la
  // carte..."). LanguageProvider enveloppe toute l'app (app/layout.tsx),
  // donc ce composant peut devenir "use client" et lire la langue active de
  // l'utilisateur via useLanguage() sans rien casser côté SSR/streaming de
  // ce fichier spécial Next.js (loading.tsx). La clé `cards.loadingCard`
  // est traduite en FR / EN / ZH dans lib/i18n/locales/*.ts.
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#080C14] text-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">
          {t("cards.loadingCard")}
        </p>
      </div>
    </div>
  );
}
