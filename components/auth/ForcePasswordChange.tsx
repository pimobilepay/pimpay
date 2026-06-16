"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Loader2, Eye, EyeOff, Check, X } from "lucide-react";

interface ForcePasswordChangeProps {
  isOpen: boolean;
  /** Called once the password has been successfully updated. */
  onComplete: () => void;
}

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

const rules: Rule[] = [
  { label: "Au moins 8 caractères", test: (v) => v.length >= 8 },
  { label: "Au moins une lettre", test: (v) => /[A-Za-z]/.test(v) },
  { label: "Au moins un chiffre", test: (v) => /\d/.test(v) },
];

export default function ForcePasswordChange({
  isOpen,
  onComplete,
}: ForcePasswordChangeProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allValid = useMemo(() => rules.every((r) => r.test(password)), [password]);
  const matches = password.length > 0 && password === confirm;
  const canSubmit = allValid && matches && !loading;

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/force-password-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Impossible de mettre à jour le mot de passe.");
        setLoading(false);
        return;
      }
      // Succès — on laisse le parent poursuivre (langue / redirection).
      onComplete();
    } catch {
      setError("Erreur réseau. Veuillez réessayer.");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[190] flex items-center justify-center bg-[#020617]/95 backdrop-blur-xl p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="w-full max-w-[440px] overflow-hidden"
        >
          <div className="relative bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[32px] shadow-2xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

            {/* Header */}
            <div className="relative px-6 pt-8 pb-4 text-center">
              <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 border border-amber-500/20 mb-4">
                <ShieldAlert className="text-amber-400" size={28} />
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white text-balance">
                Sécurisez votre compte
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed mt-2 px-2">
                Pour votre sécurité, vous devez définir un nouveau mot de passe avant de
                continuer.
              </p>
            </div>

            {/* Form */}
            <div className="px-6 pb-2 space-y-3">
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  autoComplete="new-password"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 pr-12 text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:border-cyan-500/40 focus:bg-white/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Confirmez le mot de passe"
                  autoComplete="new-password"
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-4 text-white placeholder:text-slate-500 text-sm font-medium focus:outline-none focus:border-cyan-500/40 focus:bg-white/10 transition-all"
                />
              </div>

              {/* Rules */}
              <div className="space-y-1.5 px-1 pt-1">
                {rules.map((r) => {
                  const ok = r.test(password);
                  return (
                    <div key={r.label} className="flex items-center gap-2">
                      <span
                        className={`w-4 h-4 rounded-full flex items-center justify-center ${
                          ok ? "bg-emerald-500/20" : "bg-white/5"
                        }`}
                      >
                        {ok ? (
                          <Check size={11} className="text-emerald-400" />
                        ) : (
                          <X size={11} className="text-slate-600" />
                        )}
                      </span>
                      <span
                        className={`text-[11px] font-semibold ${
                          ok ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {r.label}
                      </span>
                    </div>
                  );
                })}
                {confirm.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center ${
                        matches ? "bg-emerald-500/20" : "bg-rose-500/20"
                      }`}
                    >
                      {matches ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <X size={11} className="text-rose-400" />
                      )}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        matches ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {matches ? "Les mots de passe correspondent" : "Les mots de passe ne correspondent pas"}
                    </span>
                  </div>
                )}
              </div>

              {error && (
                <p className="text-[11px] font-semibold text-rose-400 px-1">{error}</p>
              )}
            </div>

            {/* Submit */}
            <div className="px-6 pb-8 pt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full h-14 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold uppercase tracking-tight active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Mettre à jour et continuer"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
