"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Globe,
  Check,
  Languages,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LOCALE_STORAGE_KEY, type Locale } from "@/lib/i18n";

interface LanguageOption {
  code: Locale;
  label: string;
  nativeLabel: string;
  flag: string;
  region: string;
}

const languages: LanguageOption[] = [
  {
    code: "fr",
    label: "Francais",
    nativeLabel: "Francais",
    flag: "FR",
    region: "France, RDC, Afrique",
  },
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "EN",
    region: "Global",
  },
];

export default function LanguagePage() {
  const router = useRouter();
  const [currentLocale, setCurrentLocale] = useState<Locale>("fr");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved === "en" || saved === "fr") {
      setCurrentLocale(saved);
    }
  }, []);

  const handleSelectLanguage = (code: Locale) => {
    if (code === currentLocale) return;

    setCurrentLocale(code);
    localStorage.setItem(LOCALE_STORAGE_KEY, code);

    toast.success(
      code === "fr" ? "Langue changee en Francais" : "Language changed to English"
    );

    // Refresh the page so all components pick up the new locale
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 font-sans">
      {/* HEADER */}
      <header className="px-6 pt-10 pb-6 flex items-center gap-4 sticky top-0 bg-[#020617]/80 backdrop-blur-md z-30">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-black tracking-tighter uppercase leading-none">
            Langue
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <Globe size={10} className="text-cyan-500" />
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-[2px]">
              {currentLocale === "fr" ? "Langue & Region" : "Language & Region"}
            </span>
          </div>
        </div>
      </header>

      <main className="px-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* CURRENT LANGUAGE INDICATOR */}
        <div className="p-6 rounded-[2rem] bg-gradient-to-br from-cyan-500/10 to-blue-600/5 border border-cyan-500/20">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <Languages size={24} className="text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {currentLocale === "fr"
                  ? "Langue actuelle"
                  : "Current language"}
              </p>
              <p className="text-lg font-black uppercase tracking-tight mt-0.5">
                {languages.find((l) => l.code === currentLocale)?.label}
              </p>
            </div>
          </div>
        </div>

        {/* LANGUAGE OPTIONS */}
        <section>
          <div className="flex items-center gap-2 mb-4 ml-2">
            <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
              {currentLocale === "fr"
                ? "Choisir une langue"
                : "Select a language"}
            </h3>
          </div>

          <div className="space-y-3">
            {languages.map((lang) => {
              const isActive = lang.code === currentLocale;
              return (
                <button
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between p-5 rounded-[2rem] transition-all active:scale-[0.98] ${
                    isActive
                      ? "bg-slate-900/40 border border-cyan-500/20"
                      : "bg-slate-900/20 border border-white/5 hover:bg-slate-900/40"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black ${
                        isActive
                          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          : "bg-white/5 text-slate-400 border border-white/10"
                      }`}
                    >
                      {lang.flag}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black uppercase tracking-tight">
                        {lang.label}
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
                </button>
              );
            })}
          </div>
        </section>

        {/* INFO */}
        <div className="p-5 rounded-[2rem] bg-slate-900/20 border border-white/5">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-relaxed">
            {currentLocale === "fr"
              ? "Le changement de langue sera applique a l'ensemble de l'application. Certains contenus generes par le serveur peuvent rester dans leur langue d'origine."
              : "The language change will apply across the entire application. Some server-generated content may remain in its original language."}
          </p>
        </div>
      </main>
    </div>
  );
}
