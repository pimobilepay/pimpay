"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";

/**
 * Affiche une adresse blockchain EN ENTIER (plus de troncature) avec copie en
 * un clic et lien explorateur optionnel. Les adresses tronquees etaient
 * inutilisables pour l'administration : impossible de verifier un depot.
 */
export function CopyableAddress({
  label,
  address,
  network,
  explorerUrl,
}: {
  label: string;
  address: string | null;
  network?: string;
  explorerUrl?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponible (contexte non securise) : on ignore */
    }
  }

  return (
    <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">
            {label}
          </span>
          {network && (
            <span className="text-[7px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20 uppercase tracking-wider shrink-0">
              {network}
            </span>
          )}
        </div>
        {address && (
          <div className="flex items-center gap-1 shrink-0">
            {explorerUrl && (
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 bg-white/5 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-colors"
                aria-label={`Ouvrir ${label} dans l'explorateur`}
              >
                <ExternalLink size={12} />
              </a>
            )}
            <button
              type="button"
              onClick={copy}
              className="p-1.5 bg-white/5 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-colors active:scale-95"
              aria-label={`Copier ${label}`}
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            </button>
          </div>
        )}
      </div>
      {address ? (
        <p className="text-[10px] font-mono text-white break-all leading-relaxed select-all">
          {address}
        </p>
      ) : (
        <p className="text-[10px] font-bold text-slate-600 uppercase">Non definie</p>
      )}
    </div>
  );
}
