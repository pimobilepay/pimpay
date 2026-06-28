"use client";

import { useState } from "react";
import { CRYPTO_ASSETS } from "@/lib/crypto-config";

// Métadonnées d'affichage des devises fiat (pas de logo PNG dédié).
const FIAT_META: Record<string, { label: string; className: string }> = {
  XAF: { label: "F", className: "bg-green-500/20 text-green-400" },
  XOF: { label: "F", className: "bg-green-500/20 text-green-400" },
  MGA: { label: "Ar", className: "bg-teal-500/20 text-teal-400" },
  EUR: { label: "€", className: "bg-blue-500/20 text-blue-400" },
  USD: { label: "$", className: "bg-emerald-500/20 text-emerald-400" },
  GBP: { label: "£", className: "bg-purple-500/20 text-purple-400" },
  NGN: { label: "₦", className: "bg-purple-500/20 text-purple-400" },
  CNY: { label: "¥", className: "bg-red-500/20 text-red-400" },
};

/**
 * Affiche le vrai logo d'un actif (crypto via /public/*.png ou fiat via symbole).
 * Retombe sur des initiales colorées si aucun logo n'est disponible ou en cas d'erreur de chargement.
 */
export function AssetLogo({
  symbol,
  className = "w-9 h-9",
  textClassName = "text-[10px]",
}: {
  symbol: string;
  className?: string;
  textClassName?: string;
}) {
  const sym = (symbol || "").toUpperCase();
  const logo = CRYPTO_ASSETS[sym]?.logo;
  const [err, setErr] = useState(false);

  if (logo && !err) {
    return (
      <div className={`${className} rounded-xl overflow-hidden bg-white/5 flex items-center justify-center shrink-0`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logo || "/placeholder.svg"}
          alt={sym}
          className="w-full h-full object-contain"
          onError={() => setErr(true)}
        />
      </div>
    );
  }

  const fiat = FIAT_META[sym];
  const fallbackClass = fiat?.className ?? "bg-slate-700/50 text-slate-400";
  const label = fiat?.label ?? (sym === "PI" ? "π" : sym.substring(0, 3));

  return (
    <div
      className={`${className} rounded-xl flex items-center justify-center font-black shrink-0 ${fallbackClass} ${textClassName}`}
    >
      {label}
    </div>
  );
}
