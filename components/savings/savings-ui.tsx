"use client";

/**
 * Primitives d'interface partagées par les écrans Épargne / Coffre-fort.
 * Alignées sur le langage visuel du portail (fond #020617, cartes translucides,
 * libellés capitales très petits, chiffres tabulaires).
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { SAVINGS_STATUS_META } from "./savings-shared";

/* ------------------------------------------------------------------ */
/*  Feuille modale                                                     */
/* ------------------------------------------------------------------ */

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  // Fermeture au clavier et blocage du défilement de l'arrière-plan.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 z-[90] max-h-[92vh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-[#0a0f1a]"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/5 bg-[#0a0f1a]/95 px-5 py-4 backdrop-blur-xl">
              <div className="min-w-0">
                <h2 className="text-sm font-black uppercase tracking-wider text-white text-balance">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="shrink-0 rounded-xl bg-white/5 p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 pb-8 pt-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/*  Champs de formulaire                                               */
/* ------------------------------------------------------------------ */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{hint}</p>}
    </div>
  );
}

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3.5 text-sm font-bold text-white placeholder:text-slate-600 focus:border-blue-500/50 focus:outline-none";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

/**
 * Saisie de montant : `inputMode="decimal"` ouvre le pavé numérique sur mobile
 * et on filtre les caractères non numériques pour éviter un NaN côté serveur.
 */
export function AmountInput({
  value,
  onChange,
  currency,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  currency: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
        placeholder="0"
        className={`${inputClass} pr-20 text-lg tabular-nums`}
      />
      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest text-slate-500">
        {currency}
      </span>
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} appearance-none`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-slate-900">
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * Saisie du code PIN. Le backend accepte 4 ou 6 chiffres ; on borne donc à 6
 * et on masque la valeur. Aucune persistance : la valeur reste dans l'état
 * local du composant appelant et n'est jamais journalisée.
 */
export function PinInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  return (
    <input
      ref={ref}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
      placeholder="••••"
      className={`${inputClass} text-center text-2xl tracking-[0.5em]`}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Affichage                                                          */
/* ------------------------------------------------------------------ */

export function StatusBadge({ status }: { status: string }) {
  const meta = SAVINGS_STATUS_META[status] ?? {
    label: status,
    className: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };
  return (
    <span
      className={`rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-widest ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export function Progress({ value, accent = "bg-blue-500" }: { value: number; accent?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1.5 w-full overflow-hidden rounded-full bg-white/5"
    >
      <div className={`h-full rounded-full ${accent}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function SubmitButton({
  onClick,
  loading,
  disabled,
  children,
  variant = "primary",
}: {
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "primary" | "danger";
}) {
  const palette =
    variant === "danger"
      ? "bg-rose-600 hover:bg-rose-500 disabled:bg-rose-600/30"
      : "bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/30";

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[11px] font-black uppercase tracking-widest text-white transition-colors disabled:cursor-not-allowed disabled:text-white/50 ${palette}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function EmptyState({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 py-14 text-center">
      <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      {hint && <p className="mt-2 max-w-[240px] text-[10px] leading-relaxed text-slate-600">{hint}</p>}
    </div>
  );
}

/** Ligne clé/valeur des récapitulatifs de sortie de fonds. */
export function SummaryRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: "danger" | "success";
}) {
  const tone =
    emphasis === "danger"
      ? "text-rose-400"
      : emphasis === "success"
        ? "text-emerald-400"
        : "text-white";
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      <span className={`text-xs font-black tabular-nums ${tone}`}>{value}</span>
    </div>
  );
}
