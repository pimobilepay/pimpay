"use client";

import { useState } from "react";
import { CRYPTO_ASSETS } from "@/lib/crypto-config";

// Correspondance devise fiat -> code pays ISO (pour l'affichage du drapeau via flagcdn).
const FIAT_FLAG: Record<string, string> = {
  USD: "us",
  EUR: "eu",
  GBP: "gb",
  XAF: "cm",
  XOF: "sn",
  CDF: "cd",
  NGN: "ng",
  AED: "ae",
  MGA: "mg",
  CNY: "cn",
  GHS: "gh",
  KES: "ke",
  ZAR: "za",
  MAD: "ma",
  DZD: "dz",
  TND: "tn",
};

// Métadonnées de repli des devises fiat (si le drapeau ne charge pas).
const FIAT_META: Record<string, { label: string; className: string }> = {
  XAF: { label: "F", className: "bg-green-500/20 text-green-400" },
  XOF: { label: "F", className: "bg-green-500/20 text-green-400" },
  CDF: { label: "FC", className: "bg-sky-500/20 text-sky-400" },
  MGA: { label: "Ar", className: "bg-teal-500/20 text-teal-400" },
  EUR: { label: "€", className: "bg-blue-500/20 text-blue-400" },
  USD: { label: "$", className: "bg-emerald-500/20 text-emerald-400" },
  GBP: { label: "£", className: "bg-purple-500/20 text-purple-400" },
  NGN: { label: "₦", className: "bg-purple-500/20 text-purple-400" },
  CNY: { label: "¥", className: "bg-red-500/20 text-red-400" },
  AED: { label: "د.إ", className: "bg-red-500/20 text-red-400" },
};

/**
 * Affiche le vrai logo/icône d'un actif :
 *  - crypto  : logo PNG via /public/*.png (config centralisée)
 *  - fiat    : drapeau du pays (flagcdn)
 *  - fallback: initiales/symbole coloré si rien n'est disponible.
 */
export function AssetLogo({
  symbol,
  className = "w-9 h-9",
  textClassName = "text-[10px]",
  rounded = "rounded-xl",
}: {
  symbol: string;
  className?: string;
  textClassName?: string;
  /** Forme du conteneur : "rounded-xl" (défaut) ou "rounded-full" pour un badge circulaire. */
  rounded?: string;
}) {
  const sym = (symbol || "").toUpperCase();
  const logo = CRYPTO_ASSETS[sym]?.logo;
  const flag = FIAT_FLAG[sym];
  const [logoErr, setLogoErr] = useState(false);
  const [flagErr, setFlagErr] = useState(false);

  // 1) Crypto : logo dédié
  if (logo && !logoErr) {
    return (
      <div className={`${className} ${rounded} overflow-hidden bg-white/5 flex items-center justify-center shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo || "/placeholder.svg"}
          alt={sym}
          className="w-full h-full object-contain"
          onError={() => setLogoErr(true)}
        />
      </div>
    );
  }

  // 2) Fiat : drapeau du pays
  if (flag && !flagErr) {
    return (
      <div className={`${className} ${rounded} overflow-hidden bg-white/5 flex items-center justify-center shrink-0 border border-white/10`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://flagcdn.com/w80/${flag}.png`}
          srcSet={`https://flagcdn.com/w160/${flag}.png 2x`}
          alt={`${sym} flag`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFlagErr(true)}
        />
      </div>
    );
  }

  // 3) Fallback : initiales/symbole coloré
  const fiat = FIAT_META[sym];
  const fallbackClass = fiat?.className ?? "bg-slate-700/50 text-slate-400";
  const label = fiat?.label ?? (sym === "PI" ? "π" : sym.substring(0, 3));

  return (
    <div
      className={`${className} ${rounded} flex items-center justify-center font-black shrink-0 ${fallbackClass} ${textClassName}`}
    >
      {label}
    </div>
  );
}
