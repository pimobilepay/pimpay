"use client";

import { useRouter } from "next/navigation";
import { ShieldCheck, X, Lock, BadgeCheck, ArrowRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Plafonds appliques cote serveur (lib/withdrawal-limits.ts).
 * Affiches ici a titre informatif pour l'utilisateur.
 */
const LIMITS = {
  KYC_FREE_LIMIT_PI: 5,
  KYC_MAX_PER_TX_PI: 100,
  MAX_PER_DAY: 10,
};

export interface KycRequiredModalProps {
  open: boolean;
  onClose: () => void;
  /** Message professionnel renvoye par l'API (optionnel). */
  message?: string | null;
  /** Code de politique renvoye par l'API: KYC_REQUIRED, PER_TX_LIMIT, DAILY_LIMIT_REACHED. */
  code?: string | null;
}

/**
 * Modale professionnelle invitant l'utilisateur a completer sa verification KYC
 * pour augmenter ses limites de retrait/transfert.
 */
export function KycRequiredModal({ open, onClose, message, code }: KycRequiredModalProps) {
  const router = useRouter();
  const { t } = useLanguage();

  if (!open) return null;

  const isLimitReached = code === "PER_TX_LIMIT" || code === "DAILY_LIMIT_REACHED";

  const title = isLimitReached ? t("kycModal.titleLimit") : t("kycModal.titleVerify");

  const intro = isLimitReached
    ? message || t("kycModal.introLimit")
    : message || t("kycModal.introVerify");

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kyc-modal-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-[#0b1220] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t("kycModal.close")}
          className="absolute top-4 right-4 p-2 bg-white/5 rounded-xl border border-white/5 active:scale-95 transition-transform"
        >
          <X size={16} className="text-slate-400" />
        </button>

        {/* Icône */}
        <div className="w-14 h-14 rounded-2xl bg-blue-600/15 flex items-center justify-center mb-5">
          <ShieldCheck size={28} className="text-blue-500" />
        </div>

        <h2 id="kyc-modal-title" className="text-xl font-black text-white tracking-tight text-balance">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-400 leading-relaxed text-pretty">{intro}</p>

        {/* Avantages de la vérification */}
        <div className="mt-5 space-y-3 rounded-2xl bg-white/[0.02] border border-white/5 p-4">
          <div className="flex items-start gap-3">
            <BadgeCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              {t("kycModal.benefit1Prefix")}{" "}
              <span className="font-bold text-white">{LIMITS.KYC_FREE_LIMIT_PI} Pi</span> {t("kycModal.benefit1Suffix")}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <BadgeCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              {t("kycModal.benefit2Prefix")}{" "}
              <span className="font-bold text-white">{LIMITS.KYC_MAX_PER_TX_PI} Pi</span> {t("kycModal.benefit2Suffix")}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <BadgeCheck size={18} className="text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-xs text-slate-300 leading-relaxed">
              {t("kycModal.benefit3")}
            </p>
          </div>
        </div>

        {/* Mention conformité */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-blue-600/5 border border-blue-600/10 p-3">
          <Lock size={14} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t("kycModal.compliancePrefix")}{" "}
            <span className="text-blue-500 font-semibold">AML/KYC</span> {t("kycModal.complianceSuffix")}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-2.5">
          <button
            onClick={() => router.push("/settings/kyc")}
            className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-colors active:scale-[0.98]"
          >
            {t("kycModal.verifyButton")}
            <ArrowRight size={16} />
          </button>
          <button
            onClick={onClose}
            className="w-full py-3.5 text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-slate-300 transition-colors"
          >
            {t("kycModal.later")}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Determine si une reponse API correspond a une violation de politique KYC/plafond.
 * A utiliser dans les blocs de gestion d'erreur des pages de transaction.
 */
export function isKycPolicyError(data: any): boolean {
  const code = data?.code;
  if (code === "KYC_REQUIRED" || code === "PER_TX_LIMIT" || code === "DAILY_LIMIT_REACHED") {
    return true;
  }
  const msg = (data?.error || data?.message || "").toString().toLowerCase();
  return msg.includes("kyc") || (msg.includes("verification") && msg.includes("requis"));
}
