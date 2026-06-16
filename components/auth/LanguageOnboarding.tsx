"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Globe, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { Locale } from "@/lib/i18n";

export const LANGUAGE_ONBOARDED_KEY = "pimpay-language-onboarded";

interface LanguageOnboardingProps {
  isOpen: boolean;
  /** Called once the user confirms their language choice. */
  onComplete: () => void;
}

interface LanguageOption {
  code: Locale;
  label: string;
  nativeLabel: string;
  /** ISO country code used by flagcdn.com */
  flagCode: string;
  region: string;
}

const languages: LanguageOption[] = [
  {
    code: "fr",
    label: "Francais",
    nativeLabel: "Francais",
    flagCode: "fr",
    region: "Europe, Afrique",
  },
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flagCode: "gb",
    region: "Global",
  },
  {
    code: "zh",
    label: "Chinese",
    nativeLabel: "\u4e2d\u6587",
    flagCode: "cn",
    region: "China, Asia",
  },
];

export default function LanguageOnboarding({
  isOpen,
  onComplete,
}: LanguageOnboardingProps) {
  const { locale, setLocale } = useLanguage();
  const [selected, setSelected] = useState<Locale>(locale);
  const [confirming, setConfirming] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (confirming) return;
    setConfirming(true);
    setLocale(selected);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(LANGUAGE_ONBOARDED_KEY, "1");
      } catch {
        /* ignore storage errors */
      }
    }
    // Small delay so the selection feedback is visible before redirecting.
    setTimeout(() => {
      onComplete();
    }, 500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-[440px] overflow-hidden"
        >
          <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
            {/* Specular reflections */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="relative px-6 pt-8 pb-4 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/10 border border-cyan-500/20 mb-4">
                <Globe className="text-cyan-400" size={28} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Choisissez votre langue
              </h2>
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em] mt-1">
                Select your language &middot; {"\u9009\u62e9\u8bed\u8a00"}
              </p>
            </div>

            {/* Options */}
            <div className="px-6 pb-4 space-y-3">
              {languages.map((lang) => {
                const isActive = lang.code === selected;
                return (
                  <motion.button
                    key={lang.code}
                    type="button"
                    onClick={() => setSelected(lang.code)}
                    whileTap={{ scale: 0.98 }}
                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${
                      isActive
                        ? "bg-cyan-500/10 border border-cyan-500/30"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={`https://flagcdn.com/w80/${lang.flagCode}.png`}
                        srcSet={`https://flagcdn.com/w160/${lang.flagCode}.png 2x`}
                        width={48}
                        height={36}
                        alt={`Drapeau ${lang.label}`}
                        className="w-12 h-9 rounded-lg object-cover border border-white/10 shadow-md"
                      />
                      <div className="text-left">
                        <p className="text-sm font-black uppercase tracking-tight text-white">
                          {lang.nativeLabel}
                        </p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                          {lang.region}
                        </p>
                      </div>
                    </div>

                    {isActive ? (
                      <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                        <Check size={16} className="text-cyan-400" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10" />
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Confirm */}
            <div className="px-6 pb-8 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={confirming}
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-70 text-white rounded-2xl font-bold uppercase tracking-tight active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {confirming ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {selected === "fr"
                      ? "Continuer"
                      : selected === "zh"
                        ? "\u7ee7\u7eed"
                        : "Continue"}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
